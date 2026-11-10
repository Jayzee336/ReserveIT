<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacilityOperatingHourHistory extends Model
{
    protected $fillable = [
        'facility_id',
        'day_of_week',
        'old_is_closed',
        'old_opens_at',
        'old_closes_at',
        'new_is_closed',
        'new_opens_at',
        'new_closes_at',
        'changed_by',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'old_is_closed' => 'boolean',
        'new_is_closed' => 'boolean',
    ];
}
