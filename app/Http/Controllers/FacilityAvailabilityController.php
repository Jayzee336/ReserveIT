<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\FacilityUnavailabilityPeriod;
use App\Models\User;
use App\Notifications\FacilityAvailabilityNotification;
use App\Support\FacilityScheduleAvailability;
use Carbon\Carbon;
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

    public function schedule(Request $request, Facility $facility)
    {
        $user = $request->user();
        $this->authorizeFacilityAccess($user, $facility);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:2000'],
            'scheduled_start_at' => ['required', 'date', 'after:now'],
            'scheduled_end_at' => ['required', 'date', 'after:scheduled_start_at'],
        ]);

        $scheduledStart = Carbon::parse($validated['scheduled_start_at']);
        $scheduledEnd = Carbon::parse($validated['scheduled_end_at']);

        $result = DB::transaction(function () use (
            $facility,
            $user,
            $validated,
            $scheduledStart,
            $scheduledEnd
        ) {
            $lockedFacility = Facility::query()
                ->whereKey($facility->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedFacility->is_available) {
                throw ValidationException::withMessages([
                    'scheduled_start_at' => 'This facility is already unavailable indefinitely. Restore it before adding a scheduled closure.',
                ]);
            }

            $overlappingPeriod = FacilityUnavailabilityPeriod::query()
                ->where('facility_id', $lockedFacility->getKey())
                ->whereNull('ended_at')
                ->whereNotNull('scheduled_start_at')
                ->where('scheduled_start_at', '<', $scheduledEnd)
                ->where('scheduled_end_at', '>', $scheduledStart)
                ->exists();

            if ($overlappingPeriod) {
                throw ValidationException::withMessages([
                    'scheduled_start_at' => 'This date/time overlaps another scheduled closure for the facility.',
                ]);
            }

            $period = FacilityUnavailabilityPeriod::create([
                'facility_id' => $lockedFacility->getKey(),
                'reason' => trim($validated['reason']),
                'started_at' => now(),
                'started_by' => $user->id,
                'scheduled_start_at' => $scheduledStart,
                'scheduled_end_at' => $scheduledEnd,
                'affected_user_ids' => [],
            ]);

            $candidateBookings = Booking::query()
                ->where('facility_id', $lockedFacility->getKey())
                ->whereNotNull('user_id')
                ->whereIn('status', ['pending', 'approved'])
                ->whereRaw('COALESCE(date, booking_date) <= ?', [$scheduledEnd->toDateString()])
                ->whereRaw('COALESCE(end_date, date, booking_date) >= ?', [$scheduledStart->toDateString()])
                ->get([
                    'id',
                    'user_id',
                    'date',
                    'booking_date',
                    'end_date',
                    'start_time',
                    'end_time',
                ]);

            $affectedSessionDates = [];

            foreach ($candidateBookings as $booking) {
                $dates = FacilityScheduleAvailability::overlappingDatesForBooking($period, $booking);

                if ($dates === []) {
                    continue;
                }

                $userId = (string) $booking->user_id;
                $affectedSessionDates[$userId] = array_values(array_unique([
                    ...($affectedSessionDates[$userId] ?? []),
                    ...$dates,
                ]));
            }

            foreach ($affectedSessionDates as &$dates) {
                sort($dates);
            }
            unset($dates);

            $affectedUserIds = array_keys($affectedSessionDates);

            $period->update(['affected_user_ids' => $affectedUserIds]);

            return [
                'period' => $period,
                'facility_name' => $lockedFacility->name,
                'affected_user_ids' => $affectedUserIds,
                'affected_session_dates' => $affectedSessionDates,
            ];
        });

        $this->notifyScheduledClosureUsers(
            $result['affected_session_dates'],
            $result['facility_name'],
            $scheduledStart,
            $scheduledEnd,
            $result['period']->reason,
            (string) $facility->getKey()
        );

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Scheduled closure saved. Only owners with overlapping pending or approved bookings have been notified.',
        ]);
    }

    public function restoreScheduled(
        Request $request,
        Facility $facility,
        FacilityUnavailabilityPeriod $period
    ) {
        $user = $request->user();
        $this->authorizeFacilityAccess($user, $facility);

        abort_unless(
            (string) $period->facility_id === (string) $facility->getKey()
            && $period->scheduled_start_at !== null
            && $period->scheduled_end_at !== null,
            404
        );

        $result = DB::transaction(function () use ($facility, $period, $user) {
            Facility::query()
                ->whereKey($facility->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $lockedPeriod = FacilityUnavailabilityPeriod::query()
                ->whereKey($period->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedPeriod->ended_at !== null) {
                return null;
            }

            $lockedPeriod->update([
                'ended_at' => now(),
                'restored_by' => $user->id,
            ]);

            return [
                'facility_name' => $facility->name,
                'affected_user_ids' => $lockedPeriod->affected_user_ids ?? [],
            ];
        });

        if ($result === null) {
            return back()->with('toast', [
                'type' => 'info',
                'message' => 'This scheduled closure has already been cancelled or restored.',
            ]);
        }

        $this->notifyUsers(
            $result['affected_user_ids'],
            'Scheduled facility closure cancelled',
            sprintf(
                'The scheduled closure for %s has been cancelled or restored early. Check the current facility schedule before adjusting your reservation.',
                $result['facility_name']
            ),
            (string) $facility->getKey()
        );

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Scheduled closure cancelled. Affected booking owners have been notified.',
        ]);
    }

    private function authorizeFacilityAccess(?User $user, Facility $facility): void
    {
        abort_unless($user !== null, 401);

        if ($user->role === 'super_admin') {
            return;
        }

        abort_unless($user->role === 'facility_admin', 403);
        abort_unless(
            $facility->facilityAdmins()->where('users.id', $user->getKey())->exists(),
            403,
            'You can only manage availability for facilities assigned to you.'
        );
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
                    $query->whereRaw(
                        'COALESCE(end_date, date, booking_date) > ?',
                        [$today]
                    )->orWhere(function ($todayEnd) use ($today, $currentTime) {
                        $todayEnd->whereRaw(
                            'COALESCE(end_date, date, booking_date) = ?',
                            [$today]
                        )->where('end_time', '>', $currentTime);
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
                ->whereNull('scheduled_start_at')
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

    private function notifyScheduledClosureUsers(
        array $affectedSessionDates,
        string $facilityName,
        Carbon $scheduledStart,
        Carbon $scheduledEnd,
        string $reason,
        string $facilityId
    ): void {
        if ($affectedSessionDates === []) {
            return;
        }

        try {
            User::query()
                ->whereIn('id', array_keys($affectedSessionDates))
                ->where('is_active', true)
                ->get()
                ->each(function (User $user) use (
                    $affectedSessionDates,
                    $facilityName,
                    $scheduledStart,
                    $scheduledEnd,
                    $reason,
                    $facilityId
                ) {
                    $dates = $affectedSessionDates[(string) $user->getKey()] ?? [];
                    $formattedDates = collect($dates)
                        ->map(fn (string $date) => Carbon::parse($date)->format('M d, Y'))
                        ->implode(', ');

                    $message = sprintf(
                        '%s has a scheduled closure from %s to %s. Reason: %s. Only the following reservation date(s) overlap this closure: %s. Please contact the facility administrator about rescheduling.',
                        $facilityName,
                        $scheduledStart->format('M d, Y g:i A'),
                        $scheduledEnd->format('M d, Y g:i A'),
                        $reason,
                        $formattedDates
                    );

                    $user->notify(new FacilityAvailabilityNotification(
                        'Scheduled facility closure',
                        $message,
                        $facilityId
                    ));
                });
        } catch (\Throwable $exception) {
            Log::warning('Scheduled facility closure notification delivery failed.', [
                'facility_id' => $facilityId,
                'error' => $exception->getMessage(),
            ]);
        }
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
