<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ActivityPlanNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $activityPlanId,
        private readonly string $title,
        private readonly string $message
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'activity_plan_id' => $this->activityPlanId,
            'activity_plan_url' => '/activity-plans/' . $this->activityPlanId,
        ];
    }
}
