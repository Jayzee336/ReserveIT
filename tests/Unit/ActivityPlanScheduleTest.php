<?php

namespace Tests\Unit;

use App\Support\ActivityPlanSchedule;
use PHPUnit\Framework\TestCase;

class ActivityPlanScheduleTest extends TestCase
{
    public function test_it_generates_only_the_selected_weekdays_inclusive_of_the_date_range(): void
    {
        $dates = ActivityPlanSchedule::dates(
            '2026-11-09',
            '2026-11-15',
            [1, 3, 5]
        );

        $this->assertSame([
            '2026-11-09',
            '2026-11-11',
            '2026-11-13',
        ], $dates);
    }

    public function test_it_supports_every_day_of_the_week(): void
    {
        $dates = ActivityPlanSchedule::dates(
            '2026-11-09',
            '2026-11-11',
            [0, 1, 2, 3, 4, 5, 6]
        );

        $this->assertSame([
            '2026-11-09',
            '2026-11-10',
            '2026-11-11',
        ], $dates);
    }

    public function test_it_returns_no_sessions_when_selected_weekdays_do_not_occur_in_range(): void
    {
        $this->assertSame([], ActivityPlanSchedule::dates(
            '2026-11-09',
            '2026-11-09',
            [0]
        ));
    }

    public function test_it_rejects_an_invalid_date_range(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        ActivityPlanSchedule::dates('2026-11-15', '2026-11-09', [1]);
    }
}
