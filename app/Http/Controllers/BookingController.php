<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Facility;
use App\Models\SystemSetting;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BookingController extends Controller
{
    /**
     * Get the configured maximum booking duration in hours.
     */
    private function getMaxBookingSpanHours($settings): float
    {
        // Support common setting-column names in case the model uses
        // a slightly different name for the same setting.
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

        // Match the configured four-hour limit if no value is found.
        return 4.0;
    }

    /**
     * Validate the duration against the configured maximum.
     */
    private function validateBookingSpan(
        string $startTime,
        string $endTime,
        $settings
    ): void {
        $start = Carbon::createFromFormat('!H:i', $startTime);
        $end = Carbon::createFromFormat('!H:i', $endTime);

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
     * Display the authenticated user's bookings.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $status = $request->input('status');
        $openBookingId = $request->input('booking');

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
                in_array($booking->status, ['pending', 'approved']) &&
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
            'date' => ['required', 'date', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
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

        $bookingDate = Carbon::parse($validated['date'])->startOfDay();
        $today = Carbon::today();

        if ($bookingDate->lt($today)) {
            return back()->withErrors([
                'date' => 'The booking date cannot be in the past.',
            ]);
        }

        $maxDays = max(0, (int) ($settings->max_advance_days ?? 30));

        if ($bookingDate->gt($today->copy()->addDays($maxDays))) {
            return back()->withErrors([
                'date' => "You can only book facilities up to {$maxDays} days in advance.",
            ]);
        }

        // Enforce the configured maximum booking duration.
        $this->validateBookingSpan(
            $validated['start_time'],
            $validated['end_time'],
            $settings
        );

        $buffer = max(
            0,
            (int) ($settings->cleanup_buffer_minutes ?? 30)
        );

        $start = Carbon::createFromFormat(
            '!H:i',
            $validated['start_time']
        );

        $end = Carbon::createFromFormat(
            '!H:i',
            $validated['end_time']
        );

        $conflictingBookings = Booking::where(
            'facility_id',
            $booking->facility_id
        )
            ->whereDate('date', $validated['date'])
            ->whereIn('status', ['pending', 'approved'])
            ->where('id', '!=', $booking->id)
            ->get(['start_time', 'end_time']);

        foreach ($conflictingBookings as $existing) {
            $existingStart = Carbon::parse($existing->start_time);
            $existingEnd = Carbon::parse($existing->end_time);

            $bufferedStart = $existingStart->copy()
                ->subMinutes($buffer);

            $bufferedEnd = $existingEnd->copy()
                ->addMinutes($buffer);

            if (
                $start->lt($bufferedEnd) &&
                $end->gt($bufferedStart)
            ) {
                return back()->withErrors([
                    'start_time' => $buffer > 0
                        ? "Time slot overlaps with an existing booking ({$buffer}-minute buffer included)."
                        : 'Time slot overlaps with an existing booking.',
                ]);
            }
        }

        $booking->update([
            'date' => $validated['date'],
            'booking_date' => $validated['date'],
            'start_time' => $start->format('H:i'),
            'end_time' => $end->format('H:i'),
            'attendees' => (int) $validated['attendees'],
            'needs_manpower' => $needsManpower,
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'Booking updated successfully.');
    }

    /**
     * Cancel a booking owned by the authenticated user.
     */
    public function cancel(string $id)
    {
        $booking = Booking::where('id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        if (!in_array($booking->status, ['pending', 'approved'])) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'This booking can no longer be cancelled.',
            ]);
        }

        $booking->update([
            'status' => 'cancelled',
        ]);

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
            'date' => ['required', 'date', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'notes' => ['nullable', 'string', 'max:10000'],
            'attendees' => ['nullable', 'integer', 'min:1'],
            'guest_name' => ['nullable', 'string', 'max:255'],
            'guest_email' => ['nullable', 'email', 'max:255'],
            'guest_phone' => ['nullable', 'string', 'max:50'],
            'needs_manpower' => ['nullable', 'boolean'],
        ]);

        $facility = Facility::findOrFail($validated['facility_id']);

        $bookingDate = Carbon::parse($validated['date'])->startOfDay();

        // Global consent overrides facility-specific rules.
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

        // Enforce the configured maximum booking duration.
        $this->validateBookingSpan(
            $validated['start_time'],
            $validated['end_time'],
            $settings
        );

        $buffer = max(
            0,
            (int) ($settings->cleanup_buffer_minutes ?? 30)
        );

        $start = Carbon::createFromFormat(
            '!H:i',
            $validated['start_time']
        );

        $end = Carbon::createFromFormat(
            '!H:i',
            $validated['end_time']
        );

        $existingBookings = Booking::where(
            'facility_id',
            $validated['facility_id']
        )
            ->whereDate('date', $validated['date'])
            ->whereIn('status', ['pending', 'approved'])
            ->get(['start_time', 'end_time']);

        foreach ($existingBookings as $existing) {
            $existingStart = Carbon::parse($existing->start_time);
            $existingEnd = Carbon::parse($existing->end_time);

            $bufferedStart = $existingStart->copy()
                ->subMinutes($buffer);

            $bufferedEnd = $existingEnd->copy()
                ->addMinutes($buffer);

            if (
                $start->lt($bufferedEnd) &&
                $end->gt($bufferedStart)
            ) {
                return back()->withErrors([
                    'start_time' => $buffer > 0
                        ? "Time slot overlaps with an existing booking ({$buffer}-minute buffer included)."
                        : 'Time slot overlaps with an existing booking.',
                ]);
            }
        }

        $isSuperAdmin = Auth::check()
            && Auth::user()->role === 'super_admin';

        $approvalScope = $settings->auto_approve_scope ?? 'disabled';
        $autoApprove = false;

        if ($approvalScope === 'everyone') {
            $autoApprove = true;
        } elseif (
            $approvalScope === 'superadmin_only' &&
            $isSuperAdmin
        ) {
            $autoApprove = true;
        }

        $path = null;
        $originalName = null;

        if ($request->hasFile('consent_letter')) {
            $path = $request->file('consent_letter')
                ->store('consent-letters', 'local');

            $originalName = $request->file('consent_letter')
                ->getClientOriginalName();
        }

        $booking = Booking::create([
            'facility_id' => $validated['facility_id'],
            'user_id' => Auth::id(),
            'guest_name' => $validated['guest_name'] ?? null,
            'guest_email' => $validated['guest_email'] ?? null,
            'guest_phone' => $validated['guest_phone'] ?? null,
            'date' => $validated['date'],
            'booking_date' => $validated['date'],
            'start_time' => $start->format('H:i'),
            'end_time' => $end->format('H:i'),
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

        try {
            if (class_exists(\App\Events\BookingCreatedEvent::class)) {
                broadcast(
                    new \App\Events\BookingCreatedEvent($booking)
                )->toOthers();
            }
        } catch (\Throwable $e) {
            Log::warning(
                'WebSocket broadcast failed: ' . $e->getMessage()
            );
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Booking submitted successfully.',
        ]);
    }

    /**
     * Approve a booking.
     *
     * Protect this route with administrator middleware/policies.
     */
    public function approve(Request $request, string $id)
    {
        $booking = Booking::findOrFail($id);

        if ($booking->status !== 'pending') {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Only pending bookings can be approved.',
            ]);
        }

        $booking->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by' => Auth::user()->name ?? 'Administrator',
            'rejection_reason' => null,
        ]);

        if (class_exists(\App\Models\ActivityLog::class)) {
            \App\Models\ActivityLog::create([
                'booking_id' => $booking->id,
                'user_id' => Auth::id(),
                'action' => 'approved',
                'notes' => 'Booking was approved by ' .
                    (Auth::user()->name ?? 'Admin'),
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
     * Protect this route with administrator middleware/policies.
     */
    public function decline(Request $request, string $id)
    {
        $booking = Booking::findOrFail($id);

        if ($booking->status !== 'pending') {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Only pending bookings can be declined.',
            ]);
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $reason = $validated['reason'] ?? 'Declined by administrator';

        $booking->update([
            'status' => 'declined',
            'rejection_reason' => $reason,
        ]);

        if (class_exists(\App\Models\ActivityLog::class)) {
            \App\Models\ActivityLog::create([
                'booking_id' => $booking->id,
                'user_id' => Auth::id(),
                'action' => 'declined',
                'notes' => 'Booking was declined: ' . $reason,
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Booking declined successfully.',
        ]);
    }
}