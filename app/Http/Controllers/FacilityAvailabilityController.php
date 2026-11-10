<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\FacilityUnavailabilityPeriod;
use App\Models\User;
use App\Notifications\FacilityAvailabilityNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class FacilityAvailabilityController extends Controller
{
    public function update(Request $request, Facility $facility)
    {
        $user = $request->user();

        abort_unless($user !== null, 401);
        abort_unless(
            in_array($user->role, ['super_admin', 'facility_admin'], true),
            403
        );

        if ($user->role === 'facility_admin') {
            abort_unless(
                $facility->facilityAdmins()
                    ->where('users.id', $user->id)
                    ->exists(),
                403,
                'You can only change the availability of facilities assigned to you.'
            );
        }

        $validated = $request->validate([
            'is_available' => ['required', 'boolean'],
            'reason' => ['required_if:is_available,false', 'nullable', 'string', 'max:2000'],
        ]);

        if (! filter_var($validated['is_available'], FILTER_VALIDATE_BOOLEAN)) {
            return $this->markUnavailable($facility, $user, (string) $validated['reason']);
        }

        return $this->markAvailable($facility, $user);
    }

    private function markUnavailable(Facility $facility, User $user, string $reason)
    {
        $result = DB::transaction(function () use ($facility, $user, $reason) {
            $lockedFacility = Facility::query()
                ->whereKey($facility->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedFacility->is_available) {
                throw ValidationException::withMessages([
                    'is_available' => 'This facility is already marked unavailable.',
                ]);
            }

            $today = today()->toDateString();
            $currentTime = now()->format('H:i:s');

            $affectedUserIds = Booking::query()
                ->where('facility_id', $lockedFacility->getKey())
                ->whereNotNull('user_id')
                ->whereIn('status', ['pending', 'approved'])
                ->where(function ($query) use ($today, $currentTime) {
                    $query->where(function ($futureDates) use ($today) {
                        $futureDates->whereDate('booking_date', '>', $today)
                            ->orWhereDate('date', '>', $today);
                    })->orWhere(function ($todayBookings) use ($today, $currentTime) {
                        $todayBookings->where(function ($dateFields) use ($today) {
                            $dateFields->whereDate('booking_date', $today)
                                ->orWhereDate('date', $today);
                        })->where('end_time', '>', $currentTime);
                    });
                })
                ->pluck('user_id')
                ->filter()
                ->unique()
                ->values()
                ->all();

            $period = FacilityUnavailabilityPeriod::create([
                'facility_id' => $lockedFacility->getKey(),
                'reason' => $reason,
                'started_at' => now(),
                'started_by' => $user->id,
                'affected_user_ids' => $affectedUserIds,
            ]);

            $lockedFacility->update([
                'is_available' => false,
                'unavailable_reason' => $reason,
            ]);

            return [
                'period' => $period,
                'facility_name' => $lockedFacility->name,
                'affected_user_ids' => $affectedUserIds,
            ];
        });

        $this->notifyUsers(
            $result['affected_user_ids'],
            'Facility temporarily unavailable',
            sprintf(
                '%s has been marked unavailable. Reason: %s. Contact the facility administrator about affected reservations.',
                $result['facility_name'],
                $reason
            ),
            (string) $facility->getKey()
        );

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Facility marked unavailable. Affected booking owners have been notified.',
        ]);
    }

    private function markAvailable(Facility $facility, User $user)
    {
        $result = DB::transaction(function () use ($facility, $user) {
            $lockedFacility = Facility::query()
                ->whereKey($facility->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedFacility->is_available) {
                return null;
            }

            $period = FacilityUnavailabilityPeriod::query()
                ->where('facility_id', $lockedFacility->getKey())
                ->whereNull('ended_at')
                ->latest('started_at')
                ->lockForUpdate()
                ->first();

            $affectedUserIds = $period?->affected_user_ids ?? [];

            if ($period) {
                $period->update([
                    'ended_at' => now(),
                    'restored_by' => $user->id,
                ]);
            }

            $lockedFacility->update([
                'is_available' => true,
                'unavailable_reason' => null,
            ]);

            return [
                'facility_name' => $lockedFacility->name,
                'affected_user_ids' => $affectedUserIds,
            ];
        });

        if ($result === null) {
            return back()->with('toast', [
                'type' => 'info',
                'message' => 'This facility is already available.',
            ]);
        }

        $this->notifyUsers(
            $result['affected_user_ids'],
            'Facility available again',
            sprintf(
                '%s is available again. Please check the current schedule before submitting or rescheduling a booking.',
                $result['facility_name']
            ),
            (string) $facility->getKey()
        );

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Facility marked available. Previously affected booking owners have been notified.',
        ]);
    }

    private function notifyUsers(
        array $userIds,
        string $title,
        string $message,
        string $facilityId
    ): void {
        if ($userIds === []) {
            return;
        }

        try {
            User::query()
                ->whereIn('id', $userIds)
                ->where('is_active', true)
                ->get()
                ->each(fn (User $user) => $user->notify(
                    new FacilityAvailabilityNotification(
                        $title,
                        $message,
                        $facilityId
                    )
                ));
        } catch (\Throwable $exception) {
            Log::warning('Facility availability notification delivery failed.', [
                'facility_id' => $facilityId,
                'title' => $title,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
