<?php

namespace App\Http\Controllers\Facilitator;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Facility;
use App\Models\SystemSetting;
use App\Models\User;
use App\Notifications\BookingOperationsNotification;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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
        $search = $request->input('search');
        $status = $request->input('status');

        $query = $this->getVisibleBookingsQuery(Auth::user());
        $today = now()->toDateString();

        // Pending bookings that have not passed their scheduled date.
        $pendingQuery = (clone $query)
            ->where('status', 'pending')
            ->where(function ($q) use ($today) {
                $q->whereDate('booking_date', '>=', $today)
                    ->orWhereDate('date', '>=', $today);
            });

        // Previously reviewed bookings.
        $reviewedQuery = (clone $query)
            ->whereIn('status', ['approved', 'declined', 'cancelled']);

        // Pending bookings whose scheduled date has passed.
        $pastUnapprovedQuery = (clone $query)
            ->where('status', 'pending')
            ->where(function ($q) use ($today) {
                $q->whereDate('booking_date', '<', $today)
                    ->orWhereDate('date', '<', $today);
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
            ->with('facility', 'user');
    }

    /**
     * Check whether another active booking overlaps this slot, including
     * the configured cleanup buffer. The facility row must be locked first.
     */
    private function hasConflict(Booking $booking, int $bufferMinutes): bool
    {
        $candidateDate = ($booking->date ?? $booking->booking_date)->format('Y-m-d');
        $candidateStart = Carbon::parse($booking->start_time);
        $candidateEnd = Carbon::parse($booking->end_time);

        $existingBookings = Booking::query()
            ->where('facility_id', $booking->facility_id)
            ->where('id', '!=', $booking->getKey())
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($query) use ($candidateDate) {
                $query->whereDate('date', $candidateDate)
                    ->orWhereDate('booking_date', $candidateDate);
            })
            ->get(['start_time', 'end_time']);

        foreach ($existingBookings as $existing) {
            $bufferedStart = Carbon::parse($existing->start_time)
                ->subMinutes($bufferMinutes);
            $bufferedEnd = Carbon::parse($existing->end_time)
                ->addMinutes($bufferMinutes);

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
        $user = Auth::user();

        $result = DB::transaction(function () use ($booking, $user) {
            // Match booking creation's lock order so concurrent requests
            // for the same facility serialize before checking availability.
            Facility::whereKey($booking->facility_id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedBooking = Booking::query()
                ->whereKey($booking->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $this->authorize('approve', $lockedBooking);

            if ($lockedBooking->status !== 'pending') {
                return 'already_reviewed';
            }

            $settings = SystemSetting::current();
            $bufferMinutes = max(
                0,
                (int) ($settings->cleanup_buffer_minutes ?? 30)
            );

            if ($this->hasConflict($lockedBooking, $bufferMinutes)) {
                return 'conflict';
            }

            $lockedBooking->update([
                'status' => 'approved',
                'approved_by' => $user->name,
                'approved_at' => now(),
            ]);

            return 'approved';
        });

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

        $isPast = ($booking->booking_date && $booking->booking_date->lt($today))
            || ($booking->date && $booking->date->lt($today));

        if ($booking->status !== 'pending' || !$isPast) {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'Only past unapproved bookings can be deleted.',
            ]);
        }

        $booking->delete();

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
                $q->whereDate('booking_date', '<', $today)
                    ->orWhereDate('date', '<', $today);
            });

        $count = (clone $query)->count();

        if ($count > 0) {
            (clone $query)->delete();
        }

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Deleted {$count} past unapproved booking(s).",
        ]);
    }
}