<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class BookingOperationsNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $message,
        private readonly string $bookingId,
        private readonly string $title = 'Booking Update'
    ) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'booking_id' => $this->bookingId,
        ];
    }
}
