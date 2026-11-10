<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Facility;
use App\Models\FacilityOperatingHour;
use App\Models\FacilityOperatingHourHistory;
use App\Models\SystemSetting;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class FacilityBookingSettingsController extends Controller
{
    private const DAY_NAMES = [
        'Sunday', 'Monday', 'Tuesday', 'Wednesday',
        'Thursday', 'Friday', 'Saturday',
    ];

    public function edit(Request $request, Facility $facility)
    {
        $this->authorizeFacilityAccess($request, $facility);

        $facility->load('operatingHours');

        $settings = SystemSetting::current();

        return Inertia::render('Admin/FacilityBookingSettings', [
            'facility' => $facility,
            'operatingHours' => $facility->operatingHours,
            'defaultOpeningTime' => substr((string) $settings->opening_time, 0, 5),
            'defaultClosingTime' => substr((string) $settings->closing_time, 0, 5),
            'dayNames' => self::DAY_NAMES,
        ]);
    }

    public function update(Request $request, Facility $facility)
    {
        $this->authorizeFacilityAccess($request, $facility);

        $validated = $request->validate([
            'hours' => ['required', 'array', 'size:7'],
            'hours.*.day_of_week' => ['required', 'integer', 'between:0,6', 'distinct'],
            'hours.*.is_closed' => ['required', 'boolean'],
            'hours.*.opens_at' => ['nullable', 'date_format:H:i'],
            'hours.*.closes_at' => ['nullable', 'date_format:H:i'],
        ]);

        foreach ($validated['hours'] as $index => $day) {
            if ($day['is_closed']) {
                continue;
            }

            if (empty($day['opens_at']) || empty($day['closes_at'])) {
                throw ValidationException::withMessages([
                    "hours.{$index}.opens_at" => 'Opening and closing times are required for an open day.',
                ]);
            }

            $opening = Carbon::createFromFormat('!H:i', $day['opens_at']);
            $closing = Carbon::createFromFormat('!H:i', $day['closes_at']);

            if (! $opening || ! $closing || ! $closing->gt($opening)) {
                throw ValidationException::withMessages([
                    "hours.{$index}.closes_at" => 'Closing time must be later than opening time.',
                ]);
            }
        }

        DB::transaction(function () use ($facility, $validated, $request) {
            Facility::query()
                ->whereKey($facility->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            foreach ($validated['hours'] as $day) {
                $dayOfWeek = (int) $day['day_of_week'];
                $isClosed = (bool) $day['is_closed'];
                $opensAt = $isClosed ? null : $day['opens_at'];
                $closesAt = $isClosed ? null : $day['closes_at'];

                $existing = FacilityOperatingHour::query()
                    ->where('facility_id', $facility->getKey())
                    ->where('day_of_week', $dayOfWeek)
                    ->first();

                FacilityOperatingHourHistory::create([
                    'facility_id' => $facility->getKey(),
                    'day_of_week' => $dayOfWeek,
                    'old_is_closed' => $existing?->is_closed,
                    'old_opens_at' => $existing?->opens_at,
                    'old_closes_at' => $existing?->closes_at,
                    'new_is_closed' => $isClosed,
                    'new_opens_at' => $opensAt,
                    'new_closes_at' => $closesAt,
                    'changed_by' => $request->user()->id,
                ]);

                FacilityOperatingHour::updateOrCreate(
                    [
                        'facility_id' => $facility->getKey(),
                        'day_of_week' => $dayOfWeek,
                    ],
                    [
                        'is_closed' => $isClosed,
                        'opens_at' => $opensAt,
                        'closes_at' => $closesAt,
                        'updated_by' => $request->user()->id,
                    ]
                );
            }
        });

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Facility booking hours saved.',
        ]);
    }

    private function authorizeFacilityAccess(Request $request, Facility $facility): void
    {
        $user = $request->user();

        abort_unless($user !== null, 401);

        if ($user->role === 'super_admin') {
            return;
        }

        abort_unless($user->role === 'facility_admin', 403);

        abort_unless(
            $facility->facilityAdmins()->where('users.id', $user->id)->exists(),
            403,
            'You can only manage booking settings for facilities assigned to you.'
        );
    }
}
