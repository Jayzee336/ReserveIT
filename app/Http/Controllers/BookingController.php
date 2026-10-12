<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\SystemSetting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class BookingController extends Controller
{
    /**
     * "My Bookings" — lists the authenticated user's own bookings, split into
     * upcoming (pending/approved, not yet passed) and history (everything
     * else: declined, cancelled, or past).
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $status = $request->input('status');
        $openBookingId = $request->input('booking');

        $query = Booking::with('facility')->where('user_id', Auth::id());

        if ($status) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->whereHas('facility', fn ($f) => $f->where('name', 'like', "%{$search}%"));
        }

        $bookings = $query->orderByDesc('date')->get();

        $today = Carbon::today();

        $upcomingBookings = $bookings
            ->filter(fn ($b) => in_array($b->status, ['pending', 'approved']) && Carbon::parse($b->date)->gte($today))
            ->values();

        $historyBookings = $bookings
            ->reject(fn ($b) => $upcomingBookings->contains('id', $b->id))
            ->values();

        $openBooking = null;
        if ($openBookingId) {
            $openBooking = Booking::with('facility')
                ->where('user_id', Auth::id())
                ->find($openBookingId);
        }

        $activityLogs = [];
        if (class_exists('\App\Models\ActivityLog')) {
            $activityLogs = \App\Models\ActivityLog::whereIn('booking_id', $bookings->pluck('id'))
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
     * Display a receipt for an approved booking owned by the authenticated user.
     */
    public function receipt(string $id)
    {
        $booking = Booking::with('facility')
            ->where('user_id', Auth::id())
            ->findOrFail($id);

        abort_unless($booking->status === 'approved', 403, 'Receipts are available only for approved bookings.');

        return Inertia::render('Receipt', [
            'booking' => $booking,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $booking = Booking::where('user_id', Auth::id())->findOrFail($id);

        if ($booking->status !== 'pending') {
            return redirect()->back()->withErrors(['status' => 'Only pending bookings can be edited.']);
        }

        $validated = $request->validate([
            'date'           => 'required|date|after_or_equal:today',
            'start_time'     => 'required|date_format:H:i',
            'end_time'       => 'required|date_format:H:i|after:start_time',
            'attendees'      => 'required|integer|min:1',
            'needs_manpower' => 'required|boolean',
            'notes'          => 'nullable|string|max:10000',
        ]);

        $settings = SystemSetting::current();
        $bookingDate = Carbon::parse($validated['date']);
        $maxDays = $settings->max_advance_days ?? 30;
        if ($bookingDate->gt(now()->addDays($maxDays))) {
            return back()->withErrors(['date' => "You can only book facilities up to {$maxDays} days in advance."])->withInput();
        }

        $buffer = $settings->cleanup_buffer_minutes ?? 30;
        $start = Carbon::createFromFormat('H:i', $validated['start_time']);
        $end = Carbon::createFromFormat('H:i', $validated['end_time']);
        $conflictingBookings = Booking::where('facility_id', $booking->facility_id)
            ->whereDate('date', $validated['date'])
            ->whereIn('status', ['pending', 'approved'])
            ->where('id', '!=', $booking->id)
            ->get(['start_time', 'end_time']);

        foreach ($conflictingBookings as $existing) {
            $existingStart = Carbon::parse($existing->start_time)->subMinutes($buffer);
            $existingEnd = Carbon::parse($existing->end_time)->addMinutes($buffer);
            if ($start->lt($existingEnd) && $end->gt($existingStart)) {
                return back()->withErrors(['start_time' => "This room requires a {$buffer}-minute cleanup buffer from neighboring bookings."])->withInput();
            }
        }

        $validated['booking_date'] = $validated['date'];
        $booking->update($validated);

        return redirect()->back()->with('success', 'Booking updated successfully.');
    }

    public function cancel(string $id)
    {
        $booking = Booking::where('id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        if (! in_array($booking->status, ['pending', 'approved'])) {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => 'This booking can no longer be cancelled.',
            ]);
        }

        $booking->update([
            'status' => 'cancelled',
        ]);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Booking cancelled.',
        ]);
    }

    public function store(Request $request)
    {
        $settings = SystemSetting::current();

        $consentRule = ($settings->require_consent_letter ?? false)
            ? 'required|file|mimes:pdf,doc,docx|max:5120'
            : 'nullable|file|mimes:pdf,doc,docx|max:5120';

        $validated = $request->validate([
            'facility_id'    => 'required|string|exists:facilities,id',
            'date'           => 'required|date',
            'start_time'     => 'required|string',
            'end_time'       => 'required|string',
            'notes'          => 'nullable|string',
            'attendees'      => 'nullable|integer|min:1',
            'guest_name'     => 'nullable|string',
            'guest_email'    => 'nullable|email',
            'guest_phone'    => 'nullable|string',
            'needs_manpower' => 'nullable|boolean',
            'consent_letter' => $consentRule,
        ]);

        $start = Carbon::parse($validated['start_time']);
        $end = Carbon::parse($validated['end_time']);
        $bookingDate = Carbon::parse($validated['date']);

        if ($end->lessThanOrEqualTo($start)) {
            return back()->withErrors(['end_time' => 'End time must be after start time.'])->withInput();
        }

        $maxDays = $settings->max_advance_days ?? 30;
        if ($bookingDate->gt(now()->addDays($maxDays))) {
            return back()->withErrors(['date' => "You can only book facilities up to {$maxDays} days in advance."])->withInput();
        }

        $buffer = $settings->cleanup_buffer_minutes ?? 30;
        
        $existingBookings = Booking::where('facility_id', $validated['facility_id'])
            ->whereDate('booking_date', $validated['date'])
            ->whereIn('status', ['pending', 'approved'])
            ->get(['start_time', 'end_time']);

        foreach ($existingBookings as $existing) {
            $existingStartWithBuffer = Carbon::parse($existing->start_time)->subMinutes($buffer);
            $existingEndWithBuffer = Carbon::parse($existing->end_time)->addMinutes($buffer);

            if ($start->lt($existingEndWithBuffer) && $end->gt($existingStartWithBuffer)) {
                return back()->withErrors(['start_time' => "This room requires a {$buffer}-minute cleanup buffer from neighboring bookings."])->withInput();
            }
        }

        $isSuperAdmin = Auth::check() && Auth::user()->role === 'super_admin';
        $approvalScope = $settings->auto_approve_scope ?? 'disabled';

        $autoApprove = false;
        if ($approvalScope === 'everyone') {
            $autoApprove = true;
        } elseif ($approvalScope === 'superadmin_only' && $isSuperAdmin) {
            $autoApprove = true;
        }

        $path = null;
        $originalName = null;

        if ($request->hasFile('consent_letter')) {
            $path = $request->file('consent_letter')->store('consent-letters', 'local');
            $originalName = $request->file('consent_letter')->getClientOriginalName();
        }

        $booking = Booking::create([
            'facility_id'           => $validated['facility_id'],
            'user_id'               => Auth::id(), 
            'guest_name'            => $validated['guest_name'] ?? null,
            'guest_email'           => $validated['guest_email'] ?? null,
            'guest_phone'           => $validated['guest_phone'] ?? null,
            'date'                  => $validated['date'],
            'booking_date'          => $validated['date'],
            'start_time'            => $start->format('H:i'),
            'end_time'              => $end->format('H:i'),
            'notes'                 => $validated['notes'] ?? null,
            'attendees'             => $validated['attendees'] ?? 1,
            'needs_manpower'        => $validated['needs_manpower'] ?? false,
            'consent_file_uploaded' => $path !== null,
            'consent_file_name'     => $originalName,
            'consent_file_path'     => $path,
            'status'                => $autoApprove ? 'approved' : 'pending',
            'approved_at'           => $autoApprove ? now() : null,
            'approved_by'           => $autoApprove ? ($isSuperAdmin ? 'Superadmin Instant Pass' : 'System Auto-Approval Policies') : null,
        ]);

        try {
            if (class_exists('\App\Events\BookingCreatedEvent')) {
                broadcast(new \App\Events\BookingCreatedEvent($booking))->toOthers();
            }
        } catch (\Exception $e) {
            Log::warning("WebSocket Broadcast failed: " . $e->getMessage());
        }

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Booking submitted successfully.',
        ]);
    }

    /**
     * Approve a pending booking reservation.
     */
    public function approve(Request $request, string $id)
    {
        $booking = Booking::findOrFail($id);

        $booking->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by' => Auth::user()->name ?? 'Administrator',
            'rejection_reason' => null,
        ]);

        if (class_exists('\App\Models\ActivityLog')) {
            \App\Models\ActivityLog::create([
                'booking_id' => $booking->id,
                'user_id' => Auth::id(),
                'action' => 'approved',
                'notes' => 'Booking was approved by ' . (Auth::user()->name ?? 'Admin'),
            ]);
        }

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Booking approved successfully.',
        ]);
    }

    /**
     * Decline a pending booking reservation.
     */
    public function decline(Request $request, string $id)
    {
        $booking = Booking::findOrFail($id);

        $booking->update([
            'status' => 'declined',
            'rejection_reason' => $request->input('reason', 'Declined by administrator'),
        ]);

        if (class_exists('\App\Models\ActivityLog')) {
            \App\Models\ActivityLog::create([
                'booking_id' => $booking->id,
                'user_id' => Auth::id(),
                'action' => 'declined',
                'notes' => 'Booking was declined: ' . $request->input('reason', 'No reason specified'),
            ]);
        }

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Booking declined successfully.',
        ]);
    }
}