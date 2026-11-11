<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Keep existing primary keys and booking relationships intact.
        DB::table('facilities')->where('id', 'f3')->update([
            'name' => 'Main Auditorium',
        ]);

        DB::table('facilities')->where('id', 'field')->update([
            'name' => 'Quadrangle or Field',
        ]);

        DB::table('facilities')->where('id', 'avr')->update([
            'name' => 'Audio Visual Room 1 (AVR1)',
        ]);

        // Add Open Lab only when it does not already exist.
        if (! DB::table('facilities')->where('id', 'open_lab')->exists()) {
            DB::table('facilities')->insert([
                'id' => 'open_lab',
                'name' => 'Open Lab',
                'type' => 'Laboratory',
                'capacity' => null,
                'description' => 'Open laboratory space. Facility details and capacity can be updated by the Super Admin.',
                'imageUrl' => '/images/facility-placeholder.svg',
                'requirement' => 'STANDARD',
                'location' => 'To be assigned',
                'requiresWeekendConsent' => true,
                'allowTdevsManpower' => true,
                'is_available' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Do not delete Open Lab or rewrite facility names during rollback:
        // bookings and administrator assignments may have been created after
        // this migration. Reversing those records would risk data loss.
    }
};
