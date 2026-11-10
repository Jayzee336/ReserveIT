<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    private const RESTRICTED_FACILITIES = [
        'university auditorium',
        'lobby',
        'ndhrm function hall',
    ];

    public function up(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            $table->unsignedTinyInteger('booking_lead_time_days')->default(0)->change();
        });

        // The original column migration applied a three-day default to every
        // facility. Remove that inherited default only from facilities still
        // carrying that value, while preserving any other configured values.
        DB::table('facilities')
            ->whereNotIn(DB::raw('LOWER(name)'), self::RESTRICTED_FACILITIES)
            ->where('booking_lead_time_days', 3)
            ->update(['booking_lead_time_days' => 0]);

        DB::table('facilities')
            ->whereIn(DB::raw('LOWER(name)'), self::RESTRICTED_FACILITIES)
            ->update(['booking_lead_time_days' => 3]);
    }

    public function down(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            $table->unsignedTinyInteger('booking_lead_time_days')->default(3)->change();
        });
    }
};
