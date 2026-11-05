<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminDashboardAnalyticsTest extends TestCase
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
        User $owner,
        string $status,
        array $overrides = []
    ): Booking {
        $date = now()->toDateString();

        $attributes = array_merge([
            'facility_id' => $facility->id,
            'user_id' => $owner->id,
            'date' => $date,
            'booking_date' => $date,
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => $status,
            'attendees' => 5,
            'notes' => 'Analytics test booking',
            'approved_by' => $status === 'approved' ? 'Facility Admin' : null,
            'approved_at' => $status === 'approved' ? now()->subMinutes(30) : null,
            'created_at' => now()->subHour(),
            'updated_at' => now(),
        ], $overrides);

        // created_at is managed by Eloquent and is not mass assignable.
        // Persist the fixture timestamp explicitly so approval-duration
        // analytics are tested against the intended 30-minute interval.
        $createdAt = $attributes['created_at'];
        unset($attributes['created_at']);

        $booking = Booking::create($attributes);
        $booking->forceFill(['created_at' => $createdAt])->saveQuietly();

        return $booking;
    }

    public function test_facility_admin_analytics_are_scoped_to_assigned_facilities_and_report_client_metrics(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);
        $returningClient = User::factory()->create(['role' => 'user']);
        $outsideClient = User::factory()->create(['role' => 'user']);

        $assignedFacility = $this->createFacility(
            'analytics-assigned-facility',
            'Analytics Assigned Facility'
        );
        $unassignedFacility = $this->createFacility(
            'analytics-unassigned-facility',
            'Analytics Unassigned Facility'
        );
        $assignedFacility->facilityAdmins()->attach($admin);

        $this->createBooking($assignedFacility, $returningClient, 'approved', [
            'overtime_minutes' => 30,
            'overtime_fee_amount' => 7.50,
            'overtime_fee_rate' => 15.00,
            'overtime_payment_status' => 'unpaid',
        ]);
        $this->createBooking($assignedFacility, $returningClient, 'cancelled', [
            'cancellation_reason' => 'The activity was rescheduled.',
            'approved_by' => null,
            'approved_at' => null,
        ]);
        $this->createBooking($unassignedFacility, $outsideClient, 'approved', [
            'overtime_minutes' => 120,
            'overtime_fee_amount' => 30.00,
            'overtime_fee_rate' => 15.00,
            'overtime_payment_status' => 'unpaid',
        ]);

        $futureDate = now()->addMonth()->toDateString();
        $this->createBooking($assignedFacility, $outsideClient, 'approved', [
            'date' => $futureDate,
            'booking_date' => $futureDate,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Dashboard')
                ->where('stats.totalFacilities', 1)
                ->where('stats.totalBookings', 3)
                ->where('operationalAnalytics.uniqueClients', 1)
                ->where('operationalAnalytics.returningClients', 1)
                ->where('operationalAnalytics.approvalRate', 100)
                ->where('operationalAnalytics.cancellationRate', 50)
                ->where('operationalAnalytics.peakHour', '9:00 AM – 10:00 AM')
                ->where('operationalAnalytics.peakHourBookings', 2)
                ->where('operationalAnalytics.overtimeBookings', 1)
                ->where('operationalAnalytics.overtimeMinutes', 30)
                ->where('operationalAnalytics.overtimeFees', 7.5)
                ->where('operationalAnalytics.averageApprovalHours', 0.5)
            );
    }

    public function test_analytics_filters_by_date_range_and_assigned_facility(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);
        $clientA = User::factory()->create(['role' => 'user']);
        $clientB = User::factory()->create(['role' => 'user']);

        $facilityA = $this->createFacility('analytics-filter-a', 'Analytics Filter A');
        $facilityB = $this->createFacility('analytics-filter-b', 'Analytics Filter B');
        $facilityA->facilityAdmins()->attach($admin);
        $facilityB->facilityAdmins()->attach($admin);

        $this->createBooking($facilityA, $clientA, 'approved');
        $this->createBooking($facilityB, $clientB, 'approved');

        $date = now()->toDateString();

        $this->actingAs($admin)
            ->get(route('admin.dashboard', [
                'from' => $date,
                'to' => $date,
                'facility_id' => $facilityA->id,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('analyticsFilters.from', $date)
                ->where('analyticsFilters.to', $date)
                ->where('analyticsFilters.facility_id', $facilityA->id)
                ->where('operationalAnalytics.uniqueClients', 1)
                ->where('operationalAnalytics.approvalRate', 100)
                ->has('mostUsedFacilities', 1)
                ->where('mostUsedFacilities.0.name', 'Analytics Filter A')
                ->where('usageOverTime.0.bookings', 1)
            );
    }
}
