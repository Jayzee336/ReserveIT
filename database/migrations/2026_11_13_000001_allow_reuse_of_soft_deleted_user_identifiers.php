<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique');
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_unique');
        } elseif ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS users_email_unique');
            DB::statement('DROP INDEX IF EXISTS users_username_unique');
        } else {
            throw new RuntimeException(
                'The soft-delete-aware user identifier indexes are currently configured for PostgreSQL and SQLite.'
            );
        }

        // Keep email and username unique among active accounts while allowing
        // a new account to reuse identifiers from a soft-deleted account.
        DB::statement(
            'CREATE UNIQUE INDEX users_email_active_unique ON users (email) WHERE deleted_at IS NULL'
        );
        DB::statement(
            'CREATE UNIQUE INDEX users_username_active_unique ON users (username) WHERE deleted_at IS NULL'
        );
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        DB::statement('DROP INDEX IF EXISTS users_email_active_unique');
        DB::statement('DROP INDEX IF EXISTS users_username_active_unique');

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email)');
            DB::statement('ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username)');
        } elseif ($driver === 'sqlite') {
            DB::statement('CREATE UNIQUE INDEX users_email_unique ON users (email)');
            DB::statement('CREATE UNIQUE INDEX users_username_unique ON users (username)');
        }
    }
};
