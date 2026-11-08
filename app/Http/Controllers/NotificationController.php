<?php

namespace App\Http\Controllers;

use App\Models\Booking;
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
                $knownPatterns = [
                    '%request%', '%submitted%', '%new booking%',
                    '%approv%', '%reject%', '%declin%', '%cancel%',
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
            $needle = mb_strtolower($search);

            // Find matching booking IDs first. The notifications.data column is TEXT
            // in this database, so JSON operators such as ->> cannot be used on it.
            $matchingBookingIds = Booking::query()
                ->where(function ($bookingQuery) use ($needle) {
                    $bookingQuery
                        ->whereRaw('LOWER(COALESCE(notes, \'\')) LIKE ?', ['%' . $needle . '%'])
                        ->orWhereHas('facility', function ($facilityQuery) use ($needle) {
                            $facilityQuery->whereRaw('LOWER(name) LIKE ?', ['%' . $needle . '%']);
                        })
                        ->orWhereRaw('LOWER(CAST(id AS TEXT)) LIKE ?', ['%' . $needle . '%']);
                })
                ->pluck('id')
                ->map(fn ($id) => (string) $id)
                ->all();

            $query->where(function ($searchQuery) use ($needle, $matchingBookingIds) {
                $searchQuery->whereRaw(
                    'LOWER(CAST(data AS TEXT)) LIKE ?',
                    ['%' . $needle . '%']
                );

                // Match the booking UUID inside the TEXT-encoded notification payload.
                foreach ($matchingBookingIds as $bookingId) {
                    $searchQuery->orWhereRaw(
                        'CAST(data AS TEXT) LIKE ?',
                        ['%' . $bookingId . '%']
                    );
                }
            });
        }

        $notifications = $query
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(function ($notification) {
                $data = $notification->data ?? [];
                $title = $data['title'] ?? 'System Notification';
                $message = $data['message'] ?? '';
                $text = strtolower($title . ' ' . $message);

                $category = match (true) {
                    str_contains($text, 'cancel') => 'cancelled',
                    str_contains($text, 'reject'), str_contains($text, 'declin') => 'rejected',
                    str_contains($text, 'approv') => 'approved',
                    str_contains($text, 'request'), str_contains($text, 'submitted'), str_contains($text, 'new booking') => 'request',
                    default => 'other',
                };

                $booking = !empty($data['booking_id'])
                    ? Booking::with('facility:id,name')
                        ->find($data['booking_id'])
                    : null;

                // BookingModal stores the submitted event title in the notes field:
                // "Event: <title> | Dept: ... | Desig: ...".
                $eventTitle = null;
                if ($booking && preg_match('/(?:^|\\n)Event:\\s*(.*?)(?:\\s*\\|\\s*Dept:|\\n|$)/i', (string) $booking->notes, $matches)) {
                    $eventTitle = trim($matches[1]) ?: null;
                }

                return [
                    'id' => $notification->id,
                    'title' => $title,
                    'message' => $message,
                    'booking_id' => $data['booking_id'] ?? null,
                    'event_title' => $eventTitle,
                    'facility_name' => $booking?->facility?->name,
                    'booking_date' => ($booking?->date ?? $booking?->booking_date)?->format('Y-m-d'),
                    'start_time' => $booking?->start_time,
                    'end_time' => $booking?->end_time,
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
