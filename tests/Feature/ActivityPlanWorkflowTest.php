<?php

namespace Tests\Feature;

use App\Models\ActivityPlan;
use App\Models\Booking;
use App\Models\Facility;
use App\Models\SystemSetting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ActivityPlanWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function createFacility(string $id = 'activity-plan-room'): Facility
    {
        return Facility::create([
            'id' => $id,
            'name' => 'Activity Plan Room',
            'type' => 'Venue',
            'capacity' => 80,
            'description' => 'Recurring activity test facility',
            'imageUrl' => 'https://example.com/facility.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building A',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
        ]);
    }

    private function createVerifiedUser(string $role = 'user'): User
    {
        return User::factory()->create([
            'role' => $role,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
    }

    private function activityPlanPayload(Facility $facility): array
    {
        $times = [];
        for ($day = 0; $day <= 6; $day++) {
            $times[$day] = [
                'start_time' => '09:00',
                'end_time' => '10:00',
            ];
        }

        return [
            'facility_id' => $facility->getKey(),
            'title' => 'Weekly Organization Meeting',
            'description' => 'A recurring student organization meeting.',
            'start_date' => '2026-11-16',
            'end_date' => '2026-11-20',
            'recurrence_days' => [1, 3],
            'weekday_times' => $times,
            'sessions' => [
                [
                    'date' => '2026-11-16',
                    'start_time' => '09:00',
                    'end_time' => '10:00',
                    'attendees' => 25,
                    'needs_manpower' => false,
                    'notes' => 'Monday session',
                ],
                [
                    'date' => '2026-11-18',
                    'start_time' => '09:00',
                    'end_time' => '10:00',
                    'attendees' => 25,
                    'needs_manpower' => false,
                    'notes' => 'Wednesday session',
                ],
            ],
            'activity_plan_file' => UploadedFile::fake()->create(
                'semester-plan.pdf',
                100,
                'application/pdf'
            ),
        ];
    }

    protected function setUp(): void
    {
        parent::setUp();

        // Keep the fixed semester fixtures valid regardless of the real date
        // when this suite is executed in CI or on a developer machine.
        Carbon::setTestNow('2026-11-10 08:00:00');

        Storage::fake('tigris');
        SystemSetting::current()->update([
            'auto_approve_scope' => 'disabled',
            'cleanup_buffer_minutes' => 0,
            'opening_time' => '08:00',
            'closing_time' => '00:00',
            'max_booking_duration' => 4,
            'max_advance_days' => 30,
            'require_consent_letter' => false,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_activity_plan_submission_rejects_sessions_that_overlap_a_scheduled_closure(): void
    {
        $facility = $this->createFacility('activity-plan-scheduled-closure-room');
        $user = $this->createVerifiedUser();
        $superAdmin = $this->createVerifiedUser('super_admin');

        $this->actingAs($superAdmin)
            ->post(route('admin.facilities.scheduled-closures.store', $facility), [
                'reason' => 'Electrical maintenance',
                'scheduled_start_at' => '2026-11-16T09:30',
                'scheduled_end_at' => '2026-11-16T09:45',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->actingAs($user)
            ->from(route('activity-plans.index'))
            ->post(route('activity-plans.store'), $this->activityPlanPayload($facility))
            ->assertSessionHasErrors('sessions.0.date');

        $this->assertDatabaseCount('activity_plans', 0);
        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_facility_specific_advance_notice_is_enforced_for_recurring_sessions(): void
    {
        $user = $this->createVerifiedUser();
        $facility = $this->createFacility();
        $facility->update(['booking_lead_time_days' => 7]);

        $this->actingAs($user)
            ->post(route('activity-plans.store'), $this->activityPlanPayload($facility))
            ->assertSessionHasErrors('sessions.0.date');

        $this->assertDatabaseCount('activity_plans', 0);
        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_facility_specific_maximum_booking_hours_is_enforced_for_activity_plan_sessions(): void
    {
        $user = $this->createVerifiedUser();
        $facility = $this->createFacility();
        $facility->update(['max_booking_hours' => 1]);
        $payload = $this->activityPlanPayload($facility);
        $payload['sessions'][0]['end_time'] = '11:00';
        $payload['weekday_times'][1] = ['start_time' => '09:00', 'end_time' => '11:00'];

        $this->actingAs($user)
            ->post(route('activity-plans.store'), $payload)
            ->assertSessionHasErrors('sessions.0.end_time');
    }

    public function test_user_can_submit_a_recurring_plan_with_separate_booking_sessions(): void
    {
        $user = $this->createVerifiedUser();
        $facility = $this->createFacility();

        $response = $this->actingAs($user)->post(
            route('activity-plans.store'),
            $this->activityPlanPayload($facility)
        );

        $response->assertSessionHasNoErrors();

        $plan = ActivityPlan::query()->where('title', 'Weekly Organization Meeting')->firstOrFail();

        $this->assertSame('pending', $plan->status);
        $this->assertSame([1, 3], $plan->recurrence_days);
        $this->assertNotNull($plan->attachment_path);
        $this->assertSame('semester-plan.pdf', $plan->attachment_name);

        $this->assertDatabaseHas('bookings', [
            'activity_plan_id' => $plan->getKey(),
            'date' => '2026-11-16',
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('bookings', [
            'activity_plan_id' => $plan->getKey(),
            'date' => '2026-11-18',
            'status' => 'pending',
        ]);

        $this->assertCount(2, $plan->bookings);
        Storage::disk('tigris')->assertExists($plan->attachment_path);
    }

    public function test_plan_rejects_a_session_on_a_weekday_that_was_not_selected(): void
    {
        $user = $this->createVerifiedUser();
        $facility = $this->createFacility();
        $payload = $this->activityPlanPayload($facility);
        $payload['sessions'][1]['date'] = '2026-11-17';

        $response = $this->actingAs($user)->from(route('activity-plans.index'))->post(
            route('activity-plans.store'),
            $payload
        );

        $response->assertRedirect(route('activity-plans.index'));
        $response->assertSessionHasErrors('sessions.1.date');
        $this->assertDatabaseCount('activity_plans', 0);
        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_unassigned_facility_admin_cannot_submit_activity_plan_for_a_facility(): void
    {
        $admin = $this->createVerifiedUser('facility_admin');
        $facility = $this->createFacility();

        $response = $this->actingAs($admin)->post(
            route('activity-plans.store'),
            $this->activityPlanPayload($facility)
        );

        $response->assertForbidden();
        $this->assertDatabaseCount('activity_plans', 0);
        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_activity_plan_index_is_scoped_to_the_owners_own_plans(): void
    {
        $owner = $this->createVerifiedUser();
        $otherUser = $this->createVerifiedUser();
        $facility = $this->createFacility();

        $ownedPlan = ActivityPlan::create([
            'user_id' => $owner->id,
            'facility_id' => $facility->id,
            'title' => 'My Plan',
            'description' => null,
            'start_date' => '2026-11-16',
            'end_date' => '2026-11-20',
            'recurrence_days' => [1, 3],
            'weekday_times' => [],
            'status' => 'pending',
        ]);

        ActivityPlan::create([
            'user_id' => $otherUser->id,
            'facility_id' => $facility->id,
            'title' => 'Another User Plan',
            'description' => null,
            'start_date' => '2026-11-16',
            'end_date' => '2026-11-20',
            'recurrence_days' => [1],
            'weekday_times' => [],
            'status' => 'pending',
        ]);

        $this->actingAs($owner)
            ->get(route('activity-plans.index'))
            ->assertOk()
            ->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
                ->component('ActivityPlans/Index')
                ->has('plans.data', 1)
                ->where('plans.data.0.id', $ownedPlan->getKey())
            );
    }

    public function test_approving_one_session_marks_the_parent_plan_partially_approved(): void
    {
        $owner = $this->createVerifiedUser();
        $admin = $this->createVerifiedUser('facility_admin');
        $facility = $this->createFacility('activity-plan-approval-room');
        $facility->facilityAdmins()->attach($admin);

        $plan = ActivityPlan::create([
            'user_id' => $owner->id,
            'facility_id' => $facility->id,
            'title' => 'Partially Approved Plan',
            'description' => null,
            'start_date' => '2026-11-16',
            'end_date' => '2026-11-18',
            'recurrence_days' => [1, 3],
            'weekday_times' => [],
            'status' => 'pending',
        ]);

        $first = Booking::create([
            'facility_id' => $facility->id,
            'activity_plan_id' => $plan->id,
            'user_id' => $owner->id,
            'date' => '2026-11-16',
            'booking_date' => '2026-11-16',
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => 'pending',
            'attendees' => 10,
            'needs_manpower' => false,
            'notes' => 'Monday session',
        ]);

        Booking::create([
            'facility_id' => $facility->id,
            'activity_plan_id' => $plan->id,
            'user_id' => $owner->id,
            'date' => '2026-11-18',
            'booking_date' => '2026-11-18',
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => 'pending',
            'attendees' => 10,
            'needs_manpower' => false,
            'notes' => 'Wednesday session',
        ]);

        $this->actingAs($admin)
            ->patch(route('facilitator.bookings.approve', $first))
            ->assertSessionHasNoErrors();

        $this->assertSame('approved', $first->fresh()->status);
        $this->assertSame('partially_approved', $plan->fresh()->status);
    }

    public function test_cancelling_one_plan_session_updates_the_parent_plan_status(): void
    {
        $owner = $this->createVerifiedUser();
        $facility = $this->createFacility();

        $plan = ActivityPlan::create([
            'user_id' => $owner->id,
            'facility_id' => $facility->id,
            'title' => 'Cancellation Status Plan',
            'description' => null,
            'start_date' => '2026-11-16',
            'end_date' => '2026-11-18',
            'recurrence_days' => [1, 3],
            'weekday_times' => [],
            'status' => 'pending',
        ]);

        $session = Booking::create([
            'facility_id' => $facility->id,
            'activity_plan_id' => $plan->id,
            'user_id' => $owner->id,
            'date' => '2026-11-16',
            'booking_date' => '2026-11-16',
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => 'pending',
            'attendees' => 10,
            'needs_manpower' => false,
            'notes' => 'Session to cancel',
        ]);

        $this->actingAs($owner)->put(
            route('bookings.cancel', $session->id),
            ['cancellation_reason' => 'The activity was rescheduled.']
        )->assertSessionHasNoErrors();

        $this->assertSame('cancelled', $session->fresh()->status);
        $this->assertSame('cancelled', $plan->fresh()->status);
    }

    public function test_owner_cannot_move_a_pending_session_outside_its_activity_plan_date_range(): void
    {
        $owner = $this->createVerifiedUser();
        $facility = $this->createFacility();
        $plan = ActivityPlan::create([
            'user_id' => $owner->id,
            'facility_id' => $facility->id,
            'title' => 'Date Range Guard Plan',
            'description' => null,
            'start_date' => '2026-11-16',
            'end_date' => '2026-11-20',
            'recurrence_days' => [1, 3],
            'weekday_times' => [],
            'status' => 'pending',
        ]);

        $session = Booking::create([
            'facility_id' => $facility->id,
            'activity_plan_id' => $plan->id,
            'user_id' => $owner->id,
            'date' => '2026-11-16',
            'booking_date' => '2026-11-16',
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => 'pending',
            'attendees' => 10,
            'needs_manpower' => false,
            'notes' => 'Session date range guard',
        ]);

        $this->actingAs($owner)
            ->put(route('bookings.update', $session->id), [
                'date' => '2026-11-23',
                'start_time' => '09:00',
                'end_time' => '10:00',
                'attendees' => 10,
                'needs_manpower' => false,
                'notes' => 'Attempt to move outside the plan',
            ])
            ->assertSessionHasErrors('date');

        $this->assertSame('2026-11-16', $session->fresh()->date->format('Y-m-d'));
    }
}
