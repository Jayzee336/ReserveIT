<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes;

    public function managedFacilities()
    {
        return $this->belongsToMany(Facility::class)->withTimestamps();
    }

    public function managesFacility($facilityId): bool
    {
        if ($this->role === 'super_admin') {
            return true;
        }

        return $this->managedFacilities()->whereKey($facilityId)->exists();
    }

    public function concerns()
    {
        return $this->hasMany(UserConcern::class);
    }

    protected $appends = ['account_type', 'account_type_label'];

    public function getAccountTypeAttribute(): string
    {
        return str_ends_with(strtolower(trim((string) $this->email)), '@uic.edu.ph')
            ? 'uic_member'
            : 'outsider';
    }

    public function getAccountTypeLabelAttribute(): string
    {
        if ($this->account_type !== 'uic_member') {
            return 'Outsider';
        }

        return match ($this->uic_member_type) {
            'student' => 'UIC Student',
            'teacher' => 'UIC Teacher',
            default => 'UIC Member — classification needed',
        };
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'google_id',
        'avatar',
        'name',
        'username',
        'email',
        'uic_member_type',
        'password',
        'role',
        'must_change_password',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
