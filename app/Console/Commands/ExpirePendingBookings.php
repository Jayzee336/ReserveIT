<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\SystemSetting;
use App\Models\User;
use App\Notifications\BookingOperationsNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExpirePendingBookings extends Command
{
    protected $signature = 'bookings:expire-pending';

    protected $description = 'Notify users about pending bookings and expire requests after the configured duration.';

    public function handle(): int
    {
        $settings = SystemSetting::current();
        $expiryHours = max(1, (int) $settings->pending_booking_expiry_hours);
        $reminderHours = max(0, (int) $settings->pending_booking_reminder_hours);
        $now = now();
        $expiredCount = 0;
        $remindedCount = 0;

        Booking::query()
            ->where('status', 'pending')
            ->whereNotNull('created_at')
            ->where('created_at', '<=', $now->copy()->subHours($expiryHours))
            ->orderBy('created_at')
            ->chunkById(100, function ($bookings) use (&$expiredCount) {
                foreach ($bookings as $booking) {
                    $expired = DB::transaction(function () use ($booking) {
                        $locked = Booking::query()->whereKey($booking->getKey())->lockForUpdate()->first();
                        if (! $locked || $locked->status !== 'pending') {
                            return null;
                        }

                        $locked->update([
                            'status' => 'expired',
                            'pending_expired_at' => now(),
                        ]);

                        return $locked->fresh(['facility', 'user']);
                    });

                    if (! $expired) {
                        continue;
                    }

                    $expired->user?->notify(new BookingOperationsNotification(
                        'Your pending booking for ' . ($expired->facility?->name ?? 'a facility') . ' expired because it was not reviewed within the configured ' . $expiryHours . '-hour period. The booking was not deleted.',
                        (string) $expired->getKey(),
                        'Booking Request Expired'
                    ));

                    $expired->facility?->facilityAdmins()
                        ->where('is_active', true)
                        ->get()
                        ->each(fn (User $admin) => $admin->notify(new BookingOperationsNotification(
                            'A pending booking for ' . ($expired->facility?->name ?? 'your facility') . ' expired after ' . $expiryHours . ' hours without a decision.',
                            (string) $expired->getKey(),
                            'Pending Booking Expired'
                        )));

                    $expiredCount++;
                }
            });

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
                ->chunkById(100, function ($bookings) use (&$remindedCount) {
                    foreach ($bookings as $booking) {
                        $sent = DB::transaction(function () use ($booking) {
                            $locked = Booking::query()->whereKey($booking->getKey())->lockForUpdate()->first();
                            if (! $locked || $locked->status !== 'pending' || $locked->pending_reminder_sent_at) {
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
}
