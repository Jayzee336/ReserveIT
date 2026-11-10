<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_extension_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->time('original_end_time');
            $table->time('requested_end_time');
            $table->unsignedSmallInteger('requested_minutes');
            $table->text('reason');
            $table->string('status', 20)->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('decision_reason')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at'], 'booking_extension_status_created');
            $table->index(['booking_id', 'status'], 'booking_extension_booking_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_extension_requests');
    }
};
