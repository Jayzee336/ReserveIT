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
            $titlePattern = match ($category) {
                'request' => '%request%',
                'approved' => '%approv%',
                'rejected' => '%reject%',
                'cancelled' => '%cancel%',
                default => null,
            };

            if ($titlePattern) {
                $query->where('data->title', 'like', $titlePattern);
            } else {
                $query->where(function ($categoryQuery) {
                    $categoryQuery
                        ->whereNull('data->title')
                        ->orWhere(function ($otherQuery) {
                            $otherQuery
                                ->where('data->title', 'not like', '%request%')
                                ->where('data->title', 'not like', '%approv%')
                                ->where('data->title', 'not like', '%reject%')
                                ->where('data->title', 'not like', '%cancel%');
                        });
                });
            }
        }

        if ($search !== '') {
            $query->where(function ($searchQuery) use ($search) {
                $searchQuery
                    ->where('data->title', 'like', "%{$search}%")
                    ->orWhere('data->message', 'like', "%{$search}%")
                    ->orWhere('data->booking_id', 'like', "%{$search}%");
            });
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
            'notifications' => $notifications,
            'filters' => [
                'status' => $status,
                'category' => $category,
                'search' => $search,
            ],
        ]);
    }
}
