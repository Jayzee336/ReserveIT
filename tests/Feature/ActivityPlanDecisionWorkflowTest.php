<?php

namespace Tests\Feature;

use App\Models\ActivityPlan;
use App\Models\Booking;
use App\Models\Facility;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityPlanDecisionWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-11-10 08:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function makeUser(string $role): User
    {
        return User::factory()->create([
            'role' => $role,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
    }

    private function makeFacility(string $id, User $admin): Facility
    {
        $facility = Facility::create([
            'id' => $id,
            'name' => 'Activity Plan Decision Facility',
            'type' => 'Venue',
            'capacity' => 60,
            'description' => 'Feature test facility',
            'imageUrl' => 'https://example.com/facility.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building A',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
        ]);

        $facility->facilityAdmins()->attach($admin);

        return $facility;
    }

    private function makePlan(Facility $facility, User $owner, string $title): ActivityPlan
    {
        return ActivityPlan::create([
            'user_id' => $owner->id,
            'facility_id' => $facility->id,
            'title' => $title,
            'description' => null,
            'start_date' => '2026-11-16',
            'end_date' => '2026-11-20',
            'recurrence_days' => [1, 3],
            'weekday_times' => [],
            'status' => 'pending',
        ]);
    }

    private function makeSession(ActivityPlan $plan, string $date, string $time = '09:00'): Booking
    {
        return Booking::create([
            'facility_id' => $plan->facility_id,
            'activity_plan_id' => $plan->id,
            'user_id' => $plan->user_id,
            'date' => $date,
            'booking_date' => $date,
            'start_time' => $time . ':00',
            'end_time' => '10:00:00',
            'status' => 'pending',
            'attendees' => 15,
            'needs_manpower' => false,
            'notes' => 'Activity plan test session',
        ]);
    }

    public function test_assigned_facility_admin_can_approve_all_pending_plan_sessions(): void
    {
        $owner = $this->makeUser('user');
        $admin = $this->makeUser('facility_admin');
        $facility = $this->makeFacility('activity-plan-whole-approve', $admin);
        $plan = $this->makePlan($facility, $owner, 'Whole Plan Approval');

        $first = $this->makeSession($plan, '2026-11-16');
        $second = $this->makeSession($plan, '2026-11-18');

        $this->actingAs($admin)
            ->patch(route('activity-plans.approve', $plan))
            ->assertSessionHasNoErrors();

        $this->assertSame('approved', $first->fresh()->status);
        $this->assertSame('approved', $second->fresh()->status);
        $this->assertSame('approved', $plan->fresh()->status);
    }

    public function test_assigned_facility_admin_can_decline_the_plan_without_affecting_other_plans(): void
    {
        $owner = $this->makeUser('user');
        $admin = $this->makeUser('facility_admin');
        $facility = $this->makeFacility('activity-plan-whole-decline', $admin);
        $plan = $this->makePlan($facility, $owner, 'Whole Plan Decline');
        $first = $this->makeSession($plan, '2026-11-16');
        $second = $this->makeSession($plan, '2026-11-18');

        $otherPlan = $this->makePlan($facility, $owner, 'Unaffected Plan');
        $unrelated = $this->makeSession($otherPlan, '2026-11-20');

        $this->actingAs($admin)
            ->patch(route('activity-plans.decline', $plan), [
                'reason' => 'The facility is already committed to another school event.',
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame('declined', $first->fresh()->status);
        $this->assertSame('declined', $second->fresh()->status);
        $this->assertSame('declined', $plan->fresh()->status);
        $this->assertSame('pending', $unrelated->fresh()->status);
        $this->assertSame('pending', $otherPlan->fresh()->status);
    }

    public function test_declining_one_session_leaves_other_plan_sessions_pending(): void
    {
        $owner = $this->makeUser('user');
        $admin = $this->makeUser('facility_admin');
        $facility = $this->makeFacility('activity-plan-single-decline', $admin);
        $plan = $this->makePlan($facility, $owner, 'Individual Session Decline');
        $first = $this->makeSession($plan, '2026-11-16');
        $second = $this->makeSession($plan, '2026-11-18');

        $this->actingAs($admin)
            ->patch(route('facilitator.bookings.decline', $first), [
                'rejection_reason' => 'This date is not available.',
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame('declined', $first->fresh()->status);
        $this->assertSame('pending', $second->fresh()->status);
        $this->assertSame('partially_approved', $plan->fresh()->status);
    }

    public function test_unassigned_facility_admin_cannot_view_or_manage_an_activity_plan(): void
    {
        $owner = $this->makeUser('user');
        $assignedAdmin = $this->makeUser('facility_admin');
        $otherAdmin = $this->makeUser('facility_admin');
        $facility = $this->makeFacility('activity-plan-private', $assignedAdmin);
        $plan = $this->makePlan($facility, $owner, 'Private Plan');
        $this->makeSession($plan, '2026-11-16');

        $this->actingAs($otherAdmin)
            ->get(route('activity-plans.show', $plan))
            ->assertForbidden();

        $this->actingAs($otherAdmin)
            ->patch(route('activity-plans.approve', $plan))
            ->assertForbidden();

        $this->assertSame('pending', $plan->fresh()->status);
    }
}
