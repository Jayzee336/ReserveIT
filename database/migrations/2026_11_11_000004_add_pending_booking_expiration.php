<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_settings', function (Blueprint $table) {
            $table->unsignedSmallInteger('pending_booking_expiry_hours')->default(72);
            $table->unsignedSmallInteger('pending_booking_reminder_hours')->default(24);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->timestamp('pending_reminder_sent_at')->nullable();
            $table->timestamp('pending_expired_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['pending_reminder_sent_at', 'pending_expired_at']);
        });

        Schema::table('system_settings', function (Blueprint $table) {
            $table->dropColumn(['pending_booking_expiry_hours', 'pending_booking_reminder_hours']);
        });
    }
};
