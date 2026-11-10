<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\FacilityUnavailabilityPeriod;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScheduledFacilityClosureTest extends TestCase
{
    use RefreshDatabase;

    private function createFacility(string $id = 'scheduled-closure-facility'): Facility
    {
        return Facility::create([
            'id' => $id,
            'name' => 'Scheduled Closure Test Facility',
            'type' => 'Venue',
            'capacity' => 80,
            'description' => 'Scheduled closure feature test.',
            'imageUrl' => '/images/facility-placeholder.svg',
            'requirement' => 'STANDARD',
            'location' => 'Test building',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
            'is_available' => true,
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

    private function setBookingDefaults(): void
    {
        SystemSetting::current()->update([
            'opening_time' => '08:00',
            'closing_time' => '22:00',
            'max_advance_days' => 30,
            'max_booking_duration' => 4,
            'cleanup_buffer_minutes' => 0,
            'require_consent_letter' => false,
            'auto_approve_scope' => 'disabled',
        ]);
    }

    private function closurePayload(string $date): array
    {
        return [
            'reason' => 'Electrical maintenance',
            'scheduled_start_at' => $date . 'T10:30',
            'scheduled_end_at' => $date . 'T11:30',
        ];
    }

    private function scheduleClosure(Facility $facility, User $admin, string $date): FacilityUnavailabilityPeriod
    {
        $this->actingAs($admin)
            ->post(route('admin.facilities.scheduled-closures.store', $facility), $this->closurePayload($date))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        return FacilityUnavailabilityPeriod::query()
            ->where('facility_id', $facility->id)
            ->whereNotNull('scheduled_start_at')
            ->firstOrFail();
    }

    public function test_assigned_admin_schedules_closure_and_only_overlapping_booking_owners_are_notified(): void
    {
        $this->setBookingDefaults();

        $facility = $this->createFacility();
        $admin = $this->createUser('facility_admin');
        $affectedUser = $this->createUser();
        $unaffectedUser = $this->createUser();
        $facility->facilityAdmins()->attach($admin);

        $date = today()->addDays(3)->toDateString();
        $secondSessionDate = today()->addDays(4)->toDateString();
        $thirdSessionDate = today()->addDays(5)->toDateString();

        // One owner has three recurring session dates. The scheduled closure
        // overlaps only the first session, so the notification must identify
        // only that date rather than all sessions in the plan.
        foreach ([$date, $secondSessionDate, $thirdSessionDate] as $sessionDate) {
            Booking::create([
                'facility_id' => $facility->id,
                'user_id' => $affectedUser->id,
                'date' => $sessionDate,
                'booking_date' => $sessionDate,
                'end_date' => $sessionDate,
                'start_time' => '10:00:00',
                'end_time' => '12:00:00',
                'status' => 'approved',
                'attendees' => 10,
                'needs_manpower' => false,
                'notes' => 'Recurring activity session.',
            ]);
        }

        Booking::create([
            'facility_id' => $facility->id,
            'user_id' => $unaffectedUser->id,
            'date' => $date,
            'booking_date' => $date,
            'end_date' => $date,
            'start_time' => '13:00:00',
            'end_time' => '14:00:00',
            'status' => 'approved',
            'attendees' => 10,
            'needs_manpower' => false,
            'notes' => 'Outside the maintenance window.',
        ]);

        $period = $this->scheduleClosure($facility, $admin, $date);

        $this->assertSame('Electrical maintenance', $period->reason);
        $this->assertSame([$affectedUser->id], $period->fresh()->affected_user_ids);
        $this->assertSame(1, $affectedUser->notifications()->count());
        $this->assertSame(0, $unaffectedUser->notifications()->count());

        $notificationMessage = $affectedUser->notifications()->firstOrFail()->data['message'];
        $this->assertStringContainsString(
            \\Carbon\\Carbon::parse($date)->format('M d, Y'),
            $notificationMessage
        );
        $this->assertStringNotContainsString(
            \\Carbon\\Carbon::parse($secondSessionDate)->format('M d, Y'),
            $notificationMessage
        );
        $this->assertStringNotContainsString(
            \\Carbon\\Carbon::parse($thirdSessionDate)->format('M d, Y'),
            $notificationMessage
        );

        $this->assertTrue($facility->fresh()->is_available);
    }

    public function test_booking_creation_rejects_only_times_that_overlap_a_scheduled_closure(): void
    {
        $this->setBookingDefaults();

        $facility = $this->createFacility('scheduled-closure-booking-facility');
        $admin = $this->createUser('super_admin');
        $user = $this->createUser();
        $date = today()->addDays(3)->toDateString();

        $this->scheduleClosure($facility, $admin, $date);

        $this->actingAs($user)
            ->from(route('facilities.index'))
            ->post(route('bookings.store'), [
                'facility_id' => $facility->id,
                'date' => $date,
                'end_date' => $date,
                'start_time' => '10:45',
                'end_time' => '11:00',
                'attendees' => 10,
                'needs_manpower' => false,
                'notes' => 'This should be rejected because it overlaps the closure.',
            ])
            ->assertSessionHasErrors('date');

        $this->actingAs($user)
            ->from(route('facilities.index'))
            ->post(route('bookings.store'), [
                'facility_id' => $facility->id,
                'date' => $date,
                'end_date' => $date,
                'start_time' => '12:00',
                'end_time' => '13:00',
                'attendees' => 10,
                'needs_manpower' => false,
                'notes' => 'This time is outside the scheduled closure.',
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseCount('bookings', 1);
    }

    public function test_scheduled_closure_can_be_cancelled_early_and_does_not_toggle_global_availability(): void
    {
        $this->setBookingDefaults();

        $facility = $this->createFacility('scheduled-closure-restore-facility');
        $admin = $this->createUser('super_admin');
        $user = $this->createUser();
        $date = today()->addDays(3)->toDateString();

        $period = $this->scheduleClosure($facility, $admin, $date);

        $this->actingAs($admin)
            ->patch(route('admin.facilities.scheduled-closures.restore', [
                'facility' => $facility->id,
                'period' => $period->id,
            ]))
            ->assertRedirect();

        $this->assertNotNull($period->fresh()->ended_at);
        $this->assertSame($admin->id, $period->fresh()->restored_by);
        $this->assertTrue($facility->fresh()->is_available);

        $this->actingAs($user)
            ->from(route('facilities.index'))
            ->post(route('bookings.store'), [
                'facility_id' => $facility->id,
                'date' => $date,
                'end_date' => $date,
                'start_time' => '10:45',
                'end_time' => '11:00',
                'attendees' => 10,
                'needs_manpower' => false,
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseCount('bookings', 1);
    }

    public function test_facility_admin_cannot_schedule_closure_for_an_unassigned_facility(): void
    {
        $facility = $this->createFacility('scheduled-closure-access-facility');
        $admin = $this->createUser('facility_admin');

        $this->actingAs($admin)
            ->post(route('admin.facilities.scheduled-closures.store', $facility), $this->closurePayload(
                today()->addDays(3)->toDateString()
            ))
            ->assertForbidden();

        $this->assertDatabaseCount('facility_unavailability_periods', 0);
    }
}
