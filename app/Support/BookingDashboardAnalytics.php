<?php

namespace App\Support;

use App\Models\Booking;
use Carbon\Carbon;
use Illuminate\Support\Collection;

final class BookingDashboardAnalytics
{
    public const STATUSES = ['pending', 'approved', 'completed', 'declined', 'cancelled', 'expired'];

    public static function isCompleted(Booking $booking, ?Carbon $asOf = null): bool
    {
        if ($booking->status === 'completed') {
            return true;
        }

        if ($booking->status !== 'approved') {
            return false;
        }

        if ($booking->checked_out_at) {
            return true;
        }

        $bookingDate = $booking->end_date ?? $booking->booking_date ?? $booking->date;
        if (! $bookingDate || ! $booking->end_time) {
            return false;
        }

        $date = $bookingDate instanceof Carbon
            ? $bookingDate->toDateString()
            : Carbon::parse($bookingDate)->toDateString();

        $endTime = substr((string) $booking->end_time, 0, 8);
        $endAt = Carbon::parse($date . ' ' . $endTime);

        // A 00:00 end time is midnight at the end of the booking date
        // when the booking began later in the day.
        if (
            substr((string) $booking->end_time, 0, 5) === '00:00'
            && $booking->start_time
            && substr((string) $booking->start_time, 0, 5) > '00:00'
        ) {
            $endAt->addDay();
        }

        return $endAt->lte($asOf ?? now());
    }

    public static function displayStatus(Booking $booking, ?Carbon $asOf = null): string
    {
        return self::isCompleted($booking, $asOf) ? 'completed' : (string) $booking->status;
    }

    public static function statusBreakdown(Collection $bookings, ?Carbon $asOf = null): array
    {
        // Use a native array for mutable counters. Laravel Collection's
        // ArrayAccess does not support indirect increment operations.
        $counts = array_fill_keys(self::STATUSES, 0);

        foreach ($bookings as $booking) {
            $status = self::displayStatus($booking, $asOf);

            if (array_key_exists($status, $counts)) {
                $counts[$status]++;
            }
        }

        $total = $bookings->count();

        return collect(self::STATUSES)->map(fn (string $status) => [
            'status' => $status,
            'count' => $counts[$status],
            'percentage' => $total > 0 ? round(($counts[$status] / $total) * 100, 1) : 0,
        ])->values()->all();
    }

    public static function filterByStatus(Collection $bookings, string $status, ?Carbon $asOf = null): Collection
    {
        return $bookings->filter(
            fn (Booking $booking) => self::displayStatus($booking, $asOf) === $status
        )->values();
    }

    public static function bookingRows(Collection $bookings, ?Carbon $asOf = null): array
    {
        return $bookings->map(function (Booking $booking) use ($asOf): array {
            $date = $booking->booking_date ?? $booking->date;
            $endDate = $booking->end_date ?? $date;

            return [
                'id' => $booking->getKey(),
                'facility' => $booking->facility?->name ?? 'Deleted facility',
                'client' => $booking->user?->name ?? $booking->guest_name ?? 'Guest',
                'email' => $booking->user?->email ?? $booking->guest_email,
                'date' => $date instanceof Carbon ? $date->format('Y-m-d') : ($date ? Carbon::parse($date)->format('Y-m-d') : null),
                'end_date' => $endDate instanceof Carbon ? $endDate->format('Y-m-d') : ($endDate ? Carbon::parse($endDate)->format('Y-m-d') : null),
                'start_time' => $booking->start_time,
                'end_time' => $booking->end_time,
                'status' => $booking->status,
                'display_status' => self::displayStatus($booking, $asOf),
                'approved_at' => $booking->approved_at?->toDateTimeString(),
                'approval_minutes' => $booking->approved_at && $booking->created_at
                    ? round(max(0, $booking->approved_at->getTimestamp() - $booking->created_at->getTimestamp()) / 60, 1)
                    : null,
                'overtime_minutes' => (int) ($booking->overtime_minutes ?? 0),
                'overtime_fee_amount' => (float) ($booking->overtime_fee_amount ?? 0),
                'overtime_payment_status' => $booking->overtime_payment_status ?? 'not_applicable',
            ];
        })->values()->all();
    }

    public static function facilityBreakdown(Collection $bookings): array
    {
        return $bookings->groupBy('facility_id')
            ->map(fn (Collection $items) => [
                'name' => $items->first()->facility?->name ?? 'Deleted facility',
                'bookings' => $items->count(),
            ])
            ->sortByDesc('bookings')
            ->values()
            ->all();
    }
}
