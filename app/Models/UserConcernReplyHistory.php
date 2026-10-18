<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserConcernReplyHistory extends Model
{
    protected $fillable = [
        'user_concern_id',
        'previous_reply',
        'updated_reply',
        'edited_by',
    ];

    public function concern(): BelongsTo
    {
        return $this->belongsTo(UserConcern::class, 'user_concern_id');
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'edited_by');
    }
}