<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            $table->unsignedTinyInteger('max_booking_hours')->nullable()->after('booking_lead_time_days');
        });

        // Preserve the existing system-wide duration for facilities that
        // already existed before the per-facility setting was introduced.
        $legacyDefault = 4;
        if (Schema::hasTable('system_settings') && Schema::hasColumn('system_settings', 'max_booking_duration')) {
            $legacyDefault = (int) (DB::table('system_settings')->value('max_booking_duration') ?: 4);
        }

        DB::table('facilities')
            ->whereNull('max_booking_hours')
            ->update(['max_booking_hours' => max(1, min(24, $legacyDefault))]);
    }

    public function down(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            $table->dropColumn('max_booking_hours');
        });
    }
};
