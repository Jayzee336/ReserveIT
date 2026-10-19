<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_update_booking_details_while_booking_remains_pending(): void
    {
        $user = User::factory()->create();
        $facility = $this->createFacility();
        $booking = $this->createBooking($user, $facility, 'pending');
        $newDate = now()->addDays(2)->toDateString();

        $response = $this->actingAs($user)->put("/bookings/{$booking->id}", [
            'date' => $newDate,
            'start_time' => '13:00',
            'end_time' => '14:00',
            'attendees' => 20,
            'notes' => 'Updated notes',
            'needs_manpower' => true,
        ]);

        $response->assertSessionHasNoErrors();

        $booking->refresh();

        $this->assertSame('pending', $booking->status);
        $this->assertSame($newDate, $booking->date->format('Y-m-d'));
        $this->assertSame('13:00', substr($booking->start_time, 0, 5));
        $this->assertSame('14:00', substr($booking->end_time, 0, 5));
        $this->assertSame(20, $booking->attendees);
        $this->assertSame('Updated notes', $booking->notes);
        $this->assertTrue($booking->needs_manpower);
    }

    public function test_user_can_cancel_pending_booking_and_declined_booking_cannot_be_cancelled(): void
    {
        $user = User::factory()->create();
        $facility = $this->createFacility();
        $pendingBooking = $this->createBooking($user, $facility, 'pending');
        $declinedBooking = $this->createBooking($user, $facility, 'declined');

        $this->actingAs($user)
            ->put("/bookings/{$pendingBooking->id}/cancel")
            ->assertSessionHasNoErrors();

        $this->put("/bookings/{$declinedBooking->id}/cancel")
            ->assertSessionHasNoErrors();

        $this->assertSame('cancelled', $pendingBooking->refresh()->status);
        $this->assertSame('declined', $declinedBooking->refresh()->status);
    }

    public function test_user_cannot_cancel_another_users_booking(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $facility = $this->createFacility();
        $booking = $this->createBooking($owner, $facility, 'pending');

        $this->actingAs($otherUser)
            ->put("/bookings/{$booking->id}/cancel")
            ->assertNotFound();

        $this->assertSame('pending', $booking->refresh()->status);
    }

    public function test_user_can_cancel_an_approved_booking(): void
    {
        $user = User::factory()->create();
        $facility = $this->createFacility();
        $booking = $this->createBooking($user, $facility, 'approved');

        $this->actingAs($user)
            ->put("/bookings/{$booking->id}/cancel")
            ->assertSessionHasNoErrors();

        $this->assertSame('cancelled', $booking->refresh()->status);
    }

    private function createFacility(): Facility
    {
        return Facility::create([
            'id' => 'booking-update-facility',
            'name' => 'Booking Update Facility',
            'type' => 'Venue',
            'capacity' => 100,
            'description' => 'Facility for booking update tests',
            'imageUrl' => 'https://example.com/facility.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building A',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => true,
        ]);
    }

    private function createBooking(
        User $user,
        Facility $facility,
        string $status
    ): Booking {
        return Booking::create([
            'facility_id' => $facility->id,
            'user_id' => $user->id,
            'date' => now()->addDay()->toDateString(),
            'start_time' => '09:00',
            'end_time' => '10:00',
            'status' => $status,
            'attendees' => 5,
            'notes' => 'Original notes',
            'needs_manpower' => false,
        ]);
    }
}