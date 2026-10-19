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
        ]);
    }
}