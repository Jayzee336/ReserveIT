<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\BookingExtensionRequest;
use App\Models\Facility;
use App\Models\FacilityOperatingHour;
use App\Models\SystemSetting;
use App\Models\User;
use App\Notifications\BookingOperationsNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BookingExtensionController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        abort_unless(
            in_array($user->role, ['facility_admin', 'super_admin'], true),
            403
        );

        $query = BookingExtensionRequest::query()
            ->with([
                'booking.facility:id,name,location',
                'booking.user:id,name,email',
                'requester:id,name,email',
                'reviewer:id,name',
            ])
            ->latest();

        if ($user->role === 'facility_admin') {
            $query->whereHas('booking.facility', fn ($facilityQuery) => $facilityQuery->forUser($user));
        }

        return Inertia::render('Facilitator/OvertimeExtensions', [
            'extensionRequests' => $query->paginate(20)->withQueryString(),
        ]);
    }

    public function store(Request $request, Booking $booking)
    {
        $user = $request->user();
        abort_unless($user !== null, 401);
        abort_unless((string) $booking->user_id === (string) $user->getKey(), 403);

        $validated = $request->validate([
            'requested_end_time' => ['required', 'date_format:H:i'],
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $result = DB::transaction(function () use ($booking, $user, $validated) {
            $facility = Facility::query()
                ->whereKey($booking->facility_id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedBooking = Booking::query()
                ->whereKey($booking->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if (! $facility->is_available) {
                return ['status' => 'facility_unavailable'];
            }

            if (
                $lockedBooking->status !== 'approved'
                || $lockedBooking->checked_in_at === null
                || $lockedBooking->checked_out_at !== null
            ) {
                return ['status' => 'not_active'];
            }

            $pendingExists = BookingExtensionRequest::query()
                ->where('booking_id', $lockedBooking->getKey())
                ->where('status', 'pending')
                ->exists();

            if ($pendingExists) {
                return ['status' => 'pending_exists'];
            }

            $requestedEnd = substr($validated['requested_end_time'], 0, 5);
            $originalEnd = substr((string) $lockedBooking->end_time, 0, 5);
            $originalEndMinutes = $this->minutes($originalEnd, true);
            $requestedEndMinutes = $this->minutes($requestedEnd, true);

            if ($requestedEndMinutes <= $originalEndMinutes) {
                throw ValidationException::withMessages([
                    'requested_end_time' => 'The requested end time must be later than the current booking end time.',
                ]);
            }

            $extensionMinutes = $requestedEndMinutes - $originalEndMinutes;
            if ($extensionMinutes % 15 !== 0) {
                throw ValidationException::withMessages([
                    'requested_end_time' => 'Choose an end time in 15-minute increments.',
                ]);
            }

            $date = $lockedBooking->end_date
                ?? $lockedBooking->date
                ?? $lockedBooking->booking_date;
            $date = Carbon::parse($date)->startOfDay();

            if (! $date->isToday()) {
                return ['status' => 'not_extension_day'];
            }

            $settings = SystemSetting::current();

            $hours = FacilityOperatingHour::query()
                ->where('facility_id', $facility->getKey())
                ->where('day_of_week', $date->dayOfWeek)
                ->first();

            if ($hours?->is_closed) {
                return ['status' => 'facility_closed'];
            }

            $openingTime = $hours
                ? substr((string) $hours->opens_at, 0, 5)
                : substr((string) $settings->opening_time, 0, 5);
            $closingTime = $hours
                ? substr((string) $hours->closes_at, 0, 5)
                : substr((string) $settings->closing_time, 0, 5);

            $openingMinutes = $this->minutes($openingTime);
            $closingMinutes = $this->minutes($closingTime, true);
            $startMinutes = $this->minutes(substr((string) $lockedBooking->start_time, 0, 5));
            $maximumHours = max(1, (int) ($settings->max_booking_duration ?? 4));

            if (
                $requestedEndMinutes > $closingMinutes
                || $requestedEndMinutes > 1440
                || $startMinutes < $openingMinutes
                || ($requestedEndMinutes - $startMinutes) > ($maximumHours * 60)
            ) {
                return ['status' => 'outside_hours'];
            }

            $buffer = max(0, (int) ($settings->cleanup_buffer_minutes ?? 30));
            if ($this->hasExtensionConflict(
                (string) $facility->getKey(),
                $date->toDateString(),
                $originalEndMinutes,
                $requestedEndMinutes,
                $buffer,
                (string) $lockedBooking->getKey()
            )) {
                return ['status' => 'conflict'];
            }

            $extension = BookingExtensionRequest::create([
                'booking_id' => $lockedBooking->getKey(),
                'requested_by' => $user->getKey(),
                'original_end_time' => $originalEnd,
                'requested_end_time' => $requestedEnd,
                'requested_minutes' => $extensionMinutes,
                'reason' => trim($validated['reason']),
                'status' => 'pending',
            ]);

            return [
                'status' => 'created',
                'extension' => $extension,
                'facility_name' => $facility->name,
                'facility_id' => $facility->getKey(),
            ];
        });

        if ($result['status'] !== 'created') {
            $messages = [
                'facility_unavailable' => 'This facility is currently unavailable. An extension cannot be requested.',
                'not_active' => 'An extension can only be requested for an approved booking that is checked in and not checked out.',
                'not_extension_day' => 'An extension can only be requested on the final date of a multi-day booking.',
                'pending_exists' => 'There is already a pending extension request for this booking.',
                'facility_closed' => 'The facility is marked closed for this day.',
                'outside_hours' => 'The requested end time exceeds facility hours or the maximum allowed booking duration.',
                'conflict' => 'The requested extension overlaps another reservation or its cleanup buffer.',
            ];

            return back()->withErrors([
                'requested_end_time' => $messages[$result['status']] ?? 'The extension request could not be submitted.',
            ]);
        }

        $facility = Facility::query()->findOrFail($result['facility_id']);

        $facility->facilityAdmins()
            ->where('is_active', true)
            ->get()
            ->each(fn (User $admin) => $admin->notify(
                new BookingOperationsNotification(
                    sprintf(
                        '%s requested an overtime extension at %s until %s. Reason: %s',
                        $user->name,
                        $result['facility_name'],
                        $result['extension']->requested_end_time,
                        $result['extension']->reason
                    ),
                    (string) $booking->getKey(),
                    'Overtime Extension Request'
                )
            ));

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Extension request submitted. The assigned facility administrator must approve it before the booking end time changes.',
        ]);
    }

    public function approve(Request $request, BookingExtensionRequest $extensionRequest)
    {
        $user = $request->user();
        $this->authorizeFacilityAccess($user, $extensionRequest->booking->facility_id);

        $result = DB::transaction(function () use ($extensionRequest, $user) {
            $bookingReference = Booking::query()->findOrFail($extensionRequest->booking_id);

            $facility = Facility::query()
                ->whereKey($bookingReference->facility_id)
                ->lockForUpdate()
                ->firstOrFail();

            $booking = Booking::query()
                ->whereKey($bookingReference->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $lockedRequest = BookingExtensionRequest::query()
                ->whereKey($extensionRequest->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedRequest->status !== 'pending') {
                return ['status' => 'already_reviewed'];
            }

            if (! $facility->is_available) {
                return ['status' => 'facility_unavailable'];
            }

            if (
                $booking->status !== 'approved'
                || $booking->checked_in_at === null
                || $booking->checked_out_at !== null
            ) {
                return ['status' => 'booking_not_active'];
            }

            $currentEnd = substr((string) $booking->end_time, 0, 5);
            if ($currentEnd !== substr((string) $lockedRequest->original_end_time, 0, 5)) {
                return ['status' => 'booking_changed'];
            }

            $date = Carbon::parse($booking->end_date ?? $booking->date ?? $booking->booking_date)->startOfDay();

            if (! $date->isToday()) {
                return ['status' => 'extension_window_closed'];
            }

            $settings = SystemSetting::current();
            $hours = FacilityOperatingHour::query()
                ->where('facility_id', $facility->getKey())
                ->where('day_of_week', $date->dayOfWeek)
                ->first();

            if ($hours?->is_closed) {
                return ['status' => 'facility_closed'];
            }

            $openingTime = $hours
                ? substr((string) $hours->opens_at, 0, 5)
                : substr((string) $settings->opening_time, 0, 5);
            $closingTime = $hours
                ? substr((string) $hours->closes_at, 0, 5)
                : substr((string) $settings->closing_time, 0, 5);
            $closingMinutes = $this->minutes($closingTime, true);
            $startMinutes = $this->minutes(substr((string) $booking->start_time, 0, 5));
            $requestedEnd = substr((string) $lockedRequest->requested_end_time, 0, 5);
            $requestedEndMinutes = $this->minutes($requestedEnd, true);
            $maximumHours = max(1, (int) ($settings->max_booking_duration ?? 4));

            if (
                $requestedEndMinutes > $closingMinutes
                || $requestedEndMinutes > 1440
                || $startMinutes < $this->minutes($openingTime)
                || ($requestedEndMinutes - $startMinutes) > ($maximumHours * 60)
            ) {
                return ['status' => 'outside_hours'];
            }

            $buffer = max(0, (int) ($settings->cleanup_buffer_minutes ?? 30));
            $originalEndMinutes = $this->minutes($currentEnd, true);

            if ($this->hasExtensionConflict(
                (string) $facility->getKey(),
                $date->toDateString(),
                $originalEndMinutes,
                $requestedEndMinutes,
                $buffer,
                (string) $booking->getKey()
            )) {
                return ['status' => 'conflict'];
            }

            $booking->update(['end_time' => $requestedEnd]);

            $lockedRequest->update([
                'status' => 'approved',
                'reviewed_by' => $user->getKey(),
                'reviewed_at' => now(),
                'decision_reason' => null,
            ]);

            ActivityLog::create([
                'booking_id' => $booking->getKey(),
                'action' => 'overtime_extension_approved',
                'performed_by' => (string) $user->getKey(),
                'reason' => sprintf(
                    'Approved extension from %s to %s (+%d minutes).',
                    $currentEnd,
                    $requestedEnd,
                    (int) $lockedRequest->requested_minutes
                ),
            ]);

            return [
                'status' => 'approved',
                'booking_id' => $booking->getKey(),
                'owner_id' => $booking->user_id,
                'facility_name' => $facility->name,
                'end_time' => $requestedEnd,
            ];
        });

        if ($result['status'] !== 'approved') {
            $messages = [
                'already_reviewed' => 'This extension request has already been reviewed.',
                'facility_unavailable' => 'The facility is unavailable. Restore it before approving this extension.',
                'booking_not_active' => 'The booking is no longer checked in and active.',
                'booking_changed' => 'The booking end time changed after the request. Submit a new extension request.',
                'extension_window_closed' => 'The booking extension window has ended. The request can no longer be approved.'
                'facility_closed' => 'The facility is closed on the booking date.',
                'outside_hours' => 'The requested end time is outside facility hours or exceeds the maximum booking duration.',
                'conflict' => 'Another active booking now overlaps the requested extension.',
            ];

            return back()->with('toast', [
                'type' => 'error',
                'message' => $messages[$result['status']] ?? 'The extension request could not be approved.',
            ]);
        }

        if ($result['owner_id']) {
            User::find($result['owner_id'])?->notify(
                new BookingOperationsNotification(
                    sprintf(
                        'Your overtime extension at %s has been approved. Your booking now ends at %s.',
                        $result['facility_name'],
                        $result['end_time']
                    ),
                    (string) $result['booking_id'],
                    'Overtime Extension Approved'
                )
            );
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Extension approved. The booking end time has been updated.',
        ]);
    }

    public function decline(Request $request, BookingExtensionRequest $extensionRequest)
    {
        $user = $request->user();
        $this->authorizeFacilityAccess($user, $extensionRequest->booking->facility_id);

        $validated = $request->validate([
            'decision_reason' => ['required', 'string', 'min:3', 'max:1000'],
        ]);

        $result = DB::transaction(function () use ($extensionRequest, $user, $validated) {
            $lockedRequest = BookingExtensionRequest::query()
                ->whereKey($extensionRequest->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedRequest->status !== 'pending') {
                return ['status' => 'already_reviewed'];
            }

            $lockedRequest->update([
                'status' => 'declined',
                'reviewed_by' => $user->getKey(),
                'reviewed_at' => now(),
                'decision_reason' => trim($validated['decision_reason']),
            ]);

            return [
                'status' => 'declined',
                'booking_id' => $lockedRequest->booking_id,
                'owner_id' => $lockedRequest->booking->user_id,
                'facility_name' => $lockedRequest->booking->facility?->name ?? 'the facility',
                'requested_end_time' => $lockedRequest->requested_end_time,
            ];
        });

        if ($result['status'] !== 'declined') {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'This extension request has already been reviewed.',
            ]);
        }

        if ($result['owner_id']) {
            User::find($result['owner_id'])?->notify(
                new BookingOperationsNotification(
                    sprintf(
                        'Your overtime extension request at %s until %s was declined. Reason: %s',
                        $result['facility_name'],
                        substr((string) $result['requested_end_time'], 0, 5),
                        trim($validated['decision_reason'])
                    ),
                    (string) $result['booking_id'],
                    'Overtime Extension Declined'
                )
            );
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Extension request declined.',
        ]);
    }

    private function authorizeFacilityAccess(?User $user, string $facilityId): void
    {
        abort_unless($user !== null, 401);

        if ($user->role === 'super_admin') {
            return;
        }

        abort_unless($user->role === 'facility_admin', 403);
        abort_unless(
            Facility::query()->whereKey($facilityId)
                ->whereHas('facilityAdmins', fn ($query) => $query->where('users.id', $user->getKey()))
                ->exists(),
            403,
            'You can only review extension requests for facilities assigned to you.'
        );
    }

    private function hasExtensionConflict(
        string $facilityId,
        string $date,
        int $extensionStart,
        int $extensionEnd,
        int $buffer,
        string $excludeBookingId
    ): bool {
        $existingBookings = Booking::query()
            ->where('facility_id', $facilityId)
            ->where('id', '!=', $excludeBookingId)
            ->whereIn('status', ['pending', 'approved'])
            ->whereRaw('COALESCE(date, booking_date) <= ?', [$date])
            ->whereRaw('COALESCE(end_date, date, booking_date) >= ?', [$date])
            ->get(['start_time', 'end_time']);

        foreach ($existingBookings as $existing) {
            $existingStart = $this->minutes(substr((string) $existing->start_time, 0, 5)) - $buffer;
            $existingEnd = $this->minutes(substr((string) $existing->end_time, 0, 5), true) + $buffer;

            if ($extensionStart < $existingEnd && $extensionEnd > $existingStart) {
                return true;
            }
        }

        return false;
    }

    private function minutes(string $time, bool $allowMidnight = false): int
    {
        $normalized = substr($time, 0, 5);
        if ($allowMidnight && $normalized === '00:00') {
            return 1440;
        }

        [$hour, $minute] = array_map('intval', explode(':', $normalized));

        return ($hour * 60) + $minute;
    }
}
