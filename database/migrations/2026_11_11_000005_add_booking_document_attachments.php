<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('activity_plan_file_path')->nullable();
            $table->string('activity_plan_file_name')->nullable();
            $table->string('sir_rene_signature_path')->nullable();
            $table->string('sir_rene_signature_name')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'activity_plan_file_path',
                'activity_plan_file_name',
                'sir_rene_signature_path',
                'sir_rene_signature_name',
            ]);
        });
    }
};
