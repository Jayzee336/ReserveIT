<?php

namespace App\Policies;

use App\Models\Booking;
use App\Models\User;

class BookingPolicy
{
    public function view(User $user, Booking $booking): bool
    {
        return $user->role === 'super_admin'
            || (string) $booking->user_id === (string) $user->getKey()
            || $this->canManageBooking($user, $booking);
    }

    public function approve(User $user, Booking $booking): bool
    {
        return $this->canManageBooking($user, $booking);
    }

    public function decline(User $user, Booking $booking): bool
    {
        return $this->canManageBooking($user, $booking);
    }

    public function delete(User $user, Booking $booking): bool
    {
        return $this->canManageBooking($user, $booking);
    }

    private function canManageBooking(User $user, Booking $booking): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }

        if ($user->role !== 'facility_admin') {
            return false;
        }

        return $booking->facility()->whereHas('facilityAdmins', function ($query) use ($user) {
            $query->where('users.id', $user->getKey());
        })->exists();
    }
}
