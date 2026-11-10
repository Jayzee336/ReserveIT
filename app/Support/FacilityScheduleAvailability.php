<?php

namespace App\Support;

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

        $periods = FacilityUnavailabilityPeriod::query()
            ->where('facility_id', $facility->getKey())
            ->whereNull('ended_at')
            ->whereNotNull('scheduled_start_at')
            ->whereNotNull('scheduled_end_at')
            ->where('scheduled_start_at', '<', $lastEnd)
            ->where('scheduled_end_at', '>', $firstStart)
            ->get();

        return $periods->filter(function (FacilityUnavailabilityPeriod $period) use (
            $startDate,
            $endDate,
            $startTime,
            $endTime
        ) {
            $cursor = Carbon::parse($startDate)->startOfDay();
            $lastDate = Carbon::parse($endDate)->startOfDay();

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
                    return true;
                }

                $cursor->addDay();
            }

            return false;
        })->values();
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
}
