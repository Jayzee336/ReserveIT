<?php

namespace App\Support;

use App\Models\Facility;
use App\Models\User;
use Carbon\Carbon;

class SpecialFacilityBookingPolicy
{
    private const GROUP_A = ['lobby', 'main auditorium', 'view deck'];
    private const GROUP_B = ['sky gym', 'quadrangle or field', 'field'];

    public static function appliesTo(?Facility $facility): bool
    {
        return in_array(self::facilityName($facility), [...self::GROUP_A, ...self::GROUP_B], true);
    }

    public static function requiresActivityPlan(?Facility $facility): bool
    {
        return self::appliesTo($facility);
    }

    public static function requiresSirReneSignature(?Facility $facility): bool
    {
        return in_array(self::facilityName($facility), self::GROUP_B, true);
    }

    public static function requiresSisterSignature(
        ?Facility $facility,
        ?User $user,
        string $startDate,
        string $endDate,
        string $startTime,
        string $endTime
    ): bool {
        if (! self::appliesTo($facility)) {
            return false;
        }

        $isOutsider = ! $user || $user->account_type === 'outsider';
        if ($isOutsider) {
            return true;
        }

        $startMinutes = self::minutes($startTime);
        $endMinutes = $endTime === '00:00' ? 1440 : self::minutes($endTime);
        $outsideRegularHours = $startMinutes < 480 || $endMinutes > 1020;

        $cursor = Carbon::createFromFormat('!Y-m-d', $startDate);
        $last = Carbon::createFromFormat('!Y-m-d', $endDate);

        while ($cursor->lte($last)) {
            if ($cursor->isSunday() || $outsideRegularHours) {
                return true;
            }
            $cursor->addDay();
        }

        return false;
    }

    /**
     * Calculate minutes outside Monday-Saturday 8:00 AM-5:00 PM.
     * Sunday is billable for the full booked interval.
     */
    public static function billableMinutes(
        string $startDate,
        string $endDate,
        string $startTime,
        string $endTime
    ): int {
        $startMinutes = self::minutes($startTime);
        $endMinutes = $endTime === '00:00' ? 1440 : self::minutes($endTime);
        if ($endMinutes <= $startMinutes) {
            return 0;
        }

        $total = 0;
        $cursor = Carbon::createFromFormat('!Y-m-d', $startDate);
        $last = Carbon::createFromFormat('!Y-m-d', $endDate);

        while ($cursor->lte($last)) {
            $dayMinutes = $endMinutes - $startMinutes;
            if ($cursor->isSunday()) {
                $total += $dayMinutes;
            } else {
                $early = max(0, min($endMinutes, 480) - $startMinutes);
                $late = max(0, $endMinutes - max($startMinutes, 1020));
                $total += $early + $late;
            }
            $cursor->addDay();
        }

        return $total;
    }

    public static function feeSnapshot(
        Facility $facility,
        string $startDate,
        string $endDate,
        string $startTime,
        string $endTime
    ): array {
        $minutes = self::billableMinutes($startDate, $endDate, $startTime, $endTime);
        $rate = (float) ($facility->overtime_fee_per_hour ?? 0);
        $enabled = (bool) ($facility->overtime_fee_enabled ?? false);
        $amount = $enabled && $minutes > 0
            ? round(($minutes / 60) * $rate, 2)
            : 0.00;

        return [
            'scheduled_fee_minutes' => $minutes,
            'scheduled_fee_rate' => $rate,
            'scheduled_fee_amount' => $amount,
            'scheduled_fee_payment_status' => $amount > 0 ? 'unpaid' : 'not_required',
        ];
    }

    private static function facilityName(?Facility $facility): string
    {
        return mb_strtolower(trim((string) ($facility?->name ?? '')));
    }

    private static function minutes(string $time): int
    {
        [$hour, $minute] = array_map('intval', explode(':', substr($time, 0, 5)));
        return ($hour * 60) + $minute;
    }
}
