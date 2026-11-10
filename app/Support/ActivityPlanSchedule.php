<?php

namespace App\Support;

use Carbon\Carbon;
use InvalidArgumentException;

class ActivityPlanSchedule
{
    /**
     * Build the exact session dates for selected ISO-style weekday numbers
     * (Carbon convention: Sunday = 0 through Saturday = 6).
     *
     * @param array<int, int|string> $weekdays
     * @return array<int, string>
     */
    public static function dates(string $startDate, string $endDate, array $weekdays): array
    {
        $start = Carbon::createFromFormat('!Y-m-d', $startDate);
        $end = Carbon::createFromFormat('!Y-m-d', $endDate);

        if (! $start || ! $end || $end->lt($start)) {
            throw new InvalidArgumentException('The activity plan date range is invalid.');
        }

        $selectedDays = array_values(array_unique(array_map(
            static fn ($day) => (int) $day,
            $weekdays
        )));

        if ($selectedDays === [] || array_diff($selectedDays, range(0, 6)) !== []) {
            throw new InvalidArgumentException('Select at least one valid weekday.');
        }

        $dates = [];
        $cursor = $start->copy();

        while ($cursor->lte($end)) {
            if (in_array($cursor->dayOfWeek, $selectedDays, true)) {
                $dates[] = $cursor->toDateString();
            }

            $cursor->addDay();
        }

        return $dates;
    }
}
