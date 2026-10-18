<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UserConcern extends Model
{
    protected $fillable = [
        'user_id',
        'message',
        'appeal_date',
        'category',
        'detailed_info',
        'status',
        'admin_reply',
    ];

    /**
     * The user who submitted the concern.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * History of edits to Super Admin replies.
     */
    public function replyHistories(): HasMany
    {
        return $this->hasMany(
            UserConcernReplyHistory::class,
            'user_concern_id'
        )->latest();
    }

    /**
     * History of edits to the submitted ticket itself.
     */
    public function editHistories(): HasMany
    {
        return $this->hasMany(
            UserConcernEditHistory::class,
            'user_concern_id'
        )->latest();
    }
}