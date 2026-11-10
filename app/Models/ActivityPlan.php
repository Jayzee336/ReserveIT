<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ActivityPlan extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'facility_id',
        'title',
        'description',
        'start_date',
        'end_date',
        'recurrence_days',
        'weekday_times',
        'status',
        'decline_reason',
        'reviewed_by',
        'reviewed_at',
        'attachment_path',
        'attachment_name',
    ];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'recurrence_days' => 'array',
        'weekday_times' => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function facility()
    {
        return $this->belongsTo(Facility::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}
