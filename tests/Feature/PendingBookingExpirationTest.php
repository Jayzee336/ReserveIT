<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PendingBookingExpirationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-11-12 10:00:00');
        SystemSetting::current()->update([
            'pending_booking_expiry_hours' => 72,
            'pending_booking_reminder_hours' => 24,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function createFacility(): Facility
    {
        return Facility::create([
            'id' => 'pending-expiration-facility',
            'name' => 'Pending Expiration Facility',
            'type' => 'Venue',
            'capacity' => 50,
            'description' => 'Expiration test facility',
            'imageUrl' => 'https://example.com/facility.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building A',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
        ]);
    }

    private function createBooking(
        Facility $facility,
        User $user,
        string $date,
        string $status = 'pending'
    ): Booking {
        return Booking::create([
            'facility_id' => $facility->id,
            'user_id' => $user->id,
            'guest_name' => $user->name,
            'guest_email' => $user->email,
            'guest_phone' => '123456789',
            'date' => $date,
            'booking_date' => $date,
            'end_date' => $date,
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => $status,
            'notes' => 'Pending expiration test',
            'created_at' => now()->subHour(),
            'updated_at' => now()->subHour(),
        ]);
    }

    public function test_pending_booking_expires_when_its_scheduled_start_time_has_passed(): void
    {
        $facility = $this->createFacility();
        $user = User::factory()->create();
        $booking = $this->createBooking($facility, $user, '2026-11-11');

        $this->artisan('bookings:expire-pending')
            ->expectsOutput('Expired 1 pending booking(s); sent 0 reminder(s).')
            ->assertSuccessful();

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => 'expired',
        ]);

        $this->assertNotNull($booking->fresh()->pending_expired_at);
    }

    public function test_pending_booking_with_a_future_start_time_remains_pending(): void
    {
        $facility = $this->createFacility();
        $user = User::factory()->create();
        $booking = $this->createBooking($facility, $user, '2026-11-13');

        $this->artisan('bookings:expire-pending')
            ->expectsOutput('Expired 0 pending booking(s); sent 0 reminder(s).')
            ->assertSuccessful();

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => 'pending',
        ]);
    }

    public function test_approved_booking_is_not_expired_after_its_start_time(): void
    {
        $facility = $this->createFacility();
        $user = User::factory()->create();
        $booking = $this->createBooking($facility, $user, '2026-11-11', 'approved');

        $this->artisan('bookings:expire-pending')
            ->expectsOutput('Expired 0 pending booking(s); sent 0 reminder(s).')
            ->assertSuccessful();

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => 'approved',
        ]);
    }
}
