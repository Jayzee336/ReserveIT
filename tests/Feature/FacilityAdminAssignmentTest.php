<?php

namespace Tests\Feature;

use App\Http\Controllers\Facilitator\BookingApprovalController;
use App\Models\Booking;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FacilityAdminAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_facility_admin_only_sees_bookings_for_assigned_facility(): void
    {
        $facilityAdmin = User::factory()->create([
            'role' => 'facility_admin',
        ]);

        $assignedFacility = Facility::create([
            'id' => 'assigned-facility',
            'name' => 'Assigned Facility',
            'type' => 'Venue',
            'capacity' => 50,
            'description' => 'Assigned facility',
            'imageUrl' => 'https://example.com/assigned.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building A',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
        ]);

        $otherFacility = Facility::create([
            'id' => 'other-facility',
            'name' => 'Other Facility',
            'type' => 'Venue',
            'capacity' => 30,
            'description' => 'Other facility',
            'imageUrl' => 'https://example.com/other.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building B',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
        ]);

        $facilityAdmin->managedFacilities()->attach($assignedFacility);

        Booking::create([
            'facility_id' => $assignedFacility->id,
            'user_id' => null,
            'guest_name' => 'Jane Doe',
            'guest_email' => 'jane@example.com',
            'guest_phone' => '123456789',
            'date' => '2026-07-15',
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => 'pending',
            'notes' => 'Need access',
        ]);

        Booking::create([
            'facility_id' => $otherFacility->id,
            'user_id' => null,
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
            'guest_phone' => '987654321',
            'date' => '2026-07-16',
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'status' => 'pending',
            'notes' => 'Should be hidden',
        ]);

        $this->actingAs($facilityAdmin);

        $query = (new BookingApprovalController())
            ->getVisibleBookingsQuery($facilityAdmin);

        $pendingBookings = (clone $query)
            ->where('status', 'pending')
            ->orderBy('date')
            ->get();

        $this->assertCount(1, $pendingBookings);
        $this->assertSame(
            'Assigned Facility',
            $pendingBookings->first()->facility->name
        );
    }

    public function test_facility_admin_cannot_select_an_unassigned_facility_scope(): void
    {
        $facilityAdmin = User::factory()->create([
            'role' => 'facility_admin',
        ]);

        $assignedFacility = Facility::create([
            'id' => 'assigned-scope-facility',
            'name' => 'Assigned Scope Facility',
            'type' => 'Venue',
            'capacity' => 50,
            'description' => 'Assigned scope facility',
            'imageUrl' => 'https://example.com/assigned.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building A',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
        ]);

        $otherFacility = Facility::create([
            'id' => 'unassigned-scope-facility',
            'name' => 'Unassigned Scope Facility',
            'type' => 'Venue',
            'capacity' => 30,
            'description' => 'Unassigned scope facility',
            'imageUrl' => 'https://example.com/unassigned.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building B',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
        ]);

        $facilityAdmin->managedFacilities()->attach($assignedFacility);

        $response = $this->actingAs($facilityAdmin)->get(
            route('facilitator.dashboard', [
                'facility_id' => $otherFacility->id,
            ])
        );

        $response->assertForbidden();
    }

    public function test_super_admin_can_assign_facility_admins_to_a_facility(): void
    {
        $superAdmin = User::factory()->create([
            'role' => 'super_admin',
        ]);

        $facilityAdmin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = Facility::create([
            'id' => 'assignable-facility',
            'name' => 'Assignable Facility',
            'type' => 'Venue',
            'capacity' => 40,
            'description' => 'Assignable facility',
            'imageUrl' => 'https://example.com/assignable.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building C',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
        ]);

        $response = $this->actingAs($superAdmin)->patch(
            route('admin.facilities.update', $facility),
            [
                'name' => 'Assignable Facility',
                'type' => 'Venue',
                'capacity' => 40,
                'description' => 'Assignable facility',
                'imageUrl' => 'https://example.com/assignable.jpg',
                'requirement' => 'STANDARD',
                'location' => 'Building C',
                'requiresWeekendConsent' => false,
                'allowTdevsManpower' => false,
                'assigned_admin_ids' => [$facilityAdmin->id],
            ]
        );

        $response->assertRedirect();

        $this->assertTrue(
            $facility->fresh()
                ->facilityAdmins()
                ->where('users.id', $facilityAdmin->id)
                ->exists()
        );
    }

    public function test_super_admin_cannot_assign_an_ordinary_user_as_facility_admin(): void
    {
        $superAdmin = User::factory()->create([
            'role' => 'super_admin',
        ]);

        $ordinaryUser = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
        ]);

        $facility = Facility::create([
            'id' => 'ordinary-user-assignment-test',
            'name' => 'Ordinary User Assignment Test',
            'type' => 'Venue',
            'capacity' => 40,
            'description' => 'Testing invalid administrator assignments.',
            'imageUrl' => 'https://example.com/facility.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building C',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
        ]);

        $response = $this->actingAs($superAdmin)->patch(
            route('admin.facilities.update', $facility),
            [
                'name' => $facility->name,
                'type' => $facility->type,
                'capacity' => $facility->capacity,
                'description' => $facility->description,
                'imageUrl' => $facility->imageUrl,
                'requirement' => $facility->requirement,
                'location' => $facility->location,
                'requiresWeekendConsent' => false,
                'allowTdevsManpower' => false,
                'assigned_admin_ids' => [$ordinaryUser->id],
            ]
        );

        $response->assertSessionHasErrors('assigned_admin_ids.0');

        $this->assertFalse(
            $facility->fresh()
                ->facilityAdmins()
                ->where('users.id', $ordinaryUser->id)
                ->exists()
        );
    }

    public function test_super_admin_cannot_assign_an_inactive_facility_admin(): void
    {
        $superAdmin = User::factory()->create([
            'role' => 'super_admin',
        ]);

        $inactiveAdmin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => false,
        ]);

        $facility = Facility::create([
            'id' => 'inactive-admin-assignment-test',
            'name' => 'Inactive Admin Assignment Test',
            'type' => 'Venue',
            'capacity' => 40,
            'description' => 'Testing inactive administrator assignments.',
            'imageUrl' => 'https://example.com/facility.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building C',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
        ]);

        $response = $this->actingAs($superAdmin)->patch(
            route('admin.facilities.update', $facility),
            [
                'name' => $facility->name,
                'type' => $facility->type,
                'capacity' => $facility->capacity,
                'description' => $facility->description,
                'imageUrl' => $facility->imageUrl,
                'requirement' => $facility->requirement,
                'location' => $facility->location,
                'requiresWeekendConsent' => false,
                'allowTdevsManpower' => false,
                'assigned_admin_ids' => [$inactiveAdmin->id],
            ]
        );

        $response->assertSessionHasErrors('assigned_admin_ids.0');

        $this->assertFalse(
            $facility->fresh()
                ->facilityAdmins()
                ->where('users.id', $inactiveAdmin->id)
                ->exists()
        );
    }
}