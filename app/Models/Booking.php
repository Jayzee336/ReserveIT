<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    use HasUuids;

    // Tell Laravel the primary key is a string (UUID), not an auto-incrementing number.
    protected $keyType = 'string';

    public $incrementing = false;

    // Fields that are allowed to be mass-assigned.
    protected $fillable = [
        'facility_id',
        'activity_plan_id',
        'user_id',
        'guest_name',
        'guest_email',
        'guest_phone',
        'date',
        'end_date',
        'booking_date',
        'start_time',
        'end_time',
        'status',
        'notes',
        'attendees',
        'needs_manpower',
        'consent_file_uploaded',
        'consent_file_name',
        'consent_file_path',
        'activity_plan_file_path',
        'activity_plan_file_name',
        'sir_rene_signature_path',
        'sir_rene_signature_name',
        'sister_signature_path',
        'sister_signature_name',
        'scheduled_fee_minutes',
        'scheduled_fee_amount',
        'scheduled_fee_rate',
        'scheduled_fee_payment_status',
        'approved_by',
        'approved_at',
        'decline_reason',
        'rejection_reason',
        'cancellation_reason',
        'checked_in_at',
        'checked_out_at',
        'overtime_notified_at',
        'pending_reminder_sent_at',
        'pending_expired_at',

        // Overtime billing and payment tracking.
        'overtime_minutes',
        'overtime_fee_amount',
        'overtime_fee_rate',
        'overtime_payment_status',
        'overtime_paid_at',
        'overtime_paid_by',
    ];

    // Automatically converts fields to their appropriate PHP types.
    protected $casts = [
        'date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'booking_date' => 'date:Y-m-d',
        'needs_manpower' => 'boolean',
        'consent_file_uploaded' => 'boolean',
        'approved_at' => 'datetime',
        'checked_in_at' => 'datetime',
        'checked_out_at' => 'datetime',
        'overtime_notified_at' => 'datetime',
        'pending_reminder_sent_at' => 'datetime',
        'pending_expired_at' => 'datetime',

        // Overtime billing fields.
        'overtime_minutes' => 'integer',
        'overtime_fee_amount' => 'decimal:2',
        'overtime_fee_rate' => 'decimal:2',
        'overtime_paid_at' => 'datetime',
        'scheduled_fee_minutes' => 'integer',
        'scheduled_fee_amount' => 'decimal:2',
        'scheduled_fee_rate' => 'decimal:2',
    ];

    // A booking belongs to one facility.
    public function facility()
    {
        return $this->belongsTo(Facility::class);
    }

    public function activityPlan()
    {
        return $this->belongsTo(ActivityPlan::class);
    }

    public function extensionRequests()
    {
        return $this->hasMany(BookingExtensionRequest::class, 'booking_id')->latest();
    }

    // A booking belongs to one user.
    public function user()
    {
        // Keep the original owner available when rendering historical bookings.
        // Soft-deleted accounts remain excluded from normal User queries.
        return $this->belongsTo(User::class)->withTrashed();
    }

    // Restrict facility administrators to bookings for their assigned facilities.
    // Super administrators can access all bookings.
    public function scopeForUser(Builder $query, User $user): Builder
    {
        if ($user->role === 'super_admin') {
            return $query;
        }

        return $query->whereHas('facility', function ($facilityQuery) use ($user) {
            $facilityQuery->forUser($user);
        });
    }
}