<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserConcernEditHistory extends Model
{
    protected $table = 'user_concern_edit_histories';

    protected $fillable = [
        'user_concern_id',
        'previous_appeal_date',
        'updated_appeal_date',
        'previous_category',
        'updated_category',
        'previous_detailed_info',
        'updated_detailed_info',
        'edited_by',
    ];

    public function concern(): BelongsTo
    {
        return $this->belongsTo(
            UserConcern::class,
            'user_concern_id'
        );
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'edited_by'
        );
    }
}