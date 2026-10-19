<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\SystemSetting;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class BookingCheckInOutController extends Controller
{
    /**
     * Check in an approved booking.
     *
     * Policy:
     * - Check-in is allowed from 15 minutes before the scheduled start.
     * - Check-in is allowed at or after the scheduled start on the booking date.
     * - Future-dated bookings cannot be checked in.
     * - Past-dated bookings require a Super Admin override and reason.
     */
    public function checkIn(Request $request, Booking $booking)
    {
        Gate::authorize('view', $booking);

        abort_if(
            $booking->status !== 'approved',
            403,
            'Only approved bookings can be checked in.'
        );

        abort_if(
            $booking->checked_in_at !== null,
            422,
            'This booking is already checked in.'
        );

        abort_if(
            $booking->checked_out_at !== null,
            422,
            'This booking has already been checked out.'
        );

        $user = $request->user();
        $now = Carbon::now();
        $today = $now->copy()->startOfDay();

        $bookingDate = Carbon::parse($booking->date)->startOfDay();

        $isPastBooking = $bookingDate->lt($today);
        $isFutureBooking = $bookingDate->gt($today);
        $isSuperAdmin = $user->role === 'super_admin';
        $overrideReason = null;

        // Future bookings cannot be checked in early.
        if ($isFutureBooking) {
            throw ValidationException::withMessages([
                'check_in' => 'Check-in is only allowed on the scheduled booking date.',
            ]);
        }

        // Past bookings require a Super Admin override.
        if ($isPastBooking && ! $isSuperAdmin) {
            throw ValidationException::withMessages([
                'check_in' => 'Check-in is not allowed for past-dated bookings. Contact a Super Admin for assistance.',
            ]);
        }

        // Require an auditable reason for past-date overrides.
        if ($isPastBooking && $isSuperAdmin) {
            $validated = $request->validate([
                'reason' => ['required', 'string', 'min:10', 'max:1000'],
            ]);

            $overrideReason = trim($validated['reason']);

            if (mb_strlen($overrideReason) < 10) {
                throw ValidationException::withMessages([
                    'reason' => 'Please provide a meaningful reason of at least 10 characters.',
                ]);
            }
        }

        // Apply the 15-minute early check-in window on today's bookings.
        if (! $isPastBooking) {
            $scheduledStart = Carbon::parse(
                $bookingDate->format('Y-m-d') . ' ' . $booking->start_time
            );

            $earliestCheckIn = $scheduledStart->copy()->subMinutes(15);

            if ($now->lt($earliestCheckIn)) {
                throw ValidationException::withMessages([
                    'check_in' => 'Check-in is allowed starting 15 minutes before the scheduled start time.',
                ]);
            }
        }

        $booking->update([
            'checked_in_at' => $now,
        ]);

        ActivityLog::create([
            'booking_id' => $booking->id,
            'action' => $isPastBooking
                ? 'check_in_past_booking_override'
                : 'check_in',
            'performed_by' => (string) $user->id,
            'reason' => $overrideReason,
        ]);

        $message = $isPastBooking
            ? "Booking #{$booking->id} checked in using a Super Admin exception."
            : "Booking #{$booking->id} marked as checked in.";

        if ($request->expectsJson()) {
            return response()->json([
                'message' => $message,
                'booking_id' => $booking->id,
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => $message,
        ]);
    }

    /**
     * Check out a booking and save its final overtime charge.
     *
     * The overtime fee and hourly rate are saved as snapshots.
     * Future changes to the system-wide rate will not alter
     * an already finalized booking charge.
     */
    public function checkOut(Request $request, Booking $booking)
    {
        Gate::authorize('view', $booking);

        $user = $request->user();

        $result = DB::transaction(function () use ($booking, $user) {
            $lockedBooking = Booking::query()
                ->whereKey($booking->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            Gate::authorize('view', $lockedBooking);

            if ($lockedBooking->checked_in_at === null) {
                throw ValidationException::withMessages([
                    'check_out' => 'This booking has not been checked in yet.',
                ]);
            }

            if ($lockedBooking->checked_out_at !== null) {
                throw ValidationException::withMessages([
                    'check_out' => 'This booking is already checked out.',
                ]);
            }

            $checkoutTime = Carbon::now();

            $scheduledEnd = Carbon::parse(
                $lockedBooking->date->format('Y-m-d')
                . ' '
                . $lockedBooking->end_time
            );

            $checkedInAt = Carbon::parse($lockedBooking->checked_in_at);

            // Only bookings checked in by their scheduled end
            // are eligible for overtime charges.
            $eligibleForOvertime = $checkedInAt->lte($scheduledEnd);

            $overtimeMinutes = (
                $eligibleForOvertime && $checkoutTime->gt($scheduledEnd)
            )
                ? (int) $scheduledEnd->diffInMinutes($checkoutTime)
                : 0;

            $settings = SystemSetting::current();

            $feePerHour = max(
                0,
                (float) ($settings->overtime_fee_per_hour ?? 0)
            );

            $overtimeFee = round(
                ($overtimeMinutes / 60) * $feePerHour,
                2
            );

            $paymentStatus = $overtimeFee > 0
                ? 'unpaid'
                : 'not_due';

            $lockedBooking->update([
                'checked_out_at' => $checkoutTime,
                'overtime_minutes' => $overtimeMinutes,
                'overtime_fee_amount' => $overtimeFee,
                'overtime_fee_rate' => $feePerHour,
                'overtime_payment_status' => $paymentStatus,
                'overtime_paid_at' => null,
                'overtime_paid_by' => null,
            ]);

            ActivityLog::create([
                'booking_id' => $lockedBooking->id,
                'action' => 'check_out',
                'performed_by' => (string) $user->id,
                'reason' => null,
            ]);

            if ($overtimeFee > 0) {
                ActivityLog::create([
                    'booking_id' => $lockedBooking->id,
                    'action' => 'overtime_fee_assessed',
                    'performed_by' => (string) $user->id,
                    'reason' => sprintf(
                        'Final overtime charge: %d minutes at ₱%.2f per hour; total ₱%.2f.',
                        $overtimeMinutes,
                        $feePerHour,
                        $overtimeFee
                    ),
                ]);
            }

            return [
                'minutes' => $overtimeMinutes,
                'fee' => $overtimeFee,
                'rate' => $feePerHour,
                'checked_out_at' => $checkoutTime->toDateTimeString(),
                'payment_status' => $paymentStatus,
            ];
        });

        $message = "Booking #{$booking->id} checked out.";

        if ($result['fee'] > 0) {
            $message .= sprintf(
                ' Final overtime charge: ₱%.2f for %d minutes. Payment is still unpaid.',
                $result['fee'],
                $result['minutes']
            );
        } else {
            $message .= ' No overtime fee is due.';
        }

        if ($request->expectsJson()) {
            return response()->json([
                'message' => $message,
                'booking_id' => $booking->id,
                'overtime_minutes' => $result['minutes'],
                'overtime_fee_amount' => $result['fee'],
                'overtime_fee_rate' => $result['rate'],
                'overtime_payment_status' => $result['payment_status'],
                'checked_out_at' => $result['checked_out_at'],
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => $message,
        ]);
    }

    /**
     * Record that an outstanding overtime fee has been received.
     *
     * This records a manual payment confirmation in ReserveIT.
     * It does not process or verify a transaction with an external
     * payment gateway.
     */
    public function recordOvertimePayment(
        Request $request,
        Booking $booking
    ) {
        Gate::authorize('view', $booking);

        $user = $request->user();

        $result = DB::transaction(function () use ($booking, $user) {
            $lockedBooking = Booking::query()
                ->whereKey($booking->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            Gate::authorize('view', $lockedBooking);

            if ($lockedBooking->checked_out_at === null) {
                throw ValidationException::withMessages([
                    'payment' => 'Check out the booking before recording its overtime payment.',
                ]);
            }

            $fee = (float) ($lockedBooking->overtime_fee_amount ?? 0);

            if ($fee <= 0) {
                throw ValidationException::withMessages([
                    'payment' => 'This booking has no overtime fee due.',
                ]);
            }

            if ($lockedBooking->overtime_payment_status === 'paid') {
                throw ValidationException::withMessages([
                    'payment' => 'The overtime fee has already been recorded as paid.',
                ]);
            }

            if ($lockedBooking->overtime_payment_status !== 'unpaid') {
                throw ValidationException::withMessages([
                    'payment' => 'This booking does not have an outstanding overtime fee.',
                ]);
            }

            $paidAt = Carbon::now();

            $lockedBooking->update([
                'overtime_payment_status' => 'paid',
                'overtime_paid_at' => $paidAt,
                'overtime_paid_by' => (string) $user->id,
            ]);

            ActivityLog::create([
                'booking_id' => $lockedBooking->id,
                'action' => 'overtime_payment_recorded',
                'performed_by' => (string) $user->id,
                'reason' => sprintf(
                    'Recorded overtime payment of ₱%.2f as received.',
                    $fee
                ),
            ]);

            return [
                'booking_id' => $lockedBooking->id,
                'fee' => $fee,
                'paid_at' => $paidAt->toDateTimeString(),
                'payment_status' => 'paid',
            ];
        });

        $message = 'Overtime payment recorded as received.';

        if ($request->expectsJson()) {
            return response()->json([
                'message' => $message,
                'booking_id' => $result['booking_id'],
                'overtime_fee_amount' => $result['fee'],
                'overtime_payment_status' => $result['payment_status'],
                'overtime_paid_at' => $result['paid_at'],
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => $message,
        ]);
    }

    /**
     * Return active bookings and their currently accrued overtime fees.
     */
    public function activeBookings()
    {
        $now = Carbon::now();
        $user = Auth::user();

        $settings = SystemSetting::current();

        $feePerHour = max(
            0,
            (float) ($settings->overtime_fee_per_hour ?? 0)
        );

        $activeBookings = Booking::query()
            ->forUser($user)
            ->with(['facility:id,name', 'user:id,name,email'])
            ->where('status', 'approved')
            ->whereNotNull('checked_in_at')
            ->whereNull('checked_out_at')
            ->get()
            ->map(function (Booking $booking) use ($now, $feePerHour) {
                $scheduledEnd = Carbon::parse(
                    $booking->date->format('Y-m-d')
                    . ' '
                    . $booking->end_time
                );

                $checkedInAt = Carbon::parse($booking->checked_in_at);

                $eligibleForOvertime = $checkedInAt->lte($scheduledEnd);

                $isOvertime = $eligibleForOvertime
                    && $now->gt($scheduledEnd);

                $overtimeMinutes = $isOvertime
                    ? (int) $scheduledEnd->diffInMinutes($now)
                    : 0;

                $overtimeFee = round(
                    ($overtimeMinutes / 60) * $feePerHour,
                    2
                );

                return [
                    'id' => $booking->id,
                    'facility_name' => $booking->facility?->name ?? 'N/A',
                    'user_name' => $booking->user?->name
                        ?? $booking->guest_name
                        ?? 'Guest',
                    'user_email' => $booking->user?->email
                        ?? $booking->guest_email
                        ?? '',
                    'date' => $booking->date,
                    'start_time' => $booking->start_time,
                    'end_time' => $booking->end_time,
                    'checked_in_at' => $booking->checked_in_at,
                    'is_overtime' => $isOvertime,
                    'overtime_minutes' => $overtimeMinutes,
                    'overtime_fee' => $overtimeFee,
                    'overtime_fee_per_hour' => $feePerHour,
                    'status' => $booking->status,
                ];
            })
            ->values();

        return response()->json([
            'activeBookings' => $activeBookings,
        ]);
    }

    /**
     * Return finalized overtime billing records for checked-out bookings.
     */
    public function overtimeBilling()
    {
        $user = Auth::user();

        $billingRecords = Booking::query()
            ->forUser($user)
            ->with(['facility:id,name', 'user:id,name,email'])
            ->whereNotNull('checked_out_at')
            ->whereNotNull('overtime_fee_amount')
            ->orderByDesc('checked_out_at')
            ->get()
            ->map(function (Booking $booking) {
                return [
                    'id' => $booking->id,
                    'facility_name' => $booking->facility?->name ?? 'N/A',
                    'user_name' => $booking->user?->name
                        ?? $booking->guest_name
                        ?? 'Guest',
                    'user_email' => $booking->user?->email
                        ?? $booking->guest_email
                        ?? '',
                    'date' => $booking->date,
                    'start_time' => $booking->start_time,
                    'end_time' => $booking->end_time,
                    'checked_out_at' => $booking->checked_out_at,
                    'overtime_minutes' => (int) ($booking->overtime_minutes ?? 0),
                    'overtime_fee_amount' => (float) ($booking->overtime_fee_amount ?? 0),
                    'overtime_fee_rate' => (float) ($booking->overtime_fee_rate ?? 0),
                    'overtime_payment_status' => $booking->overtime_payment_status,
                    'overtime_paid_at' => $booking->overtime_paid_at,
                    'overtime_paid_by' => $booking->overtime_paid_by,
                ];
            })
            ->values();

        return response()->json([
            'billingRecords' => $billingRecords,
        ]);
    }
}