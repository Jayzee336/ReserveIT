<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingExtensionRequest;
use App\Models\Facility;
use App\Models\SystemSetting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingExtensionWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function createFacility(string $id = 'extension-room'): Facility
    {
        return Facility::create([
            'id' => $id,
            'name' => 'Extension Test Room',
            'type' => 'Venue',
            'capacity' => 80,
            'description' => 'Test facility for overtime extensions',
            'imageUrl' => 'https://example.com/facility.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building A',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
        ]);
    }

    private function createUser(string $role = 'user'): User
    {
        return User::factory()->create([
            'role' => $role,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
    }

    private function createActiveBooking(Facility $facility, User $owner): Booking
    {
        return Booking::create([
            'facility_id' => $facility->id,
            'user_id' => $owner->id,
            'date' => today()->toDateString(),
            'booking_date' => today()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => 'approved',
            'attendees' => 15,
            'needs_manpower' => false,
            'notes' => 'Active reservation for extension test',
            'checked_in_at' => now()->subMinutes(20),
        ]);
    }

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::now()->startOfDay()->setTime(9, 45));

        SystemSetting::current()->update([
            'cleanup_buffer_minutes' => 0,
            'opening_time' => '08:00',
            'closing_time' => '00:00',
            'max_booking_duration' => 4,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_scheduled_closure_blocks_an_overtime_extension_that_would_enter_its_window(): void
    {
        $owner = $this->createUser();
        $superAdmin = $this->createUser('super_admin');
        $facility = $this->createFacility('extension-scheduled-closure-room');
        $booking = $this->createActiveBooking($facility, $owner);
        $date = today()->toDateString();

        $this->actingAs($superAdmin)
            ->post(route('admin.facilities.scheduled-closures.store', $facility), [
                'reason' => 'Electrical maintenance',
                'scheduled_start_at' => $date . 'T10:15',
                'scheduled_end_at' => $date . 'T10:45',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->actingAs($owner)
            ->from(route('bookings.index'))
            ->post(route('bookings.extensions.store', $booking), [
                'requested_end_time' => '10:30',
                'reason' => 'The activity needs another thirty minutes.',
            ])
            ->assertSessionHasErrors('requested_end_time');

        $this->assertDatabaseCount('booking_extension_requests', 0);
        $this->assertSame('10:00:00', $booking->fresh()->end_time);
    }

    public function test_booking_owner_can_request_an_extension_without_immediately_changing_the_booking(): void
    {
        $owner = $this->createUser();
        $facility = $this->createFacility();
        $booking = $this->createActiveBooking($facility, $owner);

        $response = $this->actingAs($owner)->post(
            route('bookings.extensions.store', $booking),
            [
                'requested_end_time' => '10:30',
                'reason' => 'The activity needs another thirty minutes.',
            ]
        );

        $response->assertSessionHasNoErrors();

        $request = BookingExtensionRequest::query()->where('booking_id', $booking->id)->firstOrFail();

        $this->assertSame('pending', $request->status);
        $this->assertSame(30, $request->requested_minutes);
        $this->assertSame('10:00:00', $booking->fresh()->end_time);
    }

    public function test_assigned_facility_admin_can_approve_and_update_the_booking_end_time(): void
    {
        $owner = $this->createUser();
        $admin = $this->createUser('facility_admin');
        $facility = $this->createFacility('extension-approve-room');
        $facility->facilityAdmins()->attach($admin);

        $booking = $this->createActiveBooking($facility, $owner);
        $extension = BookingExtensionRequest::create([
            'booking_id' => $booking->id,
            'requested_by' => $owner->id,
            'original_end_time' => '10:00',
            'requested_end_time' => '11:00',
            'requested_minutes' => 60,
            'reason' => 'The event needs one more hour.',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($admin)->patch(
            route('overtime-extensions.approve', $extension)
        );

        $response->assertSessionHasNoErrors();

        $this->assertSame('11:00:00', $booking->fresh()->end_time);
        $this->assertDatabaseHas('booking_extension_requests', [
            'id' => $extension->id,
            'status' => 'approved',
            'reviewed_by' => $admin->id,
        ]);
    }

    public function test_unassigned_facility_admin_cannot_approve_an_extension(): void
    {
        $owner = $this->createUser();
        $admin = $this->createUser('facility_admin');
        $facility = $this->createFacility('extension-protected-room');
        $booking = $this->createActiveBooking($facility, $owner);

        $extension = BookingExtensionRequest::create([
            'booking_id' => $booking->id,
            'requested_by' => $owner->id,
            'original_end_time' => '10:00',
            'requested_end_time' => '10:30',
            'requested_minutes' => 30,
            'reason' => 'The activity needs more time.',
            'status' => 'pending',
        ]);

        $this->actingAs($admin)
            ->patch(route('overtime-extensions.approve', $extension))
            ->assertForbidden();

        $this->assertSame('pending', $extension->fresh()->status);
        $this->assertSame('10:00:00', $booking->fresh()->end_time);
    }

    public function test_extension_is_rejected_when_another_booking_overlaps_its_requested_time(): void
    {
        $owner = $this->createUser();
        $admin = $this->createUser('facility_admin');
        $facility = $this->createFacility('extension-conflict-room');
        $facility->facilityAdmins()->attach($admin);

        $booking = $this->createActiveBooking($facility, $owner);

        Booking::create([
            'facility_id' => $facility->id,
            'user_id' => null,
            'guest_name' => 'Another booking',
            'guest_email' => 'guest@example.com',
            'date' => today()->toDateString(),
            'booking_date' => today()->toDateString(),
            'start_time' => '10:30:00',
            'end_time' => '11:30:00',
            'status' => 'approved',
            'attendees' => 5,
            'needs_manpower' => false,
            'notes' => 'Conflicting reservation',
        ]);

        $extension = BookingExtensionRequest::create([
            'booking_id' => $booking->id,
            'requested_by' => $owner->id,
            'original_end_time' => '10:00',
            'requested_end_time' => '11:00',
            'requested_minutes' => 60,
            'reason' => 'The activity needs one more hour.',
            'status' => 'pending',
        ]);

        SystemSetting::current()->update(['cleanup_buffer_minutes' => 0]);

        $this->actingAs($admin)
            ->patch(route('overtime-extensions.approve', $extension))
            ->assertSessionHas('toast.message');

        $this->assertSame('pending', $extension->fresh()->status);
        $this->assertSame('10:00:00', $booking->fresh()->end_time);
    }

    public function test_another_user_cannot_request_an_extension_for_someone_elses_booking(): void
    {
        $owner = $this->createUser();
        $otherUser = $this->createUser();
        $facility = $this->createFacility('extension-owner-protection');
        $booking = $this->createActiveBooking($facility, $owner);

        $this->actingAs($otherUser)
            ->post(route('bookings.extensions.store', $booking), [
                'requested_end_time' => '10:30',
                'reason' => 'The activity needs another thirty minutes.',
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('booking_extension_requests', 0);
        $this->assertSame('10:00:00', $booking->fresh()->end_time);
    }

    public function test_a_booking_cannot_have_two_pending_extension_requests(): void
    {
        $owner = $this->createUser();
        $facility = $this->createFacility('extension-one-pending');
        $booking = $this->createActiveBooking($facility, $owner);

        $first = $this->actingAs($owner)->post(
            route('bookings.extensions.store', $booking),
            [
                'requested_end_time' => '10:30',
                'reason' => 'The activity needs another thirty minutes.',
            ]
        );

        $first->assertSessionHasNoErrors();

        $this->from(route('bookings.index'))
            ->post(route('bookings.extensions.store', $booking), [
                'requested_end_time' => '11:00',
                'reason' => 'The activity needs another full hour.',
            ])
            ->assertSessionHasErrors('requested_end_time');

        $this->assertDatabaseCount('booking_extension_requests', 1);
        $this->assertSame('10:00:00', $booking->fresh()->end_time);
    }

    public function test_facility_admin_can_request_an_extension_for_their_own_booking(): void
    {
        $facilityAdmin = $this->createUser('facility_admin');
        $facility = $this->createFacility('extension-admin-owner-room');
        $booking = $this->createActiveBooking($facility, $facilityAdmin);

        $this->actingAs($facilityAdmin)
            ->post(route('bookings.extensions.store', $booking), [
                'requested_end_time' => '10:30',
                'reason' => 'My activity needs another thirty minutes.',
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('booking_extension_requests', [
            'booking_id' => $booking->id,
            'requested_by' => $facilityAdmin->id,
            'status' => 'pending',
        ]);
        $this->assertSame('10:00:00', $booking->fresh()->end_time);
    }
}
