<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Allow the expiration workflow to persist the "expired" booking status
     * on PostgreSQL deployments.
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check');

        DB::statement("
            ALTER TABLE bookings
            ADD CONSTRAINT bookings_status_check
            CHECK (status IN ('pending', 'approved', 'declined', 'cancelled', 'expired'))
        ");
    }

    /**
     * Restore the original set of booking statuses.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check');

        DB::statement("
            ALTER TABLE bookings
            ADD CONSTRAINT bookings_status_check
            CHECK (status IN ('pending', 'approved', 'declined', 'cancelled'))
        ");
    }
};
