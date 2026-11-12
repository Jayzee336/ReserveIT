<?php

namespace Tests\Unit;

use App\Models\Facility;
use App\Models\User;
use App\Support\SpecialFacilityBookingPolicy;
use PHPUnit\Framework\TestCase;

class SpecialFacilityBookingPolicyTest extends TestCase
{
    public function test_regular_weekday_booking_has_no_billable_minutes(): void
    {
        $this->assertSame(
            0,
            SpecialFacilityBookingPolicy::billableMinutes('2026-11-12', '2026-11-12', '08:00', '17:00')
        );
    }

    public function test_early_and_evening_minutes_are_billed_only_outside_regular_hours(): void
    {
        $this->assertSame(
            120,
            SpecialFacilityBookingPolicy::billableMinutes('2026-11-12', '2026-11-12', '07:00', '18:00')
        );
    }

    public function test_sunday_booking_is_billable_for_its_entire_duration(): void
    {
        $this->assertSame(
            180,
            SpecialFacilityBookingPolicy::billableMinutes('2026-11-15', '2026-11-15', '09:00', '12:00')
        );
    }

    public function test_multi_day_booking_sums_daily_billable_minutes(): void
    {
        // Friday and Saturday contribute one late hour each; Sunday contributes two full hours.
        $this->assertSame(
            240,
            SpecialFacilityBookingPolicy::billableMinutes('2026-11-13', '2026-11-15', '16:00', '18:00')
        );
    }

    public function test_sister_signature_is_not_required_for_internal_regular_weekday_booking(): void
    {
        $facility = new Facility(['name' => 'Lobby']);
        $user = new User(['email' => 'student@uic.edu.ph']);

        $this->assertFalse(
            SpecialFacilityBookingPolicy::requiresSisterSignature(
                $facility, $user, '2026-11-12', '2026-11-12', '08:00', '17:00'
            )
        );
    }

    public function test_sister_signature_is_required_for_internal_after_hours_booking(): void
    {
        $facility = new Facility(['name' => 'Main Auditorium']);
        $user = new User(['email' => 'student@uic.edu.ph']);

        $this->assertTrue(
            SpecialFacilityBookingPolicy::requiresSisterSignature(
                $facility, $user, '2026-11-12', '2026-11-12', '16:00', '18:00'
            )
        );
    }

    public function test_sister_signature_is_required_for_outsider_even_during_regular_hours(): void
    {
        $facility = new Facility(['name' => 'View Deck']);
        $user = new User(['email' => 'visitor@example.com']);

        $this->assertTrue(
            SpecialFacilityBookingPolicy::requiresSisterSignature(
                $facility, $user, '2026-11-12', '2026-11-12', '09:00', '10:00'
            )
        );
    }

    public function test_sir_rene_signature_is_always_required_for_group_b_facilities(): void
    {
        $this->assertTrue(SpecialFacilityBookingPolicy::requiresSirReneSignature(new Facility(['name' => 'Sky Gym'])));
        $this->assertTrue(SpecialFacilityBookingPolicy::requiresSirReneSignature(new Facility(['name' => 'Quadrangle or Field'])));
        $this->assertFalse(SpecialFacilityBookingPolicy::requiresSirReneSignature(new Facility(['name' => 'Lobby'])));
    }
}
