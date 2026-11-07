<?php

namespace App\Http\Controllers\Facilitator;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Facility;
use App\Support\BookingDashboardAnalytics;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class FacilitatorDashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $selectedFacilityId = $request->query('facility_id');

        $filters = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'group_by' => ['nullable', 'in:day,week,month'],
        ]);

        $defaultFrom = now()->subMonths(5)->startOfMonth()->toDateString();
        $defaultTo = now()->toDateString();
        $filterFrom = $filters['from'] ?? $defaultFrom;
        $filterTo = $filters['to'] ?? $defaultTo;
        $groupBy = $filters['group_by'] ?? 'month';

        $managedFacilities = Facility::query()
            ->select(['id', 'name'])
            ->orderBy('name')
            ->forUser($user)
            ->get();

        $managedFacilityIds = $managedFacilities->pluck('id')->map(fn ($id) => (string) $id)->all();

        if ($selectedFacilityId !== null && $selectedFacilityId !== '') {
            abort_unless(in_array((string) $selectedFacilityId, $managedFacilityIds, true), 403);
            $activeFacilityIds = [(string) $selectedFacilityId];
        } else {
            $activeFacilityIds = $managedFacilityIds;
        }

        // Every dashboard query starts with the authenticated user's facility scope.
        $scopedBookings = Booking::query()->forUser($user);
        if ($activeFacilityIds !== []) {
            $scopedBookings->whereIn('facility_id', $activeFacilityIds);
        } else {
            $scopedBookings->whereRaw('0 = 1');
        }

        // Operational sections omit cancelled and declined bookings.
        $operationalBookings = (clone $scopedBookings)
            ->whereNotIn('status', ['declined', 'cancelled']);

        $pendingBookings = (clone $operationalBookings)
            ->where('status', 'pending')
            ->with(['facility:id,name', 'user:id,name,email'])
            ->orderBy('date')
            ->orderBy('start_time')
            ->take(5)
            ->get();

        $todayDate = today()->toDateString();
        $todayBookings = (clone $operationalBookings)
            ->where(function ($query) use ($todayDate): void {
                $query->whereDate('booking_date', $todayDate)
                    ->orWhereDate('date', $todayDate);
            })
            ->with(['facility:id,name', 'user:id,name,email'])
            ->orderBy('start_time')
            ->get();

        $now = now();
        $timeline = ['ongoing' => [], 'upcoming' => [], 'completed' => []];

        foreach ($todayBookings as $booking) {
            $isOngoing = ! is_null($booking->checked_in_at)
                || $this->isBetweenTime($booking->start_time, $booking->end_time, $now);
            $isCompleted = ! is_null($booking->checked_out_at)
                || $this->isPastEndTime($booking->end_time, $now);

            if ($isOngoing) {
                $timeline['ongoing'][] = $booking;
            } elseif ($isCompleted) {
                $timeline['completed'][] = $booking;
            } else {
                $timeline['upcoming'][] = $booking;
            }
        }

        $weekStart = now()->startOfWeek();
        $weekEnd = now()->endOfWeek();
        $weekBookings = (clone $operationalBookings)
            ->where(function ($query) use ($weekStart, $weekEnd): void {
                $query->whereBetween('booking_date', [
                    $weekStart->toDateString(),
                    $weekEnd->toDateString(),
                ])->orWhere(function ($legacyQuery) use ($weekStart, $weekEnd): void {
                    $legacyQuery->whereNull('booking_date')
                        ->whereBetween('date', [
                            $weekStart->toDateString(),
                            $weekEnd->toDateString(),
                        ]);
                });
            })
            ->get();

        $occupiedHours = $weekBookings->sum(
            fn (Booking $booking) => $this->getDurationHours($booking->start_time, $booking->end_time)
        );
        $capacityHours = count($activeFacilityIds) * 14 * 7;
        $weeklyUtilizationRate = $capacityHours > 0
            ? round(($occupiedHours / $capacityHours) * 100, 1)
            : 0;

        $activeOccupancy = (clone $operationalBookings)
            ->whereNotNull('checked_in_at')
            ->whereNull('checked_out_at')
            ->count();

        // Analytics include every booking status, but remain restricted to assigned facilities.
        $analyticsBookings = (clone $scopedBookings)
            ->whereRaw(
                'DATE(COALESCE(booking_date, date)) BETWEEN ? AND ?',
                [$filterFrom, $filterTo]
            )
            ->with(['facility:id,name', 'user:id,name,email'])
            ->get();

        $clientGroups = $analyticsBookings->groupBy(function (Booking $booking): string {
            if ($booking->user_id) {
                return 'user:' . $booking->user_id;
            }
            if ($booking->guest_email) {
                return 'guest:' . strtolower(trim($booking->guest_email));
            }
            return 'booking:' . $booking->getKey();
        });

        $uniqueClients = $clientGroups->count();
        $returningClients = $clientGroups->filter(
            fn ($clientBookings) => $clientBookings->count() > 1
        )->count();

        $decidedBookings = $analyticsBookings->whereIn('status', ['approved', 'declined']);
        $approvalRate = $decidedBookings->isNotEmpty()
            ? round(($decidedBookings->where('status', 'approved')->count() / $decidedBookings->count()) * 100, 1)
            : 0.0;
        $cancellationRate = $analyticsBookings->isNotEmpty()
            ? round(($analyticsBookings->where('status', 'cancelled')->count() / $analyticsBookings->count()) * 100, 1)
            : 0.0;

        $approvalMinutes = $analyticsBookings
            ->filter(fn (Booking $booking) => $booking->approved_at && $booking->created_at)
            ->map(fn (Booking $booking) => max(
                0,
                Carbon::parse($booking->approved_at)->getTimestamp()
                    - Carbon::parse($booking->created_at)->getTimestamp()
            ) / 60);
        $averageApprovalHours = $approvalMinutes->isNotEmpty()
            ? round($approvalMinutes->avg() / 60, 1)
            : null;

        $bookingsByHour = $analyticsBookings
            ->filter(fn (Booking $booking) => ! empty($booking->start_time))
            ->groupBy(fn (Booking $booking) => (int) substr((string) $booking->start_time, 0, 2))
            ->sortByDesc(fn ($hourBookings) => $hourBookings->count());

        $peakHour = null;
        $peakHourBookings = 0;
        if ($bookingsByHour->isNotEmpty()) {
            $hour = (int) $bookingsByHour->keys()->first();
            $peakHour = Carbon::createFromTime($hour)->format('g:00 A')
                . ' – ' . Carbon::createFromTime(($hour + 1) % 24)->format('g:00 A');
            $peakHourBookings = $bookingsByHour->first()->count();
        }

        $overtimeBookings = $analyticsBookings->filter(
            fn (Booking $booking) => (int) ($booking->overtime_minutes ?? 0) > 0
        );

        $statusBreakdown = BookingDashboardAnalytics::statusBreakdown($analyticsBookings);
        $analyticsBookingRows = BookingDashboardAnalytics::bookingRows($analyticsBookings);
        $statusDetails = collect(BookingDashboardAnalytics::STATUSES)->mapWithKeys(
            fn (string $status) => [
                $status => BookingDashboardAnalytics::bookingRows(
                    BookingDashboardAnalytics::filterByStatus($analyticsBookings, $status)
                ),
            ]
        );

        $clientDetails = $clientGroups->map(function ($clientBookings): array {
            $first = $clientBookings->first();
            $latest = $clientBookings->sortByDesc(
                fn (Booking $booking) => ($booking->booking_date ?? $booking->date)?->format('Y-m-d') ?? ''
            )->first();

            return [
                'name' => $first->user?->name ?? $first->guest_name ?? 'Guest',
                'email' => $first->user?->email ?? $first->guest_email,
                'bookings' => $clientBookings->count(),
                'lastBooking' => ($latest->booking_date ?? $latest->date)?->format('Y-m-d'),
            ];
        })->sortByDesc('bookings')->values();

        $analyticsDetails = [
            'totalBookings' => $analyticsBookingRows,
            'uniqueClients' => $clientDetails->all(),
            'returningClients' => $clientDetails->where('bookings', '>', 1)->values()->all(),
            'approvalRate' => collect($analyticsBookingRows)->whereIn('status', ['approved', 'declined'])->values()->all(),
            'cancellationRate' => collect($analyticsBookingRows)->where('status', 'cancelled')->values()->all(),
            'approvalTime' => collect($analyticsBookingRows)->whereNotNull('approved_at')->values()->all(),
            'peakHour' => collect($analyticsBookingRows)->filter(
                fn (array $booking) => $peakHour !== null
                    && (int) substr((string) ($booking['start_time'] ?? ''), 0, 2) === (int) $bookingsByHour->keys()->first()
            )->values()->all(),
            'overtimeBookings' => collect($analyticsBookingRows)->where('overtime_minutes', '>', 0)->values()->all(),
        ];

        $usageOverTime = collect();
        $cursor = Carbon::parse($filterFrom)->startOfDay();
        $periodEnd = Carbon::parse($filterTo)->endOfDay();

        if ($groupBy === 'week') {
            $cursor->startOfWeek();
            $periodEnd->endOfWeek();
        } elseif ($groupBy === 'month') {
            $cursor->startOfMonth();
            $periodEnd->startOfMonth()->endOfMonth();
        }

        while ($cursor->lte($periodEnd)) {
            $start = $cursor->copy();
            $finish = match ($groupBy) {
                'day' => $start->copy()->endOfDay(),
                'week' => $start->copy()->endOfWeek(),
                default => $start->copy()->endOfMonth(),
            };

            $periodBookings = $analyticsBookings->filter(function (Booking $booking) use ($start, $finish): bool {
                $date = $booking->booking_date ?? $booking->date;
                return $date !== null && Carbon::parse($date)->betweenIncluded($start, $finish);
            });

            $usageOverTime->push([
                'label' => $groupBy === 'day'
                    ? $start->format('M j')
                    : ($groupBy === 'week'
                        ? $start->format('M j') . ' – ' . $finish->format('M j')
                        : $start->format('M Y')),
                'bookings' => $periodBookings->count(),
                'approved' => $periodBookings->where('status', 'approved')->count(),
                'facilities' => BookingDashboardAnalytics::facilityBreakdown($periodBookings),
            ]);

            $cursor = match ($groupBy) {
                'day' => $cursor->addDay(),
                'week' => $cursor->addWeek(),
                default => $cursor->addMonth(),
            };
        }

        $mostUsedFacilities = $analyticsBookings
            ->groupBy('facility_id')
            ->map(fn ($items) => [
                'name' => $items->first()->facility?->name ?? 'Deleted facility',
                'bookings' => $items->count(),
            ])
            ->sortByDesc('bookings')
            ->take(5)
            ->values();

        return Inertia::render('Facilitator/Dashboard', [
            'selectedFacilityId' => $selectedFacilityId,
            'facilities' => $managedFacilities->map(fn ($facility) => [
                'id' => $facility->id,
                'name' => $facility->name,
            ])->values(),
            'stats' => [
                'pendingApprovals' => (clone $operationalBookings)->where('status', 'pending')->count(),
                'todayBookings' => $todayBookings->count(),
                'weeklyUtilizationRate' => $weeklyUtilizationRate,
                'activeOccupancy' => $activeOccupancy,
                'totalBookings' => (clone $scopedBookings)->count(),
            ],
            'pendingBookings' => $pendingBookings,
            'todaySchedule' => $timeline,
            'analyticsFilters' => [
                'from' => $filterFrom,
                'to' => $filterTo,
                'group_by' => $groupBy,
            ],
            'analytics' => [
                'periodLabel' => Carbon::parse($filterFrom)->format('M j, Y')
                    . ' – ' . Carbon::parse($filterTo)->format('M j, Y'),
                'totalBookings' => $analyticsBookings->count(),
                'uniqueClients' => $uniqueClients,
                'returningClients' => $returningClients,
                'approvalRate' => $approvalRate,
                'cancellationRate' => $cancellationRate,
                'averageApprovalHours' => $averageApprovalHours,
                'peakHour' => $peakHour,
                'peakHourBookings' => $peakHourBookings,
                'overtimeBookings' => $overtimeBookings->count(),
                'overtimeMinutes' => (int) $overtimeBookings->sum('overtime_minutes'),
                'overtimeFees' => round((float) $overtimeBookings->sum('overtime_fee_amount'), 2),
            ],
            'statusBreakdown' => $statusBreakdown,
            'statusDetails' => $statusDetails,
            'analyticsDetails' => $analyticsDetails,
            'analyticsBookingRows' => $analyticsBookingRows,
            'usageOverTime' => $usageOverTime,
            'mostUsedFacilities' => $mostUsedFacilities,
        ]);
    }

    private function isBetweenTime(?string $startTime, ?string $endTime, $now): bool
    {
        if (! $startTime || ! $endTime) return false;

        $currentTime = $now->copy()->format('H:i:s');
        $start = (new \DateTime($startTime))->format('H:i:s');
        $end = (new \DateTime($endTime))->format('H:i:s');

        return $currentTime >= $start && $currentTime <= $end;
    }

    private function isPastEndTime(?string $endTime, $now): bool
    {
        if (! $endTime) return false;

        $currentTime = $now->copy()->format('H:i:s');
        $end = (new \DateTime($endTime))->format('H:i:s');

        return $currentTime > $end;
    }

    private function getDurationHours(?string $startTime, ?string $endTime): float
    {
        if (! $startTime || ! $endTime) return 0;

        $start = new \DateTime($startTime);
        $end = new \DateTime($endTime);
        if ($end <= $start && substr((string) $endTime, 0, 5) === '00:00') {
            $end->modify('+1 day');
        }

        return max(0, round(($end->getTimestamp() - $start->getTimestamp()) / 3600, 2));
    }
}
