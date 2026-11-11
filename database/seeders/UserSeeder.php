<?php

namespace Database\Seeders;

use App\Models\Facility;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Local/demo accounts only.
 *
 * Do not run this seeder against the hosted production database. It assigns
 * demo roles, credentials, and facility access for local development.
 */
class UserSeeder extends Seeder
{
    /**
     * Create or refresh the named local demonstration accounts.
     *
     * The first account of each former demo role reuses its old demo identity
     * when possible, preserving its ID and related local booking history.
     */
    public function run(): void
    {
        $demoAccounts = [
            [
                'username' => 'user1',
                'name' => 'ReserveIT Demo User 1',
                'email' => 'user1@uic.edu.ph',
                'legacy_email' => 'user@test.com',
                'password' => 'password',
                'role' => 'user',
                'uic_member_type' => 'student',
            ],
            [
                'username' => 'user2',
                'name' => 'ReserveIT Demo User 2',
                'email' => 'user2@uic.edu.ph',
                'password' => 'password',
                'role' => 'user',
                'uic_member_type' => 'student',
            ],
            [
                'username' => 'user3',
                'name' => 'ReserveIT Demo User 3',
                'email' => 'user3@uic.edu.ph',
                'password' => 'password',
                'role' => 'user',
                'uic_member_type' => 'student',
            ],
            [
                'username' => 'facility1',
                'name' => 'ReserveIT Facility Admin 1',
                'email' => 'facility1@uic.edu.ph',
                'legacy_email' => 'facility@test.com',
                'password' => 'password',
                'role' => 'facility_admin',
                'uic_member_type' => 'teacher',
            ],
            [
                'username' => 'facility2',
                'name' => 'ReserveIT Facility Admin 2',
                'email' => 'facility2@uic.edu.ph',
                'password' => 'password',
                'role' => 'facility_admin',
                'uic_member_type' => 'teacher',
            ],
            [
                'username' => 'facility3',
                'name' => 'ReserveIT Facility Admin 3',
                'email' => 'facility3@uic.edu.ph',
                'password' => 'password',
                'role' => 'facility_admin',
                'uic_member_type' => 'teacher',
            ],
            [
                'username' => 'admin',
                'name' => 'ReserveIT Super Admin',
                'email' => 'admin@uic.edu.ph',
                'legacy_email' => 'admin@test.com',
                'password' => 'password',
                'role' => 'super_admin',
                'uic_member_type' => 'teacher',
            ],
        ];

        foreach ($demoAccounts as $account) {
            // Reuse the existing demo row where possible so local booking
            // history and foreign-key relationships remain attached.
            $user = User::query()
                ->where('email', $account['email'])
                ->first();

            if (! $user && ! empty($account['legacy_email'])) {
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
                'uic_member_type' => $account['uic_member_type'],
                'must_change_password' => false,
                'is_active' => true,
            ]);

            $user->save();
        }

        /*
         * Assign each local facility-admin demo account only to its agreed
         * group. sync() also removes stale demo assignments from earlier runs.
         */
        $facilityGroups = [
            'facility1@uic.edu.ph' => ['avr', 'avr2'],
            'facility2@uic.edu.ph' => ['lobby', 'f3', 'field', 'sky_gym', 'view_deck'],
            'facility3@uic.edu.ph' => ['itrc', 'iot', 'open_lab'],
        ];

        foreach ($facilityGroups as $email => $facilityIds) {
            $facilityAdmin = User::query()
                ->where('email', $email)
                ->where('role', 'facility_admin')
                ->firstOrFail();

            $existingFacilityIds = Facility::query()
                ->whereIn('id', $facilityIds)
                ->pluck('id')
                ->all();

            $facilityAdmin->managedFacilities()->sync($existingFacilityIds);
        }
    }
}
