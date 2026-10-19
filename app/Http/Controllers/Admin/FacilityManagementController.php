<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FacilityManagementController extends Controller
{
    /**
     * List facilities the authenticated facility_admin is assigned to manage.
     * Super admins can see all facilities here too.
     */
    public function managed(): Response
    {
        $user = Auth::user();

        $query = Facility::with('facilityAdmins:id,name,email')
            ->orderBy('name');

        if ($user->role !== 'super_admin') {
            $query->forUser($user);
        }

        return Inertia::render('Facilitator/ManagedFacilities', [
            'facilities' => $query->get(),
        ]);
    }

    /**
     * List facilities according to user role permissions.
     */
    public function index(): Response
    {
        $user = Auth::user();

        $facilities = Facility::with('facilityAdmins:id,name,email')
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Facilities', [
            'facilities' => $facilities,

            'facilityAdmins' => $user->role === 'super_admin'
                ? User::where('role', 'facility_admin')
                    ->select('id', 'name', 'email')
                    ->orderBy('name')
                    ->get()
                : [],

            'auth' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'managed_facility_ids' => (
                        $user->role === 'facility_admin'
                        && method_exists($user, 'managedFacilities')
                    )
                        ? $user->managedFacilities()
                            ->pluck('facilities.id')
                            ->toArray()
                        : [],
                ],
            ],
        ]);
    }

    /**
     * Store a newly created facility (Super Admin only).
     */
    public function store(Request $request)
    {
        if ($request->user()->role !== 'super_admin') {
            abort(403, 'Unauthorized action.');
        }

        $validated = $this->validateFacility($request);

        $assignedAdminIds = $validated['assigned_admin_ids'] ?? [];

        unset($validated['assigned_admin_ids']);

        if ($request->hasFile('image')) {
            $file = $request->file('image');

            $fileName = Str::slug(
                pathinfo(
                    $file->getClientOriginalName(),
                    PATHINFO_FILENAME
                )
            ) . '-' . time() . '.' . $file->extension();

            $path = $file->storePubliclyAs(
                'facilities',
                $fileName,
                'public'
            );

            $validated['imageUrl'] = Storage::url($path);
        } elseif (blank($validated['imageUrl'] ?? null)) {
            // Use the existing placeholder if no image was supplied.
            $validated['imageUrl'] = '/images/facility-placeholder.svg';
        }

        unset($validated['image']);

        $baseId = Str::slug($validated['name']);
        $id = $baseId;
        $suffix = 1;

        while (Facility::where('id', $id)->exists()) {
            $id = "{$baseId}-{$suffix}";
            $suffix++;
        }

        $facility = Facility::create([
            ...$validated,
            'id' => $id,
        ]);

        $facility->facilityAdmins()->sync($assignedAdminIds);

        return redirect()
            ->back()
            ->with('success', 'Facility created.');
    }

    /**
     * Update an existing facility.
     * Super Admins can edit any facility.
     * Facility Admins can edit only facilities assigned to them.
     */
    public function update(Request $request, Facility $facility)
    {
        $user = $request->user();

        $isSuperAdmin = $user->role === 'super_admin';

        $isManagedFacilityAdmin = (
            $user->role === 'facility_admin'
            && $facility->facilityAdmins()
                ->where('users.id', $user->id)
                ->exists()
        );

        if (!$isSuperAdmin && !$isManagedFacilityAdmin) {
            abort(
                403,
                'You do not have permission to edit this facility.'
            );
        }

        $validated = $this->validateFacility($request);

        // Only Super Admins can reassign facility administrators.
        if ($isSuperAdmin) {
            $assignedAdminIds = $validated['assigned_admin_ids'] ?? [];

            $facility->facilityAdmins()->sync($assignedAdminIds);
        }

        unset($validated['assigned_admin_ids']);

        if ($request->hasFile('image')) {
            $file = $request->file('image');

            $fileName = Str::slug(
                pathinfo(
                    $file->getClientOriginalName(),
                    PATHINFO_FILENAME
                )
            ) . '-' . time() . '.' . $file->extension();

            $path = $file->storePubliclyAs(
                'facilities',
                $fileName,
                'public'
            );

            $validated['imageUrl'] = Storage::url($path);
        } elseif (blank($validated['imageUrl'] ?? null)) {
            // Preserve the current image if no replacement was provided.
            $validated['imageUrl'] = $facility->imageUrl
                ?: '/images/facility-placeholder.svg';
        }

        unset($validated['image']);

        $facility->update($validated);

        return redirect()
            ->back()
            ->with('success', 'Facility updated.');
    }

    /**
     * Delete a facility (Super Admin only).
     */
    public function destroy(Request $request, Facility $facility)
    {
        if ($request->user()->role !== 'super_admin') {
            abort(403, 'Unauthorized action.');
        }

        $facility->delete();

        return redirect()
            ->back()
            ->with('success', 'Facility deleted.');
    }

    /**
     * Shared validation rules for store and update.
     */
    private function validateFacility(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',

            'type' => [
                'required',
                Rule::in(['Venue', 'Laboratory']),
            ],

            // Capacity is now mandatory.
            'capacity' => 'required|integer|min:1',

            'description' => 'required|string',

            // Image is optional because the controller supplies a placeholder.
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',

            // Accept full URLs or local paths.
            'imageUrl' => 'nullable|string|max:2048',

            'requirement' => [
                'required',
                Rule::in(['STANDARD', 'CONSENT_REQUIRED']),
            ],

            'location' => 'required|string|max:255',

            // Require each boolean to be explicitly submitted as true or false.
            'requiresWeekendConsent' => 'required|boolean',
            'allowTdevsManpower' => 'required|boolean',

            // Admin assignment remains optional.
            'assigned_admin_ids' => 'sometimes|array',
            'assigned_admin_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('users', 'id')
                    ->where('role', 'facility_admin'),
            ],
        ]);
    }
}