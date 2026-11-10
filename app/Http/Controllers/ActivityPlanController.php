<?php

namespace App\Http\Controllers;

use App\Models\ActivityPlan;
use App\Models\Booking;
use App\Models\Facility;
use App\Models\FacilityOperatingHour;
use App\Models\SystemSetting;
use App\Models\User;
use App\Notifications\ActivityPlanNotification;
use App\Support\FacilityScheduleAvailability;
use App\Support\ActivityPlanSchedule;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ActivityPlanController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $plansQuery = ActivityPlan::query()
            ->with([
                'facility:id,name,location',
                'user:id,name,email',
                'bookings:id,activity_plan_id,date,start_time,end_time,status',
            ])
            ->latest();

        if ($user->role === 'user') {
            $plansQuery->where('user_id', $user->getKey());
        } elseif ($user->role === 'facility_admin') {
            $plansQuery->whereHas('facility', fn ($query) => $query->forUser($user));
        }

        $facilityQuery = Facility::query()
            ->with([
                'operatingHours',
                'unavailabilityPeriods' => fn ($query) => $query
                    ->whereNull('ended_at')
                    ->whereNotNull('scheduled_start_at')
                    ->where('scheduled_end_at', '>=', now())
                    ->orderBy('scheduled_start_at'),
            ])
            ->where('is_available', true)
            ->orderBy('name');

        if ($user->role === 'facility_admin') {
            $facilityQuery->forUser($user);
        }

        return Inertia::render('ActivityPlans/Index', [
            'plans' => $plansQuery->paginate(10)->withQueryString(),
            'facilities' => $facilityQuery->get([
                'id',
                'name',
                'location',
                'capacity',
                'allowTdevsManpower',
                'requirement',
                'requiresWeekendConsent',
                'booking_lead_time_days',
                'is_available',
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'facility_id' => ['required', 'string', 'exists:facilities,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'start_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'recurrence_days' => ['required', 'array', 'min:1', 'max:7'],
            'recurrence_days.*' => ['required', 'integer', 'between:0,6', 'distinct'],
            'weekday_times' => ['required', 'array'],
            'weekday_times.*.start_time' => ['required', 'date_format:H:i'],
            'weekday_times.*.end_time' => ['required', 'date_format:H:i'],
            'sessions' => ['required', 'array', 'min:1', 'max:366'],
            'sessions.*.date' => ['required', 'date_format:Y-m-d'],
            'sessions.*.start_time' => ['required', 'date_format:H:i'],
            'sessions.*.end_time' => ['required', 'date_format:H:i'],
            'sessions.*.attendees' => ['required', 'integer', 'min:1'],
            'sessions.*.needs_manpower' => ['required', 'boolean'],
            'sessions.*.notes' => ['nullable', 'string', 'max:10000'],
            'activity_plan_file' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:10240'],
            'consent_letter' => ['nullable', 'file', 'mimes:pdf,doc,docx', 'max:5120'],
        ]);

        $facility = Facility::with('operatingHours')->findOrFail($validated['facility_id']);

        if (Auth::user()->role === 'facility_admin') {
            abort_unless(
                $facility->facilityAdmins()->where('users.id', Auth::id())->exists(),
                403,
                'You can only submit activity plans for facilities assigned to you.'
            );
        }

        if (!$facility->is_available) {
            throw ValidationException::withMessages([
                'facility_id' => 'This facility is temporarily unavailable and cannot accept activity plans.',
            ]);
        }

        $settings = SystemSetting::current();
        $isSuperAdmin = Auth::user()->role === 'super_admin';
        $approvalScope = $settings->auto_approve_scope ?? 'disabled';
        $autoApprove = $approvalScope === 'everyone'
            || ($approvalScope === 'superadmin_only' && $isSuperAdmin);

        $days = array_values(array_unique(array_map('intval', $validated['recurrence_days'])));
        $generatedDates = ActivityPlanSchedule::dates(
            $validated['start_date'],
            $validated['end_date'],
            $days
        );
        $sessions = collect($validated['sessions'])->values();

        $dateSpan = Carbon::createFromFormat('!Y-m-d', $validated['start_date'])
            ->diffInDays(Carbon::createFromFormat('!Y-m-d', $validated['end_date']));
        if ($dateSpan > 365) {
            throw ValidationException::withMessages([
                'end_date' => 'An activity plan cannot span more than 366 calendar days.',
            ]);
        }

        $seenSessionDates = [];
        foreach ($sessions as $index => $session) {
            $sessionDate = Carbon::createFromFormat('!Y-m-d', $session['date']);

            if ($sessionDate->lt(Carbon::createFromFormat('!Y-m-d', $validated['start_date']))
                || $sessionDate->gt(Carbon::createFromFormat('!Y-m-d', $validated['end_date']))) {
                throw ValidationException::withMessages([
                    "sessions.{$index}.date" => 'Every session must fall within the activity plan date range.',
                ]);
            }

            if (!in_array($sessionDate->toDateString(), $generatedDates, true)) {
                throw ValidationException::withMessages([
                    "sessions.{$index}.date" => 'Every session must fall on one of the selected weekdays.',
                ]);
            }

            if (isset($seenSessionDates[$session['date']])) {
                throw ValidationException::withMessages([
                    "sessions.{$index}.date" => 'Only one session per date is allowed in an activity plan.',
                ]);
            }
            $seenSessionDates[$session['date']] = true;

            $sessionStartMinutes = $this->minutes($session['start_time']);
            $sessionEndMinutes = $session['end_time'] === '00:00'
                ? 1440
                : $this->minutes($session['end_time']);

            if ($sessionEndMinutes <= $sessionStartMinutes) {
                throw ValidationException::withMessages([
                    "sessions.{$index}.end_time" => 'The session end time must be later than its start time.',
                ]);
            }

            $configuredMaxHours = $facility->max_booking_hours
                ?? 4;
            $sessionDurationMinutes = $sessionEndMinutes - $sessionStartMinutes;

            if ($sessionDurationMinutes > ((float) $configuredMaxHours * 60)) {
                throw ValidationException::withMessages([
                    "sessions.{$index}.end_time" => "A session cannot exceed {$configuredMaxHours} hours for this facility.",
                ]);
            }

            if (($sessionDate->dayOfWeek < 0) || ($sessionDate->dayOfWeek > 6)) {
                throw ValidationException::withMessages([
                    "sessions.{$index}.date" => 'Please select a valid session date.',
                ]);
            }

            $attendees = (int) $session['attendees'];
            if ($facility->capacity !== null && $attendees > (int) $facility->capacity) {
                throw ValidationException::withMessages([
                    "sessions.{$index}.attendees" => "This facility allows a maximum of {$facility->capacity} attendees.",
                ]);
            }

            if (!empty($session['needs_manpower']) && !$facility->allowTdevsManpower) {
                throw ValidationException::withMessages([
                    "sessions.{$index}.needs_manpower" => 'TDEVS manpower is not available for this facility.',
                ]);
            }
        }

        $sortedSessions = $sessions->sortBy(fn ($session) => $session['date'] . ' ' . $session['start_time'])->values();
        for ($i = 0; $i < $sortedSessions->count(); $i++) {
            for ($j = $i + 1; $j < $sortedSessions->count(); $j++) {
                $left = $sortedSessions[$i];
                $right = $sortedSessions[$j];

                if ($left['date'] !== $right['date']) {
                    break;
                }

                $cleanupBuffer = max(0, (int) ($settings->cleanup_buffer_minutes ?? 30));
                $leftStart = $this->minutes($left['start_time']) - $cleanupBuffer;
                $leftEnd = ($left['end_time'] === '00:00' ? 1440 : $this->minutes($left['end_time'])) + $cleanupBuffer;
                $rightStart = $this->minutes($right['start_time']);
                $rightEnd = $right['end_time'] === '00:00' ? 1440 : $this->minutes($right['end_time']);

                if ($rightStart < $leftEnd && $rightEnd > $leftStart) {
                    throw ValidationException::withMessages([
                        'sessions' => 'Two sessions in this activity plan overlap on ' . $left['date'] . '.',
                    ]);
                }
            }
        }

        $consentRequired = (bool) $settings->require_consent_letter
            || $facility->requirement === 'CONSENT_REQUIRED'
            || (
                (bool) $facility->requiresWeekendConsent
                && $sessions->contains(fn ($session) => Carbon::createFromFormat('!Y-m-d', $session['date'])->isWeekend())
            );

        if ($consentRequired && !$request->hasFile('consent_letter')) {
            throw ValidationException::withMessages([
                'consent_letter' => 'A separate consent letter is required for one or more sessions in this activity plan.',
            ]);
        }

        $activityPlanPath = null;
        $consentPath = null;
        $activityPlanName = null;
        $consentName = null;

        try {
            $planFile = $request->file('activity_plan_file');
            $planExtension = strtolower($planFile->getClientOriginalExtension());
            $activityPlanPath = $planFile->storeAs(
                'activity-plans',
                bin2hex(random_bytes(24)) . '.' . $planExtension,
                'tigris'
            );
            $activityPlanName = basename($planFile->getClientOriginalName());

            if ($request->hasFile('consent_letter')) {
                $consentFile = $request->file('consent_letter');
                $consentExtension = strtolower($consentFile->getClientOriginalExtension());
                $consentPath = $consentFile->storeAs(
                    'consent-letters',
                    bin2hex(random_bytes(24)) . '.' . $consentExtension,
                    'tigris'
                );
                $consentName = basename($consentFile->getClientOriginalName());
            }

            $plan = DB::transaction(function () use (
                $facility,
                $validated,
                $days,
                $sessions,
                $settings,
                $autoApprove,
                $activityPlanPath,
                $activityPlanName,
                $consentPath,
                $consentName
            ) {
                $lockedFacility = Facility::query()
                    ->whereKey($facility->getKey())
                    ->lockForUpdate()
                    ->firstOrFail();

                if (!$lockedFacility->is_available) {
                    throw ValidationException::withMessages([
                        'facility_id' => 'This facility became unavailable before the activity plan could be saved.',
                    ]);
                }

                $plan = ActivityPlan::create([
                    'user_id' => Auth::id(),
                    'facility_id' => $lockedFacility->getKey(),
                    'title' => $validated['title'],
                    'description' => $validated['description'] ?? null,
                    'start_date' => $validated['start_date'],
                    'end_date' => $validated['end_date'],
                    'recurrence_days' => $days,
                    'weekday_times' => $validated['weekday_times'],
                    'status' => $autoApprove ? 'approved' : 'pending',
                    'reviewed_by' => $autoApprove ? Auth::id() : null,
                    'reviewed_at' => $autoApprove ? now() : null,
                    'attachment_path' => $activityPlanPath,
                    'attachment_name' => $activityPlanName,
                ]);

                $buffer = max(0, (int) ($settings->cleanup_buffer_minutes ?? 30));
// Semester plans may extend beyond the single-booking advance window.
                foreach ($sessions as $index => $session) {
                    $sessionDate = Carbon::createFromFormat('!Y-m-d', $session['date']);

                    // Activity plans are intentionally allowed to cover a semester.
                    // The 366-day plan limit above prevents unbounded generation; the
                    // single-booking advance limit does not truncate recurring schedules.

                    $this->validateSessionHours(
                        $lockedFacility,
                        $sessionDate,
                        $session['start_time'],
                        $session['end_time'],
                        $settings
                    );

                    $scheduledClosure = FacilityScheduleAvailability::firstOverlappingClosure(
                        $lockedFacility,
                        $session['date'],
                        $session['date'],
                        $session['start_time'],
                        $session['end_time']
                    );

                    if ($scheduledClosure) {
                        throw ValidationException::withMessages([
                            "sessions.{$index}.date" => 'This session overlaps a scheduled facility closure: ' . $scheduledClosure->reason,
                        ]);
                    }

                    if ($this->hasSessionConflict(
                        (string) $lockedFacility->getKey(),
                        $session['date'],
                        $session['start_time'],
                        $session['end_time'],
                        $buffer
                    )) {
                        throw ValidationException::withMessages([
                            "sessions.{$index}.start_time" => 'This session overlaps an existing booking or cleanup buffer.',
                        ]);
                    }

                    $bookingDate = $sessionDate;
                    $sessionConsentRequired = (bool) $settings->require_consent_letter
                        || $lockedFacility->requirement === 'CONSENT_REQUIRED'
                        || ((bool) $lockedFacility->requiresWeekendConsent && $bookingDate->isWeekend());

                    if ($sessionConsentRequired && !$consentPath) {
                        throw ValidationException::withMessages([
                            'consent_letter' => 'A consent letter is required for the session on ' . $session['date'] . '.',
                        ]);
                    }

                    $leadDays = max(0, (int) ($lockedFacility->booking_lead_time_days ?? 3));
                    if ($sessionConsentRequired && $bookingDate->lt(today()->addDays($leadDays))) {
                        throw ValidationException::withMessages([
                            "sessions.{$index}.date" => "The session on {$session['date']} requires at least {$leadDays} days advance notice.",
                        ]);
                    }

                    Booking::create([
                        'facility_id' => $lockedFacility->getKey(),
                        'activity_plan_id' => $plan->getKey(),
                        'user_id' => Auth::id(),
                        'date' => $session['date'],
                        'booking_date' => $session['date'],
                        'end_date' => $session['date'],
                        'start_time' => $session['start_time'],
                        'end_time' => $session['end_time'],
                        'notes' => $plan->title . (!empty($session['notes']) ? "\n" . $session['notes'] : '')
                            . ($plan->description ? "\n" . $plan->description : ''),
                        'attendees' => (int) $session['attendees'],
                        'needs_manpower' => (bool) $session['needs_manpower'],
                        'consent_file_uploaded' => $consentPath !== null,
                        'consent_file_name' => $consentName,
                        'consent_file_path' => $consentPath,
                        'status' => $autoApprove ? 'approved' : 'pending',
                        'approved_at' => $autoApprove ? now() : null,
                        'approved_by' => $autoApprove ? (
                            Auth::user()->role === 'super_admin'
                                ? 'Superadmin Instant Pass'
                                : 'System Auto-Approval Policies'
                        ) : null,
                    ]);
                }

                return $plan->load('bookings');
            });

            try {
                $requesterName = Auth::user()?->name ?? 'A user';
                $message = sprintf(
                    '%s submitted an activity plan for %s covering %s to %s with %d sessions.',
                    $requesterName,
                    $facility->name,
                    $plan->start_date->format('M d, Y'),
                    $plan->end_date->format('M d, Y'),
                    $plan->bookings->count()
                );

                $facility->facilityAdmins()
                    ->where('is_active', true)
                    ->get()
                    ->each(fn (User $admin) => $admin->notify(
                        new ActivityPlanNotification(
                            (string) $plan->getKey(),
                            'New Activity Plan',
                            $message
                        )
                    ));
            } catch (\Throwable $exception) {
                Log::warning('Activity plan notification delivery failed.', [
                    'activity_plan_id' => $plan->getKey(),
                    'error' => $exception->getMessage(),
                ]);
            }
        } catch (\Throwable $exception) {
            foreach ([$activityPlanPath, $consentPath] as $uploadedPath) {
                if ($uploadedPath) {
                    try {
                        Storage::disk('tigris')->delete($uploadedPath);
                    } catch (\Throwable $cleanupException) {
                        Log::warning('Failed to clean up an activity plan upload.', [
                            'path' => $uploadedPath,
                            'error' => $cleanupException->getMessage(),
                        ]);
                    }
                }
            }

            throw $exception;
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => $autoApprove
                ? 'Activity plan submitted and automatically approved.'
                : 'Activity plan submitted successfully for review.',
        ]);
    }

    public function approveAll(Request $request, ActivityPlan $activityPlan)
    {
        $user = $request->user();
        $this->authorizePlanManagement($user, $activityPlan);

        $result = DB::transaction(function () use ($activityPlan, $user) {
            $facility = Facility::query()
                ->whereKey($activityPlan->facility_id)
                ->lockForUpdate()
                ->firstOrFail();

            $plan = ActivityPlan::query()
                ->whereKey($activityPlan->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if (!$facility->is_available) {
                return 'facility_unavailable';
            }

            $settings = SystemSetting::current();
            $buffer = max(0, (int) ($settings->cleanup_buffer_minutes ?? 30));
            $sessions = $plan->bookings()->where('status', 'pending')->orderBy('date')->orderBy('start_time')->get();

            foreach ($sessions as $session) {
                $date = $session->date ?? $session->booking_date;
                $this->validateSessionHours($facility, $date, $session->start_time, $session->end_time, $settings);

                $scheduledClosure = FacilityScheduleAvailability::firstOverlappingClosure(
                    $facility,
                    $date->format('Y-m-d'),
                    $date->format('Y-m-d'),
                    substr((string) $session->start_time, 0, 5),
                    substr((string) $session->end_time, 0, 5)
                );

                if ($scheduledClosure) {
                    return 'scheduled_closure';
                }

                if ($this->hasSessionConflict(
                    (string) $facility->getKey(),
                    $date->format('Y-m-d'),
                    $session->start_time,
                    $session->end_time,
                    $buffer,
                    $plan->bookings()->pluck('id')->all()
                )) {
                    return 'conflict';
                }
            }

                $plan->bookings()->where('status', 'pending')->update([
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by' => $user->name,
            ]);

            $plan->update([
                'reviewed_by' => $user->id,
                'reviewed_at' => now(),
                'decline_reason' => null,
            ]);
            $plan->syncStatus();

            return 'approved';
        });

        if ($result !== 'approved') {
            $messages = [
                'facility_unavailable' => 'The facility is unavailable. Restore it before approving this activity plan.',
                'conflict' => 'One or more sessions now conflict with another booking. Review the affected dates before approving the plan.',
                'scheduled_closure' => 'One or more sessions overlap a scheduled facility closure. Adjust the affected sessions before approving the plan.',
            ];

            return back()->with('toast', [
                'type' => 'error',
                'message' => $messages[$result] ?? 'The activity plan could not be approved.',
            ]);
        }

        $activityPlan->user?->notify(new ActivityPlanNotification(
            (string) $activityPlan->getKey(),
            'Activity Plan Approved',
            'Your activity plan "' . $activityPlan->title . '" has been approved.'
        ));

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'All pending sessions in the activity plan were approved.',
        ]);
    }

    public function declineAll(Request $request, ActivityPlan $activityPlan)
    {
        $user = $request->user();
        $this->authorizePlanManagement($user, $activityPlan);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($activityPlan, $user, $validated) {
            $plan = ActivityPlan::query()
                ->whereKey($activityPlan->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $plan->bookings()
                ->whereIn('status', ['pending', 'approved'])
                ->whereNull('checked_in_at')
                ->whereNull('checked_out_at')
                ->update([
                    'status' => 'declined',
                    'decline_reason' => $validated['reason'],
                    'rejection_reason' => $validated['reason'],
                    'approved_by' => $user->name,
                    'approved_at' => now(),
                ]);

            $plan->update([
                'decline_reason' => $validated['reason'],
                'reviewed_by' => $user->id,
                'reviewed_at' => now(),
            ]);
            $plan->syncStatus();
        });

        $activityPlan->user?->notify(new ActivityPlanNotification(
            (string) $activityPlan->getKey(),
            'Activity Plan Declined',
            'Your activity plan "' . $activityPlan->title . '" was declined. Reason: ' . $validated['reason']
        ));

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'The activity plan and its remaining active sessions were declined.',
        ]);
    }

    public function show(Request $request, ActivityPlan $activityPlan)
    {
        $this->authorizePlanAccess($request->user(), $activityPlan);

        $activityPlan->load([
            'facility:id,name,location,is_available,unavailable_reason,capacity,allowTdevsManpower',
            'user:id,name,email',
            'bookings' => fn ($query) => $query->with('user:id,name')->orderBy('date')->orderBy('start_time'),
        ]);

        return Inertia::render('ActivityPlans/Show', [
            'activityPlan' => $activityPlan,
        ]);
    }

    public function downloadAttachment(Request $request, ActivityPlan $activityPlan): StreamedResponse
    {
        $this->authorizePlanAccess($request->user(), $activityPlan);

        abort_unless(
            $activityPlan->attachment_path
            && Storage::disk('tigris')->exists($activityPlan->attachment_path),
            404,
            'The activity plan attachment could not be found.'
        );

        return Storage::disk('tigris')->download(
            $activityPlan->attachment_path,
            $activityPlan->attachment_name ?: 'activity-plan'
        );
    }

    private function authorizePlanManagement(?User $user, ActivityPlan $plan): void
    {
        abort_unless($user !== null, 401);

        if ($user->role === 'super_admin') {
            return;
        }

        abort_unless($user->role === 'facility_admin', 403);
        abort_unless(
            Facility::query()->whereKey($plan->facility_id)
                ->whereHas('facilityAdmins', fn ($query) => $query->where('users.id', $user->id))
                ->exists(),
            403,
            'You may only manage activity plans for facilities assigned to you.'
        );
    }

    private function authorizePlanAccess(?User $user, ActivityPlan $plan): void
    {
        abort_unless($user !== null, 401);

        if ($user->role === 'super_admin' || (int) $plan->user_id === (int) $user->id) {
            return;
        }

        abort_unless(
            $user->role === 'facility_admin'
            && Facility::query()->whereKey($plan->facility_id)
                ->whereHas('facilityAdmins', fn ($query) => $query->where('users.id', $user->id))
                ->exists(),
            403,
            'You are not authorized to access this activity plan.'
        );
    }

    private function validateSessionHours(
        Facility $facility,
        Carbon $date,
        string $startTime,
        string $endTime,
        SystemSetting $settings
    ): void {
        $startMinutes = $this->minutes($startTime);
        $endMinutes = $endTime === '00:00' ? 1440 : $this->minutes($endTime);

        if ($startMinutes >= $endMinutes || $startMinutes % 15 !== 0 || $endMinutes % 15 !== 0) {
            throw ValidationException::withMessages([
                'sessions' => 'Session times must be valid 15-minute intervals, with the end after the start.',
            ]);
        }

        $hours = FacilityOperatingHour::query()
            ->where('facility_id', $facility->getKey())
            ->where('day_of_week', $date->dayOfWeek)
            ->first();

        if ($hours) {
            if ($hours->is_closed) {
                throw ValidationException::withMessages([
                    'sessions' => $facility->name . ' is closed on ' . $date->format('l') . '.',
                ]);
            }

            $opening = $this->minutes(substr((string) $hours->opens_at, 0, 5));
            $closingString = substr((string) $hours->closes_at, 0, 5);
            $closing = $closingString === '00:00' ? 1440 : $this->minutes($closingString);
        } else {
            $opening = $this->minutes(substr((string) $settings->opening_time, 0, 5));
            $closingString = substr((string) $settings->closing_time, 0, 5);
            $closing = $closingString === '00:00' ? 1440 : $this->minutes($closingString);
        }

        if ($startMinutes < $opening || $startMinutes >= $closing || $endMinutes > $closing) {
            throw ValidationException::withMessages([
                'sessions' => 'A session falls outside ' . $facility->name . "'s operating hours on " . $date->format('M j, Y') . '.',
            ]);
        }

        $maxHours = 4.0;
        foreach ([
            'max_booking_span_hours',
            'max_booking_hours',
            'max_booking_duration_hours',
            'max_duration_hours',
            'max_booking_duration',
        ] as $column) {
            $configured = $settings->getAttribute($column);
            if ($configured !== null && is_numeric($configured)) {
                $maxHours = max(0, (float) $configured);
                break;
            }
        }

        if (($endMinutes - $startMinutes) > ($maxHours * 60)) {
            throw ValidationException::withMessages([
                'sessions' => "A session exceeds the current maximum booking duration of {$maxHours} hours.",
            ]);
        }
    }

    private function hasSessionConflict(
        string $facilityId,
        string $date,
        string $startTime,
        string $endTime,
        int $buffer,
        array $excludeIds = []
    ): bool {
        $start = $this->minutes($startTime);
        $end = $endTime === '00:00' ? 1440 : $this->minutes($endTime);

        $query = Booking::query()
            ->where('facility_id', $facilityId)
            ->whereIn('status', ['pending', 'approved'])
            ->whereRaw('COALESCE(date, booking_date) <= ?', [$date])
            ->whereRaw('COALESCE(end_date, date, booking_date) >= ?', [$date]);

        if ($excludeIds !== []) {
            $query->whereNotIn('id', $excludeIds);
        }

        return $query->get(['start_time', 'end_time'])->contains(function (Booking $booking) use ($start, $end, $buffer) {
            $existingStart = $this->minutes($booking->start_time) - $buffer;
            $existingEnd = ($booking->end_time === '00:00' ? 1440 : $this->minutes($booking->end_time)) + $buffer;

            return $start < $existingEnd && $end > $existingStart;
        });
    }

    private function minutes(string $time): int
    {
        [$hour, $minute] = array_map('intval', explode(':', substr($time, 0, 5)));
        return ($hour * 60) + $minute;
    }
}
