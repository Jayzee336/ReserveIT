<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacilityUnavailabilityPeriod extends Model
{
    protected $fillable = [
        'facility_id',
        'reason',
        'started_at',
        'ended_at',
        'started_by',
        'restored_by',
        'affected_user_ids',
        'scheduled_start_at',
        'scheduled_end_at',
    ];

    protected $hidden = [
        'affected_user_ids',
    ];

    protected $appends = [
        'affected_user_count',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'scheduled_start_at' => 'datetime',
        'scheduled_end_at' => 'datetime',
        'affected_user_ids' => 'array',
    ];

    public function facility()
    {
        return $this->belongsTo(Facility::class);
    }

    public function getAffectedUserCountAttribute(): int
    {
        return count($this->affected_user_ids ?? []);
    }

    public function isScheduled(): bool
    {
        return $this->scheduled_start_at !== null && $this->scheduled_end_at !== null;
    }

    public function isCurrentlyActive(): bool
    {
        if ($this->ended_at !== null) {
            return false;
        }

        if (! $this->isScheduled()) {
            return true;
        }

        $currentTime = now();

        return $currentTime->gte($this->scheduled_start_at)
            && $currentTime->lte($this->scheduled_end_at);
    }
}
