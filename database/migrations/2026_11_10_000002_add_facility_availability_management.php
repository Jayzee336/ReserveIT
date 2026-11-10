<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            $table->boolean('is_available')->default(true)->after('allowTdevsManpower');
            $table->text('unavailable_reason')->nullable()->after('is_available');
        });

        Schema::create('facility_unavailability_periods', function (Blueprint $table) {
            $table->id();
            $table->string('facility_id');
            $table->foreign('facility_id')
                ->references('id')
                ->on('facilities')
                ->cascadeOnDelete();

            $table->text('reason');
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->foreignId('started_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('restored_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('affected_user_ids')->nullable();
            $table->timestamps();

            $table->index(['facility_id', 'ended_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facility_unavailability_periods');

        Schema::table('facilities', function (Blueprint $table) {
            $table->dropColumn(['is_available', 'unavailable_reason']);
        });
    }
};
