<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoAccountSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_creates_the_numbered_uic_demo_accounts(): void
    {
        $this->seed(DatabaseSeeder::class);

        $expectedAccounts = [
            'admin@uic.edu.ph' => 'super_admin',
            'facility1@uic.edu.ph' => 'facility_admin',
            'facility2@uic.edu.ph' => 'facility_admin',
            'facility3@uic.edu.ph' => 'facility_admin',
            'user1@uic.edu.ph' => 'user',
            'user2@uic.edu.ph' => 'user',
            'user3@uic.edu.ph' => 'user',
        ];

        foreach ($expectedAccounts as $email => $role) {
            $this->assertDatabaseHas('users', [
                'email' => $email,
                'role' => $role,
                'is_active' => true,
            ]);
        }

        $this->assertSame(
            'teacher',
            User::query()->where('email', 'admin@uic.edu.ph')->value('uic_member_type')
        );

        $this->assertSame(
            'student',
            User::query()->where('email', 'user1@uic.edu.ph')->value('uic_member_type')
        );
    }

    public function test_demo_facility_admins_receive_only_their_configured_facility_groups(): void
    {
        $this->seed(DatabaseSeeder::class);

        $expectedGroups = [
            'facility1@uic.edu.ph' => ['avr', 'avr2'],
            'facility2@uic.edu.ph' => ['field', 'f3', 'lobby', 'sky_gym', 'view_deck'],
            'facility3@uic.edu.ph' => ['iot', 'itrc', 'open_lab'],
        ];

        foreach ($expectedGroups as $email => $expectedFacilityIds) {
            $admin = User::query()->where('email', $email)->firstOrFail();
            $actualFacilityIds = $admin->managedFacilities()
                ->pluck('facilities.id')
                ->all();

            sort($expectedFacilityIds);
            sort($actualFacilityIds);

            $this->assertSame($expectedFacilityIds, $actualFacilityIds);
        }
    }
}
