<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ProvisionUicDemoAccounts extends Command
{
    protected $signature = 'reserveit:provision-uic-demo-accounts {--dry-run : Report email conversions without writing to the database}';

    protected $description = 'Safely convert existing production demo account emails to UIC addresses without changing other user data';

    public function handle(): int
    {
        // These are the existing production demo identities created by the
        // explicitly enabled demo seeder. Only the email column is changed.
        $conversions = [
            ['from' => 'admin@test.com', 'to' => 'admin@uic.edu.ph'],
            ['from' => 'facility@test.com', 'to' => 'facility1@uic.edu.ph'],
            ['from' => 'facility2@test.com', 'to' => 'facility2@uic.edu.ph'],
            ['from' => 'facility3@test.com', 'to' => 'facility3@uic.edu.ph'],
            ['from' => 'facility4@test.com', 'to' => 'facility4@uic.edu.ph'],
            ['from' => 'user@test.com', 'to' => 'user1@uic.edu.ph'],
            ['from' => 'user2@test.com', 'to' => 'user2@uic.edu.ph'],
            ['from' => 'user3@test.com', 'to' => 'user3@uic.edu.ph'],
        ];

        $updates = [];
        $alreadyConverted = [];
        $conflicts = [];

        foreach ($conversions as $conversion) {
            $source = User::withTrashed()
                ->where('email', $conversion['from'])
                ->first();

            $target = User::withTrashed()
                ->where('email', $conversion['to'])
                ->first();

            if ($source && $target && $source->isNot($target)) {
                $conflicts[] = $conversion['from'] . ' -> ' . $conversion['to']
                    . ' (target email belongs to a different user; source ID=' . $source->getKey()
                    . ', target ID=' . $target->getKey() . ')';
                continue;
            }

            if ($source && $source->trashed()) {
                $conflicts[] = $conversion['from'] . ' -> ' . $conversion['to']
                    . ' (source account ID=' . $source->getKey() . ' is soft-deleted)';
                continue;
            }

            if ($target && $target->trashed()) {
                $conflicts[] = $conversion['from'] . ' -> ' . $conversion['to']
                    . ' (target email belongs to soft-deleted account ID=' . $target->getKey() . ')';
                continue;
            }

            if ($source) {
                $updates[] = [
                    'user_id' => $source->getKey(),
                    'from' => $conversion['from'],
                    'to' => $conversion['to'],
                ];
                continue;
            }

            if ($target) {
                $alreadyConverted[] = $conversion['to'] . ' (account ID=' . $target->getKey() . ')';
                continue;
            }

            $conflicts[] = $conversion['from'] . ' -> ' . $conversion['to']
                . ' (neither source nor target email exists)';
        }

        $this->info('Existing accounts whose email will be changed: ' . count($updates));
        foreach ($updates as $update) {
            $this->line('  UPDATE EMAIL ONLY ' . $update['from'] . ' -> ' . $update['to']
                . ' (preserve user ID ' . $update['user_id'] . ', password, role, username, bookings, and assignments)');
        }

        foreach ($alreadyConverted as $email) {
            $this->line('  ALREADY CONVERTED ' . $email . ' (no changes)');
        }

        foreach ($conflicts as $conflict) {
            $this->warn('  REVIEW CONFLICT ' . $conflict);
        }

        if ($this->option('dry-run')) {
            $this->comment('Dry run only. No database changes were made.');
            return $conflicts === [] ? self::SUCCESS : self::FAILURE;
        }

        if ($conflicts !== []) {
            $this->error('Conflicts must be resolved first. No email addresses were changed.');
            return self::FAILURE;
        }

        DB::transaction(function () use ($updates): void {
            foreach ($updates as $update) {
                $user = User::query()->whereKey($update['user_id'])->firstOrFail();

                // Update only email. Do not touch passwords, roles, usernames,
                // account status, facility assignments, bookings, or other data.
                $user->email = $update['to'];
                $user->save();
            }
        });

        $this->info('UIC email conversion completed. Existing user records and related data were preserved.');
        return self::SUCCESS;
    }
}
