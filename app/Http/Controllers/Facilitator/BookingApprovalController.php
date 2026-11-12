<?php

namespace App\Http\Controllers\Facilitator;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\ActivityPlan;
use App\Models\Facility;
use App\Models\FacilityOperatingHour;
use App\Models\SystemSetting;
use App\Models\User;
use App\Notifications\BookingOperationsNotification;
use App\Support\FacilityScheduleAvailability;
use App\Support\SpecialFacilityBookingPolicy;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class BookingApprovalController extends Controller
{
    use AuthorizesRequests;

    /**
     * List all bookings for facilitator review (pending first, then history).
     * Accepts optional search and status query parameters for filtering.
     */
    public function index(Request $request): Response
    {
        // Expire overdue requests before building the review queues.
        Artisan::call('bookings:expire-pending');

        $search = $request->input('search');
        $status = $request->input('status');

        $query = $this->getVisibleBookingsQuery(Auth::user());
        $today = now()->toDateString();

        // Pending bookings that have not passed their scheduled date.
        $pendingQuery = (clone $query)
            ->where('status', 'pending')
            ->where(function ($q) use ($today) {
                $q->whereDate('end_date', '>=', $today)
                    ->orWhere(function ($legacy) use ($today) {
                        $legacy->whereNull('end_date')
                            ->where(function ($dates) use ($today) {
                                $dates->whereDate('booking_date', '>=', $today)
                                    ->orWhereDate('date', '>=', $today);
                            });
                    });
            });

        // Previously reviewed bookings.
        $reviewedQuery = (clone $query)
            ->whereIn('status', ['approved', 'declined', 'cancelled']);

        // Pending bookings whose scheduled date has passed.
        $pastUnapprovedQuery = (clone $query)
            ->where('status', 'pending')
            ->where(function ($q) use ($today) {
                $q->where(function ($dated) use ($today) {
                    $dated->whereNotNull('end_date')
                        ->whereDate('end_date', '<', $today);
                })->orWhere(function ($legacy) use ($today) {
                    $legacy->whereNull('end_date')
                        ->where(function ($dates) use ($today) {
                            $dates->whereDate('booking_date', '<', $today)
                                ->orWhereDate('date', '<', $today);
                        });
                });
            });

        // Apply the status filter to the appropriate dataset.
        if ($status) {
            if ($status === 'pending') {
                $reviewedQuery->where('id', 0);
                $pastUnapprovedQuery->where('id', 0);
            } elseif ($status === 'past_unapproved') {
                $pendingQuery->where('id', 0);
                $reviewedQuery->where('id', 0);
            } elseif (in_array($status, ['approved', 'declined', 'cancelled'], true)) {
                $pendingQuery->where('id', 0);
                $pastUnapprovedQuery->where('id', 0);
                $reviewedQuery->where('status', $status);
            }
        }

        // Apply search to all datasets.
        if ($search) {
            $searchFilter = function ($q) use ($search) {
                $q->whereHas('facility', function ($facilityQuery) use ($search) {
                    $facilityQuery->where('name', 'like', "%{$search}%");
                })
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'like', "%{$search}%");
                    })
                    ->orWhere('guest_name', 'like', "%{$search}%");
            };

            $pendingQuery->where($searchFilter);
            $reviewedQuery->where($searchFilter);
            $pastUnapprovedQuery->where($searchFilter);
        }

        $openBookingId = $request->input('booking');
        $openBooking = $openBookingId
            ? $this->getVisibleBookingsQuery(Auth::user())->whereKey($openBookingId)->first()
            : null;

        return Inertia::render('Facilitator/Bookings', [
            'pendingBookings' => $pendingQuery->orderBy('date')->get(),
            'reviewedBookings' => $reviewedQuery
                ->orderByDesc('updated_at')
                ->limit(20)
                ->get(),
            'pastUnapprovedBookings' => $pastUnapprovedQuery
                ->orderByDesc('date')
                ->get(),
            'openBooking' => $openBooking,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Get bookings visible to the specified user.
     */
    public function getVisibleBookingsQuery(?User $user = null)
    {
        $user ??= Auth::user();

        return Booking::query()
            ->forUser($user)
            ->with('facility', 'user', 'activityPlan');
    }

    /**
     * Check whether another active booking overlaps this slot, including
     * the configured cleanup buffer. The facility row must be locked first.
     */
    private function hasConflict(Booking $booking, int $bufferMinutes): bool
    {
        $candidateStartDate = Carbon::parse($booking->date ?? $booking->booking_date)->toDateString();
        $candidateEndDate = Carbon::parse($booking->end_date ?? $booking->date ?? $booking->booking_date)->toDateString();
        $candidateStart = Carbon::parse($booking->start_time);
        $candidateEnd = Carbon::parse($booking->end_time);
        if (substr((string) $booking->end_time, 0, 5) === '00:00') {
            $candidateEnd->addDay();
        }

        $existingBookings = Booking::query()
            ->where('facility_id', $booking->facility_id)
            ->where('id', '!=', $booking->getKey())
            ->whereIn('status', ['pending', 'approved'])
            ->whereRaw('COALESCE(date, booking_date) <= ?', [$candidateEndDate])
            ->whereRaw('COALESCE(end_date, date, booking_date) >= ?', [$candidateStartDate])
            ->get(['start_time', 'end_time']);

        foreach ($existingBookings as $existing) {
            $existingEnd = Carbon::parse($existing->end_time);
            if (substr((string) $existing->end_time, 0, 5) === '00:00') {
                $existingEnd->addDay();
            }

            $bufferedStart = Carbon::parse($existing->start_time)
                ->subMinutes($bufferMinutes);
            $bufferedEnd = $existingEnd->copy()->addMinutes($bufferMinutes);

            if (
                $candidateStart->lt($bufferedEnd) &&
                $candidateEnd->gt($bufferedStart)
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Approve a booking only if it is still pending.
     */
    public function approve(Booking $booking)
    {
        // Prevent a stale review screen from approving a request after its start time.
        Artisan::call('bookings:expire-pending');
        $booking->refresh();
        $user = Auth::user();

        $result = DB::transaction(function () use ($booking, $user) {
            // Match booking creation's lock order so concurrent requests
            // for the same facility serialize before checking availability.
            $lockedFacility = Facility::whereKey($booking->facility_id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedFacility->is_available) {
                return 'facility_unavailable';
            }

            $lockedBooking = Booking::query()
                ->whereKey($booking->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $this->authorize('approve', $lockedBooking);

            if ($lockedBooking->status === 'expired') {
                return 'expired';
            }

            if ($lockedBooking->status !== 'pending') {
                return 'already_reviewed';
            }

            $settings = SystemSetting::current();
            $bufferMinutes = max(
                0,
                (int) ($settings->cleanup_buffer_minutes ?? 30)
            );

            $bookingStartDate = Carbon::parse($lockedBooking->date ?? $lockedBooking->booking_date)->startOfDay();
            $bookingEndDate = Carbon::parse($lockedBooking->end_date ?? $lockedBooking->date ?? $lockedBooking->booking_date)->startOfDay();
            $startTime = Carbon::parse($lockedBooking->start_time);
            $endTime = Carbon::parse($lockedBooking->end_time);
            $startMinutes = ((int) $startTime->format('H') * 60) + (int) $startTime->format('i');
            $endMinutes = substr((string) $lockedBooking->end_time, 0, 5) === '00:00'
                ? 1440
                : ((int) $endTime->format('H') * 60) + (int) $endTime->format('i');

            if (! SpecialFacilityBookingPolicy::appliesTo($lockedFacility)) {
                for ($day = $bookingStartDate->copy(); $day->lte($bookingEndDate); $day->addDay()) {
                    $facilityHours = FacilityOperatingHour::query()
                    ->where('facility_id', $lockedFacility->getKey())
                    ->where('day_of_week', $day->dayOfWeek)
                    ->first();

                if ($facilityHours?->is_closed) {
                    return 'outside_hours';
                }

                $openingTime = substr(
                    (string) ($facilityHours?->opens_at ?? $settings->opening_time ?? '08:00'),
                    0,
                    5
                );
                $closingTime = substr(
                    (string) ($facilityHours?->closes_at ?? $settings->closing_time ?? '00:00'),
                    0,
                    5
                );

                $openingMinutes = ((int) substr($openingTime, 0, 2) * 60)
                    + (int) substr($openingTime, 3, 2);
                $closingMinutes = $closingTime === '00:00'
                    ? 1440
                    : ((int) substr($closingTime, 0, 2) * 60) + (int) substr($closingTime, 3, 2);

                    if (
                        $startMinutes < $openingMinutes
                        || $startMinutes >= $closingMinutes
                        || $endMinutes > $closingMinutes
                    ) {
                        return 'outside_hours';
                    }
                }
            }

            if (SpecialFacilityBookingPolicy::appliesTo($lockedFacility)) {
                $requester = $lockedBooking->user;
                $startDate = $bookingStartDate->toDateString();
                $endDate = $bookingEndDate->toDateString();
                $startClock = substr((string) $lockedBooking->start_time, 0, 5);
                $endClock = substr((string) $lockedBooking->end_time, 0, 5);
                $needsSisterSignature = SpecialFacilityBookingPolicy::requiresSisterSignature(
                    $lockedFacility, $requester, $startDate, $endDate, $startClock, $endClock
                );

                if (
                    ! $lockedBooking->consent_file_uploaded
                    || ! $lockedBooking->activity_plan_file_path
                    || (SpecialFacilityBookingPolicy::requiresSirReneSignature($lockedFacility) && ! $lockedBooking->sir_rene_signature_path)
                    || ($needsSisterSignature && ! $lockedBooking->sister_signature_path)
                ) {
                    return 'missing_documents';
                }
            }

            $scheduledClosure = FacilityScheduleAvailability::firstOverlappingClosure(
                $lockedFacility,
                $bookingStartDate->toDateString(),
                $bookingEndDate->toDateString(),
                substr((string) $lockedBooking->start_time, 0, 5),
                substr((string) $lockedBooking->end_time, 0, 5)
            );

            if ($scheduledClosure) {
                return 'scheduled_closure';
            }

            if ($this->hasConflict($lockedBooking, $bufferMinutes)) {
                return 'conflict';
            }

            $approvalUpdates = [
                'status' => 'approved',
                'approved_by' => $user->name,
                'approved_at' => now(),
            ];

            if (SpecialFacilityBookingPolicy::appliesTo($lockedFacility)) {
                $approvalUpdates = array_merge(
                    $approvalUpdates,
                    SpecialFacilityBookingPolicy::feeSnapshot(
                        $lockedFacility,
                        $bookingStartDate->toDateString(),
                        $bookingEndDate->toDateString(),
                        substr((string) $lockedBooking->start_time, 0, 5),
                        substr((string) $lockedBooking->end_time, 0, 5)
                    )
                );
            }

            $lockedBooking->update($approvalUpdates);

            return 'approved';
        });

        if ($result === 'expired') {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'This booking has expired because its scheduled start time has passed. It can no longer be approved.',
            ]);
        }

        if ($result === 'facility_unavailable') {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'This facility is currently unavailable. The booking cannot be approved until the facility is restored.',
            ]);
        }

        if ($result === 'scheduled_closure') {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'This booking overlaps a scheduled facility closure. Review the closure dates before approving it.',
            ]);
        }

        if ($result === 'missing_documents') {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'This booking is missing one or more required documents or signatures. Review the booking attachments before approving it.',
            ]);
        }

        if ($result === 'outside_hours') {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'This booking falls outside the facility operating hours. Update the booking or its operating hours before approving it.',
            ]);
        }

        if ($result === 'conflict') {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'This booking conflicts with another active booking for the facility. Resolve the schedule conflict before approving it.',
            ]);
        }

        if ($result !== 'approved') {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'This booking has already been reviewed.',
            ]);
        }

        $booking->refresh();
        $booking->activityPlan?->syncStatus();

        // Notify after the booking transaction commits.
        if ($booking->user_id) {
            $bookingUser = User::find($booking->user_id);

            if ($bookingUser) {
                $facilityName = $booking->facility?->name ?? 'A facility';

                $bookingUser->notify(
                    new BookingOperationsNotification(
                        "Your booking at {$facilityName} on {$booking->date} ({$booking->start_time}–{$booking->end_time}) has been approved.",
                        $booking->id
                    )
                );
            }
        }

        return redirect()->back()->with('success', 'Booking approved.');
    }

    /**
     * Decline a booking only if it is still pending.
     */
    public function decline(Request $request, Booking $booking)
    {
        // Prevent a stale review screen from declining a request after its start time.
        Artisan::call('bookings:expire-pending');
        $booking->refresh();

        if ($booking->status === 'expired') {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'This booking has expired because its scheduled start time has passed. It can no longer be declined.',
            ]);
        }

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'min:1'],
        ]);

        $user = Auth::user();

        $this->authorize('decline', $booking);

        // Atomically transition the booking from pending to declined.
        $updated = Booking::query()
            ->whereKey($booking->getKey())
            ->where('status', 'pending')
            ->update([
                'status' => 'declined',
                'approved_by' => $user->name,
                'approved_at' => now(),
                'decline_reason' => $validated['rejection_reason'],
                'rejection_reason' => $validated['rejection_reason'],
                'updated_at' => now(),
            ]);

        if ($updated !== 1) {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'This booking has already been reviewed.',
            ]);
        }

        $booking->refresh();
        $booking->activityPlan?->syncStatus();

        // Notify the user who made the booking.
        if ($booking->user_id) {
            $bookingUser = User::find($booking->user_id);

            if ($bookingUser) {
                $facilityName = $booking->facility?->name ?? 'A facility';

                $bookingUser->notify(
                    new BookingOperationsNotification(
                        "Your booking at {$facilityName} on {$booking->date} ({$booking->start_time}–{$booking->end_time}) has been declined. Reason: {$validated['rejection_reason']}",
                        $booking->id
                    )
                );
            }
        }

        return redirect()->back()->with('toast', [
            'type' => 'error',
            'message' => 'Booking has been declined.',
        ]);
    }

    /**
     * Delete a single past unapproved booking (manual cleanup).
     */
    public function destroy(Booking $booking)
    {
        $user = Auth::user();

        $this->authorize('delete', $booking);

        $today = now()->toDateString();

        $endDate = $booking->end_date ?? $booking->booking_date ?? $booking->date;
        $isPast = $endDate && $endDate->lt($today);

        if ($booking->status !== 'pending' || !$isPast) {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'Only past unapproved bookings can be deleted.',
            ]);
        }

        $activityPlan = $booking->activityPlan;
        $booking->delete();
        $activityPlan?->syncStatus();

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Past unapproved booking deleted.',
        ]);
    }

    /**
     * Delete all past unapproved bookings (manual bulk cleanup).
     */
    public function destroyAll()
    {
        $user = Auth::user();
        $today = now()->toDateString();

        $query = $this->getVisibleBookingsQuery($user)
            ->where('status', 'pending')
            ->where(function ($q) use ($today) {
                $q->where(function ($dated) use ($today) {
                    $dated->whereNotNull('end_date')
                        ->whereDate('end_date', '<', $today);
                })->orWhere(function ($legacy) use ($today) {
                    $legacy->whereNull('end_date')
                        ->where(function ($dates) use ($today) {
                            $dates->whereDate('booking_date', '<', $today)
                                ->orWhereDate('date', '<', $today);
                        });
                });
            });

        $pastBookings = (clone $query)->get(['id', 'activity_plan_id']);
        $count = $pastBookings->count();

        if ($count > 0) {
            (clone $query)->delete();

            ActivityPlan::query()
                ->whereIn('id', $pastBookings->pluck('activity_plan_id')->filter()->unique())
                ->get()
                ->each(fn (ActivityPlan $plan) => $plan->syncStatus());
        }

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Deleted {$count} past unapproved booking(s).",
        ]);
    }
}