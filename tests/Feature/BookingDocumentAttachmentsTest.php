<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class BookingDocumentAttachmentsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-11-11 08:00:00');
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

    private function createUser(string $role = 'user'): User
    {
        return User::factory()->create([
            'role' => $role,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
    }

    private function createFacility(string $id, string $name): Facility
    {
        return Facility::create([
            'id' => $id,
            'name' => $name,
            'type' => 'Venue',
            'capacity' => 100,
            'description' => $name,
            'imageUrl' => 'https://example.com/facility.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building A',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
            'booking_lead_time_days' => 0,
        ]);
    }

    private function bookingPayload(Facility $facility): array
    {
        return [
            'facility_id' => $facility->getKey(),
            'date' => '2026-11-12',
            'end_date' => '2026-11-12',
            'start_time' => '09:00',
            'end_time' => '10:00',
            'attendees' => 20,
            'needs_manpower' => false,
            'notes' => 'Event: Test | Dept: CCS | Desig: Student',
        ];
    }

    public function test_lobby_requires_an_activity_plan_for_a_single_booking(): void
    {
        $user = $this->createUser();
        $facility = $this->createFacility('documents-lobby', 'Lobby');

        $this->actingAs($user)
            ->post(route('bookings.store'), $this->bookingPayload($facility))
            ->assertSessionHasErrors('activity_plan_file');

        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_sky_gym_requires_both_activity_plan_and_sir_rene_signed_document(): void
    {
        $user = $this->createUser();
        $facility = $this->createFacility('documents-sky-gym', 'Sky Gym');

        $this->actingAs($user)
            ->post(route('bookings.store'), $this->bookingPayload($facility))
            ->assertSessionHasErrors([
                'activity_plan_file',
                'sir_rene_signature',
            ]);

        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_sky_gym_booking_stores_both_documents_privately(): void
    {
        $user = $this->createUser();
        $facility = $this->createFacility('documents-sky-gym-upload', 'Sky Gym');

        $payload = array_merge($this->bookingPayload($facility), [
            'activity_plan_file' => UploadedFile::fake()->create('activity-plan.pdf', 100, 'application/pdf'),
            'sir_rene_signature' => UploadedFile::fake()->create('sir-rene-signed.pdf', 100, 'application/pdf'),
        ]);

        $this->actingAs($user)
            ->post(route('bookings.store'), $payload)
            ->assertSessionHasNoErrors();

        $booking = Booking::query()->where('facility_id', $facility->getKey())->firstOrFail();

        $this->assertSame('activity-plan.pdf', $booking->activity_plan_file_name);
        $this->assertSame('sir-rene-signed.pdf', $booking->sir_rene_signature_name);
        Storage::disk('tigris')->assertExists($booking->activity_plan_file_path);
        Storage::disk('tigris')->assertExists($booking->sir_rene_signature_path);
        $this->assertStringStartsWith('booking-activity-plans/', $booking->activity_plan_file_path);
        $this->assertStringStartsWith('booking-signatures/', $booking->sir_rene_signature_path);
    }

    public function test_assigned_facility_admin_can_download_booking_documents_but_unassigned_admin_cannot(): void
    {
        $owner = $this->createUser();
        $assignedAdmin = $this->createUser('facility_admin');
        $otherAdmin = $this->createUser('facility_admin');
        $facility = $this->createFacility('documents-access-sky-gym', 'Sky Gym');

        $facility->facilityAdmins()->attach($assignedAdmin);

        $activityPath = 'booking-activity-plans/test-plan.pdf';
        $signaturePath = 'booking-signatures/test-signature.pdf';
        Storage::disk('tigris')->put($activityPath, 'plan');
        Storage::disk('tigris')->put($signaturePath, 'signature');

        $booking = Booking::create([
            'facility_id' => $facility->getKey(),
            'user_id' => $owner->getKey(),
            'date' => '2026-11-12',
            'booking_date' => '2026-11-12',
            'end_date' => '2026-11-12',
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => 'pending',
            'activity_plan_file_path' => $activityPath,
            'activity_plan_file_name' => 'test-plan.pdf',
            'sir_rene_signature_path' => $signaturePath,
            'sir_rene_signature_name' => 'test-signature.pdf',
        ]);

        $this->actingAs($assignedAdmin)
            ->get(route('bookings.attachments.download', [$booking, 'activity-plan']))
            ->assertOk();

        $this->get(route('bookings.attachments.download', [$booking, 'sir-rene-signature']))
            ->assertOk();

        $this->actingAs($otherAdmin)
            ->get(route('bookings.attachments.download', [$booking, 'activity-plan']))
            ->assertForbidden();

        $this->actingAs($owner)
            ->get(route('bookings.attachments.download', [$booking, 'sir-rene-signature']))
            ->assertOk();
    }
}
