<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BookingAttachmentController extends Controller
{
    public function download(Request $request, Booking $booking, string $type): StreamedResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        $isOwner = (string) $booking->user_id === (string) $user->getKey();
        $isSuperAdmin = $user->role === 'super_admin';
        $isAssignedFacilityAdmin = $user->role === 'facility_admin'
            && $booking->facility()
                ->whereHas('facilityAdmins', fn ($query) => $query->where('users.id', $user->getKey()))
                ->exists();

        abort_unless($isOwner || $isSuperAdmin || $isAssignedFacilityAdmin, 403);

        [$path, $name, $directory] = match ($type) {
            'activity-plan' => [
                $booking->activity_plan_file_path,
                $booking->activity_plan_file_name,
                'booking-activity-plans/',
            ],
            'sir-rene-signature' => [
                $booking->sir_rene_signature_path,
                $booking->sir_rene_signature_name,
                'booking-signatures/',
            ],
            default => abort(404),
        };

        abort_unless(
            is_string($path)
                && str_starts_with($path, $directory)
                && ! str_contains($path, '..')
                && Storage::disk('tigris')->exists($path),
            404
        );

        $downloadName = basename($name ?: ($type . '.pdf'));

        return Storage::disk('tigris')->download($path, $downloadName, [
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, max-age=0',
            'Referrer-Policy' => 'no-referrer',
        ]);
    }
}
