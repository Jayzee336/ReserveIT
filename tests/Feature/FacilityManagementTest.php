<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FacilityManagementTest extends TestCase
{
    use RefreshDatabase;

    private function facilityData(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Test Facility',
            'type' => 'Venue',
            'capacity' => 50,
            'description' => 'A facility created for automated testing.',
            'imageUrl' => 'https://example.com/facility.jpg',
            'requirement' => 'STANDARD',
            'location' => 'Building A',
            'requiresWeekendConsent' => false,
            'allowTdevsManpower' => false,
        ], $overrides);
    }

    public function test_regular_user_cannot_create_a_facility(): void
    {
        $user = User::factory()->create(['role' => 'user']);

        $response = $this->actingAs($user)->post(
            route('admin.facilities.store'),
            $this->facilityData()
        );

        $response->assertForbidden();

        $this->assertDatabaseMissing('facilities', [
            'name' => 'Test Facility',
        ]);
    }

    public function test_facility_admin_cannot_create_a_facility(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
        ]);

        $response = $this->actingAs($admin)->post(
            route('admin.facilities.store'),
            $this->facilityData()
        );

        $response->assertForbidden();

        $this->assertDatabaseMissing('facilities', [
            'name' => 'Test Facility',
        ]);
    }

    public function test_super_admin_can_create_a_facility_with_an_external_image_url(): void
    {
        $admin = User::factory()->create([
            'role' => 'super_admin',
        ]);

        $response = $this->actingAs($admin)->post(
            route('admin.facilities.store'),
            $this->facilityData()
        );

        $response->assertRedirect();

        $this->assertDatabaseHas('facilities', [
            'name' => 'Test Facility',
            'imageUrl' => 'https://example.com/facility.jpg',
        ]);
    }

    public function test_super_admin_can_create_a_facility_with_a_valid_relative_image_path(): void
    {
        $admin = User::factory()->create([
            'role' => 'super_admin',
        ]);

        foreach ([
            '/images/facility-placeholder.svg',
            '/storage/facilities/example.jpg',
        ] as $index => $imagePath) {
            $response = $this->actingAs($admin)->post(
                route('admin.facilities.store'),
                $this->facilityData([
                    'name' => 'Relative Image Facility ' . $index,
                    'imageUrl' => $imagePath,
                ])
            );

            $response->assertRedirect();

            $this->assertDatabaseHas('facilities', [
                'name' => 'Relative Image Facility ' . $index,
                'imageUrl' => $imagePath,
            ]);
        }
    }

    public function test_super_admin_cannot_create_a_facility_with_a_malformed_image_value(): void
    {
        $admin = User::factory()->create([
            'role' => 'super_admin',
        ]);

        $response = $this->actingAs($admin)->post(
            route('admin.facilities.store'),
            $this->facilityData([
                'imageUrl' => 'not-an-image',
            ])
        );

        $response->assertSessionHasErrors('imageUrl');

        $this->assertDatabaseMissing('facilities', [
            'name' => 'Test Facility',
        ]);
    }

    public function test_super_admin_can_create_a_facility_with_an_uploaded_image(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create([
            'role' => 'super_admin',
        ]);

        $response = $this->actingAs($admin)->post(
            route('admin.facilities.store'),
            $this->facilityData([
                'imageUrl' => '',
                'image' => UploadedFile::fake()->image('facility.jpg'),
            ])
        );

        $response->assertRedirect();

        $facility = Facility::where('name', 'Test Facility')->firstOrFail();

        $this->assertStringContainsString(
            '/storage/facilities/',
            $facility->imageUrl
        );

        $path = parse_url($facility->imageUrl, PHP_URL_PATH);
        $relativePath = str_replace('/storage/', '', $path);

        Storage::disk('public')->assertExists($relativePath);
    }

    public function test_facility_update_without_a_new_image_preserves_the_existing_image(): void
    {
        $admin = User::factory()->create([
            'role' => 'super_admin',
        ]);

        $facility = Facility::create([
            'id' => 'preserve-image-facility',
            ...$this->facilityData([
                'name' => 'Preserve Image Facility',
            ]),
        ]);

        $originalImage = $facility->imageUrl;

        $response = $this->actingAs($admin)->patch(
            route('admin.facilities.update', $facility),
            $this->facilityData([
                'name' => 'Updated Facility Name',
                'imageUrl' => $originalImage,
            ])
        );

        $response->assertRedirect();

        $facility->refresh();

        $this->assertSame($originalImage, $facility->imageUrl);
        $this->assertSame('Updated Facility Name', $facility->name);
    }

    public function test_facility_admin_cannot_update_an_unassigned_facility(): void
    {
        $admin = User::factory()->create([
            'role' => 'facility_admin',
        ]);

        $facility = Facility::create([
            'id' => 'protected-facility',
            ...$this->facilityData([
                'name' => 'Protected Facility',
            ]),
        ]);

        $response = $this->actingAs($admin)->patch(
            route('admin.facilities.update', $facility),
            $this->facilityData([
                'name' => 'Unauthorized Change',
            ])
        );

        $response->assertForbidden();

        $this->assertDatabaseHas('facilities', [
            'id' => 'protected-facility',
            'name' => 'Protected Facility',
        ]);
    }
}