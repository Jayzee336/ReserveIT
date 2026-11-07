<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_settings', function (Blueprint $table) {
            $table->time('opening_time')->default('08:00:00');
            $table->time('closing_time')->default('00:00:00');
            $table->unsignedInteger('early_check_in_minutes')->default(15);
            $table->unsignedInteger('overtime_grace_minutes')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('system_settings', function (Blueprint $table) {
            $table->dropColumn([
                'opening_time',
                'closing_time',
                'early_check_in_minutes',
                'overtime_grace_minutes',
            ]);
        });
    }
};
