<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\FacilityOperatingHour;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FacilityOperatingHoursBookingTest extends TestCase
{
    use RefreshDatabase;

    private function configuredFacilityAndUser(): array
    {
        $facility = Facility::create([
            'id' => 'facility-hours-test',
            'name' => 'Facility Hours Test',
            'type' => 'Venue',
            'capacity' => 100,
            'description' => 'Facility operating hours test.',
            'imageUrl' => '/images/facility-placeholder.svg',
            'requirement' => 'STANDARD',
            'location' => 'Test building',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
            'booking_lead_time_days' => 0,
            'is_available' => true,
        ]);

        $date = today()->addDays(2);

        FacilityOperatingHour::create([
            'facility_id' => $facility->id,
            'day_of_week' => $date->dayOfWeek,
            'is_closed' => false,
            'opens_at' => '07:30',
            'closes_at' => '19:00',
        ]);

        $settings = SystemSetting::current();
        $settings->update([
            'opening_time' => '08:00',
            'closing_time' => '22:00',
        ]);

        return [$facility, User::factory()->create(['role' => 'user']), $date];
    }

    public function test_booking_can_use_facility_opening_time_earlier_than_global_default(): void
    {
        [$facility, $user, $date] = $this->configuredFacilityAndUser();

        $response = $this->actingAs($user)->post(route('bookings.store'), [
            'facility_id' => $facility->id,
            'date' => $date->toDateString(),
            'start_time' => '07:30',
            'end_time' => '09:00',
            'attendees' => 10,
            'needs_manpower' => false,
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('bookings', [
            'facility_id' => $facility->id,
            'user_id' => $user->id,
            'date' => $date->toDateString(),
            'start_time' => '07:30',
            'end_time' => '09:00',
        ]);
    }

    public function test_booking_outside_facility_specific_hours_is_rejected(): void
    {
        [$facility, $user, $date] = $this->configuredFacilityAndUser();

        $response = $this->actingAs($user)->post(route('bookings.store'), [
            'facility_id' => $facility->id,
            'date' => $date->toDateString(),
            'start_time' => '07:00',
            'end_time' => '09:00',
            'attendees' => 10,
            'needs_manpower' => false,
        ]);

        $response->assertSessionHasErrors('start_time');
        $this->assertDatabaseMissing('bookings', [
            'facility_id' => $facility->id,
            'user_id' => $user->id,
            'date' => $date->toDateString(),
        ]);
    }
}
