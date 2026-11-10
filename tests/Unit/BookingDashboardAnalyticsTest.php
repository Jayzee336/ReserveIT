<?php

namespace Tests\Unit;

use App\Models\Booking;
use App\Support\BookingDashboardAnalytics;
use Carbon\Carbon;
use PHPUnit\Framework\TestCase;

class BookingDashboardAnalyticsTest extends TestCase
{
    public function test_multi_day_booking_is_not_completed_before_its_final_date(): void
    {
        $booking = new Booking();
        $booking->forceFill([
            'status' => 'approved',
            'date' => '2026-11-09',
            'booking_date' => '2026-11-09',
            'end_date' => '2026-11-12',
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
        ]);

        $this->assertSame(
            'approved',
            BookingDashboardAnalytics::displayStatus(
                $booking,
                Carbon::parse('2026-11-11 15:00:00')
            )
        );

        $this->assertSame(
            'completed',
            BookingDashboardAnalytics::displayStatus(
                $booking,
                Carbon::parse('2026-11-12 10:00:01')
            )
        );
    }

    public function test_midnight_end_time_on_final_date_is_completed_after_that_midnight(): void
    {
        $booking = new Booking();
        $booking->forceFill([
            'status' => 'approved',
            'date' => '2026-11-09',
            'booking_date' => '2026-11-09',
            'end_date' => '2026-11-12',
            'start_time' => '09:00:00',
            'end_time' => '00:00:00',
        ]);

        $this->assertSame(
            'approved',
            BookingDashboardAnalytics::displayStatus(
                $booking,
                Carbon::parse('2026-11-12 23:59:59')
            )
        );

        $this->assertSame(
            'completed',
            BookingDashboardAnalytics::displayStatus(
                $booking,
                Carbon::parse('2026-11-13 00:00:01')
            )
        );
    }
}
