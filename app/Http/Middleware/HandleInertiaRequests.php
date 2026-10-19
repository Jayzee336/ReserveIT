<?php

namespace App\Http\Middleware;

use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $notifications = [];

        if ($request->user()) {
            $notifications = $request->user()
                ->unreadNotifications()
                ->latest()
                ->take(10)
                ->get()
                ->map(function ($notification) {
                    $data = $notification->data;

                    return [
                        'id' => $notification->id,
                        'title' => $data['title'] ?? 'System Notification',
                        'message' => $data['message'] ?? '',
                        'booking_id' => $data['booking_id'] ?? null,
                        'read' => false,
                        'created_at' => $notification->created_at,
                    ];
                });
        }

        return [
            ...parent::share($request),

            'auth' => [
                'user' => $request->user(),
            ],

            'flash' => [
                'toast' => fn () => $request->session()->get('toast'),
                'error' => fn () => $request->session()->get('error'),
            ],

            'notifications' => $notifications,

            'systemSettings' => fn () => (function () {
                $settings = SystemSetting::current();

                return [
                    'require_consent_letter' => (bool) $settings
                        ->require_consent_letter,

                    'cleanup_buffer_minutes' => (int) (
                        $settings->cleanup_buffer_minutes ?? 30
                    ),
                ];
            })(),
        ];
    }
}