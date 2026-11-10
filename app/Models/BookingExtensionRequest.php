<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingExtensionRequest extends Model
{
    protected $fillable = [
        'booking_id',
        'requested_by',
        'original_end_time',
        'requested_end_time',
        'requested_minutes',
        'reason',
        'status',
        'reviewed_by',
        'reviewed_at',
        'decision_reason',
    ];

    protected $casts = [
        'requested_minutes' => 'integer',
        'reviewed_at' => 'datetime',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
