<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\SystemSetting;
use App\Models\User;
use App\Notifications\BookingOperationsNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BookingController extends Controller
{
    /**
     * Get the configured maximum booking duration in hours.
     */
    private function getMaxBookingSpanHours($settings): float
    {
        $possibleColumns = [
            'max_booking_span_hours',
            'max_booking_hours',
            'max_booking_duration_hours',
            'max_duration_hours',
        ];

        foreach ($possibleColumns as $column) {
            $value = $settings->getAttribute($column);

            if ($value !== null && is_numeric($value)) {
                return max(0, (float) $value);
            }
        }

        return 4.0;
    }

    /**
     * Enforce the booking hours and 15-minute interval used by the booking forms
     * and Schedule Grid. The closing time is available as an end time only.
     */
    private function validateOperatingHours(string $startTime, string $endTime, $settings): void
    {
        $openingTime = substr((string) ($settings->opening_time ?? '08:00'), 0, 5);
        $closingTime = substr((string) ($settings->closing_time ?? '00:00'), 0, 5);
        $openingMinutes = $this->timeToMinutes($openingTime);
        $closingMinutes = $closingTime === '00:00' ? 1440 : $this->timeToMinutes($closingTime);
        $startMinutes = $this->timeToMinutes($startTime);
        $endMinutes = $endTime === '00:00' ? 1440 : $this->timeToMinutes($endTime);

        if ($startMinutes < $openingMinutes || $startMinutes >= $closingMinutes) {
            throw ValidationException::withMessages([
                'start_time' => 'The selected start time is outside the configured operating hours.',
            ]);
        }

        if ($endMinutes > $closingMinutes || $endMinutes <= $startMinutes) {
            throw ValidationException::withMessages([
                'end_time' => 'The booking must end after its start time and no later than the configured closing time.',
            ]);
        }

        $this->validateTimeIntervals($startTime, $endTime);
    }

    private function validateTimeIntervals(string $startTime, string $endTime): void
    {
        foreach (['start_time' => $startTime, 'end_time' => $endTime] as $field => $time) {
            if (($this->timeToMinutes($time) % 15) !== 0) {
                throw ValidationException::withMessages([
                    $field => 'Please select a valid 15-minute time interval.',
                ]);
            }
        }
    }

    /**
     * Prefer a facility's day-specific schedule. Fall back to the existing
     * Super Admin global hours until day-specific hours have been configured.
     */
    private function validateFacilityOperatingHours(
        string $date,
        string $startTime,
        string $endTime,
        Facility $facility,
        $settings
    ): void {
        $this->validateTimeIntervals($startTime, $endTime);

        $bookingDate = Carbon::createFromFormat('!Y-m-d', $date);
        $schedule = $facility->operatingHours()
            ->where('day_of_week', $bookingDate->dayOfWeek)
            ->first();

        if (!$schedule) {
            $this->validateOperatingHours($startTime, $endTime, $settings);

            return;
        }

        if ($schedule->is_closed) {
            throw ValidationException::withMessages([
                'date' => 'This facility is closed on the selected day.',
            ]);
        }

        $openingTime = substr((string) $schedule->opens_at, 0, 5);
        $closingTime = substr((string) $schedule->closes_at, 0, 5);
        $openingMinutes = $this->timeToMinutes($openingTime);
        $closingMinutes = $closingTime === '00:00'
            ? 1440
            : $this->timeToMinutes($closingTime);
        $startMinutes = $this->timeToMinutes($startTime);
        $endMinutes = $endTime === '00:00'
            ? 1440
            : $this->timeToMinutes($endTime);

        if ($startMinutes < $openingMinutes || $startMinutes >= $closingMinutes) {
            throw ValidationException::withMessages([
                'start_time' => "The selected start time is outside {$facility->name}'s operating hours for this day.",
            ]);
        }

        if ($endMinutes > $closingMinutes || $endMinutes <= $startMinutes) {
            throw ValidationException::withMessages([
                'end_time' => "The booking must end within {$facility->name}'s operating hours for this day.",
            ]);
        }
    }

    private function timeToMinutes(string $time): int
    {
        [$hour, $minute] = array_map('intval', explode(':', $time));
        return ($hour * 60) + $minute;
    }

    /**
     * Validate that the end time follows the start time and
     * the duration is within the configured limit.
     */
    private function validateBookingSpan(
        string $startTime,
        string $endTime,
        $settings
    ): void {
        $start = Carbon::createFromFormat('!H:i', $startTime);
        $end = Carbon::createFromFormat('!H:i', $endTime);

        if (!$start || !$end) {
            throw ValidationException::withMessages([
                'end_time' => 'Please provide a valid end time.',
            ]);
        }

        if ($end->lte($start) && $endTime === '00:00') {
            $end->addDay();
        }

        if (!$end->gt($start)) {
            throw ValidationException::withMessages([
                'end_time' => 'The end time must be later than the start time.',
            ]);
        }

        $durationMinutes = $start->diffInMinutes($end);
        $maxHours = $this->getMaxBookingSpanHours($settings);
        $maxMinutes = $maxHours * 60;

        if ($durationMinutes > $maxMinutes) {
            $formattedMax = rtrim(
                rtrim(number_format($maxHours, 2, '.', ''), '0'),
                '.'
            );

            throw ValidationException::withMessages([
                'end_time' => "A booking cannot exceed {$formattedMax} hours. Please select an earlier end time.",
            ]);
        }
    }

    /**
     * Reject approval actions from users who are not administrators.
     * Facility admins must also be assigned to the booking's facility.
     */
    private function authorizeBookingAdministration(Booking $booking): void
    {
        $user = Auth::user();

        abort_unless($user, 401);

        if ($user->role === 'super_admin') {
            return;
        }

        abort_unless($user->role === 'facility_admin', 403);

        $facility = $booking->facility;

        abort_unless($facility, 404);

        $isAssigned = $facility->facilityAdmins()
            ->where('users.id', $user->id)
            ->exists();

        abort_unless($isAssigned, 403);
    }

    /**
     * Check booking time conflicts.
     *
     * Call this while the corresponding facility row is locked
     * inside a database transaction.
     */
    private function hasBookingConflict(
        string $facilityId,
        string $date,
        string $startTime,
        string $endTime,
        int $bufferMinutes,
        ?string $excludeBookingId = null
    ): bool {
        $query = Booking::query()
            ->where('facility_id', $facilityId)
            ->where(function ($query) use ($date) {
                $query->whereDate('date', $date)
                    ->orWhereDate('booking_date', $date);
            })
            ->whereIn('status', ['pending', 'approved']);

        if ($excludeBookingId !== null) {
            $query->where('id', '!=', $excludeBookingId);
        }

        $existingBookings = $query->get([
            'start_time',
            'end_time',
        ]);

        $requestedStart = Carbon::createFromFormat('!H:i', $startTime);
        $requestedEnd = Carbon::createFromFormat('!H:i', $endTime);
        if ($endTime === '00:00') {
            $requestedEnd->addDay();
        }

        foreach ($existingBookings as $existing) {
            $existingStart = Carbon::parse($existing->start_time);
            $existingEnd = Carbon::parse($existing->end_time);
            if (substr((string) $existing->end_time, 0, 5) === '00:00') {
                $existingEnd->addDay();
            }

            $bufferedStart = $existingStart->copy()
                ->subMinutes($bufferMinutes);

            $bufferedEnd = $existingEnd->copy()
                ->addMinutes($bufferMinutes);

            if (
                $requestedStart->lt($bufferedEnd) &&
                $requestedEnd->gt($bufferedStart)
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Return the standard time-slot conflict message.
     */
    private function conflictMessage(int $bufferMinutes): string
    {
        return $bufferMinutes > 0
            ? "Time slot overlaps with an existing booking ({$bufferMinutes}-minute buffer included)."
            : 'Time slot overlaps with an existing booking.';
    }

    /**
     * Display the authenticated user's bookings.
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => [
                'nullable',
                'string',
                Rule::in([
                    'pending',
                    'approved',
                    'declined',
                    'cancelled',
                ]),
            ],
            'booking' => ['nullable', 'string', 'max:255'],
        ]);

        $search = $validated['search'] ?? null;
        $status = $validated['status'] ?? null;
        $openBookingId = $validated['booking'] ?? null;

        $query = Booking::with(['facility', 'extensionRequests.requester', 'extensionRequests.reviewer'])
            ->where('user_id', Auth::id());

        if ($status) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->whereHas('facility', function ($facilityQuery) use ($search) {
                $facilityQuery->where('name', 'like', "%{$search}%");
            });
        }

        $bookings = $query->orderByDesc('date')->get();

        $today = Carbon::today();

        $upcomingBookings = $bookings
            ->filter(fn ($booking) =>
                in_array($booking->status, ['pending', 'approved'], true) &&
                Carbon::parse($booking->date)->gte($today)
            )
            ->values();

        $historyBookings = $bookings
            ->reject(fn ($booking) =>
                $upcomingBookings->contains('id', $booking->id)
            )
            ->values();

        $openBooking = null;

        if ($openBookingId) {
            $openBooking = Booking::with(['facility', 'extensionRequests.requester', 'extensionRequests.reviewer'])
                ->where('user_id', Auth::id())
                ->find($openBookingId);
        }

        $activityLogs = [];

        if (class_exists(\App\Models\ActivityLog::class)) {
            $activityLogs = \App\Models\ActivityLog::whereIn(
                'booking_id',
                $bookings->pluck('id')
            )
                ->orderByDesc('created_at')
                ->get();
        }

        return Inertia::render('MyBookings', [
            'bookings' => $bookings,
            'upcomingBookings' => $upcomingBookings,
            'historyBookings' => $historyBookings,
            'filters' => $request->only(['search', 'status']),
            'openBooking' => $openBooking,
            'activityLogs' => $activityLogs,
        ]);
    }

    /**
     * Display a receipt for an approved booking owned by the user.
     */
    public function receipt(string $id)
    {
        $booking = Booking::with('facility')
            ->where('user_id', Auth::id())
            ->findOrFail($id);

        abort_unless(
            $booking->status === 'approved',
            403,
            'Receipts are available only for approved bookings.'
        );

        return Inertia::render('Receipt', [
            'booking' => $booking,
        ]);
    }

    /**
     * Update a pending booking owned by the authenticated user.
     */
    public function update(Request $request, string $id)
    {
        $booking = Booking::with(['facility', 'activityPlan'])
            ->where('user_id', Auth::id())
            ->findOrFail($id);

        if ($booking->status !== 'pending') {
            return back()->withErrors([
                'status' => 'Only pending bookings can be edited.',
            ]);
        }

        $validated = $request->validate([
            'date' => [
                'required',
                'date_format:Y-m-d',
                'after_or_equal:today',
            ],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i'],
            'attendees' => ['required', 'integer', 'min:1'],
            'needs_manpower' => ['required', 'boolean'],
            'notes' => ['nullable', 'string', 'max:10000'],
        ]);

        if ($booking->activityPlan) {
            $planStart = Carbon::parse($booking->activityPlan->start_date)->toDateString();
            $planEnd = Carbon::parse($booking->activityPlan->end_date)->toDateString();

            if ($validated['date'] < $planStart || $validated['date'] > $planEnd) {
                throw ValidationException::withMessages([
                    'date' => 'An individual session must remain within its activity plan date range.',
                ]);
            }
        }

        $facility = $booking->facility;

        if (!$facility) {
            return back()->withErrors([
                'facility' => 'The facility associated with this booking could not be found.',
            ]);
        }

        if (! $facility->is_available) {
            throw ValidationException::withMessages([
                'facility' => 'This facility is temporarily unavailable. Contact its administrator before changing this booking.',
            ]);
        }

        if (
            $facility->capacity !== null &&
            (int) $validated['attendees'] > (int) $facility->capacity
        ) {
            return back()->withErrors([
                'attendees' => "This facility allows a maximum of {$facility->capacity} attendees.",
            ]);
        }

        $needsManpower = (bool) $validated['needs_manpower'];

        if ($needsManpower && !$facility->allowTdevsManpower) {
            throw ValidationException::withMessages([
                'needs_manpower' => 'TDEVS manpower is not available for this facility.',
            ]);
        }

        $settings = SystemSetting::current();
        $bookingDate = Carbon::createFromFormat('!Y-m-d', $validated['date']);
        $today = Carbon::today();

        $consentRequired = (bool) $settings->require_consent_letter
            || $facility->requirement === 'CONSENT_REQUIRED'
            || (
                (bool) $facility->requiresWeekendConsent
                && $bookingDate->isWeekend()
            );

        if ($consentRequired && ! $booking->consent_file_uploaded) {
            throw ValidationException::withMessages([
                'consent_letter' => 'A consent letter is required for the selected date and facility. Please create a new booking and attach the required document.',
            ]);
        }

        $leadTimeDays = max(0, (int) ($facility->booking_lead_time_days ?? 3));
        if ($consentRequired && $bookingDate->lt($today->copy()->addDays($leadTimeDays))) {
            throw ValidationException::withMessages([
                'date' => "This facility requires at least {$leadTimeDays} days advance notice for consent-required bookings.",
            ]);
        }

        $maxDays = max(0, (int) ($settings->max_advance_days ?? 30));

        if ($bookingDate->gt($today->copy()->addDays($maxDays))) {
            return back()->withErrors([
                'date' => "You can only book facilities up to {$maxDays} days in advance.",
            ]);
        }

        $this->validateBookingSpan(
            $validated['start_time'],
            $validated['end_time'],
            $settings
        );

        $this->validateFacilityOperatingHours(
            $validated['date'],
            $validated['start_time'],
            $validated['end_time'],
            $facility,
            $settings
        );

        $buffer = max(
            0,
            (int) ($settings->cleanup_buffer_minutes ?? 30)
        );

        DB::transaction(function () use (
            $booking,
            $facility,
            $validated,
            $needsManpower,
            $buffer,
            $settings
        ) {
            $lockedFacility = Facility::whereKey($facility->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedFacility->is_available) {
                throw ValidationException::withMessages([
                    'facility' => 'This facility became unavailable before the booking could be updated.',
                ]);
            }

            $this->validateFacilityOperatingHours(
                $validated['date'],
                $validated['start_time'],
                $validated['end_time'],
                $lockedFacility,
                $settings
            );

            $lockedBooking = Booking::whereKey($booking->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $lockedBooking->user_id != Auth::id() ||
                $lockedBooking->status !== 'pending'
            ) {
                throw ValidationException::withMessages([
                    'status' => 'This booking can no longer be edited.',
                ]);
            }

            $conflict = $this->hasBookingConflict(
                (string) $lockedBooking->facility_id,
                $validated['date'],
                $validated['start_time'],
                $validated['end_time'],
                $buffer,
                (string) $lockedBooking->id
            );

            if ($conflict) {
                throw ValidationException::withMessages([
                    'start_time' => $this->conflictMessage($buffer),
                ]);
            }

            $lockedBooking->update([
                'date' => $validated['date'],
                'booking_date' => $validated['date'],
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'attendees' => (int) $validated['attendees'],
                'needs_manpower' => $needsManpower,
                'notes' => $validated['notes'] ?? null,
            ]);
        });

        return back()->with('success', 'Booking updated successfully.');
    }

    /**
     * Cancel a booking owned by the authenticated user.
     *
     * The conditional update ensures the status changes only when
     * the booking is still pending or approved at update time.
     */
    public function cancel(Request $request, string $id)
    {
        $validated = $request->validate([
            'cancellation_reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $reason = trim($validated['cancellation_reason']);

        if (mb_strlen($reason) < 5) {
            throw ValidationException::withMessages([
                'cancellation_reason' => 'Please provide a cancellation reason of at least 5 characters.',
            ]);
        }

        $result = DB::transaction(function () use ($id, $reason) {
            $booking = Booking::query()
                ->whereKey($id)
                ->where('user_id', Auth::id())
                ->lockForUpdate()
                ->firstOrFail();

            if (! in_array($booking->status, ['pending', 'approved'], true)) {
                return ['status' => 'not_cancellable'];
            }

            if ($booking->checked_in_at !== null || $booking->checked_out_at !== null) {
                return ['status' => 'already_started'];
            }

            $booking->update([
                'status' => 'cancelled',
                'cancellation_reason' => $reason,
            ]);

            return [
                'status' => 'cancelled',
                'booking_id' => $booking->getKey(),
            ];
        });

        if ($result['status'] === 'already_started') {
            return back()->withErrors([
                'status' => 'A booking cannot be cancelled after check-in has started.',
            ]);
        }

        if ($result['status'] !== 'cancelled') {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'This booking can no longer be cancelled.',
            ]);
        }

        // Refresh the parent recurring plan after an individual session is cancelled.
        $cancelledBooking = Booking::with(['facility', 'activityPlan'])->findOrFail($result['booking_id']);
        $cancelledBooking->activityPlan?->syncStatus();

        // Notify after the cancellation transaction commits. Facility admins
        // only receive notices for facilities assigned to them.
        $facilityAdmins = $cancelledBooking->facility
            ? $cancelledBooking->facility->facilityAdmins()
                ->where('is_active', true)
                ->get()
            : collect();

        $superAdmins = User::query()
            ->where('role', 'super_admin')
            ->where('is_active', true)
            ->get();

        $message = sprintf(
            '%s cancelled the booking for %s on %s (%s–%s). Reason: %s',
            Auth::user()->name,
            $cancelledBooking->facility?->name ?? 'a facility',
            ($cancelledBooking->date ?? $cancelledBooking->booking_date)?->format('M d, Y') ?? 'an unspecified date',
            $cancelledBooking->start_time,
            $cancelledBooking->end_time,
            $reason
        );

        $facilityAdmins
            ->merge($superAdmins)
            ->unique('id')
            ->each(fn (User $admin) => $admin->notify(
                new BookingOperationsNotification(
                    $message,
                    (string) $cancelledBooking->getKey(),
                    'Booking Cancelled'
                )
            ));

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Booking cancelled. The responsible administrators have been notified and the time slot is available again.',
        ]);
    }

    /**
     * Create a new facility booking.
     */
    public function store(Request $request)
    {
        $settings = SystemSetting::current();

        $validated = $request->validate([
            'facility_id' => ['required', 'string', 'exists:facilities,id'],
            'date' => [
                'required',
                'date_format:Y-m-d',
                'after_or_equal:today',
            ],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:10000'],
            'attendees' => ['nullable', 'integer', 'min:1'],
            'guest_name' => ['nullable', 'string', 'max:255'],
            'guest_email' => ['nullable', 'email', 'max:255'],
            'guest_phone' => ['nullable', 'string', 'max:50'],
            'needs_manpower' => ['nullable', 'boolean'],
        ]);

        $facility = Facility::findOrFail($validated['facility_id']);

        if (! $facility->is_available) {
            throw ValidationException::withMessages([
                'facility_id' => 'This facility is temporarily unavailable and cannot accept new bookings.',
            ]);
        }

        $bookingDate = Carbon::createFromFormat('!Y-m-d', $validated['date']);

        $isConsentRequired =
            (bool) $settings->require_consent_letter
            || $facility->requirement === 'CONSENT_REQUIRED'
            || (
                (bool) $facility->requiresWeekendConsent
                && $bookingDate->isWeekend()
            );

        $leadTimeDays = max(0, (int) ($facility->booking_lead_time_days ?? 3));
        if (
            $isConsentRequired &&
            $bookingDate->lt(Carbon::today()->addDays($leadTimeDays))
        ) {
            throw ValidationException::withMessages([
                'date' => "This facility requires at least {$leadTimeDays} days advance notice for consent-required bookings.",
            ]);
        }

        $request->validate([
            'consent_letter' => $isConsentRequired
                ? ['required', 'file', 'mimes:pdf,doc,docx', 'max:5120']
                : ['nullable', 'file', 'mimes:pdf,doc,docx', 'max:5120'],
        ]);

        $attendeeCount = (int) ($validated['attendees'] ?? 1);

        if (
            $facility->capacity !== null &&
            $attendeeCount > (int) $facility->capacity
        ) {
            return back()->withErrors([
                'attendees' => "This facility allows a maximum of {$facility->capacity} attendees.",
            ]);
        }

        $needsManpower = (bool) ($validated['needs_manpower'] ?? false);

        if ($needsManpower && !$facility->allowTdevsManpower) {
            throw ValidationException::withMessages([
                'needs_manpower' => 'TDEVS manpower is not available for this facility.',
            ]);
        }

        $today = Carbon::today();
        $maxDays = max(0, (int) ($settings->max_advance_days ?? 30));

        if ($bookingDate->gt($today->copy()->addDays($maxDays))) {
            return back()->withErrors([
                'date' => "You can only book facilities up to {$maxDays} days in advance.",
            ]);
        }

        $this->validateBookingSpan(
            $validated['start_time'],
            $validated['end_time'],
            $settings
        );

        $buffer = max(
            0,
            (int) ($settings->cleanup_buffer_minutes ?? 30)
        );

        $isSuperAdmin = Auth::user()->role === 'super_admin';
        $approvalScope = $settings->auto_approve_scope ?? 'disabled';

        $autoApprove = $approvalScope === 'everyone'
            || (
                $approvalScope === 'superadmin_only'
                && $isSuperAdmin
            );

        $path = null;
        $originalName = null;
        $booking = null;

        try {
            if ($request->hasFile('consent_letter')) {
                $file = $request->file('consent_letter');
                $extension = strtolower($file->getClientOriginalExtension());

                $path = $file->storeAs(
                    'consent-letters',
                    bin2hex(random_bytes(24)) . '.' . $extension,
                    'tigris'
                );

                $originalName = basename($file->getClientOriginalName());
            }

            $booking = DB::transaction(function () use (
                $facility,
                $validated,
                $attendeeCount,
                $needsManpower,
                $path,
                $originalName,
                $autoApprove,
                $isSuperAdmin,
                $buffer,
                $settings
            ) {
                $lockedFacility = Facility::whereKey($facility->getKey())
                    ->lockForUpdate()
                    ->firstOrFail();

                if (! $lockedFacility->is_available) {
                    throw ValidationException::withMessages([
                        'facility_id' => 'This facility became unavailable before the booking could be saved.',
                    ]);
                }

                $this->validateFacilityOperatingHours(
                    $validated['date'],
                    $validated['start_time'],
                    $validated['end_time'],
                    $lockedFacility,
                    $settings
                );

                $conflict = $this->hasBookingConflict(
                    (string) $facility->getKey(),
                    $validated['date'],
                    $validated['start_time'],
                    $validated['end_time'],
                    $buffer
                );

                if ($conflict) {
                    throw ValidationException::withMessages([
                        'start_time' => $this->conflictMessage($buffer),
                    ]);
                }

                return Booking::create([
                    'facility_id' => $facility->getKey(),
                    'user_id' => Auth::id(),
                    'guest_name' => $validated['guest_name'] ?? null,
                    'guest_email' => $validated['guest_email'] ?? null,
                    'guest_phone' => $validated['guest_phone'] ?? null,
                    'date' => $validated['date'],
                    'booking_date' => $validated['date'],
                    'start_time' => $validated['start_time'],
                    'end_time' => $validated['end_time'],
                    'notes' => $validated['notes'] ?? null,
                    'attendees' => $attendeeCount,
                    'needs_manpower' => $needsManpower,
                    'consent_file_uploaded' => $path !== null,
                    'consent_file_name' => $originalName,
                    'consent_file_path' => $path,
                    'status' => $autoApprove ? 'approved' : 'pending',
                    'approved_at' => $autoApprove ? now() : null,
                    'approved_by' => $autoApprove
                        ? (
                            $isSuperAdmin
                                ? 'Superadmin Instant Pass'
                                : 'System Auto-Approval Policies'
                        )
                        : null,
                ]);
            });
        } catch (\Throwable $e) {
            if ($path !== null) {
                try {
                    Storage::disk('tigris')->delete($path);
                } catch (\Throwable $cleanupException) {
                    Log::error('Failed to clean up consent upload.', [
                        'path' => $path,
                        'error' => $cleanupException->getMessage(),
                    ]);
                }
            }

            throw $e;
        }

        try {
            if (class_exists(\App\Events\BookingCreatedEvent::class)) {
                broadcast(
                    new \App\Events\BookingCreatedEvent($booking)
                )->toOthers();
            }
        } catch (\Throwable $e) {
            Log::warning('WebSocket broadcast failed.', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);
        }

        // Notify the active administrators assigned to this facility only after
        // the booking transaction has committed successfully.
        try {
            $createdBooking = Booking::with('facility')->findOrFail($booking->getKey());
            $requesterName = Auth::user()?->name
                ?? $createdBooking->guest_name
                ?? 'A guest';

            $adminMessage = sprintf(
                '%s submitted a %s booking request for %s on %s (%s–%s).',
                $requesterName,
                $createdBooking->status,
                $createdBooking->facility?->name ?? 'a facility',
                $createdBooking->date?->format('M d, Y')
                    ?? $createdBooking->booking_date?->format('M d, Y')
                    ?? 'an unspecified date',
                $createdBooking->start_time,
                $createdBooking->end_time
            );

            $createdBooking->facility?->facilityAdmins()
                ->where('is_active', true)
                ->get()
                ->each(fn (User $admin) => $admin->notify(
                    new BookingOperationsNotification(
                        $adminMessage,
                        (string) $createdBooking->getKey(),
                        'New Booking Request'
                    )
                ));

            // If system policy auto-approved the request, also inform its owner.
            if ($createdBooking->status === 'approved' && $createdBooking->user_id) {
                $requester = User::find($createdBooking->user_id);
                $requester?->notify(new BookingOperationsNotification(
                    sprintf(
                        'Your booking for %s on %s (%s–%s) was automatically approved.',
                        $createdBooking->facility?->name ?? 'the facility',
                        $createdBooking->date?->format('M d, Y')
                            ?? $createdBooking->booking_date?->format('M d, Y')
                            ?? 'the selected date',
                        $createdBooking->start_time,
                        $createdBooking->end_time
                    ),
                    (string) $createdBooking->getKey(),
                    'Booking Approved'
                ));
            }
        } catch (\Throwable $e) {
            Log::warning('Booking notification delivery failed.', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Booking submitted successfully.',
        ]);
    }

    /**
     * Approve a booking.
     *
     * Kept for compatibility, but explicitly enforces authorization
     * even if a route is accidentally registered without role middleware.
     */
    public function approve(Request $request, string $id)
    {
        $booking = Booking::with('facility')->findOrFail($id);

        $this->authorizeBookingAdministration($booking);

        $updated = DB::transaction(function () use ($booking) {
            $lockedBooking = Booking::whereKey($booking->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedBooking->status !== 'pending') {
                return false;
            }

            $lockedBooking->update([
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by' => Auth::user()->name ?? 'Administrator',
                'rejection_reason' => null,
            ]);

            if (class_exists(\App\Models\ActivityLog::class)) {
                \App\Models\ActivityLog::create([
                    'booking_id' => $lockedBooking->id,
                    'user_id' => Auth::id(),
                    'action' => 'approved',
                    'notes' => 'Booking was approved by ' .
                        (Auth::user()->name ?? 'Admin'),
                ]);
            }

            return true;
        });

        if (!$updated) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Only pending bookings can be approved.',
            ]);
        }

        $approvedBooking = Booking::with('facility')->findOrFail($booking->getKey());
        if ($approvedBooking->user_id) {
            User::find($approvedBooking->user_id)?->notify(
                new BookingOperationsNotification(
                    sprintf(
                        'Your booking for %s on %s (%s–%s) has been approved.',
                        $approvedBooking->facility?->name ?? 'the facility',
                        $approvedBooking->date?->format('M d, Y')
                            ?? $approvedBooking->booking_date?->format('M d, Y')
                            ?? 'the selected date',
                        $approvedBooking->start_time,
                        $approvedBooking->end_time
                    ),
                    (string) $approvedBooking->getKey(),
                    'Booking Approved'
                )
            );
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Booking approved successfully.',
        ]);
    }

    /**
     * Decline a booking.
     *
     * Kept for compatibility, but explicitly enforces authorization
     * even if a route is accidentally registered without role middleware.
     */
    public function decline(Request $request, string $id)
    {
        $booking = Booking::with('facility')->findOrFail($id);

        $this->authorizeBookingAdministration($booking);

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $reason = $validated['reason'] ?? 'Declined by administrator';

        $updated = DB::transaction(function () use ($booking, $reason) {
            $lockedBooking = Booking::whereKey($booking->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedBooking->status !== 'pending') {
                return false;
            }

            $lockedBooking->update([
                'status' => 'declined',
                'rejection_reason' => $reason,
            ]);

            if (class_exists(\App\Models\ActivityLog::class)) {
                \App\Models\ActivityLog::create([
                    'booking_id' => $lockedBooking->id,
                    'user_id' => Auth::id(),
                    'action' => 'declined',
                    'notes' => 'Booking was declined: ' . $reason,
                ]);
            }

            return true;
        });

        if (!$updated) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Only pending bookings can be declined.',
            ]);
        }

        $declinedBooking = Booking::with('facility')->findOrFail($booking->getKey());
        if ($declinedBooking->user_id) {
            User::find($declinedBooking->user_id)?->notify(
                new BookingOperationsNotification(
                    sprintf(
                        'Your booking for %s on %s (%s–%s) was declined. Reason: %s',
                        $declinedBooking->facility?->name ?? 'the facility',
                        $declinedBooking->date?->format('M d, Y')
                            ?? $declinedBooking->booking_date?->format('M d, Y')
                            ?? 'the selected date',
                        $declinedBooking->start_time,
                        $declinedBooking->end_time,
                        $declinedBooking->rejection_reason ?? $reason
                    ),
                    (string) $declinedBooking->getKey(),
                    'Booking Declined'
                )
            );
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Booking declined successfully.',
        ]);
    }
}