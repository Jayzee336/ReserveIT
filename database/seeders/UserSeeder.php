<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Create or refresh the three demonstration accounts.
     *
     * These credentials are only for local development and public demos.
     * Never use them for real users or production data.
     */
    public function run(): void
    {
        $demoAccounts = [
            [
                'username' => 'user',
                'name' => 'ReserveIT Demo User',
                'email' => 'user@test.com',
                'legacy_email' => 'demo.user@reserveit.test',
                'password' => 'password',
                'role' => 'user',
            ],
            [
                'username' => 'facility',
                'name' => 'ReserveIT Facility Admin',
                'email' => 'facility@test.com',
                'legacy_email' => 'facilityadmin@reserveit.test',
                'password' => 'password',
                'role' => 'facility_admin',
            ],
            [
                'username' => 'admin',
                'name' => 'ReserveIT Super Admin',
                'email' => 'admin@test.com',
                'legacy_email' => 'superadmin@reserveit.test',
                'password' => 'password',
                'role' => 'super_admin',
            ],
        ];

        foreach ($demoAccounts as $account) {
            // Update the existing demo identity when possible so its ID,
            // booking history, and relationships remain intact.
            $user = User::query()
                ->where('email', $account['email'])
                ->first();

            if (! $user) {
                $user = User::query()
                    ->where('email', $account['legacy_email'])
                    ->first();
            }

            $user ??= new User();

            $user->fill([
                'username' => $account['username'],
                'name' => $account['name'],
                'email' => $account['email'],
                'password' => $account['password'],
                'role' => $account['role'],
                'must_change_password' => false,
                'is_active' => true,
            ]);

            $user->save();
        }

        /*
         * Keep the demo facility administrator assigned to the same
         * sample facilities. syncWithoutDetaching preserves other links.
         */
        $facilityAdmin = User::query()
            ->where('email', 'facility@test.com')
            ->firstOrFail();

        $facilityAdmin->managedFacilities()->syncWithoutDetaching([
            'itdif',
            'itrc',
        ]);
    }
}
