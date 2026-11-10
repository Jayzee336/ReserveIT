<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('facility_id');
            $table->foreign('facility_id')->references('id')->on('facilities')->cascadeOnDelete();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->json('recurrence_days');
            $table->json('weekday_times')->nullable();
            $table->string('status', 32)->default('pending');
            $table->text('decline_reason')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('attachment_path')->nullable();
            $table->string('attachment_name')->nullable();
            $table->timestamps();

            $table->index(['facility_id', 'status', 'start_date', 'end_date'], 'activity_plan_facility_status_dates');
            $table->index(['user_id', 'created_at']);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->uuid('activity_plan_id')->nullable()->after('facility_id');
            $table->foreign('activity_plan_id')
                ->references('id')
                ->on('activity_plans')
                ->nullOnDelete();
            $table->index('activity_plan_id');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['activity_plan_id']);
            $table->dropIndex(['activity_plan_id']);
            $table->dropColumn('activity_plan_id');
        });

        Schema::dropIfExists('activity_plans');
    }
};
