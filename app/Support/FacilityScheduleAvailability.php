<?php

namespace App\Support;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\FacilityUnavailabilityPeriod;
use Carbon\Carbon;

final class FacilityScheduleAvailability
{
    /**
     * Return scheduled closures that overlap a booking interval.
     * Multi-day bookings reserve the same daily time slot on every date.
     */
    public static function overlappingClosures(
        Facility $facility,
        string $startDate,
        string $endDate,
        string $startTime,
        string $endTime
    ) {
        $firstStart = Carbon::parse($startDate . ' ' . $startTime);
        $lastEnd = Carbon::parse($endDate . ' ' . $endTime);

        if (substr($endTime, 0, 5) === '00:00') {
            $lastEnd->addDay();
        }

        return FacilityUnavailabilityPeriod::query()
            ->where('facility_id', $facility->getKey())
            ->whereNull('ended_at')
            ->whereNotNull('scheduled_start_at')
            ->whereNotNull('scheduled_end_at')
            ->where('scheduled_start_at', '<', $lastEnd)
            ->where('scheduled_end_at', '>', $firstStart)
            ->get()
            ->filter(fn (FacilityUnavailabilityPeriod $period) => self::periodOverlapsBooking(
                $period,
                $startDate,
                $endDate,
                $startTime,
                $endTime
            ))
            ->values();
    }

    public static function firstOverlappingClosure(
        Facility $facility,
        string $startDate,
        string $endDate,
        string $startTime,
        string $endTime
    ): ?FacilityUnavailabilityPeriod {
        return self::overlappingClosures(
            $facility,
            $startDate,
            $endDate,
            $startTime,
            $endTime
        )->first();
    }

    public static function periodOverlapsBooking(
        FacilityUnavailabilityPeriod $period,
        string $startDate,
        string $endDate,
        string $startTime,
        string $endTime
    ): bool {
        return self::overlappingBookingDates(
            $period,
            $startDate,
            $endDate,
            $startTime,
            $endTime
        ) !== [];
    }

    /**
     * Return only the daily reservation dates that actually intersect a
     * scheduled closure. This lets notifications identify the affected
     * dates of recurring plans and multi-day bookings precisely.
     */
    public static function overlappingBookingDates(
        FacilityUnavailabilityPeriod $period,
        string $startDate,
        string $endDate,
        string $startTime,
        string $endTime
    ): array {
        $cursor = Carbon::parse($startDate)->startOfDay();
        $lastDate = Carbon::parse($endDate)->startOfDay();
        $overlappingDates = [];

        while ($cursor->lte($lastDate)) {
            $date = $cursor->toDateString();
            $bookingStart = Carbon::parse($date . ' ' . $startTime);
            $bookingEnd = Carbon::parse($date . ' ' . $endTime);

            if (substr($endTime, 0, 5) === '00:00') {
                $bookingEnd->addDay();
            }

            if (
                $bookingStart->lt($period->scheduled_end_at)
                && $bookingEnd->gt($period->scheduled_start_at)
            ) {
                $overlappingDates[] = $date;
            }

            $cursor->addDay();
        }

        return $overlappingDates;
    }

    public static function bookingOverlapsPeriod(
        FacilityUnavailabilityPeriod $period,
        Booking $booking
    ): bool {
        $startDate = $booking->date ?? $booking->booking_date;
        $endDate = $booking->end_date ?? $startDate;

        if (! $startDate || ! $endDate || ! $booking->start_time || ! $booking->end_time) {
            return false;
        }

        return self::periodOverlapsBooking(
            $period,
            Carbon::parse($startDate)->toDateString(),
            Carbon::parse($endDate)->toDateString(),
            substr((string) $booking->start_time, 0, 5),
            substr((string) $booking->end_time, 0, 5)
        );
    }

    public static function overlappingDatesForBooking(
        FacilityUnavailabilityPeriod $period,
        Booking $booking
    ): array {
        $startDate = $booking->date ?? $booking->booking_date;
        $endDate = $booking->end_date ?? $startDate;

        if (! $startDate || ! $endDate || ! $booking->start_time || ! $booking->end_time) {
            return [];
        }

        return self::overlappingBookingDates(
            $period,
            Carbon::parse($startDate)->toDateString(),
            Carbon::parse($endDate)->toDateString(),
            substr((string) $booking->start_time, 0, 5),
            substr((string) $booking->end_time, 0, 5)
        );
    }
}
