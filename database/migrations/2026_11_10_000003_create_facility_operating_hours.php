<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facility_operating_hours', function (Blueprint $table) {
            $table->id();
            $table->string('facility_id');
            $table->foreign('facility_id')->references('id')->on('facilities')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->boolean('is_closed')->default(false);
            $table->time('opens_at')->nullable();
            $table->time('closes_at')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['facility_id', 'day_of_week']);
        });

        Schema::create('facility_operating_hour_histories', function (Blueprint $table) {
            $table->id();
            $table->string('facility_id');
            $table->foreign('facility_id')->references('id')->on('facilities')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->boolean('old_is_closed')->nullable();
            $table->time('old_opens_at')->nullable();
            $table->time('old_closes_at')->nullable();
            $table->boolean('new_is_closed');
            $table->time('new_opens_at')->nullable();
            $table->time('new_closes_at')->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['facility_id', 'day_of_week', 'created_at'], 'facility_hours_history_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facility_operating_hour_histories');
        Schema::dropIfExists('facility_operating_hours');
    }
};
