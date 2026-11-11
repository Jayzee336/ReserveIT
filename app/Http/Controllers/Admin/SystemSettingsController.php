<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SystemSettingsController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Admin/SystemSettings', [
            'settings' => SystemSetting::current(),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'auto_approve_scope' => ['nullable', 'in:disabled,superadmin_only,everyone'],
            'auto_approve_bookings' => ['nullable', 'boolean'],
            'overtime_fee_per_hour' => ['nullable', 'numeric', 'min:0'],
            'cleanup_buffer_minutes' => ['nullable', 'integer', 'min:0', 'max:120'],
            'max_advance_days' => ['nullable', 'integer', 'min:1'],
            'require_consent_letter' => ['nullable', 'boolean'],
            'auto_purge_unapproved_days' => ['nullable', 'integer', 'min:0', 'max:30'],
            'pending_booking_expiry_hours' => ['required', 'integer', 'min:1', 'max:720'],
            'pending_booking_reminder_hours' => ['required', 'integer', 'min:0', 'max:168'],
            'opening_time' => ['sometimes', 'required', 'date_format:H:i'],
            'closing_time' => ['sometimes', 'required', 'date_format:H:i'],
            'early_check_in_minutes' => ['sometimes', 'required', 'integer', 'min:0', 'max:180'],
            'overtime_grace_minutes' => ['sometimes', 'required', 'integer', 'min:0', 'max:180'],
        ]);

        $current = SystemSetting::current();
        $openingTime = $data['opening_time'] ?? substr((string) $current->opening_time, 0, 5);
        $closingTime = $data['closing_time'] ?? substr((string) $current->closing_time, 0, 5);

        if ($openingTime === $closingTime) {
            return back()->withErrors(['closing_time' => 'Opening and closing times cannot be identical.']);
        }

        $expiryHours = (int) ($data['pending_booking_expiry_hours'] ?? $current->pending_booking_expiry_hours ?? 72);
        $reminderHours = (int) ($data['pending_booking_reminder_hours'] ?? $current->pending_booking_reminder_hours ?? 24);

        if ($reminderHours >= $expiryHours && $reminderHours !== 0) {
            return back()->withErrors([
                'pending_booking_reminder_hours' => 'The reminder must be scheduled before the expiration time.',
            ]);
        }

        SystemSetting::current()->update($data);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Booking settings saved.',
        ]);
    }
}