<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class BookingCheckInOutTest extends TestCase
{
    use RefreshDatabase;

    private function createFacility(string $id, string $name): Facility
    {
        return Facility::create([
            'id' => $id,
            'name' => $name,
            'type' => 'Venue',
            'capacity' => 50,
            'description' => $name,
            'imageUrl' => 'https://example.com/facility.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building A',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
        ]);
    }

    private function createBooking(
        Facility $facility,
        array $attributes = []
    ): Booking {
        return Booking::create(array_merge([
            'facility_id' => $facility->id,
            'user_id' => null,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '123456789',
            'date' => now()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => 'approved',
            'notes' => 'Authorization test',
        ], $attributes));
    }

public function test_assigned_facility_admin_can_check_in_an_approved_booking(): void
{
    Carbon::setTestNow(Carbon::parse('2026-10-20 08:50:00'));

    try {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility(
            'check-in-assigned',
            'Assigned Facility'
        );

        $facility->facilityAdmins()->attach($admin);

        $booking = $this->createBooking($facility, [
            'date' => '2026-10-20',
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
        ]);

        $response = $this->actingAs($admin)->post(
            route('bookings.check-in', $booking)
        );

        $response->assertSessionHasNoErrors();

        $this->assertNotNull($booking->fresh()->checked_in_at);
    } finally {
        Carbon::setTestNow();
    }
}

    public function test_assigned_facility_admin_can_check_out_a_checked_in_booking(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility(
            'check-out-assigned',
            'Assigned Facility'
        );

        $facility->facilityAdmins()->attach($admin);

        $booking = $this->createBooking($facility, [
            'checked_in_at' => now()->subMinutes(30),
        ]);

        $response = $this->actingAs($admin)->post(
            route('bookings.check-out', $booking)
        );

        $response->assertSessionHasNoErrors();

        $this->assertNotNull($booking->fresh()->checked_out_at);
    }

    public function test_facility_admin_cannot_check_in_booking_for_unassigned_facility(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility(
            'check-in-other',
            'Other Facility'
        );

        $booking = $this->createBooking($facility);

        $this->actingAs($admin)
            ->post(route('bookings.check-in', $booking))
            ->assertForbidden();

        $this->assertNull($booking->fresh()->checked_in_at);
    }

    public function test_facility_admin_cannot_check_out_booking_for_unassigned_facility(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility(
            'check-out-other',
            'Other Facility'
        );

        $booking = $this->createBooking($facility, [
            'checked_in_at' => now()->subMinutes(30),
        ]);

        $this->actingAs($admin)
            ->post(route('bookings.check-out', $booking))
            ->assertForbidden();

        $this->assertNull($booking->fresh()->checked_out_at);
    }

    public function test_regular_user_cannot_check_in_or_check_out(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
        ]);

        $facility = $this->createFacility(
            'check-in-user',
            'User Test Facility'
        );

        $booking = $this->createBooking($facility, [
            'checked_in_at' => now()->subMinutes(30),
        ]);

        $this->actingAs($user)
            ->post(route('bookings.check-in', $booking))
            ->assertForbidden();

        $this->actingAs($user)
            ->post(route('bookings.check-out', $booking))
            ->assertForbidden();

        $this->assertNotNull($booking->fresh()->checked_in_at);
        $this->assertNull($booking->fresh()->checked_out_at);
    }

    public function test_active_bookings_only_returns_assigned_facility_bookings(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $assignedFacility = $this->createFacility(
            'active-assigned',
            'Assigned Facility'
        );

        $otherFacility = $this->createFacility(
            'active-unassigned',
            'Unassigned Facility'
        );

        $assignedFacility->facilityAdmins()->attach($admin);

        $assignedBooking = $this->createBooking($assignedFacility, [
            'checked_in_at' => now()->subMinutes(10),
        ]);

        $unassignedBooking = $this->createBooking($otherFacility, [
            'checked_in_at' => now()->subMinutes(10),
        ]);

        $response = $this->actingAs($admin)
            ->getJson(route('admin.active-bookings'));

        $response->assertOk();

        $ids = collect($response->json('activeBookings'))
            ->pluck('id')
            ->all();

        $this->assertContains($assignedBooking->id, $ids);
        $this->assertNotContains($unassignedBooking->id, $ids);
    }

    public function test_active_bookings_calculates_overtime_fee_correctly(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-19 12:00:00'));

        try {
            $admin = User::factory()->create([
                'role' => 'facility_admin',
                'is_active' => true,
            ]);

            $facility = $this->createFacility(
                'overtime-test',
                'Overtime Test Facility'
            );

            $facility->facilityAdmins()->attach($admin);

            SystemSetting::current()->update([
                'overtime_fee_per_hour' => 5.00,
            ]);

            $booking = $this->createBooking($facility, [
                'date' => '2026-10-19',
                'start_time' => '09:00:00',
                'end_time' => '10:00:00',
                'checked_in_at' => Carbon::parse(
                    '2026-10-19 09:00:00'
                ),
            ]);

            $response = $this->actingAs($admin)
                ->getJson(route('admin.active-bookings'));

            $response->assertOk();

            $activeBooking = collect(
                $response->json('activeBookings')
            )->firstWhere('id', $booking->id);

            $this->assertNotNull($activeBooking);
            $this->assertTrue($activeBooking['is_overtime']);
            $this->assertEquals(120, $activeBooking['overtime_minutes']);
            $this->assertEquals(10.00, $activeBooking['overtime_fee']);
            $this->assertEquals(
                5.00,
                $activeBooking['overtime_fee_per_hour']
            );
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_inactive_facility_admin_cannot_check_in_booking(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => false,
        ]);

        $facility = $this->createFacility(
            'check-in-inactive-admin',
            'Inactive Admin Facility'
        );

        $facility->facilityAdmins()->attach($admin);

        $booking = $this->createBooking($facility);

        $response = $this->actingAs($admin)->post(
            route('bookings.check-in', $booking)
        );

        $response->assertRedirect(route('login'));

        $this->assertGuest();

        $this->assertNull($booking->fresh()->checked_in_at);
    }

    public function test_inactive_facility_admin_cannot_check_out_booking(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => false,
        ]);

        $facility = $this->createFacility(
            'check-out-inactive-admin',
            'Inactive Admin Facility'
        );

        $facility->facilityAdmins()->attach($admin);

        $booking = $this->createBooking($facility, [
            'checked_in_at' => now()->subMinutes(30),
        ]);

        $response = $this->actingAs($admin)->post(
            route('bookings.check-out', $booking)
        );

        $response->assertRedirect(route('login'));

        $this->assertGuest();

        $this->assertNull($booking->fresh()->checked_out_at);
    }
}
