<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_settings', function (Blueprint $table) {
            $table->string('auto_approve_scope')
                ->default('disabled');

            $table->unsignedInteger('cleanup_buffer_minutes')
                ->default(30);

            $table->unsignedInteger('max_advance_days')
                ->default(30);

            $table->unsignedInteger('max_booking_duration')
                ->default(4);

            $table->boolean('require_consent_letter')
                ->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('system_settings', function (Blueprint $table) {
            $table->dropColumn([
                'auto_approve_scope',
                'cleanup_buffer_minutes',
                'max_advance_days',
                'max_booking_duration',
                'require_consent_letter',
            ]);
        });
    }
};