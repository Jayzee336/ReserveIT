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

    public function test_cancelled_booking_cannot_be_checked_out_even_if_it_has_a_check_in_timestamp(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility(
            'check-out-cancelled',
            'Cancelled Booking Facility'
        );

        $facility->facilityAdmins()->attach($admin);

        $booking = $this->createBooking($facility, [
            'status' => 'cancelled',
            'checked_in_at' => now()->subMinutes(30),
        ]);

        $this->actingAs($admin)
            ->post(route('bookings.check-out', $booking))
            ->assertSessionHasErrors('check_out');

        $this->assertNull($booking->fresh()->checked_out_at);
        $this->assertNull($booking->fresh()->overtime_fee_amount);
    }

    public function test_declined_booking_cannot_be_checked_out(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility(
            'check-out-declined',
            'Declined Booking Facility'
        );

        $facility->facilityAdmins()->attach($admin);

        $booking = $this->createBooking($facility, [
            'status' => 'declined',
            'checked_in_at' => now()->subMinutes(30),
        ]);

        $this->actingAs($admin)
            ->post(route('bookings.check-out', $booking))
            ->assertSessionHasErrors('check_out');

        $this->assertNull($booking->fresh()->checked_out_at);
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

    public function test_regular_user_can_check_in_and_check_out_their_own_approved_booking(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-20 08:50:00'));

        try {
            $user = User::factory()->create([
                'role' => 'user',
                'is_active' => true,
            ]);

            $facility = $this->createFacility(
                'check-in-user-owner',
                'User Owner Test Facility'
            );

            $booking = $this->createBooking($facility, [
                'user_id' => $user->id,
                'date' => '2026-10-20',
                'start_time' => '09:00:00',
                'end_time' => '10:00:00',
            ]);

            $this->actingAs($user)
                ->post(route('bookings.check-in', $booking))
                ->assertSessionHasNoErrors();

            $this->assertNotNull($booking->fresh()->checked_in_at);

            $this->post(route('bookings.check-out', $booking))
                ->assertSessionHasNoErrors();

            $this->assertNotNull($booking->fresh()->checked_out_at);
            $this->assertSame(0, $booking->fresh()->overtime_minutes);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_regular_user_cannot_check_in_or_check_out_another_users_booking(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
        ]);
        $owner = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
        ]);

        $facility = $this->createFacility(
            'check-in-user-not-owner',
            'User Ownership Test Facility'
        );

        $booking = $this->createBooking($facility, [
            'user_id' => $owner->id,
            'checked_in_at' => now()->subMinutes(30),
        ]);

        $this->actingAs($user)
            ->post(route('bookings.check-in', $booking))
            ->assertForbidden();

        $this->post(route('bookings.check-out', $booking))
            ->assertForbidden();

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

    public function test_checkout_snapshots_overtime_rate_and_final_charge(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-20 10:30:00'));

        try {
            $admin = User::factory()->create([
                'role' => 'facility_admin',
                'is_active' => true,
            ]);

            $facility = $this->createFacility(
                'checkout-rate-snapshot',
                'Rate Snapshot Facility'
            );
            $facility->facilityAdmins()->attach($admin);

            SystemSetting::current()->update([
                'overtime_fee_per_hour' => 10.00,
            ]);

            $booking = $this->createBooking($facility, [
                'date' => '2026-10-20',
                'start_time' => '09:00:00',
                'end_time' => '10:00:00',
                'checked_in_at' => Carbon::parse('2026-10-20 09:00:00'),
            ]);

            $this->actingAs($admin)
                ->post(route('bookings.check-out', $booking))
                ->assertSessionHasNoErrors();

            $finalized = $booking->fresh();
            $this->assertSame(30, $finalized->overtime_minutes);
            $this->assertEquals(5.00, (float) $finalized->overtime_fee_amount);
            $this->assertEquals(10.00, (float) $finalized->overtime_fee_rate);
            $this->assertSame('unpaid', $finalized->overtime_payment_status);

            SystemSetting::current()->update([
                'overtime_fee_per_hour' => 25.00,
            ]);

            $unchanged = $booking->fresh();
            $this->assertEquals(5.00, (float) $unchanged->overtime_fee_amount);
            $this->assertEquals(10.00, (float) $unchanged->overtime_fee_rate);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_assigned_facility_admin_can_record_overtime_payment_once(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility(
            'overtime-payment-once',
            'Overtime Payment Facility'
        );
        $facility->facilityAdmins()->attach($admin);

        $booking = $this->createBooking($facility, [
            'checked_in_at' => now()->subHour(),
            'checked_out_at' => now(),
            'overtime_minutes' => 45,
            'overtime_fee_amount' => 12.50,
            'overtime_fee_rate' => 10.00,
            'overtime_payment_status' => 'unpaid',
        ]);

        $this->actingAs($admin)
            ->post(route('bookings.overtime-payment', $booking))
            ->assertSessionHasNoErrors();

        $paid = $booking->fresh();
        $this->assertSame('paid', $paid->overtime_payment_status);
        $this->assertNotNull($paid->overtime_paid_at);
        $this->assertSame((string) $admin->id, (string) $paid->overtime_paid_by);

        $this->actingAs($admin)
            ->post(route('bookings.overtime-payment', $booking))
            ->assertSessionHasErrors('payment');

        $this->assertSame('paid', $booking->fresh()->overtime_payment_status);
    }

    public function test_facility_admin_cannot_record_payment_for_unassigned_facility(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility(
            'overtime-payment-other',
            'Unassigned Payment Facility'
        );

        $booking = $this->createBooking($facility, [
            'checked_out_at' => now(),
            'overtime_fee_amount' => 12.50,
            'overtime_fee_rate' => 10.00,
            'overtime_payment_status' => 'unpaid',
        ]);

        $this->actingAs($admin)
            ->post(route('bookings.overtime-payment', $booking))
            ->assertForbidden();

        $this->assertSame('unpaid', $booking->fresh()->overtime_payment_status);
        $this->assertNull($booking->fresh()->overtime_paid_at);
    }


    public function test_overtime_billing_only_returns_records_for_assigned_facilities(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $assignedFacility = $this->createFacility(
            'billing-assigned',
            'Assigned Billing Facility'
        );
        $otherFacility = $this->createFacility(
            'billing-unassigned',
            'Unassigned Billing Facility'
        );
        $assignedFacility->facilityAdmins()->attach($admin);

        $assignedBooking = $this->createBooking($assignedFacility, [
            'checked_out_at' => now(),
            'overtime_minutes' => 30,
            'overtime_fee_amount' => 5.00,
            'overtime_fee_rate' => 10.00,
            'overtime_payment_status' => 'unpaid',
        ]);
        $unassignedBooking = $this->createBooking($otherFacility, [
            'checked_out_at' => now(),
            'overtime_minutes' => 60,
            'overtime_fee_amount' => 10.00,
            'overtime_fee_rate' => 10.00,
            'overtime_payment_status' => 'unpaid',
        ]);

        $response = $this->actingAs($admin)
            ->getJson(route('admin.overtime-billing'));

        $response->assertOk();

        $ids = collect($response->json('billingRecords'))
            ->pluck('id')
            ->all();

        $this->assertContains($assignedBooking->id, $ids);
        $this->assertNotContains($unassignedBooking->id, $ids);
    }

}
