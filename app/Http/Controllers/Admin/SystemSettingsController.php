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
            'max_booking_duration' => ['nullable', 'integer', 'min:1', 'max:24'],
            'require_consent_letter' => ['nullable', 'boolean'],
            'auto_purge_unapproved_days' => ['nullable', 'integer', 'min:0', 'max:30'],
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

        SystemSetting::current()->update($data);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Booking settings saved.',
        ]);
    }
}