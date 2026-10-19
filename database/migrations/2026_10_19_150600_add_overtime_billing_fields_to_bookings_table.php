<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->unsignedInteger('overtime_minutes')
                ->nullable();

            $table->decimal('overtime_fee_amount', 10, 2)
                ->nullable();

            $table->decimal('overtime_fee_rate', 10, 2)
                ->nullable();

            $table->string('overtime_payment_status', 20)
                ->default('not_due');

            $table->timestamp('overtime_paid_at')
                ->nullable();

            $table->string('overtime_paid_by')
                ->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'overtime_minutes',
                'overtime_fee_amount',
                'overtime_fee_rate',
                'overtime_payment_status',
                'overtime_paid_at',
                'overtime_paid_by',
            ]);
        });
    }
};