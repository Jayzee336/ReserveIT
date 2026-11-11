<?php

namespace App\\Console\\Commands;

use Illuminate\\Console\\Command;

class PurgeUnapprovedBookings extends Command
{
    protected $signature = 'bookings:purge-unapproved {--dry-run : Deprecated; no records are deleted}';

    protected $description = 'Deprecated: pending bookings now expire without deleting their history.';

    public function handle(): int
    {
        $this->warn('This command is deprecated and will not delete booking records.');
        $this->line('Use bookings:expire-pending to send reminders and mark overdue pending requests as expired.');

        return self::SUCCESS;
    }
}
