<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RoleDashboardAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(now()->startOfDay()->addHours(8));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

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
        User $owner,
        string $status,
        array $overrides = []
    ): Booking {
        $createdAt = now()->subHour();
        $attributes = array_merge([
            'facility_id' => $facility->id,
            'user_id' => $owner->id,
            'date' => now()->toDateString(),
            'booking_date' => now()->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => $status,
            'attendees' => 5,
            'notes' => 'Dashboard analytics test',
            'approved_by' => $status === 'approved' ? 'Facility Admin' : null,
            'approved_at' => $status === 'approved' ? now()->subMinutes(30) : null,
        ], $overrides);

        $booking = Booking::create($attributes);
        $booking->forceFill(['created_at' => $createdAt])->saveQuietly();

        return $booking;
    }

    public function test_facility_admin_dashboard_analytics_only_include_assigned_facilities(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);
        $clientA = User::factory()->create(['role' => 'user']);
        $clientB = User::factory()->create(['role' => 'user']);
        $outsideClient = User::factory()->create(['role' => 'user']);

        $assignedFacility = $this->createFacility('role-dashboard-assigned', 'Assigned Hall');
        $secondAssignedFacility = $this->createFacility('role-dashboard-assigned-2', 'Assigned Lab');
        $unassignedFacility = $this->createFacility('role-dashboard-outside', 'Outside Facility');

        $assignedFacility->facilityAdmins()->attach($admin);
        $secondAssignedFacility->facilityAdmins()->attach($admin);

        $this->createBooking($assignedFacility, $clientA, 'approved', [
            'overtime_minutes' => 30,
            'overtime_fee_amount' => 7.50,
        ]);
        $this->createBooking($assignedFacility, $clientA, 'pending');
        $this->createBooking($secondAssignedFacility, $clientB, 'cancelled', [
            'approved_by' => null,
            'approved_at' => null,
        ]);
        $this->createBooking($unassignedFacility, $outsideClient, 'approved');

        $this->actingAs($admin)
            ->get(route('facilitator.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Facilitator/Dashboard')
                ->where('stats.totalBookings', 3)
                ->where('analytics.totalBookings', 3)
                ->where('analytics.uniqueClients', 2)
                ->where('analytics.returningClients', 1)
                ->where('analytics.approvalRate', 100)
                ->where('analytics.cancellationRate', 33.3)
                ->where('analytics.overtimeBookings', 1)
                ->where('analytics.overtimeMinutes', 30)
                ->where('analytics.overtimeFees', 7.5)
                ->where('statusBreakdown.0.status', 'pending')
                ->where('statusBreakdown.0.count', 1)
                ->where('statusBreakdown.2.status', 'completed')
                ->where('statusBreakdown.2.count', 0)
                ->where('statusBreakdown.3.status', 'declined')
                ->where('statusBreakdown.4.count', 1)
                ->has('mostUsedFacilities', 2)
            );
    }

    public function test_facility_admin_dashboard_can_filter_analytics_to_one_assigned_facility(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);
        $clientA = User::factory()->create(['role' => 'user']);
        $clientB = User::factory()->create(['role' => 'user']);

        $facilityA = $this->createFacility('role-dashboard-filter-a', 'Filter Facility A');
        $facilityB = $this->createFacility('role-dashboard-filter-b', 'Filter Facility B');
        $facilityA->facilityAdmins()->attach($admin);
        $facilityB->facilityAdmins()->attach($admin);

        $this->createBooking($facilityA, $clientA, 'approved');
        $this->createBooking($facilityB, $clientB, 'approved');

        $date = now()->toDateString();

        $this->actingAs($admin)
            ->get(route('facilitator.dashboard', [
                'facility_id' => $facilityA->id,
                'from' => $date,
                'to' => $date,
                'group_by' => 'day',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('selectedFacilityId', $facilityA->id)
                ->where('analytics.totalBookings', 1)
                ->where('analytics.uniqueClients', 1)
                ->where('analyticsFilters.group_by', 'day')
                ->where('mostUsedFacilities.0.name', 'Filter Facility A')
            );
    }

    public function test_general_user_dashboard_analytics_only_include_the_signed_in_users_bookings(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        $otherUser = User::factory()->create(['role' => 'user']);
        $facility = $this->createFacility('personal-dashboard-facility', 'Personal Dashboard Hall');

        $this->createBooking($facility, $user, 'approved', [
            'start_time' => '07:00:00',
            'end_time' => '07:30:00',
        ]);
        $this->createBooking($facility, $user, 'pending');
        $this->createBooking($facility, $otherUser, 'approved');

        $this->actingAs($user)
            ->get(route('user.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('User/Dashboard')
                ->where('stats.totalBookings', 2)
                ->where('stats.approvedBookings', 0)
                ->where('stats.completedBookings', 1)
                ->where('stats.pendingRequests', 1)
                ->where('stats.declinedBookings', 0)
                ->where('stats.cancelledBookings', 0)
                ->has('bookingTrends', 6)
                ->where('statusBreakdown.0.status', 'pending')
                ->where('statusBreakdown.0.count', 1)
                ->where('statusBreakdown.1.status', 'approved')
                ->where('statusBreakdown.1.count', 0)
                ->where('statusBreakdown.2.status', 'completed')
                ->where('statusBreakdown.2.count', 1)
                ->has('statusDetails.completed', 1)
                ->has('mostUsedFacilities', 1)
                ->where('mostUsedFacilities.0.name', 'Personal Dashboard Hall')
                ->has('recentBookings', 2)
            );
    }
}
