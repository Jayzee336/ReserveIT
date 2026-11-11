<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $fillable = [
        'auto_approve_bookings',
        'auto_approve_scope',
        'overtime_fee_per_hour',
        'cleanup_buffer_minutes',
        'max_advance_days',
        'max_booking_duration',
        'require_consent_letter',
        'auto_purge_unapproved_days',
        'pending_booking_expiry_hours',
        'pending_booking_reminder_hours',
        'opening_time',
        'closing_time',
        'early_check_in_minutes',
        'overtime_grace_minutes',
    ];

    protected $casts = [
        'auto_approve_bookings' => 'boolean',
        'auto_approve_scope' => 'string',
        'overtime_fee_per_hour' => 'decimal:2',
        'cleanup_buffer_minutes' => 'integer',
        'max_advance_days' => 'integer',
        'max_booking_duration' => 'integer',
        'require_consent_letter' => 'boolean',
        'auto_purge_unapproved_days' => 'integer',
        'pending_booking_expiry_hours' => 'integer',
        'pending_booking_reminder_hours' => 'integer',
        'opening_time' => 'string',
        'closing_time' => 'string',
        'early_check_in_minutes' => 'integer',
        'overtime_grace_minutes' => 'integer',
    ];

    public static function current(): self
    {
        return static::firstOrCreate([], [
            'auto_approve_bookings' => false,
            'auto_approve_scope' => 'disabled',
            'overtime_fee_per_hour' => 0,
            'cleanup_buffer_minutes' => 30,
            'max_advance_days' => 30,
            'max_booking_duration' => 4,
            'require_consent_letter' => false,
            'auto_purge_unapproved_days' => 0,
            'pending_booking_expiry_hours' => 72,
            'pending_booking_reminder_hours' => 24,
            'opening_time' => '08:00',
            'closing_time' => '00:00',
            'early_check_in_minutes' => 15,
            'overtime_grace_minutes' => 0,
        ]);
    }
}