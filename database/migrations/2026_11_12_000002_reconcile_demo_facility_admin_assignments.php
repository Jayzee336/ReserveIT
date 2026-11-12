<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Reconcile the known ReserveIT UIC demo facility-admin assignments.
     *
     * Only the named demo accounts and their facility_user pivot rows are
     * changed. Bookings, users, and other facility-admin assignments remain
     * untouched.
     */
    public function up(): void
    {
        $assignments = [
            'facility1@uic.edu.ph' => ['avr', 'avr2'],
            'facility2@uic.edu.ph' => ['lobby', 'f3', 'field', 'sky_gym', 'view_deck'],
            'facility3@uic.edu.ph' => ['itrc', 'iot', 'open_lab'],
            'facility4@uic.edu.ph' => ['itdif'],
        ];

        $legacyEmails = [
            'facility@test.com',
            'facility2@test.com',
            'facility3@test.com',
            'facility4@test.com',
        ];

        DB::transaction(function () use ($assignments, $legacyEmails): void {
            // Remove stale access from superseded legacy demo accounts only.
            $legacyIds = DB::table('users')
                ->whereIn('email', $legacyEmails)
                ->pluck('id');

            if ($legacyIds->isNotEmpty()) {
                DB::table('facility_user')->whereIn('user_id', $legacyIds)->delete();
            }

            $requiredFacilityIds = collect($assignments)->flatten()->unique();
            $existingFacilityIds = DB::table('facilities')
                ->whereIn('id', $requiredFacilityIds)
                ->pluck('id')
                ->all();

            foreach ($assignments as $email => $facilityIds) {
                $admin = DB::table('users')
                    ->where('email', $email)
                    ->where('role', 'facility_admin')
                    ->first(['id']);

                // Some installations may not have the optional fourth demo
                // account. Do not create or promote accounts in a migration.
                if (! $admin) {
                    continue;
                }

                $adminFacilityIds = array_values(array_intersect(
                    $facilityIds,
                    $existingFacilityIds
                ));

                // Replace only this named demo admin's assignments.
                DB::table('facility_user')
                    ->where('user_id', $admin->id)
                    ->delete();

                foreach ($adminFacilityIds as $facilityId) {
                    DB::table('facility_user')->insert([
                        'facility_id' => $facilityId,
                        'user_id' => $admin->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        });
    }

    /**
     * The prior assignment rows are intentionally not reconstructed on rollback.
     * Restoring an unknown historical mapping could reintroduce incorrect access.
     */
    public function down(): void
    {
        // No-op: this data reconciliation is intentionally forward-only.
    }
};
