<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\SystemSetting;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BookingController extends Controller
{
    /**
     * Get the configured maximum booking duration in hours.
     */
    private function getMaxBookingSpanHours($settings): float
    {
        $possibleColumns = [
            'max_booking_span_hours',
            'max_booking_hours',
            'max_booking_duration_hours',
            'max_duration_hours',
        ];

        foreach ($possibleColumns as $column) {
            $value = $settings->getAttribute($column);

            if ($value !== null && is_numeric($value)) {
                return max(0, (float) $value);
            }
        }

        return 4.0;
    }

    /**
     * Validate that the end time follows the start time and
     * the duration is within the configured limit.
     */
    private function validateBookingSpan(
        string $startTime,
        string $endTime,
        $settings
    ): void {
        $start = Carbon::createFromFormat('!H:i', $startTime);
        $end = Carbon::createFromFormat('!H:i', $endTime);

        if (!$start || !$end || !$end->gt($start)) {
            throw ValidationException::withMessages([
                'end_time' => 'The end time must be later than the start time.',
            ]);
        }

        $durationMinutes = $start->diffInMinutes($end);
        $maxHours = $this->getMaxBookingSpanHours($settings);
        $maxMinutes = $maxHours * 60;

        if ($durationMinutes > $maxMinutes) {
            $formattedMax = rtrim(
                rtrim(number_format($maxHours, 2, '.', ''), '0'),
                '.'
            );

            throw ValidationException::withMessages([
                'end_time' => "A booking cannot exceed {$formattedMax} hours. Please select an earlier end time.",
            ]);
        }
    }

    /**
     * Reject approval actions from users who are not administrators.
     * Facility admins must also be assigned to the booking's facility.
     */
    private function authorizeBookingAdministration(Booking $booking): void
    {
        $user = Auth::user();

        abort_unless($user, 401);

        if ($user->role === 'super_admin') {
            return;
        }

        abort_unless($user->role === 'facility_admin', 403);

        $facility = $booking->facility;

        abort_unless($facility, 404);

        $isAssigned = $facility->facilityAdmins()
            ->where('users.id', $user->id)
            ->exists();

        abort_unless($isAssigned, 403);
    }

    /**
     * Check booking time conflicts.
     *
     * Call this while the corresponding facility row is locked
     * inside a database transaction.
     */
    private function hasBookingConflict(
        string $facilityId,
        string $date,
        string $startTime,
        string $endTime,
        int $bufferMinutes,
        ?string $excludeBookingId = null
    ): bool {
        $query = Booking::query()
            ->where('facility_id', $facilityId)
            ->where(function ($query) use ($date) {
                $query->whereDate('date', $date)
                    ->orWhereDate('booking_date', $date);
            })
            ->whereIn('status', ['pending', 'approved']);

        if ($excludeBookingId !== null) {
            $query->where('id', '!=', $excludeBookingId);
        }

        $existingBookings = $query->get([
            'start_time',
            'end_time',
        ]);

        $requestedStart = Carbon::createFromFormat('!H:i', $startTime);
        $requestedEnd = Carbon::createFromFormat('!H:i', $endTime);

        foreach ($existingBookings as $existing) {
            $existingStart = Carbon::parse($existing->start_time);
            $existingEnd = Carbon::parse($existing->end_time);

            $bufferedStart = $existingStart->copy()
                ->subMinutes($bufferMinutes);

            $bufferedEnd = $existingEnd->copy()
                ->addMinutes($bufferMinutes);

            if (
                $requestedStart->lt($bufferedEnd) &&
                $requestedEnd->gt($bufferedStart)
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Return the standard time-slot conflict message.
     */
    private function conflictMessage(int $bufferMinutes): string
    {
        return $bufferMinutes > 0
            ? "Time slot overlaps with an existing booking ({$bufferMinutes}-minute buffer included)."
            : 'Time slot overlaps with an existing booking.';
    }

    /**
     * Display the authenticated user's bookings.
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => [
                'nullable',
                'string',
                Rule::in([
                    'pending',
                    'approved',
                    'declined',
                    'cancelled',
                ]),
            ],
            'booking' => ['nullable', 'string', 'max:255'],
        ]);

        $search = $validated['search'] ?? null;
        $status = $validated['status'] ?? null;
        $openBookingId = $validated['booking'] ?? null;

        $query = Booking::with('facility')
            ->where('user_id', Auth::id());

        if ($status) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->whereHas('facility', function ($facilityQuery) use ($search) {
                $facilityQuery->where('name', 'like', "%{$search}%");
            });
        }

        $bookings = $query->orderByDesc('date')->get();

        $today = Carbon::today();

        $upcomingBookings = $bookings
            ->filter(fn ($booking) =>
                in_array($booking->status, ['pending', 'approved'], true) &&
                Carbon::parse($booking->date)->gte($today)
            )
            ->values();

        $historyBookings = $bookings
            ->reject(fn ($booking) =>
                $upcomingBookings->contains('id', $booking->id)
            )
            ->values();

        $openBooking = null;

        if ($openBookingId) {
            $openBooking = Booking::with('facility')
                ->where('user_id', Auth::id())
                ->find($openBookingId);
        }

        $activityLogs = [];

        if (class_exists(\App\Models\ActivityLog::class)) {
            $activityLogs = \App\Models\ActivityLog::whereIn(
                'booking_id',
                $bookings->pluck('id')
            )
                ->orderByDesc('created_at')
                ->get();
        }

        return Inertia::render('MyBookings', [
            'bookings' => $bookings,
            'upcomingBookings' => $upcomingBookings,
            'historyBookings' => $historyBookings,
            'filters' => $request->only(['search', 'status']),
            'openBooking' => $openBooking,
            'activityLogs' => $activityLogs,
        ]);
    }

    /**
     * Display a receipt for an approved booking owned by the user.
     */
    public function receipt(string $id)
    {
        $booking = Booking::with('facility')
            ->where('user_id', Auth::id())
            ->findOrFail($id);

        abort_unless(
            $booking->status === 'approved',
            403,
            'Receipts are available only for approved bookings.'
        );

        return Inertia::render('Receipt', [
            'booking' => $booking,
        ]);
    }

    /**
     * Update a pending booking owned by the authenticated user.
     */
    public function update(Request $request, string $id)
    {
        $booking = Booking::with('facility')
            ->where('user_id', Auth::id())
            ->findOrFail($id);

        if ($booking->status !== 'pending') {
            return back()->withErrors([
                'status' => 'Only pending bookings can be edited.',
            ]);
        }

        $validated = $request->validate([
            'date' => [
                'required',
                'date_format:Y-m-d',
                'after_or_equal:today',
            ],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => [
                'required',
                'date_format:H:i',
                'after:start_time',
            ],
            'attendees' => ['required', 'integer', 'min:1'],
            'needs_manpower' => ['required', 'boolean'],
            'notes' => ['nullable', 'string', 'max:10000'],
        ]);

        $facility = $booking->facility;

        if (!$facility) {
            return back()->withErrors([
                'facility' => 'The facility associated with this booking could not be found.',
            ]);
        }

        if (
            $facility->capacity !== null &&
            (int) $validated['attendees'] > (int) $facility->capacity
        ) {
            return back()->withErrors([
                'attendees' => "This facility allows a maximum of {$facility->capacity} attendees.",
            ]);
        }

        $needsManpower = (bool) $validated['needs_manpower'];

        if ($needsManpower && !$facility->allowTdevsManpower) {
            throw ValidationException::withMessages([
                'needs_manpower' => 'TDEVS manpower is not available for this facility.',
            ]);
        }

        $settings = SystemSetting::current();
        $bookingDate = Carbon::createFromFormat('!Y-m-d', $validated['date']);
        $today = Carbon::today();

        $maxDays = max(0, (int) ($settings->max_advance_days ?? 30));

        if ($bookingDate->gt($today->copy()->addDays($maxDays))) {
            return back()->withErrors([
                'date' => "You can only book facilities up to {$maxDays} days in advance.",
            ]);
        }

        $this->validateBookingSpan(
            $validated['start_time'],
            $validated['end_time'],
            $settings
        );

        $buffer = max(
            0,
            (int) ($settings->cleanup_buffer_minutes ?? 30)
        );

        DB::transaction(function () use (
            $booking,
            $facility,
            $validated,
            $needsManpower,
            $buffer
        ) {
            Facility::whereKey($facility->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $lockedBooking = Booking::whereKey($booking->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if (
                $lockedBooking->user_id != Auth::id() ||
                $lockedBooking->status !== 'pending'
            ) {
                throw ValidationException::withMessages([
                    'status' => 'This booking can no longer be edited.',
                ]);
            }

            $conflict = $this->hasBookingConflict(
                (string) $lockedBooking->facility_id,
                $validated['date'],
                $validated['start_time'],
                $validated['end_time'],
                $buffer,
                (string) $lockedBooking->id
            );

            if ($conflict) {
                throw ValidationException::withMessages([
                    'start_time' => $this->conflictMessage($buffer),
                ]);
            }

            $lockedBooking->update([
                'date' => $validated['date'],
                'booking_date' => $validated['date'],
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'attendees' => (int) $validated['attendees'],
                'needs_manpower' => $needsManpower,
                'notes' => $validated['notes'] ?? null,
            ]);
        });

        return back()->with('success', 'Booking updated successfully.');
    }

    /**
     * Cancel a booking owned by the authenticated user.
     *
     * The conditional update ensures the status changes only when
     * the booking is still pending or approved at update time.
     */
    public function cancel(string $id)
    {
        $booking = Booking::query()
            ->whereKey($id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $updated = Booking::query()
            ->whereKey($booking->getKey())
            ->where('user_id', Auth::id())
            ->whereIn('status', ['pending', 'approved'])
            ->update([
                'status' => 'cancelled',
                'updated_at' => now(),
            ]);

        if ($updated !== 1) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'This booking can no longer be cancelled.',
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Booking cancelled.',
        ]);
    }

    /**
     * Create a new facility booking.
     */
    public function store(Request $request)
    {
        $settings = SystemSetting::current();

        $validated = $request->validate([
            'facility_id' => ['required', 'string', 'exists:facilities,id'],
            'date' => [
                'required',
                'date_format:Y-m-d',
                'after_or_equal:today',
            ],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => [
                'required',
                'date_format:H:i',
                'after:start_time',
            ],
            'notes' => ['nullable', 'string', 'max:10000'],
            'attendees' => ['nullable', 'integer', 'min:1'],
            'guest_name' => ['nullable', 'string', 'max:255'],
            'guest_email' => ['nullable', 'email', 'max:255'],
            'guest_phone' => ['nullable', 'string', 'max:50'],
            'needs_manpower' => ['nullable', 'boolean'],
        ]);

        $facility = Facility::findOrFail($validated['facility_id']);

        $bookingDate = Carbon::createFromFormat('!Y-m-d', $validated['date']);

        $isConsentRequired =
            (bool) $settings->require_consent_letter
            || $facility->requirement === 'CONSENT_REQUIRED'
            || (
                (bool) $facility->requiresWeekendConsent
                && $bookingDate->isWeekend()
            );

        $request->validate([
            'consent_letter' => $isConsentRequired
                ? ['required', 'file', 'mimes:pdf,doc,docx', 'max:5120']
                : ['nullable', 'file', 'mimes:pdf,doc,docx', 'max:5120'],
        ]);

        $attendeeCount = (int) ($validated['attendees'] ?? 1);

        if (
            $facility->capacity !== null &&
            $attendeeCount > (int) $facility->capacity
        ) {
            return back()->withErrors([
                'attendees' => "This facility allows a maximum of {$facility->capacity} attendees.",
            ]);
        }

        $needsManpower = (bool) ($validated['needs_manpower'] ?? false);

        if ($needsManpower && !$facility->allowTdevsManpower) {
            throw ValidationException::withMessages([
                'needs_manpower' => 'TDEVS manpower is not available for this facility.',
            ]);
        }

        $today = Carbon::today();
        $maxDays = max(0, (int) ($settings->max_advance_days ?? 30));

        if ($bookingDate->gt($today->copy()->addDays($maxDays))) {
            return back()->withErrors([
                'date' => "You can only book facilities up to {$maxDays} days in advance.",
            ]);
        }

        $this->validateBookingSpan(
            $validated['start_time'],
            $validated['end_time'],
            $settings
        );

        $buffer = max(
            0,
            (int) ($settings->cleanup_buffer_minutes ?? 30)
        );

        $isSuperAdmin = Auth::user()->role === 'super_admin';
        $approvalScope = $settings->auto_approve_scope ?? 'disabled';

        $autoApprove = $approvalScope === 'everyone'
            || (
                $approvalScope === 'superadmin_only'
                && $isSuperAdmin
            );

        $path = null;
        $originalName = null;
        $booking = null;

        try {
            if ($request->hasFile('consent_letter')) {
                $file = $request->file('consent_letter');
                $extension = strtolower($file->getClientOriginalExtension());

                $path = $file->storeAs(
                    'consent-letters',
                    bin2hex(random_bytes(24)) . '.' . $extension,
                    'local'
                );

                $originalName = basename($file->getClientOriginalName());
            }

            $booking = DB::transaction(function () use (
                $facility,
                $validated,
                $attendeeCount,
                $needsManpower,
                $path,
                $originalName,
                $autoApprove,
                $isSuperAdmin,
                $buffer
            ) {
                Facility::whereKey($facility->getKey())
                    ->lockForUpdate()
                    ->firstOrFail();

                $conflict = $this->hasBookingConflict(
                    (string) $facility->getKey(),
                    $validated['date'],
                    $validated['start_time'],
                    $validated['end_time'],
                    $buffer
                );

                if ($conflict) {
                    throw ValidationException::withMessages([
                        'start_time' => $this->conflictMessage($buffer),
                    ]);
                }

                return Booking::create([
                    'facility_id' => $facility->getKey(),
                    'user_id' => Auth::id(),
                    'guest_name' => $validated['guest_name'] ?? null,
                    'guest_email' => $validated['guest_email'] ?? null,
                    'guest_phone' => $validated['guest_phone'] ?? null,
                    'date' => $validated['date'],
                    'booking_date' => $validated['date'],
                    'start_time' => $validated['start_time'],
                    'end_time' => $validated['end_time'],
                    'notes' => $validated['notes'] ?? null,
                    'attendees' => $attendeeCount,
                    'needs_manpower' => $needsManpower,
                    'consent_file_uploaded' => $path !== null,
                    'consent_file_name' => $originalName,
                    'consent_file_path' => $path,
                    'status' => $autoApprove ? 'approved' : 'pending',
                    'approved_at' => $autoApprove ? now() : null,
                    'approved_by' => $autoApprove
                        ? (
                            $isSuperAdmin
                                ? 'Superadmin Instant Pass'
                                : 'System Auto-Approval Policies'
                        )
                        : null,
                ]);
            });
        } catch (\Throwable $e) {
            if ($path !== null) {
                try {
                    Storage::disk('local')->delete($path);
                } catch (\Throwable $cleanupException) {
                    Log::error('Failed to clean up consent upload.', [
                        'path' => $path,
                        'error' => $cleanupException->getMessage(),
                    ]);
                }
            }

            throw $e;
        }

        try {
            if (class_exists(\App\Events\BookingCreatedEvent::class)) {
                broadcast(
                    new \App\Events\BookingCreatedEvent($booking)
                )->toOthers();
            }
        } catch (\Throwable $e) {
            Log::warning('WebSocket broadcast failed.', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Booking submitted successfully.',
        ]);
    }

    /**
     * Approve a booking.
     *
     * Kept for compatibility, but explicitly enforces authorization
     * even if a route is accidentally registered without role middleware.
     */
    public function approve(Request $request, string $id)
    {
        $booking = Booking::with('facility')->findOrFail($id);

        $this->authorizeBookingAdministration($booking);

        $updated = DB::transaction(function () use ($booking) {
            $lockedBooking = Booking::whereKey($booking->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedBooking->status !== 'pending') {
                return false;
            }

            $lockedBooking->update([
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by' => Auth::user()->name ?? 'Administrator',
                'rejection_reason' => null,
            ]);

            if (class_exists(\App\Models\ActivityLog::class)) {
                \App\Models\ActivityLog::create([
                    'booking_id' => $lockedBooking->id,
                    'user_id' => Auth::id(),
                    'action' => 'approved',
                    'notes' => 'Booking was approved by ' .
                        (Auth::user()->name ?? 'Admin'),
                ]);
            }

            return true;
        });

        if (!$updated) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Only pending bookings can be approved.',
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Booking approved successfully.',
        ]);
    }

    /**
     * Decline a booking.
     *
     * Kept for compatibility, but explicitly enforces authorization
     * even if a route is accidentally registered without role middleware.
     */
    public function decline(Request $request, string $id)
    {
        $booking = Booking::with('facility')->findOrFail($id);

        $this->authorizeBookingAdministration($booking);

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $reason = $validated['reason'] ?? 'Declined by administrator';

        $updated = DB::transaction(function () use ($booking, $reason) {
            $lockedBooking = Booking::whereKey($booking->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedBooking->status !== 'pending') {
                return false;
            }

            $lockedBooking->update([
                'status' => 'declined',
                'rejection_reason' => $reason,
            ]);

            if (class_exists(\App\Models\ActivityLog::class)) {
                \App\Models\ActivityLog::create([
                    'booking_id' => $lockedBooking->id,
                    'user_id' => Auth::id(),
                    'action' => 'declined',
                    'notes' => 'Booking was declined: ' . $reason,
                ]);
            }

            return true;
        });

        if (!$updated) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Only pending bookings can be declined.',
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Booking declined successfully.',
        ]);
    }
}