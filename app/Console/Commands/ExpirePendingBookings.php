<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\SystemSetting;
use App\Models\User;
use App\Notifications\BookingOperationsNotification;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExpirePendingBookings extends Command
{
    protected $signature = 'bookings:expire-pending';

    protected $description = 'Remind about pending bookings and expire them when their scheduled start time passes or the configured waiting period elapses.';

    public function handle(): int
    {
        $settings = SystemSetting::current();
        $expiryHours = max(1, (int) $settings->pending_booking_expiry_hours);
        $reminderHours = max(0, (int) $settings->pending_booking_reminder_hours);
        $now = now();
        $expiredCount = 0;
        $remindedCount = 0;

        // A request must not remain pending after its actual scheduled start.
        // The configured waiting-period expiry remains an additional cutoff.
        Booking::query()
            ->where('status', 'pending')
            ->orderBy('created_at')
            ->chunkById(100, function ($bookings) use (&$expiredCount, $expiryHours, $now) {
                foreach ($bookings as $booking) {
                    $outcome = DB::transaction(function () use ($booking, $expiryHours, $now) {
                        $locked = Booking::query()
                            ->whereKey($booking->getKey())
                            ->lockForUpdate()
                            ->first();

                        if (! $locked || $locked->status !== 'pending') {
                            return null;
                        }

                        $startAt = $this->scheduledStartAt($locked);
                        $scheduledTimePassed = $startAt !== null && $startAt->lte($now);
                        $waitingPeriodElapsed = $locked->created_at
                            && $locked->created_at->lte($now->copy()->subHours($expiryHours));

                        if (! $scheduledTimePassed && ! $waitingPeriodElapsed) {
                            return null;
                        }

                        $locked->update([
                            'status' => 'expired',
                            'pending_expired_at' => $now,
                        ]);

                        return [
                            'booking' => $locked->fresh(['facility', 'user']),
                            'reason' => $scheduledTimePassed
                                ? 'its scheduled start date and time had already passed'
                                : "it was not reviewed within the configured {$expiryHours}-hour period",
                        ];
                    });

                    if (! $outcome) {
                        continue;
                    }

                    $expired = $outcome['booking'];
                    $reason = $outcome['reason'];

                    $expired->user?->notify(new BookingOperationsNotification(
                        'Your pending booking for ' . ($expired->facility?->name ?? 'a facility') . " expired because {$reason}. The booking was not deleted.",
                        (string) $expired->getKey(),
                        'Booking Request Expired'
                    ));

                    $expired->facility?->facilityAdmins()
                        ->where('is_active', true)
                        ->get()
                        ->each(fn (User $admin) => $admin->notify(new BookingOperationsNotification(
                            'A pending booking for ' . ($expired->facility?->name ?? 'your facility') . " expired because {$reason}.",
                            (string) $expired->getKey(),
                            'Pending Booking Expired'
                        )));

                    $expiredCount++;
                }
            });

        // Reminders are sent only while the booking is still before its scheduled start.
        if ($reminderHours > 0 && $reminderHours < $expiryHours) {
            $reminderCutoff = $now->copy()->subHours($expiryHours - $reminderHours);
            Booking::query()
                ->with(['facility', 'user'])
                ->where('status', 'pending')
                ->whereNull('pending_reminder_sent_at')
                ->whereNotNull('created_at')
                ->where('created_at', '<=', $reminderCutoff)
                ->where('created_at', '>', $now->copy()->subHours($expiryHours))
                ->orderBy('created_at')
                ->chunkById(100, function ($bookings) use (&$remindedCount, $now) {
                    foreach ($bookings as $booking) {
                        $startAt = $this->scheduledStartAt($booking);
                        if ($startAt !== null && $startAt->lte($now)) {
                            continue;
                        }

                        $sent = DB::transaction(function () use ($booking) {
                            $locked = Booking::query()
                                ->whereKey($booking->getKey())
                                ->lockForUpdate()
                                ->first();

                            if (
                                ! $locked
                                || $locked->status !== 'pending'
                                || $locked->pending_reminder_sent_at
                            ) {
                                return false;
                            }

                            $locked->update(['pending_reminder_sent_at' => now()]);

                            return true;
                        });

                        if (! $sent) {
                            continue;
                        }

                        $booking->user?->notify(new BookingOperationsNotification(
                            'Your booking for ' . ($booking->facility?->name ?? 'a facility') . ' is still awaiting approval and will expire soon if no decision is made.',
                            (string) $booking->getKey(),
                            'Booking Approval Reminder'
                        ));

                        $booking->facility?->facilityAdmins()
                            ->where('is_active', true)
                            ->get()
                            ->each(fn (User $admin) => $admin->notify(new BookingOperationsNotification(
                                'A pending booking for ' . ($booking->facility?->name ?? 'your facility') . ' is approaching its expiration deadline.',
                                (string) $booking->getKey(),
                                'Pending Approval Reminder'
                            )));

                        $remindedCount++;
                    }
                });
        }

        $this->info("Expired {$expiredCount} pending booking(s); sent {$remindedCount} reminder(s).");

        return self::SUCCESS;
    }

    private function scheduledStartAt(Booking $booking): ?Carbon
    {
        $date = $booking->date ?? $booking->booking_date;

        if (! $date || ! $booking->start_time) {
            return null;
        }

        $dateString = $date instanceof Carbon
            ? $date->toDateString()
            : Carbon::parse($date)->toDateString();

        return Carbon::parse($dateString . ' ' . substr((string) $booking->start_time, 0, 8));
    }
}
