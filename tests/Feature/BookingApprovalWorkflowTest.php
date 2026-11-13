<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingApprovalWorkflowTest extends TestCase
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

    private function createBooking(Facility $facility, string $status = 'pending'): Booking
    {
        return Booking::create([
            'facility_id' => $facility->id,
            'user_id' => null,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '123456789',
            'date' => '2026-11-15',
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => $status,
            'notes' => 'Approval workflow test',
        ]);
    }

    public function test_super_admin_can_filter_system_wide_bookings_by_status(): void
    {
        $admin = User::factory()->create([
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $mainFacility = $this->createFacility('global-filter-main', 'Main Conference Room');
        $labFacility = $this->createFacility('global-filter-lab', 'Lab 1');

        $pending = $this->createBooking($mainFacility, 'pending');
        $pending->update(['date' => now()->addDays(2)->toDateString()]);
        $approved = $this->createBooking($labFacility, 'approved');
        $declined = $this->createBooking($mainFacility, 'declined');

        foreach ([
            'pending' => [$pending->id, 'pendingBookings', 1, 'reviewedBookings', 0],
            'approved' => [$approved->id, 'reviewedBookings', 1, 'pendingBookings', 0],
            'declined' => [$declined->id, 'reviewedBookings', 1, 'pendingBookings', 0],
        ] as $status => [$expectedId, $primaryProp, $primaryCount, $emptyProp, $emptyCount]) {
            $this->actingAs($admin)
                ->get(route('admin.bookings.index', ['search' => '', 'status' => $status]))
                ->assertOk()
                ->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
                    ->component('Facilitator/Bookings')
                    ->has($primaryProp, $primaryCount)
                    ->where($primaryProp . '.0.id', $expectedId)
                    ->has($emptyProp, $emptyCount)
                );
        }
    }

    public function test_facility_admin_can_filter_cancelled_booking_history_and_view_reason(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('approval-cancelled-history', 'Cancelled History Facility');
        $facility->facilityAdmins()->attach($admin);

        $booking = $this->createBooking($facility, 'cancelled');
        $booking->update([
            'cancellation_reason' => 'The event was rescheduled.',
        ]);

        $this->actingAs($admin)
            ->get(route('facilitator.bookings.index', ['status' => 'cancelled']))
            ->assertOk()
            ->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
                ->component('Facilitator/Bookings')
                ->has('reviewedBookings', 1)
                ->where('reviewedBookings.0.status', 'cancelled')
                ->where('reviewedBookings.0.cancellation_reason', 'The event was rescheduled.')
            );
    }

    public function test_assigned_facility_admin_can_approve_pending_booking(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('approval-assigned', 'Assigned Facility');
        $facility->facilityAdmins()->attach($admin);

        $booking = $this->createBooking($facility);

        $response = $this->actingAs($admin)->patch(
            route('facilitator.bookings.approve', $booking)
        );

        $response->assertSessionHasNoErrors();

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => 'approved',
            'approved_by' => $admin->name,
        ]);

        $this->assertNotNull($booking->fresh()->approved_at);
    }

    public function test_booking_with_overlapping_active_slot_cannot_be_approved(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('approval-conflict', 'Conflict Facility');
        $facility->facilityAdmins()->attach($admin);

        $candidate = $this->createBooking($facility);
        $conflicting = $this->createBooking($facility);
        $conflicting->update([
            'start_time' => '09:30:00',
            'end_time' => '10:30:00',
        ]);

        SystemSetting::current()->update([
            'cleanup_buffer_minutes' => 0,
        ]);

        $this->actingAs($admin)->patch(
            route('facilitator.bookings.approve', $candidate)
        );

        $this->assertSame('pending', $candidate->fresh()->status);
    }

    public function test_booking_inside_cleanup_buffer_cannot_be_approved(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('approval-buffer', 'Buffer Facility');
        $facility->facilityAdmins()->attach($admin);

        $candidate = $this->createBooking($facility);
        $nearby = $this->createBooking($facility);
        $nearby->update([
            'start_time' => '10:15:00',
            'end_time' => '11:15:00',
        ]);

        SystemSetting::current()->update([
            'cleanup_buffer_minutes' => 30,
        ]);

        $this->actingAs($admin)->patch(
            route('facilitator.bookings.approve', $candidate)
        );

        $this->assertSame('pending', $candidate->fresh()->status);
    }

    public function test_unassigned_facility_admin_cannot_approve_booking(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('approval-other', 'Other Facility');
        $booking = $this->createBooking($facility);

        $response = $this->actingAs($admin)->patch(
            route('facilitator.bookings.approve', $booking)
        );

        $response->assertForbidden();

        $this->assertSame('pending', $booking->fresh()->status);
    }

    public function test_unassigned_facility_admin_cannot_decline_booking(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('decline-other', 'Other Decline Facility');
        $booking = $this->createBooking($facility);

        $response = $this->actingAs($admin)->patch(
            route('facilitator.bookings.decline', $booking),
            ['rejection_reason' => 'Test reason']
        );

        $response->assertForbidden();

        $this->assertSame('pending', $booking->fresh()->status);
    }

    public function test_ordinary_user_cannot_approve_booking(): void
    {
        $user = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('approval-user-test', 'User Test Facility');
        $booking = $this->createBooking($facility);

        $response = $this->actingAs($user)->patch(
            route('facilitator.bookings.approve', $booking)
        );

        $response->assertForbidden();

        $this->assertSame('pending', $booking->fresh()->status);
    }

    public function test_already_approved_booking_cannot_be_approved_again(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('approval-repeat', 'Repeat Approval Facility');
        $facility->facilityAdmins()->attach($admin);

        $booking = $this->createBooking($facility, 'approved');

        $response = $this->actingAs($admin)->patch(
            route('facilitator.bookings.approve', $booking)
        );

        $this->assertSame('approved', $booking->fresh()->status);
    }

    public function test_declined_booking_cannot_be_approved(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('approval-declined', 'Declined Facility');
        $facility->facilityAdmins()->attach($admin);

        $booking = $this->createBooking($facility, 'declined');

        $response = $this->actingAs($admin)->patch(
            route('facilitator.bookings.approve', $booking)
        );

        $this->assertSame('declined', $booking->fresh()->status);
    }

    public function test_approved_booking_cannot_be_declined(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('decline-approved', 'Approved Facility');
        $facility->facilityAdmins()->attach($admin);

        $booking = $this->createBooking($facility, 'approved');

        $response = $this->actingAs($admin)->patch(
            route('facilitator.bookings.decline', $booking),
            ['rejection_reason' => 'Attempt to change approved booking']
        );

        $this->assertSame('approved', $booking->fresh()->status);
    }

    public function test_declined_booking_cannot_be_declined_again(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('decline-repeat', 'Repeat Decline Facility');
        $facility->facilityAdmins()->attach($admin);

        $booking = $this->createBooking($facility, 'declined');

        $response = $this->actingAs($admin)->patch(
            route('facilitator.bookings.decline', $booking),
            ['rejection_reason' => 'Second decline attempt']
        );

        $this->assertSame('declined', $booking->fresh()->status);
    }
}