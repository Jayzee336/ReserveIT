<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\FacilityOperatingHour;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FacilityBookingSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function facility(): Facility
    {
        return Facility::create([
            'id' => 'hours-test-facility',
            'name' => 'Operating Hours Test Facility',
            'type' => 'Venue',
            'capacity' => 100,
            'description' => 'Facility used to test day-specific booking hours.',
            'imageUrl' => '/images/facility-placeholder.svg',
            'requirement' => 'STANDARD',
            'location' => 'Test building',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
            'is_available' => true,
        ]);
    }

    public function test_assigned_facility_admin_can_save_weekly_hours_and_create_audit_records(): void
    {
        $facility = $this->facility();
        $admin = User::factory()->create(['role' => 'facility_admin']);
        $admin->managedFacilities()->attach($facility->id);

        $hours = [];
        for ($day = 0; $day <= 6; $day++) {
            $hours[] = [
                'day_of_week' => $day,
                'is_closed' => $day === 0,
                'opens_at' => $day === 0 ? null : '07:30',
                'closes_at' => $day === 0 ? null : '19:00',
            ];
        }

        $response = $this->actingAs($admin)->put(
            route('admin.facilities.booking-settings.update', $facility),
            ['hours' => $hours]
        );

        $response->assertRedirect();
        $this->assertDatabaseHas('facility_operating_hours', [
            'facility_id' => $facility->id,
            'day_of_week' => 0,
            'is_closed' => true,
        ]);
        $this->assertDatabaseHas('facility_operating_hours', [
            'facility_id' => $facility->id,
            'day_of_week' => 1,
            'is_closed' => false,
            'opens_at' => '07:30:00',
            'closes_at' => '19:00:00',
            'updated_by' => $admin->id,
        ]);
        $this->assertDatabaseCount('facility_operating_hour_histories', 7);
    }

    public function test_facility_admin_cannot_update_hours_for_an_unassigned_facility(): void
    {
        $facility = $this->facility();
        $admin = User::factory()->create(['role' => 'facility_admin']);

        $response = $this->actingAs($admin)->put(
            route('admin.facilities.booking-settings.update', $facility),
            ['hours' => []]
        );

        $response->assertForbidden();
        $this->assertDatabaseCount('facility_operating_hours', 0);
    }

    public function test_booking_is_rejected_on_a_facility_closed_for_the_selected_weekday(): void
    {
        $facility = $this->facility();
        $user = User::factory()->create(['role' => 'user']);
        $sunday = Carbon::today()->next(Carbon::SUNDAY);

        FacilityOperatingHour::create([
            'facility_id' => $facility->id,
            'day_of_week' => Carbon::SUNDAY,
            'is_closed' => true,
            'opens_at' => null,
            'closes_at' => null,
        ]);

        $response = $this->actingAs($user)->post(
            route('bookings.store'),
            [
                'facility_id' => $facility->id,
                'date' => $sunday->toDateString(),
                'start_time' => '09:00',
                'end_time' => '11:00',
                'attendees' => 10,
                'needs_manpower' => false,
            ]
        );

        $response->assertSessionHasErrors('date');
        $this->assertDatabaseCount('bookings', 0);
    }
}
