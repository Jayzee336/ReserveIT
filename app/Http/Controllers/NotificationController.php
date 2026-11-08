<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    /**
     * Display the signed-in user's notification history.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'status' => ['nullable', 'in:all,unread,read'],
            'category' => ['nullable', 'in:all,request,approved,rejected,cancelled,other'],
            'search' => ['nullable', 'string', 'max:150'],
        ]);

        $status = $filters['status'] ?? 'all';
        $category = $filters['category'] ?? 'all';
        $search = trim($filters['search'] ?? '');

        $query = $request->user()->notifications();

        if ($status === 'unread') {
            $query->whereNull('read_at');
        } elseif ($status === 'read') {
            $query->whereNotNull('read_at');
        }

        if ($category !== 'all') {
            $patterns = match ($category) {
                'request' => ['%request%', '%submitted%', '%new booking%'],
                'approved' => ['%approv%'],
                'rejected' => ['%reject%', '%declin%'],
                'cancelled' => ['%cancel%'],
                default => [],
            };

            if ($patterns !== []) {
                $query->where(function ($categoryQuery) use ($patterns) {
                    foreach ($patterns as $pattern) {
                        $categoryQuery->orWhereRaw(
                            'LOWER(CAST(data AS TEXT)) LIKE ?',
                            [$pattern]
                        );
                    }
                });
            } else {
                // "Other" excludes all known booking lifecycle notifications.
                $knownPatterns = [
                    '%request%',
                    '%submitted%',
                    '%new booking%',
                    '%approv%',
                    '%reject%',
                    '%declin%',
                    '%cancel%',
                ];

                $query->where(function ($categoryQuery) use ($knownPatterns) {
                    foreach ($knownPatterns as $pattern) {
                        $categoryQuery->whereRaw(
                            'LOWER(CAST(data AS TEXT)) NOT LIKE ?',
                            [$pattern]
                        );
                    }
                });
            }
        }

        if ($search !== '') {
            $query->whereRaw(
                'LOWER(CAST(data AS TEXT)) LIKE ?',
                ['%' . mb_strtolower($search) . '%']
            );
        }

        $notifications = $query
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(function ($notification) {
                $data = $notification->data ?? [];
                $title = $data['title'] ?? 'System Notification';
                $text = strtolower($title . ' ' . ($data['message'] ?? ''));

                $category = match (true) {
                    str_contains($text, 'cancel') => 'cancelled',
                    str_contains($text, 'reject'), str_contains($text, 'declin') => 'rejected',
                    str_contains($text, 'approv') => 'approved',
                    str_contains($text, 'request'), str_contains($text, 'submitted'), str_contains($text, 'new booking') => 'request',
                    default => 'other',
                };

                return [
                    'id' => $notification->id,
                    'title' => $title,
                    'message' => $data['message'] ?? '',
                    'booking_id' => $data['booking_id'] ?? null,
                    'category' => $category,
                    'read' => $notification->read_at !== null,
                    'created_at' => $notification->created_at?->toIso8601String(),
                ];
            });

        return Inertia::render('Notifications/Index', [
            'notificationHistory' => $notifications,
            'unreadCount' => $request->user()->unreadNotifications()->count(),
            'filters' => [
                'status' => $status,
                'category' => $category,
                'search' => $search,
            ],
        ]);
    }
}
