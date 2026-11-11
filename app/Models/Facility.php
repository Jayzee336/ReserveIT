<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Facility extends Model
{
    protected $guarded = [];
    protected $keyType = 'string';
    public $incrementing = false;

    protected $casts = [
        'requiresWeekendConsent' => 'boolean',
        'allowTdevsManpower' => 'boolean',
        'capacity' => 'integer',
        'booking_lead_time_days' => 'integer',
        'max_booking_hours' => 'integer',
        'overtime_fee_enabled' => 'boolean',
        'overtime_fee_per_hour' => 'decimal:2',
        'is_available' => 'boolean',
    ];

    public function facilityAdmins()
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }

    public function admins()
    {
        return $this->facilityAdmins();
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    public function unavailabilityPeriods()
    {
        return $this->hasMany(FacilityUnavailabilityPeriod::class);
    }

    public function operatingHours()
    {
        return $this->hasMany(FacilityOperatingHour::class)->orderBy('day_of_week');
    }

    public function scopeForUser(Builder $query, User $user): Builder
    {
        if ($user->role === 'super_admin') {
            return $query;
        }

        return $query->whereHas('facilityAdmins', function ($adminQuery) use ($user) {
            $adminQuery->where('users.id', $user->getKey());
        });
    }
}