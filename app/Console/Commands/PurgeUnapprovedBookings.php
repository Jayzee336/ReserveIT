<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\SystemSetting;
use Carbon\Carbon;
use Illuminate\Console\Command;

class PurgeUnapprovedBookings extends Command
{
    protected $signature = 'bookings:purge-unapproved
                            {--dry-run : Preview eligible bookings without deleting them}';

    protected $description = 'Purge expired pending bookings using the configured retention period.';

    public function handle(): int
    {
        $retentionDays = (int) SystemSetting::current()->auto_purge_unapproved_days;

        if ($retentionDays <= 0) {
            $this->info(
                'Auto-purge is disabled. Set the retention period to 7 or 14 days in Booking System Settings.'
            );

            return Command::SUCCESS;
        }

        $cutoff = Carbon::today()->subDays($retentionDays)->toDateString();

        $expiredUnapproved = Booking::query()
            ->where('status', 'pending')
            ->where(function ($query) use ($cutoff) {
                $query->whereDate('date', '<', $cutoff)
                    ->orWhere(function ($subquery) use ($cutoff) {
                        $subquery->whereNull('date')
                            ->whereDate('booking_date', '<', $cutoff);
                    });
            });

        $count = (clone $expiredUnapproved)->count();

        if ($count === 0) {
            $this->info('No expired pending bookings found.');

            return Command::SUCCESS;
        }

        if ($this->option('dry-run')) {
            $this->warn("DRY RUN: {$count} pending booking(s) qualify for deletion.");

            (clone $expiredUnapproved)
                ->orderBy('id')
                ->get(['id', 'date', 'booking_date', 'status'])
                ->each(function (Booking $booking) {
                    $this->line(
                        "ID: {$booking->id} | Date: "
                        . ($booking->date ?? $booking->booking_date ?? 'Unknown')
                        . " | Status: {$booking->status}"
                    );
                });

            $this->comment('No records were deleted.');

            return Command::SUCCESS;
        }

        $deletedCount = (clone $expiredUnapproved)->delete();

        $this->info(
            "Purged {$deletedCount} expired pending booking(s) older than {$retentionDays} day(s)."
        );

        return Command::SUCCESS;
    }
}