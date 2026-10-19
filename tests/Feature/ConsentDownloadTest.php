<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ConsentDownloadTest extends TestCase
{
    use RefreshDatabase;

    private function createFacility(string $id): Facility
    {
        return Facility::create([
            'id' => $id,
            'name' => 'Consent Test Facility',
            'type' => 'Venue',
            'capacity' => 50,
            'description' => 'Facility for consent download tests',
            'imageUrl' => 'https://example.com/facility.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building A',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
        ]);
    }

    private function createBooking(
        Facility $facility,
        string $path = 'consent-letters/test-consent.pdf'
    ): Booking {
        Storage::disk('local')->put($path, 'test consent file contents');

        return Booking::create([
            'facility_id' => $facility->id,
            'user_id' => null,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '123456789',
            'date' => '2026-11-15',
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => 'pending',
            'notes' => 'Consent download test',
            'consent_file_uploaded' => true,
            'consent_file_name' => 'consent-letter.pdf',
            'consent_file_path' => $path,
        ]);
    }

    public function test_assigned_facility_admin_can_download_consent_file(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('consent-assigned');
        $facility->facilityAdmins()->attach($admin);

        $booking = $this->createBooking($facility);

        $this->actingAs($admin)
            ->get(route('bookings.consent', $booking))
            ->assertOk()
            ->assertHeader('content-disposition');
    }

    public function test_unassigned_facility_admin_cannot_download_consent_file(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create([
            'role' => 'facility_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('consent-unassigned');
        $booking = $this->createBooking($facility);

        $this->actingAs($admin)
            ->get(route('bookings.consent', $booking))
            ->assertForbidden();
    }

    public function test_ordinary_user_cannot_download_consent_file(): void
    {
        Storage::fake('local');

        $user = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('consent-ordinary-user');
        $booking = $this->createBooking($facility);

        $this->actingAs($user)
            ->get(route('bookings.consent', $booking))
            ->assertForbidden();
    }

    public function test_super_admin_can_download_consent_file(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create([
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('consent-super-admin');
        $booking = $this->createBooking($facility);

        $this->actingAs($admin)
            ->get(route('bookings.consent', $booking))
            ->assertOk()
            ->assertHeader('content-disposition');
    }

    public function test_missing_consent_file_returns_not_found(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create([
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('consent-missing');

        $booking = Booking::create([
            'facility_id' => $facility->id,
            'user_id' => null,
            'guest_name' => 'Test Guest',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '123456789',
            'date' => '2026-11-15',
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => 'pending',
            'consent_file_uploaded' => true,
            'consent_file_name' => 'missing.pdf',
            'consent_file_path' => 'consent-letters/missing.pdf',
        ]);

        $this->actingAs($admin)
            ->get(route('bookings.consent', $booking))
            ->assertNotFound();
    }

    public function test_consent_download_rejects_files_outside_consent_directory(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create([
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $facility = $this->createFacility('consent-outside-directory');

        $booking = $this->createBooking(
            $facility,
            'private-documents/secret.pdf'
        );

        $this->actingAs($admin)
            ->get(route('bookings.consent', $booking))
            ->assertNotFound();
    }
}