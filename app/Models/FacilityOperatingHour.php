<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacilityOperatingHour extends Model
{
    protected $fillable = [
        'facility_id',
        'day_of_week',
        'is_closed',
        'opens_at',
        'closes_at',
        'updated_by',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'is_closed' => 'boolean',
    ];

    public function facility()
    {
        return $this->belongsTo(Facility::class);
    }
}
