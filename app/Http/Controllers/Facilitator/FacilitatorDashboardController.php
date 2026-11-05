<?php

namespace App\Http\Controllers\Facilitator;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Facility;
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

        $facilityQuery = Facility::query()->select(['id', 'name'])->orderBy('name');

        if ($user->role !== 'super_admin') {
            $facilityQuery->forUser($user);
        }

        $managedFacilities = $facilityQuery->get();
        $managedFacilityIds = $managedFacilities->pluck('id')->all();

        if ($selectedFacilityId !== null) {
            if ($user->role !== 'super_admin') {
                if (! in_array($selectedFacilityId, $managedFacilityIds, true)) {
                    abort(403);
                }
            } elseif (! Facility::whereKey($selectedFacilityId)->exists()) {
                abort(404);
            }

            $activeFacilityIds = [$selectedFacilityId];
        } else {
            $activeFacilityIds = $managedFacilityIds;
        }

        // Cancelled and declined reservations must not appear in the
        // facilitator's live schedule or inflate weekly facility utilization.
        $bookingsQuery = Booking::query()
            ->forUser($user)
            ->whereNotIn('status', ['declined', 'cancelled']);

        if (! empty($activeFacilityIds)) {
            $bookingsQuery->whereIn('facility_id', $activeFacilityIds);
        } else {
            $bookingsQuery->whereRaw('0 = 1');
        }

        $pendingQuery = (clone $bookingsQuery)->where('status', 'pending');
        $pendingBookings = $pendingQuery
            ->with(['facility:id,name', 'user:id,name,email'])
            ->orderBy('date')
            ->orderBy('start_time')
            ->take(5)
            ->get();

        $todayDate = today()->toDateString();
        $todayBookings = (clone $bookingsQuery)
            ->where(function ($query) use ($todayDate): void {
                $query->whereDate('booking_date', $todayDate)
                    ->orWhereDate('date', $todayDate);
            })
            ->with(['facility:id,name', 'user:id,name,email'])
            ->orderBy('start_time')
            ->get();

        $now = now();
        $timeline = [
            'ongoing' => [],
            'upcoming' => [],
            'completed' => [],
        ];

        foreach ($todayBookings as $booking) {
            $isOngoing = ! is_null($booking->checked_in_at) || $this->isBetweenTime($booking->start_time, $booking->end_time, $now);
            $isCompleted = ! is_null($booking->checked_out_at) || $this->isPastEndTime($booking->end_time, $now);

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
        $weekBookings = (clone $bookingsQuery)
            ->where(function ($query) use ($weekStart, $weekEnd): void {
                $query->whereDate('booking_date', '>=', $weekStart->toDateString())
                    ->whereDate('booking_date', '<=', $weekEnd->toDateString())
                    ->orWhere(function ($rangeQuery) use ($weekStart, $weekEnd): void {
                        $rangeQuery->whereDate('date', '>=', $weekStart->toDateString())
                            ->whereDate('date', '<=', $weekEnd->toDateString());
                    });
            })
            ->get();

        $occupiedHours = 0;
        foreach ($weekBookings as $booking) {
            $occupiedHours += $this->getDurationHours($booking->start_time, $booking->end_time);
        }

        $capacityHours = count($activeFacilityIds) * 14 * 7;
        $weeklyUtilizationRate = $capacityHours > 0
            ? round(($occupiedHours / $capacityHours) * 100, 1)
            : 0;

        $activeOccupancy = (clone $bookingsQuery)
            ->whereNotNull('checked_in_at')
            ->whereNull('checked_out_at')
            ->count();

        return Inertia::render('Facilitator/Dashboard', [
            'selectedFacilityId' => $selectedFacilityId,
            'facilities' => $managedFacilities->map(fn ($facility) => [
                'id' => $facility->id,
                'name' => $facility->name,
            ])->values(),
            'stats' => [
                'pendingApprovals' => $pendingQuery->count(),
                'todayBookings' => $todayBookings->count(),
                'weeklyUtilizationRate' => $weeklyUtilizationRate,
                'activeOccupancy' => $activeOccupancy,
            ],
            'pendingBookings' => $pendingBookings,
            'todaySchedule' => [
                'ongoing' => $timeline['ongoing'],
                'upcoming' => $timeline['upcoming'],
                'completed' => $timeline['completed'],
            ],
        ]);
    }

    private function isBetweenTime(?string $startTime, ?string $endTime, $now): bool
    {
        if (! $startTime || ! $endTime) {
            return false;
        }

        $currentTime = $now->copy()->format('H:i:s');
        $start = (new \DateTime($startTime))->format('H:i:s');
        $end = (new \DateTime($endTime))->format('H:i:s');

        return $currentTime >= $start && $currentTime <= $end;
    }

    private function isPastEndTime(?string $endTime, $now): bool
    {
        if (! $endTime) {
            return false;
        }

        $currentTime = $now->copy()->format('H:i:s');
        $end = (new \DateTime($endTime))->format('H:i:s');

        return $currentTime > $end;
    }

    private function getDurationHours(?string $startTime, ?string $endTime): float
    {
        if (! $startTime || ! $endTime) {
            return 0;
        }

        $start = new \DateTime($startTime);
        $end = new \DateTime($endTime);

        $diff = $end->getTimestamp() - $start->getTimestamp();

        return max(0, round($diff / 3600, 2));
    }
}
