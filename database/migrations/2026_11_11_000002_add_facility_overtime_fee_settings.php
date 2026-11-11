<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    private const BILLABLE_FACILITIES = [
        'i.t. development and incubation facility (itdif)',
        'lobby',
        'sky gym',
        'main auditorium',
        'quadrangle or field',
        'view deck',
    ];

    public function up(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            $table->boolean('overtime_fee_enabled')->default(false);
            $table->decimal('overtime_fee_per_hour', 10, 2)->default(0);
        });

        $defaultRate = (float) (DB::table('system_settings')->value('overtime_fee_per_hour') ?? 0);

        foreach (self::BILLABLE_FACILITIES as $name) {
            DB::table('facilities')
                ->whereRaw('LOWER(name) = ?', [$name])
                ->update([
                    'overtime_fee_enabled' => true,
                    'overtime_fee_per_hour' => $defaultRate,
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            $table->dropColumn(['overtime_fee_enabled', 'overtime_fee_per_hour']);
        });
    }
};
