<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class SpecialFacilityBookingApprovalFeeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-11-11 08:00:00');

        SystemSetting::current()->update([
            'cleanup_buffer_minutes' => 0,
            'opening_time' => '08:00',
            'closing_time' => '00:00',
            'auto_approve_scope' => 'disabled',
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_after_hours_fee_is_snapshotted_as_unpaid_when_facility_admin_approves(): void
    {
        $owner = User::factory()->create([
            'role' => 'user',
            'email' => 'student@uic.edu.ph',
        ]);
        $admin = User::factory()->create(['role' => 'facility_admin']);

        $facility = Facility::create([
            'id' => 'lobby-fee-approval-test',
            'name' => 'Lobby',
            'type' => 'Venue',
            'capacity' => 100,
            'description' => 'Fee approval test',
            'imageUrl' => '/images/facility-placeholder.svg',
            'requirement' => 'STANDARD',
            'location' => 'Test location',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
            'is_available' => true,
            'overtime_fee_enabled' => true,
            'overtime_fee_per_hour' => 120,
        ]);
        $facility->facilityAdmins()->attach($admin);

        $booking = Booking::create([
            'facility_id' => $facility->id,
            'user_id' => $owner->id,
            'date' => '2026-11-12',
            'booking_date' => '2026-11-12',
            'end_date' => '2026-11-12',
            'start_time' => '16:00:00',
            'end_time' => '18:00:00',
            'status' => 'pending',
            'consent_file_uploaded' => true,
            'activity_plan_file_path' => 'booking-activity-plans/test-plan.pdf',
            'sister_signature_path' => 'booking-sister-signatures/test-sister.pdf',
        ]);

        $this->actingAs($admin)
            ->patch(route('admin.bookings.approve', $booking))
            ->assertRedirect();

        $booking->refresh();

        $this->assertSame('approved', $booking->status);
        $this->assertSame(60, $booking->scheduled_fee_minutes);
        $this->assertSame('120.00', $booking->scheduled_fee_rate);
        $this->assertSame('120.00', $booking->scheduled_fee_amount);
        $this->assertSame('unpaid', $booking->scheduled_fee_payment_status);
    }
}
