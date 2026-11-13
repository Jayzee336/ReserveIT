<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function createFacility(string $id): Facility
    {
        return Facility::create([
            'id' => $id,
            'name' => 'Facility ' . $id,
            'type' => 'Venue',
            'capacity' => 40,
            'description' => 'User management test facility.',
            'imageUrl' => 'https://example.com/facility.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building A',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
        ]);
    }

    public function test_super_admin_can_create_a_facility_admin_with_facility_assignments(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $facility = $this->createFacility('user-create-assigned');

        $response = $this->actingAs($superAdmin)->post(route('admin.users.store'), [
            'name' => 'New Facility Admin',
            'username' => 'newfacilityadmin',
            'email' => 'new-facility-admin@example.com',
            'role' => 'facility_admin',
            'password_mode' => 'generated',
            'assigned_facility_ids' => [$facility->id],
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('users', [
            'email' => 'new-facility-admin@example.com',
            'role' => 'facility_admin',
            'must_change_password' => true,
        ]);

        $createdUser = User::where('email', 'new-facility-admin@example.com')->firstOrFail();

        $this->assertTrue(
            $createdUser->managedFacilities()->whereKey($facility->id)->exists()
        );
    }

    public function test_editing_facility_admin_details_without_assignment_data_preserves_assignments(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $facilityAdmin = User::factory()->create(['role' => 'facility_admin', 'username' => 'existingfacilityadmin']);
        $facility = $this->createFacility('user-edit-preserve-assignment');
        $facilityAdmin->managedFacilities()->attach($facility);

        $response = $this->actingAs($superAdmin)->patch(
            route('admin.users.update', $facilityAdmin),
            [
                'name' => 'Updated Facility Admin',
                'username' => $facilityAdmin->username,
                'email' => $facilityAdmin->email,
            ]
        );

        $response->assertRedirect();

        $this->assertSame('Updated Facility Admin', $facilityAdmin->fresh()->name);
        $this->assertTrue(
            $facilityAdmin->fresh()
                ->managedFacilities()
                ->whereKey($facility->id)
                ->exists()
        );
    }

    public function test_changing_facility_admin_to_regular_user_removes_facility_assignments(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $facilityAdmin = User::factory()->create(['role' => 'facility_admin']);
        $facility = $this->createFacility('user-role-remove-assignment');
        $facilityAdmin->managedFacilities()->attach($facility);

        $response = $this->actingAs($superAdmin)->patch(
            route('admin.users.updateRole', $facilityAdmin),
            ['role' => 'user']
        );

        $response->assertRedirect();

        $this->assertSame('user', $facilityAdmin->fresh()->role);
        $this->assertDatabaseMissing('facility_user', [
            'user_id' => $facilityAdmin->id,
            'facility_id' => $facility->id,
        ]);
    }

    public function test_promoting_a_user_to_facility_admin_saves_string_facility_ids(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $user = User::factory()->create(['role' => 'user']);
        $facility = $this->createFacility('promoted-admin-facility');

        $response = $this->actingAs($superAdmin)->patch(
            route('admin.users.updateRole', $user),
            [
                'role' => 'facility_admin',
                'assigned_facility_ids' => [$facility->id],
            ]
        );

        $response->assertRedirect();
        $this->assertSame('facility_admin', $user->fresh()->role);
        $this->assertTrue(
            $user->fresh()->managedFacilities()->whereKey($facility->id)->exists()
        );
    }

    public function test_last_active_super_admin_cannot_be_demoted(): void
    {
        $superAdmin = User::factory()->create([
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $response = $this->actingAs($superAdmin)->patch(
            route('admin.users.updateRole', $superAdmin),
            ['role' => 'user']
        );

        $response->assertSessionHasErrors('role');
        $this->assertSame('super_admin', $superAdmin->fresh()->role);
    }

    public function test_last_active_super_admin_cannot_be_deactivated(): void
    {
        $superAdmin = User::factory()->create([
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $response = $this->actingAs($superAdmin)->patch(
            route('admin.users.toggleActive', $superAdmin)
        );

        $response->assertSessionHasErrors('role');
        $this->assertTrue($superAdmin->fresh()->is_active);
    }
}
