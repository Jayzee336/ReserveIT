<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Facility;
use App\Models\UserConcern;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();

        $defaultFrom = now()->subMonths(5)->startOfMonth()->toDateString();
        $defaultTo = now()->toDateString();
        $validatedFilters = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'facility_id' => ['nullable', 'string', 'max:255'],
            'group_by' => ['nullable', 'in:day,week,month'],
        ]);
        $filterFrom = $validatedFilters['from'] ?? $defaultFrom;
        $filterTo = $validatedFilters['to'] ?? $defaultTo;
        $filterFacilityId = $validatedFilters['facility_id'] ?? '';
        $groupBy = $validatedFilters['group_by'] ?? 'month';

        $managedFacilities = Facility::query()
            ->forUser($user)
            ->orderBy('name')
            ->get(['id', 'name']);

        $bookingQuery = Booking::with(['facility:id,name', 'user:id,name,email'])->forUser($user);

        $analyticsQuery = (clone $bookingQuery)
            ->whereRaw(
                'DATE(COALESCE(booking_date, date)) BETWEEN ? AND ?',
                [$filterFrom, $filterTo]
            );

        if ($filterFacilityId !== '') {
            // The base query is already scoped to facilities assigned to this user.
            $analyticsQuery->where('facility_id', $filterFacilityId);
        }

        $bookings = $analyticsQuery->get();

        $bookingDateFor = fn (Booking $booking) => $booking->booking_date ?? $booking->date;

        $usageOverTime = collect();
        $periodCursor = Carbon::parse($filterFrom)->startOfDay();
        $periodEnd = Carbon::parse($filterTo)->endOfDay();

        if ($groupBy === 'week') {
            $periodCursor->startOfWeek();
            $periodEnd->endOfWeek();
        } elseif ($groupBy === 'month') {
            $periodCursor->startOfMonth();
            $periodEnd->endOfMonth();
        }

        while ($periodCursor->lte($periodEnd)) {
            $periodStart = $periodCursor->copy();
            $periodFinish = match ($groupBy) {
                'day' => $periodStart->copy()->endOfDay(),
                'week' => $periodStart->copy()->endOfWeek(),
                default => $periodStart->copy()->endOfMonth(),
            };
            $periodBookings = $bookings->filter(function (Booking $booking) use ($bookingDateFor, $periodStart, $periodFinish) {
                $date = $bookingDateFor($booking);
                return $date && $date->betweenIncluded($periodStart, $periodFinish);
            });

            $usageOverTime->push([
                'label' => $groupBy === 'day'
                    ? $periodStart->format('M j')
                    : ($groupBy === 'week'
                        ? $periodStart->format('M j') . ' – ' . $periodFinish->format('M j')
                        : $periodStart->format('M Y')),
                'bookings' => $periodBookings->count(),
                'approved' => $periodBookings->where('status', 'approved')->count(),
            ]);

            $periodCursor = match ($groupBy) {
                'day' => $periodCursor->addDay(),
                'week' => $periodCursor->addWeek(),
                default => $periodCursor->addMonth(),
            };
        }

        $periodDays = Carbon::parse($filterFrom)->startOfDay()
            ->diffInDays(Carbon::parse($filterTo)->startOfDay()) + 1;
        $comparisonFrom = Carbon::parse($filterFrom)->subDays($periodDays)->toDateString();
        $comparisonTo = Carbon::parse($filterFrom)->subDay()->toDateString();
        $comparisonQuery = (clone $bookingQuery)->whereRaw(
            'DATE(COALESCE(booking_date, date)) BETWEEN ? AND ?',
            [$comparisonFrom, $comparisonTo]
        );
        if ($filterFacilityId !== '') {
            $comparisonQuery->where('facility_id', $filterFacilityId);
        }
        $previousPeriodBookings = $comparisonQuery->count();
        $currentPeriodBookings = $bookings->count();
        $periodComparison = [
            'currentBookings' => $currentPeriodBookings,
            'previousBookings' => $previousPeriodBookings,
            'change' => $previousPeriodBookings > 0
                ? round((($currentPeriodBookings - $previousPeriodBookings) / $previousPeriodBookings) * 100, 1)
                : null,
            'direction' => $currentPeriodBookings <=> $previousPeriodBookings,
            'previousFrom' => $comparisonFrom,
            'previousTo' => $comparisonTo,
        ];

        $clientBookingGroups = $bookings->groupBy(function (Booking $booking) {
            if ($booking->user_id) {
                return 'user:' . $booking->user_id;
            }

            if ($booking->guest_email) {
                return 'guest:' . strtolower(trim($booking->guest_email));
            }

            return 'booking:' . $booking->getKey();
        });

        $uniqueClients = $clientBookingGroups->count();
        $returningClients = $clientBookingGroups
            ->filter(fn ($clientBookings) => $clientBookings->count() > 1)
            ->count();

        $decidedBookings = $bookings->whereIn('status', ['approved', 'declined']);
        $periodApproved = $bookings->where('status', 'approved')->count();
        $approvalRate = $decidedBookings->isNotEmpty()
            ? round(($periodApproved / $decidedBookings->count()) * 100, 1)
            : 0.0;

        $periodCancelled = $bookings->where('status', 'cancelled')->count();
        $cancellationRate = $bookings->isNotEmpty()
            ? round(($periodCancelled / $bookings->count()) * 100, 1)
            : 0.0;

        // Use timestamp subtraction so Carbon's signed diff direction cannot
        // turn a normal approval duration into a negative value.
        $approvalDurations = $bookings
            ->filter(fn (Booking $booking) => $booking->approved_at && $booking->created_at)
            ->map(function (Booking $booking): int {
                return max(
                    0,
                    $booking->approved_at->getTimestamp() - $booking->created_at->getTimestamp()
                ) / 60;
            });

        $averageApprovalHours = $approvalDurations->isNotEmpty()
            ? round($approvalDurations->avg() / 60, 1)
            : null;

        $bookingsByHour = $bookings
            ->filter(fn (Booking $booking) => ! empty($booking->start_time))
            ->groupBy(fn (Booking $booking) => (int) substr((string) $booking->start_time, 0, 2))
            ->sortByDesc(fn ($hourBookings) => $hourBookings->count());

        $peakHour = null;
        $peakHourBookings = 0;

        if ($bookingsByHour->isNotEmpty()) {
            $hour = (int) $bookingsByHour->keys()->first();
            $peakHour = Carbon::createFromTime($hour)->format('g:00 A')
                . ' – '
                . Carbon::createFromTime(($hour + 1) % 24)->format('g:00 A');
            $peakHourBookings = $bookingsByHour->first()->count();
        }

        $overtimeBookings = $bookings->filter(
            fn (Booking $booking) => (int) ($booking->overtime_minutes ?? 0) > 0
        );
        $overtimeMinutes = (int) $overtimeBookings->sum('overtime_minutes');
        $overtimeFees = round((float) $overtimeBookings->sum('overtime_fee_amount'), 2);

        $bookingDetailRows = $bookings
            ->sortByDesc(fn (Booking $booking) => ($bookingDateFor($booking)?->format('Y-m-d') ?? '') . ' ' . ($booking->start_time ?? ''))
            ->map(fn (Booking $booking) => [
                'id' => $booking->getKey(),
                'facility' => $booking->facility?->name ?? 'Deleted facility',
                'client' => $booking->user?->name ?? $booking->guest_name ?? 'Guest',
                'email' => $booking->user?->email ?? $booking->guest_email,
                'date' => $bookingDateFor($booking)?->format('Y-m-d'),
                'start_time' => $booking->start_time,
                'end_time' => $booking->end_time,
                'status' => $booking->status,
                'approved_at' => $booking->approved_at?->toDateTimeString(),
                'approval_minutes' => $booking->approved_at && $booking->created_at
                    ? round(max(0, $booking->approved_at->getTimestamp() - $booking->created_at->getTimestamp()) / 60, 1)
                    : null,
                'overtime_minutes' => (int) ($booking->overtime_minutes ?? 0),
                'overtime_fee_amount' => (float) ($booking->overtime_fee_amount ?? 0),
                'overtime_payment_status' => $booking->overtime_payment_status ?? 'not_applicable',
            ])->values();

        $clientDetails = $clientBookingGroups->map(function ($clientBookings) {
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

        $statusBreakdown = collect(['pending', 'approved', 'declined', 'cancelled'])
            ->map(fn (string $status) => [
                'status' => $status,
                'count' => $bookings->where('status', $status)->count(),
                'percentage' => $bookings->isNotEmpty()
                    ? round(($bookings->where('status', $status)->count() / $bookings->count()) * 100, 1)
                    : 0,
            ])->values();

        $analyticsDetails = [
            'clients' => $clientDetails,
            'returningClients' => $clientDetails->where('bookings', '>', 1)->values(),
            'approvalRate' => $bookingDetailRows->whereIn('status', ['approved', 'declined'])->values(),
            'cancellationRate' => $bookingDetailRows->where('status', 'cancelled')->values(),
            'approvalTime' => $bookingDetailRows->filter(fn (array $booking) => $booking['approved_at'] !== null)->values(),
            'peakHour' => $bookingDetailRows->filter(
                fn (array $booking) => $peakHour !== null
                    && (int) substr((string) ($booking['start_time'] ?? ''), 0, 2) === (int) $bookingsByHour->keys()->first()
            )->values(),
            'overtime' => $bookingDetailRows->where('overtime_minutes', '>', 0)->values(),
        ];

        $mostUsedFacilities = $bookings->groupBy('facility_id')->map(function ($facilityBookings) {
            return [
                'name' => $facilityBookings->first()->facility?->name ?? 'Deleted facility',
                'bookings' => $facilityBookings->count(),
                'approved' => $facilityBookings->where('status', 'approved')->count(),
            ];
        })->sortByDesc('bookings')->take(5)->values();

        // Scope counts to the authenticated user (super_admin sees all, facility_admin sees assigned only)
        $totalBookings = (clone $bookingQuery)->count();
        $pendingApprovals = (clone $bookingQuery)->where('status', 'pending')->count();
        $approvedBookings = (clone $bookingQuery)->where('status', 'approved')->count();
        $declinedBookings = (clone $bookingQuery)->where('status', 'declined')->count();

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'totalFacilities' => Facility::query()->forUser($user)->count(),
                'totalBookings' => $totalBookings,
                'pendingApprovals' => $pendingApprovals,
                'pendingConcerns' => UserConcern::where('status', 'pending')->count(),
                'approvedBookings' => $approvedBookings,
                'declinedBookings' => $declinedBookings,
            ],
            'usageOverTime' => $usageOverTime,
            'mostUsedFacilities' => $mostUsedFacilities,
            'analyticsFilters' => [
                'from' => $filterFrom,
                'to' => $filterTo,
                'facility_id' => $filterFacilityId,
                'group_by' => $groupBy,
            ],
            'periodComparison' => $periodComparison,
            'analyticsFacilities' => $managedFacilities,
            'statusBreakdown' => $statusBreakdown,
            'analyticsDetails' => $analyticsDetails,
            'operationalAnalytics' => [
                'periodLabel' => Carbon::parse($filterFrom)->format('M j, Y')
                    . ' – ' . Carbon::parse($filterTo)->format('M j, Y'),
                'uniqueClients' => $uniqueClients,
                'returningClients' => $returningClients,
                'approvalRate' => $approvalRate,
                'cancellationRate' => $cancellationRate,
                'averageApprovalHours' => $averageApprovalHours,
                'peakHour' => $peakHour,
                'peakHourBookings' => $peakHourBookings,
                'overtimeBookings' => $overtimeBookings->count(),
                'overtimeMinutes' => $overtimeMinutes,
                'overtimeFees' => $overtimeFees,
            ],
            // Show ALL pending bookings (no take() limit) so new requests always appear
            'pendingBookings' => (clone $bookingQuery)
                ->where('status', 'pending')
                ->orderBy('booking_date')
                ->orderBy('start_time')
                ->get(),
            'recentConcerns' => UserConcern::with('user:id,name,email')->latest()->take(6)->get(),
        ]);
    }
}