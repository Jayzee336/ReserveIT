<?php

namespace App\Console\Commands;

use App\Models\Facility;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ProvisionUicDemoAccounts extends Command
{
    protected $signature = 'reserveit:provision-uic-demo-accounts {--dry-run : Report changes without writing to the database}';

    protected $description = 'Create only missing UIC demo accounts without modifying existing users or assignments';

    public function handle(): int
    {
        $password = (string) getenv('RESERVEIT_UIC_DEMO_PASSWORD');

        if ($password === '') {
            $this->error('RESERVEIT_UIC_DEMO_PASSWORD must be set. No changes were made.');
            return self::FAILURE;
        }

        $accounts = [
            ['username' => 'admin', 'name' => 'ReserveIT Super Admin', 'email' => 'admin@uic.edu.ph', 'role' => 'super_admin', 'member_type' => 'teacher'],
            ['username' => 'facility1', 'name' => 'ReserveIT Facility Admin 1', 'email' => 'facility1@uic.edu.ph', 'role' => 'facility_admin', 'member_type' => 'teacher'],
            ['username' => 'facility2', 'name' => 'ReserveIT Facility Admin 2', 'email' => 'facility2@uic.edu.ph', 'role' => 'facility_admin', 'member_type' => 'teacher'],
            ['username' => 'facility3', 'name' => 'ReserveIT Facility Admin 3', 'email' => 'facility3@uic.edu.ph', 'role' => 'facility_admin', 'member_type' => 'teacher'],
            ['username' => 'facility4', 'name' => 'ReserveIT Facility Admin 4', 'email' => 'facility4@uic.edu.ph', 'role' => 'facility_admin', 'member_type' => 'teacher'],
            ['username' => 'user1', 'name' => 'ReserveIT Demo User 1', 'email' => 'user1@uic.edu.ph', 'role' => 'user', 'member_type' => 'student'],
            ['username' => 'user2', 'name' => 'ReserveIT Demo User 2', 'email' => 'user2@uic.edu.ph', 'role' => 'user', 'member_type' => 'student'],
            ['username' => 'user3', 'name' => 'ReserveIT Demo User 3', 'email' => 'user3@uic.edu.ph', 'role' => 'user', 'member_type' => 'student'],
        ];

        $assignments = [
            'facility1@uic.edu.ph' => ['avr', 'avr2'],
            'facility2@uic.edu.ph' => ['lobby', 'f3', 'field', 'sky_gym', 'view_deck'],
            'facility3@uic.edu.ph' => ['itrc', 'iot', 'open_lab'],
            'facility4@uic.edu.ph' => ['itdif'],
        ];

        $created = [];
        $conflicts = [];
        $existing = [];

        foreach ($accounts as $account) {
            $byEmail = User::withTrashed()->where('email', $account['email'])->first();
            $byUsername = User::withTrashed()->where('username', $account['username'])->first();

            if ($byEmail || $byUsername) {
                $existing[] = $account['email'];
                if (! $byEmail || ! $byUsername || $byEmail->isNot($byUsername) || $byEmail->trashed()) {
                    $conflicts[] = $account['email'] . ' (email/username conflict or soft-deleted row)';
                }
                continue;
            }

            $created[] = $account;
        }

        foreach ($created as $account) {
            if (isset($assignments[$account['email']])) {
                $facilityIds = $assignments[$account['email']];
                $foundIds = Facility::whereIn('id', $facilityIds)->pluck('id')->all();
                $missing = array_diff($facilityIds, $foundIds);
                if ($missing !== []) {
                    $this->error('Missing required facilities for ' . $account['email'] . ': ' . implode(', ', $missing));
                    return self::FAILURE;
                }
            }
        }

        $this->info('Accounts to create: ' . count($created));
        foreach ($created as $account) $this->line('  CREATE ' . $account['email'] . ' (' . $account['role'] . ')');
        foreach ($existing as $email) $this->line('  KEEP EXISTING ' . $email . ' (no changes)');
        foreach ($conflicts as $conflict) $this->warn('  REVIEW CONFLICT ' . $conflict);

        if ($this->option('dry-run')) {
            $this->comment('Dry run only. No database changes were made.');
            return $conflicts === [] ? self::SUCCESS : self::FAILURE;
        }

        if ($conflicts !== []) {
            $this->error('Conflicts must be reviewed before provisioning. No accounts were created.');
            return self::FAILURE;
        }

        DB::transaction(function () use ($created, $assignments, $password): void {
            foreach ($created as $account) {
                $user = User::create([
                    'username' => $account['username'],
                    'name' => $account['name'],
                    'email' => $account['email'],
                    'password' => $password,
                    'role' => $account['role'],
                    'uic_member_type' => $account['member_type'],
                    'must_change_password' => true,
                    'is_active' => true,
                ]);

                if (isset($assignments[$account['email']])) {
                    $user->managedFacilities()->attach($assignments[$account['email']]);
                }
            }
        });

        $this->info('Provisioning completed. Existing accounts were not modified.');
        $this->warn('New accounts must change their temporary password at first login.');
        return self::SUCCESS;
    }
}
