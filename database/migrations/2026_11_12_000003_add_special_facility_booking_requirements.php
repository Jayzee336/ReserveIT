<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('sister_signature_path')->nullable();
            $table->string('sister_signature_name')->nullable();
            $table->unsignedInteger('scheduled_fee_minutes')->default(0);
            $table->decimal('scheduled_fee_amount', 10, 2)->default(0);
            $table->decimal('scheduled_fee_rate', 10, 2)->default(0);
            $table->string('scheduled_fee_payment_status', 20)->default('not_required');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'sister_signature_path',
                'sister_signature_name',
                'scheduled_fee_minutes',
                'scheduled_fee_amount',
                'scheduled_fee_rate',
                'scheduled_fee_payment_status',
            ]);
        });
    }
};
