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
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'affected_user_ids' => 'array',
    ];

    public function facility()
    {
        return $this->belongsTo(Facility::class);
    }
}
