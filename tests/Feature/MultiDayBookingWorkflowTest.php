<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\FacilityOperatingHour;
use App\Models\SystemSetting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MultiDayBookingWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function createFacility(string $id = 'multi-day-facility'): Facility
    {
        return Facility::create([
            'id' => $id,
            'name' => 'Multi-day Test Facility',
            'type' => 'Venue',
            'capacity' => 80,
            'description' => 'Multi-day booking feature test.',
            'imageUrl' => '/images/facility-placeholder.svg',
            'requirement' => 'STANDARD',
            'location' => 'Test building',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
            'is_available' => true,
        ]);
    }

    private function createUser(): User
    {
        return User::factory()->create([
            'role' => 'user',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
    }

    protected function setUp(): void
    {
        parent::setUp();

        SystemSetting::current()->update([
            'auto_approve_scope' => 'disabled',
            'cleanup_buffer_minutes' => 0,
            'max_advance_days' => 30,
            'max_booking_duration' => 4,
            'require_consent_letter' => false,
            'opening_time' => '08:00',
            'closing_time' => '22:00',
        ]);
    }

    public function test_user_can_create_a_reservation_for_an_inclusive_date_range(): void
    {
        $user = $this->createUser();
        $facility = $this->createFacility();
        $startDate = today()->addDays(3)->toDateString();
        $endDate = today()->addDays(5)->toDateString();

        $this->actingAs($user)
            ->post(route('bookings.store'), [
                'facility_id' => $facility->id,
                'date' => $startDate,
                'end_date' => $endDate,
                'start_time' => '09:00',
                'end_time' => '10:00',
                'attendees' => 15,
                'needs_manpower' => false,
                'notes' => 'A multi-day school activity.',
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('bookings', [
            'facility_id' => $facility->id,
            'user_id' => $user->id,
            'date' => $startDate,
            'booking_date' => $startDate,
            'end_date' => $endDate,
            'start_time' => '09:00',
            'end_time' => '10:00',
            'status' => 'pending',
        ]);
    }

    public function test_legacy_single_day_booking_submission_defaults_end_date_to_start_date(): void
    {
        $user = $this->createUser();
        $facility = $this->createFacility('multi-day-single-day-facility');
        $date = today()->addDays(3)->toDateString();

        $this->actingAs($user)
            ->post(route('bookings.store'), [
                'facility_id' => $facility->id,
                'date' => $date,
                'start_time' => '09:00',
                'end_time' => '10:00',
                'attendees' => 15,
                'needs_manpower' => false,
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('bookings', [
            'facility_id' => $facility->id,
            'user_id' => $user->id,
            'date' => $date,
            'end_date' => $date,
        ]);
    }

    public function test_multi_day_reservation_is_rejected_when_one_of_its_dates_is_closed(): void
    {
        $user = $this->createUser();
        $facility = $this->createFacility('multi-day-closed-date-facility');
        $start = today()->addDays(3);
        $closedDate = $start->copy()->addDay();
        $end = $start->copy()->addDays(2);

        FacilityOperatingHour::create([
            'facility_id' => $facility->id,
            'day_of_week' => $closedDate->dayOfWeek,
            'is_closed' => true,
            'opens_at' => null,
            'closes_at' => null,
        ]);

        $this->actingAs($user)
            ->from(route('facilities.index'))
            ->post(route('bookings.store'), [
                'facility_id' => $facility->id,
                'date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
                'start_time' => '09:00',
                'end_time' => '10:00',
                'attendees' => 15,
                'needs_manpower' => false,
            ])
            ->assertSessionHasErrors('date');

        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_multi_day_reservation_conflicts_with_an_existing_booking_on_a_later_date(): void
    {
        $user = $this->createUser();
        $facility = $this->createFacility('multi-day-conflict-facility');
        $start = today()->addDays(3);
        $conflictDate = $start->copy()->addDay();
        $end = $start->copy()->addDays(2);

        Booking::create([
            'facility_id' => $facility->id,
            'user_id' => null,
            'guest_name' => 'Existing reservation',
            'guest_email' => 'existing@example.com',
            'date' => $conflictDate->toDateString(),
            'booking_date' => $conflictDate->toDateString(),
            'end_date' => $conflictDate->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => 'approved',
            'attendees' => 10,
            'needs_manpower' => false,
            'notes' => 'Existing booking on the second day.',
        ]);

        $this->actingAs($user)
            ->from(route('facilities.index'))
            ->post(route('bookings.store'), [
                'facility_id' => $facility->id,
                'date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
                'start_time' => '09:00',
                'end_time' => '10:00',
                'attendees' => 15,
                'needs_manpower' => false,
            ])
            ->assertSessionHasErrors('start_time');

        $this->assertDatabaseCount('bookings', 1);
    }

    public function test_calendar_includes_a_reservation_that_started_before_the_selected_month(): void
    {
        $user = $this->createUser();
        $facility = $this->createFacility('multi-day-calendar-facility');

        // The range begins near the end of this month and continues into next month.
        $start = today()->addDays(18);
        $end = $start->copy()->addDays(5);
        $selectedMonthDate = $end->copy()->startOfMonth()->toDateString();

        Booking::create([
            'facility_id' => $facility->id,
            'user_id' => $user->id,
            'date' => $start->toDateString(),
            'booking_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => 'approved',
            'attendees' => 15,
            'needs_manpower' => false,
            'notes' => 'Continues into selected month.',
        ]);

        $this->actingAs($user)
            ->get(route('schedule.index', ['date' => $selectedMonthDate]))
            ->assertOk()
            ->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
                ->component('CalendarDashboard')
                ->has('serverBookings', 1)
                ->where('serverBookings.0.end_date', $end->toDateString())
            );
    }

    public function test_multi_day_booking_cannot_be_approved_if_a_later_date_is_closed(): void
    {
        $owner = $this->createUser();
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
        $facility = $this->createFacility('multi-day-approval-hours-facility');
        $facility->facilityAdmins()->attach($admin);

        $start = today()->addDays(3);
        $closedDate = $start->copy()->addDay();
        $end = $start->copy()->addDays(2);

        $booking = Booking::create([
            'facility_id' => $facility->id,
            'user_id' => $owner->id,
            'date' => $start->toDateString(),
            'booking_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => 'pending',
            'attendees' => 15,
            'needs_manpower' => false,
            'notes' => 'Multi-day approval hours test.',
        ]);

        FacilityOperatingHour::create([
            'facility_id' => $facility->id,
            'day_of_week' => $closedDate->dayOfWeek,
            'is_closed' => true,
            'opens_at' => null,
            'closes_at' => null,
        ]);

        $this->actingAs($admin)
            ->patch(route('facilitator.bookings.approve', $booking))
            ->assertSessionHas('toast.message');

        $this->assertSame('pending', $booking->fresh()->status);
    }
}
