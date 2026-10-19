<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FacilityManagementController extends Controller
{
    private const PLACEHOLDER_IMAGE = '/images/facility-placeholder.svg';

    /**
     * List facilities managed by the authenticated user.
     * Super admins can see every facility.
     */
    public function managed(): Response
    {
        $user = Auth::user();

        abort_unless($user !== null, 401);

        $query = Facility::with('facilityAdmins:id,name,email')
            ->orderBy('name');

        if ($user->role !== 'super_admin') {
            abort_unless($user->role === 'facility_admin', 403);

            $query->forUser($user);
        }

        return Inertia::render('Facilitator/ManagedFacilities', [
            'facilities' => $query->get(),
        ]);
    }

    /**
     * List facilities and administrator assignment data.
     */
    public function index(): Response
    {
        $user = Auth::user();

        abort_unless($user !== null, 401);

        $query = Facility::with('facilityAdmins:id,name,email')
            ->orderBy('name');

        if ($user->role === 'facility_admin') {
            $query->forUser($user);
        } else {
            abort_unless($user->role === 'super_admin', 403);
        }

        $facilities = $query->get();

        return Inertia::render('Admin/Facilities', [
            'facilities' => $facilities,

            'facilityAdmins' => $user->role === 'super_admin'
                ? User::where('role', 'facility_admin')
                    ->where('is_active', true)
                    ->select('id', 'name', 'email')
                    ->orderBy('name')
                    ->get()
                : [],

            'auth' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'managed_facility_ids' => $user->role === 'facility_admin'
                        && method_exists($user, 'managedFacilities')
                            ? $user->managedFacilities()
                                ->pluck('facilities.id')
                                ->toArray()
                            : [],
                ],
            ],
        ]);
    }

    /**
     * Create a facility. Super admin only.
     */
    public function store(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        $validated = $this->validateFacility($request, true);

        $assignedAdminIds = $validated['assigned_admin_ids'] ?? [];

        unset($validated['assigned_admin_ids']);

        $uploadedPath = null;

        try {
            if ($request->hasFile('image')) {
                $uploadedPath = $this->storeFacilityImage(
                    $request->file('image')
                );

                $validated['imageUrl'] = $this->publicStorageUrl($uploadedPath);
            } elseif (blank($validated['imageUrl'] ?? null)) {
                $validated['imageUrl'] = self::PLACEHOLDER_IMAGE;
            }

            unset($validated['image']);

            DB::transaction(function () use (
                &$validated,
                $assignedAdminIds
            ) {
                $baseId = Str::slug($validated['name']);

                if ($baseId === '') {
                    $baseId = 'facility';
                }

                // Keep facility IDs unique even if facilities share a name.
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

                $this->syncFacilityAdmins($facility, $assignedAdminIds);
            });
        } catch (\Throwable $e) {
            if ($uploadedPath !== null) {
                Storage::disk('public')->delete($uploadedPath);
            }

            throw $e;
        }

        return redirect()
            ->back()
            ->with('success', 'Facility created.');
    }

    /**
     * Update an existing facility.
     *
     * Super admins can update any facility and its assignments.
     * Facility admins can update only facilities assigned to them.
     */
    public function update(Request $request, Facility $facility)
    {
        $user = $request->user();

        abort_unless($user !== null, 401);

        $isSuperAdmin = $user->role === 'super_admin';

        $isAssignedFacilityAdmin = $user->role === 'facility_admin'
            && $facility->facilityAdmins()
                ->where('users.id', $user->id)
                ->exists();

        abort_unless(
            $isSuperAdmin || $isAssignedFacilityAdmin,
            403,
            'You do not have permission to edit this facility.'
        );

        // Only super admins may submit administrator assignments.
        $validated = $this->validateFacility($request, $isSuperAdmin);

        $assignedAdminIds = $validated['assigned_admin_ids'] ?? [];

        unset($validated['assigned_admin_ids']);

        $uploadedPath = null;
        $oldImagePath = $this->getManagedImagePath($facility->imageUrl);

        try {
            if ($request->hasFile('image')) {
                $uploadedPath = $this->storeFacilityImage(
                    $request->file('image')
                );

                $validated['imageUrl'] = $this->publicStorageUrl($uploadedPath);
            } elseif (blank($validated['imageUrl'] ?? null)) {
                // Preserve the current image if no replacement was uploaded.
                $validated['imageUrl'] = $facility->imageUrl
                    ?: self::PLACEHOLDER_IMAGE;
            }

            unset($validated['image']);

            DB::transaction(function () use (
                $facility,
                $validated,
                $assignedAdminIds,
                $isSuperAdmin
            ) {
                $lockedFacility = Facility::whereKey($facility->getKey())
                    ->lockForUpdate()
                    ->firstOrFail();

                $lockedFacility->update($validated);

                if ($isSuperAdmin) {
                    $this->syncFacilityAdmins(
                        $lockedFacility,
                        $assignedAdminIds
                    );
                }
            });
        } catch (\Throwable $e) {
            if ($uploadedPath !== null) {
                Storage::disk('public')->delete($uploadedPath);
            }

            throw $e;
        }

        // Remove an old managed upload only after the database update succeeds.
        if (
            $uploadedPath !== null
            && $oldImagePath !== null
            && $oldImagePath !== $uploadedPath
        ) {
            Storage::disk('public')->delete($oldImagePath);
        }

        return redirect()
            ->back()
            ->with('success', 'Facility updated.');
    }

    /**
     * Delete a facility. Super admin only.
     */
    public function destroy(Request $request, Facility $facility)
    {
        $this->authorizeSuperAdmin($request);

        $imagePath = $this->getManagedImagePath($facility->imageUrl);

        DB::transaction(function () use ($facility) {
            $lockedFacility = Facility::whereKey($facility->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $lockedFacility->facilityAdmins()->detach();

            $lockedFacility->delete();
        });

        if ($imagePath !== null) {
            Storage::disk('public')->delete($imagePath);
        }

        return redirect()
            ->back()
            ->with('success', 'Facility deleted.');
    }

    /**
     * Ensure that only a super admin can perform global facility actions.
     */
    private function authorizeSuperAdmin(Request $request): void
    {
        $user = $request->user();

        abort_unless(
            $user !== null && $user->role === 'super_admin',
            403,
            'Unauthorized action.'
        );
    }

    /**
     * Build a public URL for a path stored on Laravel's public disk.
     */
    private function publicStorageUrl(string $path): string
    {
        return url('/storage/' . ltrim($path, '/'));
    }

    /**
     * Store an image using a random server-generated filename.
     */
    private function storeFacilityImage(UploadedFile $file): string
    {
        $extension = strtolower($file->extension() ?: '');

        // Validation restricts this to the supported image formats.
        abort_unless(
            in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true),
            422,
            'Unsupported image format.'
        );

        $path = $file->storeAs(
            'facilities',
            bin2hex(random_bytes(24)) . '.' . $extension,
            'public'
        );

        if (!is_string($path) || $path === '') {
            abort(500, 'The facility image could not be stored.');
        }

        return $path;
    }

    /**
     * Return a managed public-disk image path only for files stored
     * in the facilities directory. External URLs and arbitrary paths
     * are never deleted.
     */
    private function getManagedImagePath(?string $imageUrl): ?string
    {
        if (blank($imageUrl)) {
            return null;
        }

        $path = parse_url($imageUrl, PHP_URL_PATH);

        if (!is_string($path) || $path === '') {
            return null;
        }

        $prefixPath = '/storage/facilities/';

        if (!str_starts_with($path, $prefixPath)) {
            return null;
        }

        $relativePath = substr($path, strlen($prefixPath));

        if (
            $relativePath === ''
            || str_contains($relativePath, '..')
            || str_contains($relativePath, '/')
            || str_contains($relativePath, '\\')
        ) {
            return null;
        }

        return 'facilities/' . $relativePath;
    }

    /**
     * Validate and synchronize facility administrators.
     */
    private function syncFacilityAdmins(
        Facility $facility,
        array $adminIds
    ): void {
        if ($adminIds === []) {
            $facility->facilityAdmins()->sync([]);

            return;
        }

        $admins = User::query()
            ->whereIn('id', $adminIds)
            ->where('role', 'facility_admin')
            ->where('is_active', true)
            ->pluck('id')
            ->map(fn ($id) => (string) $id)
            ->all();

        $requestedIds = array_map(
            fn ($id) => (string) $id,
            $adminIds
        );

        sort($admins);
        sort($requestedIds);

        // Fail closed if an administrator was deactivated or changed role
        // after validation but before assignment.
        if ($admins !== $requestedIds) {
            abort(
                422,
                'Every assigned user must be an active facility administrator.'
            );
        }

        $facility->facilityAdmins()->sync($adminIds);
    }

    /**
     * Shared facility validation rules.
     */
    private function validateFacility(
        Request $request,
        bool $allowAdminAssignments
    ): array {
        $rules = [
            'name' => ['required', 'string', 'max:255'],

            'type' => [
                'required',
                Rule::in(['Venue', 'Laboratory']),
            ],

            'capacity' => ['required', 'integer', 'min:1'],

            'description' => ['required', 'string', 'max:10000'],

            'image' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],

            'imageUrl' => [
                'nullable',
                'string',
                'max:2048',
                function (
                    string $attribute,
                    mixed $value,
                    \Closure $fail
                ): void {
                    if ($value === null || trim($value) === '') {
                        return;
                    }

                    $value = trim($value);

                    // Allow the application's built-in placeholder.
                    if ($value === self::PLACEHOLDER_IMAGE) {
                        return;
                    }

                    // Allow relative paths only inside the facility image directory.
                    if (str_starts_with($value, '/')) {
                        if (
                            preg_match(
                                '#^/storage/facilities/[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp)$#i',
                                $value
                            ) === 1
                            && !str_contains($value, '..')
                        ) {
                            return;
                        }

                        $fail(
                            'The image URL must be a valid facility image path.'
                        );

                        return;
                    }

                    // Preserve external HTTP and HTTPS image URL support.
                    $scheme = parse_url($value, PHP_URL_SCHEME);

                    if (
                        filter_var($value, FILTER_VALIDATE_URL) === false
                        || !in_array(
                            strtolower((string) $scheme),
                            ['http', 'https'],
                            true
                        )
                    ) {
                        $fail(
                            'The image URL must be a valid HTTP or HTTPS URL.'
                        );
                    }
                },
            ],

            'requirement' => [
                'required',
                Rule::in(['STANDARD', 'CONSENT_REQUIRED']),
            ],

            'location' => ['required', 'string', 'max:255'],

            'requiresWeekendConsent' => ['required', 'boolean'],

            'allowTdevsManpower' => ['required', 'boolean'],
        ];

        if ($allowAdminAssignments) {
            $rules['assigned_admin_ids'] = [
                'sometimes',
                'array',
                'max:100',
            ];

            $rules['assigned_admin_ids.*'] = [
                'required',
                'integer',
                'distinct',
                Rule::exists('users', 'id')
                    ->where('role', 'facility_admin')
                    ->where('is_active', true),
            ];
        }

        return $request->validate($rules);
    }
}