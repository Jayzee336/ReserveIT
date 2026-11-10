<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BookingSchedulePrivacyTest extends TestCase
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
        ?User $owner = null,
        string $guestEmail = 'guest@example.com'
    ): Booking {
        return Booking::create([
            'facility_id' => $facility->id,
            'user_id' => $owner?->id,
            'guest_name' => 'Private Guest Name',
            'guest_email' => $guestEmail,
            'guest_phone' => '09171234567',
            'date' => '2026-11-15',
            'booking_date' => '2026-11-15',
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => 'pending',
            'attendees' => 12,
            'notes' => 'Private booking purpose and notes',
        ]);
    }

    public function test_ordinary_user_receives_availability_without_private_booking_details(): void
    {
        $viewer = User::factory()->create(['role' => 'user']);
        $bookingOwner = User::factory()->create(['role' => 'user']);
        $facility = $this->createFacility('schedule-private-user', 'Private User Schedule');
        $booking = $this->createBooking($facility, $bookingOwner);

        $this->actingAs($viewer)
            ->get(route('schedule.index', ['date' => '2026-11-15']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('CalendarDashboard')
                ->has('serverBookings', 1)
                ->where('serverBookings.0.id', $booking->id)
                ->where('serverBookings.0.can_view_details', false)
                ->missing('serverBookings.0.user')
                ->missing('serverBookings.0.user_id')
                ->missing('serverBookings.0.guest_name')
                ->missing('serverBookings.0.guest_email')
                ->missing('serverBookings.0.notes')
                ->missing('serverBookings.0.approved_by')
                ->missing('serverBookings.0.approved_at')
            );
    }

    public function test_booking_owner_receives_private_details_for_their_own_calendar_event(): void
    {
        $owner = User::factory()->create(['role' => 'user']);
        $facility = $this->createFacility('schedule-owner-booking', 'Owner Booking Facility');
        $booking = $this->createBooking($facility, $owner, 'owner@example.com');

        $this->actingAs($owner)
            ->get(route('schedule.index', ['date' => '2026-11-15']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('serverBookings', 1)
                ->where('serverBookings.0.id', $booking->id)
                ->where('serverBookings.0.can_view_details', true)
                ->where('serverBookings.0.user.email', $owner->email)
                ->where('serverBookings.0.guest_email', 'owner@example.com')
                ->where('serverBookings.0.notes', 'Private booking purpose and notes')
            );
    }

    public function test_facility_admin_only_receives_assigned_facility_schedule_and_booking_details(): void
    {
        $admin = User::factory()->create(['role' => 'facility_admin']);
        $owner = User::factory()->create(['role' => 'user']);
        $assignedFacility = $this->createFacility(
            'schedule-assigned-facility',
            'Assigned Schedule Facility'
        );
        $unassignedFacility = $this->createFacility(
            'schedule-unassigned-facility',
            'Unassigned Schedule Facility'
        );

        $assignedFacility->facilityAdmins()->attach($admin);

        $assignedBooking = $this->createBooking(
            $assignedFacility,
            $owner,
            'assigned@example.com'
        );
        $assignedBooking->update([
            'status' => 'approved',
            'approved_by' => 'Assigned Facility Admin',
            'approved_at' => now(),
        ]);
        $this->createBooking(
            $unassignedFacility,
            $owner,
            'unassigned@example.com'
        );

        $this->actingAs($admin)
            ->get(route('schedule.index', ['date' => '2026-11-15']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('CalendarDashboard')
                ->has('serverFacilities', 1)
                ->where('serverFacilities.0.id', $assignedFacility->id)
                ->has('serverBookings', 1)
                ->where('serverBookings.0.id', $assignedBooking->id)
                ->where('serverBookings.0.guest_email', 'assigned@example.com')
                ->where('serverBookings.0.notes', 'Private booking purpose and notes')
                ->where('serverBookings.0.approved_by', 'Assigned Facility Admin')
                ->has('serverBookings.0.approved_at')
                ->where('serverBookings.0.user.email', $owner->email)
            );
    }

    public function test_super_admin_can_view_booking_details_for_all_facilities(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $owner = User::factory()->create(['role' => 'user']);
        $facility = $this->createFacility('schedule-super-admin', 'Super Admin Schedule');
        $booking = $this->createBooking($facility, $owner);

        $this->actingAs($admin)
            ->get(route('schedule.index', ['date' => '2026-11-15']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('CalendarDashboard')
                ->has('serverBookings', 1)
                ->where('serverBookings.0.id', $booking->id)
                ->where('serverBookings.0.guest_email', 'guest@example.com')
                ->where('serverBookings.0.notes', 'Private booking purpose and notes')
                ->where('serverBookings.0.user.email', $owner->email)
            );
    }
}
