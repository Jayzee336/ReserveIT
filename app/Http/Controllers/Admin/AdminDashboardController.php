<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Facility;
use App\Models\UserConcern;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();

        $bookingQuery = Booking::with(['facility:id,name', 'user:id,name,email'])->forUser($user);

        $periodStart = now()->subMonths(5)->startOfMonth();

        $bookings = (clone $bookingQuery)
            ->where(function ($query) use ($periodStart) {
                $query->whereDate('booking_date', '>=', $periodStart->toDateString())
                    ->orWhereDate('date', '>=', $periodStart->toDateString());
            })
            ->get();

        $bookingDateFor = fn (Booking $booking) => $booking->booking_date ?? $booking->date;

        $usageOverTime = collect(range(5, 0))->map(function (int $monthsAgo) use ($bookings, $bookingDateFor) {
            $month = now()->subMonths($monthsAgo)->startOfMonth();
            return [
                'label' => $month->format('M Y'),
                'bookings' => $bookings->filter(fn (Booking $booking) => $bookingDateFor($booking)?->isSameMonth($month))->count(),
                'approved' => $bookings->filter(fn (Booking $booking) => $bookingDateFor($booking)?->isSameMonth($month) && $booking->status === 'approved')->count(),
            ];
        })->values();

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

        $approvalDurations = $bookings
            ->filter(fn (Booking $booking) => $booking->approved_at && $booking->created_at)
            ->map(fn (Booking $booking) => $booking->created_at->diffInMinutes($booking->approved_at));

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
            'operationalAnalytics' => [
                'periodLabel' => 'Last 6 months',
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