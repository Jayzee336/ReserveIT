<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class BookingOperationsNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $message,
        private readonly string $referenceId,
        private readonly string $title = 'Booking Update',
        private readonly string $referenceType = 'booking'
    ) {}

    public function via(object $notifiable): array { return ['database']; }

    public function toArray(object $notifiable): array
    {
         $payload = [
            'title' => $this->title,
            'message' => $this->message,
        ];

        if ($this->referenceType === 'ticket') {
            $payload['ticket_id'] = $this->referenceId;
        } else {
            $payload['booking_id'] = $this->referenceId;
        }

        return $payload;
    }
}
