<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FacilityAvailabilityTest extends TestCase
{
    use RefreshDatabase;

    private function facility(): Facility
    {
        return Facility::create([
            'id' => 'availability-test-1',
            'name' => 'AVR Availability Test',
            'type' => 'Venue',
            'capacity' => 100,
            'description' => 'Facility availability test record.',
            'imageUrl' => '/images/facility-placeholder.svg',
            'requirement' => 'STANDARD',
            'location' => 'Test building',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
            'is_available' => true,
        ]);
    }

    private function futureBooking(Facility $facility, User $owner): Booking
    {
        return Booking::create([
            'facility_id' => $facility->id,
            'user_id' => $owner->id,
            'date' => today()->addDays(2)->toDateString(),
            'booking_date' => today()->addDays(2)->toDateString(),
            'start_time' => '09:00',
            'end_time' => '11:00',
            'status' => 'approved',
            'notes' => 'Existing reservation affected by a temporary closure.',
            'attendees' => 20,
            'needs_manpower' => false,
        ]);
    }

    public function test_assigned_facility_admin_can_mark_a_facility_unavailable_and_only_affected_users_are_notified(): void
    {
        $facility = $this->facility();
        $admin = User::factory()->create(['role' => 'facility_admin']);
        $affectedUser = User::factory()->create(['role' => 'user']);
        $unaffectedUser = User::factory()->create(['role' => 'user']);

        $admin->managedFacilities()->attach($facility->id);
        $this->futureBooking($facility, $affectedUser);

        $response = $this->actingAs($admin)->patch(
            route('admin.facilities.availability', $facility),
            [
                'is_available' => false,
                'reason' => 'Electrical maintenance',
            ]
        );

        $response->assertRedirect();
        $this->assertDatabaseHas('facilities', [
            'id' => $facility->id,
            'is_available' => false,
            'unavailable_reason' => 'Electrical maintenance',
        ]);
        $this->assertDatabaseCount('facility_unavailability_periods', 1);
        $this->assertDatabaseCount('notifications', 1);
        $this->assertSame(0, $unaffectedUser->notifications()->count());
    }

    public function test_facility_admin_cannot_change_availability_of_an_unassigned_facility(): void
    {
        $facility = $this->facility();
        $admin = User::factory()->create(['role' => 'facility_admin']);

        $response = $this->actingAs($admin)->patch(
            route('admin.facilities.availability', $facility),
            [
                'is_available' => false,
                'reason' => 'Unauthorized test',
            ]
        );

        $response->assertForbidden();
        $this->assertDatabaseHas('facilities', [
            'id' => $facility->id,
            'is_available' => true,
        ]);
        $this->assertDatabaseCount('facility_unavailability_periods', 0);
    }

    public function test_super_admin_can_restore_a_facility_and_notify_the_previously_affected_users(): void
    {
        $facility = $this->facility();
        $admin = User::factory()->create(['role' => 'super_admin']);
        $affectedUser = User::factory()->create(['role' => 'user']);
        $this->futureBooking($facility, $affectedUser);

        $this->actingAs($admin)->patch(
            route('admin.facilities.availability', $facility),
            [
                'is_available' => false,
                'reason' => 'Emergency repair',
            ]
        )->assertRedirect();

        $restoreResponse = $this->actingAs($admin)->patch(
            route('admin.facilities.availability', $facility),
            ['is_available' => true]
        );

        $restoreResponse->assertRedirect();
        $this->assertDatabaseHas('facilities', [
            'id' => $facility->id,
            'is_available' => true,
            'unavailable_reason' => null,
        ]);
        $this->assertDatabaseHas('facility_unavailability_periods', [
            'facility_id' => $facility->id,
            'restored_by' => $admin->id,
        ]);
        $this->assertSame(2, $affectedUser->notifications()->count());
    }
}
