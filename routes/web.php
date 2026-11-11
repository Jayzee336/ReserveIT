<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\BookingAttachmentController;
use App\Http\Controllers\ActivityPlanController;
use App\Http\Controllers\BookingExtensionController;
use App\Http\Controllers\FacilityAvailabilityController;
use App\Http\Controllers\FacilityBookingSettingsController;
use App\Http\Controllers\DeveloperContactController;
use App\Http\Controllers\UserConcernController;
use App\Http\Controllers\NotificationController;

use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\Admin\FacilityManagementController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\ConcernManagementController;
use App\Http\Controllers\Admin\SystemSettingsController;

use App\Http\Controllers\BookingCheckInOutController;
use App\Http\Controllers\Facilitator\BookingApprovalController;
use App\Http\Controllers\Facilitator\FacilitatorDashboardController;

use App\Http\Controllers\Auth\ForcePasswordChangeController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\Auth\SetPasswordController;

use App\Models\Facility;
use App\Models\Booking;
use App\Support\BookingDashboardAnalytics;
use Carbon\Carbon;

use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Validation\Rule;

// 1. Welcome Page
Route::get('/', function () {
    $dbFacilities = Facility::latest()
        ->take(6)
        ->get();

    // Only approved bookings are displayed publicly.
    $dbSchedules = Booking::with(['facility:id,name'])
        ->whereRaw('COALESCE(date, booking_date) <= ?', [today()->toDateString()])
        ->whereRaw('COALESCE(end_date, date, booking_date) >= ?', [today()->toDateString()])
        ->where('status', 'approved')
        ->orderBy('start_time', 'asc')
        ->take(8)
        ->get([
            'id',
            'facility_id',
            'date',
            'booking_date',
            'end_date',
            'start_time',
            'end_time',
            'status',
        ]);

    return Inertia::render('Welcome', [
        'canLogin'       => Route::has('login'),
        'canRegister'    => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion'     => PHP_VERSION,
        'dbFacilities'   => $dbFacilities,
        'dbSchedules'    => $dbSchedules,
    ]);
});

// 2. Authenticated Dashboard & Application Space
Route::middleware(['auth', 'verified'])->group(function () {

    // Force Password Change
    Route::get('/force-password-change', [ForcePasswordChangeController::class, 'edit'])
        ->name('password.force.edit');

    Route::put('/force-password-change', [ForcePasswordChangeController::class, 'update'])
        ->name('password.force.update');

    // Set a ReserveIT password for Google SSO users.
    Route::get('/set-password', [SetPasswordController::class, 'edit'])
        ->name('password.set.edit');

    Route::put('/set-password', [SetPasswordController::class, 'update'])
        ->name('password.set.update');

    // Protected Super Admin Test Page
    Route::get('/admin-test', function () {
        return 'You are a super admin! This page is protected.';
    })->middleware('role:super_admin')->name('admin.test');

    // Central dashboard redirect
    Route::get('/dashboard', function () {
        return match (Auth::user()->role) {
            'super_admin'    => redirect()->route('admin.dashboard'),
            'facility_admin' => redirect()->route('facilitator.dashboard'),
            default          => redirect()->route('user.dashboard'),
        };
    })->name('dashboard');

    // Admin Dashboard
    Route::get('/admin/dashboard', [AdminDashboardController::class, 'index'])
        ->middleware('role:super_admin,facility_admin')
        ->name('admin.dashboard');

    // Admin Bookings Management
    Route::get('/admin/bookings', [BookingApprovalController::class, 'index'])
        ->middleware('role:super_admin,facility_admin')
        ->name('admin.bookings.index');

    // Policy-protected Booking Approval / Decline
    Route::match(['patch', 'post'], '/admin/bookings/{booking}/approve', [BookingApprovalController::class, 'approve'])
        ->middleware('role:super_admin,facility_admin')
        ->name('admin.bookings.approve');

    Route::match(['patch', 'post'], '/admin/bookings/{booking}/decline', [BookingApprovalController::class, 'decline'])
        ->middleware('role:super_admin,facility_admin')
        ->name('admin.bookings.decline');

    // Facilitator Bookings
    Route::get('/facilitator/bookings', [BookingApprovalController::class, 'index'])
        ->middleware('role:facility_admin,super_admin')
        ->name('facilitator.bookings.index');

    Route::match(['patch', 'post'], '/facilitator/bookings/{booking}/approve', [BookingApprovalController::class, 'approve'])
        ->middleware('role:facility_admin,super_admin')
        ->name('facilitator.bookings.approve');

    Route::match(['patch', 'post'], '/facilitator/bookings/{booking}/decline', [BookingApprovalController::class, 'decline'])
        ->middleware('role:facility_admin,super_admin')
        ->name('facilitator.bookings.decline');

    Route::delete('/facilitator/bookings/past-unapproved/delete-all', [BookingApprovalController::class, 'destroyAll'])
        ->middleware('role:facility_admin,super_admin')
        ->name('facilitator.bookings.destroyAll');

    Route::delete('/facilitator/bookings/{booking}', [BookingApprovalController::class, 'destroy'])
        ->middleware('role:facility_admin,super_admin')
        ->name('facilitator.bookings.destroy');

    // Active Bookings Monitor Page
    Route::get('/admin/active-bookings-monitor', function () {
        return Inertia::render('Admin/ActiveBookings');
    })->middleware('role:super_admin,facility_admin')
        ->name('admin.active-bookings.page');

    // Super Admin Concerns
    Route::get('/admin/concerns', [ConcernManagementController::class, 'index'])
        ->middleware('role:super_admin')
        ->name('admin.concerns.index');

    Route::patch('/admin/concerns/{concern}/resolve', [ConcernManagementController::class, 'resolve'])
        ->middleware('role:super_admin')
        ->name('admin.concerns.resolve');

    // Super Admin Settings
    Route::get('/admin/settings', [SystemSettingsController::class, 'edit'])
        ->middleware('role:super_admin')
        ->name('admin.settings.edit');

    Route::patch('/admin/settings', [SystemSettingsController::class, 'update'])
        ->middleware('role:super_admin')
        ->name('admin.settings.update');

    // Super Admin — User Management
    Route::post('/admin/users', [UserManagementController::class, 'store'])
        ->middleware('role:super_admin')
        ->name('admin.users.store');

    Route::get('/admin/users', [UserManagementController::class, 'index'])
        ->middleware('role:super_admin')
        ->name('admin.users.index');

    Route::patch('/admin/users/{user}/role', [UserManagementController::class, 'updateRole'])
        ->middleware('role:super_admin')
        ->name('admin.users.updateRole');

    Route::post('/admin/users/{user}/regenerate-password', [UserManagementController::class, 'regeneratePassword'])
        ->middleware('role:super_admin')
        ->name('admin.users.regeneratePassword');

    Route::patch('/admin/users/{user}', [UserManagementController::class, 'update'])
        ->middleware('role:super_admin')
        ->name('admin.users.update');

    Route::patch('/admin/users/{user}/toggle-active', [UserManagementController::class, 'toggleActive'])
        ->middleware('role:super_admin')
        ->name('admin.users.toggleActive');

    Route::delete('/admin/users/{user}', [UserManagementController::class, 'destroy'])
        ->middleware('role:super_admin')
        ->name('admin.users.destroy');

    // Super Admin — Facility Management
    Route::get('/admin/facilities', [FacilityManagementController::class, 'index'])
        ->middleware('role:super_admin')
        ->name('admin.facilities.index');

    Route::post('/admin/facilities', [FacilityManagementController::class, 'store'])
        ->middleware('role:super_admin')
        ->name('admin.facilities.store');

    Route::patch('/admin/facilities/{facility}', [FacilityManagementController::class, 'update'])
        ->middleware('role:super_admin,facility_admin')
        ->name('admin.facilities.update');

    Route::patch('/admin/facilities/{facility}/availability', [FacilityAvailabilityController::class, 'update'])
        ->middleware('role:super_admin,facility_admin')
        ->name('admin.facilities.availability');

    Route::post('/admin/facilities/{facility}/scheduled-closures', [FacilityAvailabilityController::class, 'schedule'])
        ->middleware('role:super_admin,facility_admin')
        ->name('admin.facilities.scheduled-closures.store');

    Route::patch('/admin/facilities/{facility}/scheduled-closures/{period}/restore', [FacilityAvailabilityController::class, 'restoreScheduled'])
        ->middleware('role:super_admin,facility_admin')
        ->name('admin.facilities.scheduled-closures.restore');

    Route::get('/admin/facilities/{facility}/booking-settings', [FacilityBookingSettingsController::class, 'edit'])
        ->middleware('role:super_admin,facility_admin')
        ->name('admin.facilities.booking-settings');

    Route::put('/admin/facilities/{facility}/booking-settings', [FacilityBookingSettingsController::class, 'update'])
        ->middleware('role:super_admin,facility_admin')
        ->name('admin.facilities.booking-settings.update');

    Route::delete('/admin/facilities/{facility}', [FacilityManagementController::class, 'destroy'])
        ->middleware('role:super_admin')
        ->name('admin.facilities.destroy');

    // Facility Admin Dashboard
    Route::get('/facilitator/dashboard', [FacilitatorDashboardController::class, 'index'])
        ->middleware('role:facility_admin,super_admin')
        ->name('facilitator.dashboard');

    // Facility Admin — Managed Facilities
    Route::get('/facilitator/managed-facilities', [FacilityManagementController::class, 'managed'])
        ->middleware('role:facility_admin,super_admin')
        ->name('facilitator.managed-facilities.index');

    // Developer Contact
    Route::post('/developer/contact', [DeveloperContactController::class, 'store'])
        ->name('developer.contact');

    // General User Dashboard — all metrics are scoped to the signed-in account.
    Route::get('/user/dashboard', function () {
        $userId = Auth::id();
        $filters = request()->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'group_by' => ['nullable', 'in:day,week,month'],
        ]);
        $filterFrom = $filters['from'] ?? now()->subMonths(5)->startOfMonth()->toDateString();
        $filterTo = $filters['to'] ?? now()->toDateString();
        $groupBy = $filters['group_by'] ?? 'month';

        $userBookings = Booking::with('facility:id,name,location')
            ->where('user_id', $userId)
            ->latest()
            ->get();

        // Keep account-wide booking history separate from the selected analytics period.
        $analyticsBookings = $userBookings->filter(function (Booking $booking) use ($filterFrom, $filterTo) {
            $date = $booking->booking_date ?? $booking->date;

            return $date
                && \Carbon\Carbon::parse($date)->toDateString() >= $filterFrom
                && \Carbon\Carbon::parse($date)->toDateString() <= $filterTo;
        })->values();

        $statusBreakdown = BookingDashboardAnalytics::statusBreakdown($analyticsBookings);
        $allTimeStatusCounts = collect(BookingDashboardAnalytics::statusBreakdown($userBookings))->mapWithKeys(
            fn (array $item) => [$item['status'] => $item['count']]
        );
        $bookingDetailRows = BookingDashboardAnalytics::bookingRows($userBookings);
        $statusDetails = collect(BookingDashboardAnalytics::STATUSES)->mapWithKeys(
            fn (string $status) => [
                $status => BookingDashboardAnalytics::bookingRows(
                    BookingDashboardAnalytics::filterByStatus($analyticsBookings, $status)
                ),
            ]
        );

        $bookingTrends = collect();
        $cursor = \Carbon\Carbon::parse($filterFrom)->startOfDay();
        $periodEnd = \Carbon\Carbon::parse($filterTo)->endOfDay();

        if ($groupBy === 'week') {
            $cursor->startOfWeek();
            $periodEnd->endOfWeek();
        } elseif ($groupBy === 'month') {
            $cursor->startOfMonth();
            $periodEnd->endOfMonth();
        }

        while ($cursor->lte($periodEnd)) {
            $periodStart = $cursor->copy();
            $periodFinish = match ($groupBy) {
                'day' => $periodStart->copy()->endOfDay(),
                'week' => $periodStart->copy()->endOfWeek(),
                default => $periodStart->copy()->endOfMonth(),
            };
            $periodBookings = $analyticsBookings->filter(function (Booking $booking) use ($periodStart, $periodFinish) {
                $date = $booking->booking_date ?? $booking->date;
                return $date && \Carbon\Carbon::parse($date)->betweenIncluded($periodStart, $periodFinish);
            });

            $bookingTrends->push([
                'label' => $groupBy === 'day'
                    ? $periodStart->format('M j')
                    : ($groupBy === 'week'
                        ? $periodStart->format('M j') . ' – ' . $periodFinish->format('M j')
                        : $periodStart->format('M Y')),
                'bookings' => $periodBookings->count(),
                'facilities' => BookingDashboardAnalytics::facilityBreakdown($periodBookings),
            ]);

            $cursor = match ($groupBy) {
                'day' => $cursor->addDay(),
                'week' => $cursor->addWeek(),
                default => $cursor->addMonth(),
            };
        }

        $decidedBookings = $analyticsBookings->whereIn('status', ['approved', 'declined']);
        $approvedInPeriod = $decidedBookings->where('status', 'approved')->count();
        $approvalRate = $decidedBookings->isNotEmpty()
            ? round(($approvedInPeriod / $decidedBookings->count()) * 100, 1)
            : 0.0;
        $cancellationRate = $analyticsBookings->isNotEmpty()
            ? round(($analyticsBookings->filter(fn (Booking $booking) => $booking->status === 'cancelled')->count() / $analyticsBookings->count()) * 100, 1)
            : 0.0;
        $approvalMinutes = $analyticsBookings
            ->filter(fn (Booking $booking) => $booking->approved_at && $booking->created_at)
            ->map(fn (Booking $booking) => max(0, $booking->approved_at->getTimestamp() - $booking->created_at->getTimestamp()) / 60);
        $averageApprovalHours = $approvalMinutes->isNotEmpty()
            ? round($approvalMinutes->avg() / 60, 1)
            : null;
        $analyticsDetails = [
            'totalBookings' => BookingDashboardAnalytics::bookingRows($analyticsBookings),
            'approvalRate' => BookingDashboardAnalytics::bookingRows($decidedBookings),
            'cancellationRate' => BookingDashboardAnalytics::bookingRows(
                $analyticsBookings->where('status', 'cancelled')->values()
            ),
            'approvalTime' => BookingDashboardAnalytics::bookingRows(
                $analyticsBookings->filter(fn (Booking $booking) => $booking->approved_at !== null)->values()
            ),
        ];

        $mostUsedFacilities = $userBookings
            ->groupBy('facility_id')
            ->map(fn ($items) => [
                'name' => $items->first()->facility?->name ?? 'Deleted facility',
                'bookings' => $items->count(),
            ])
            ->sortByDesc('bookings')
            ->take(5)
            ->values();

        $upcomingBooking = Booking::with('facility')
            ->where('user_id', $userId)
            ->whereIn('status', ['pending', 'approved'])
            ->whereRaw(
                'COALESCE(end_date, date, booking_date) >= ?',
                [now()->toDateString()]
            )
            ->orderByRaw('COALESCE(booking_date, date) asc')
            ->orderBy('start_time', 'asc')
            ->first();

        return Inertia::render('User/Dashboard', [
            'stats' => [
                'totalBookings' => $userBookings->count(),
                'activeRooms' => Facility::count(),
                'pendingRequests' => $allTimeStatusCounts['pending'],
                'approvedBookings' => $allTimeStatusCounts['approved'],
                'completedBookings' => $allTimeStatusCounts['completed'],
                'declinedBookings' => $allTimeStatusCounts['declined'],
                'cancelledBookings' => $allTimeStatusCounts['cancelled'],
            ],
            'bookingTrends' => $bookingTrends,
            'analyticsFilters' => [
                'from' => $filterFrom,
                'to' => $filterTo,
                'group_by' => $groupBy,
            ],
            'analytics' => [
                'periodLabel' => \Carbon\Carbon::parse($filterFrom)->format('M j, Y')
                    . ' – ' . \Carbon\Carbon::parse($filterTo)->format('M j, Y'),
                'totalBookings' => $analyticsBookings->count(),
                'approvalRate' => $approvalRate,
                'cancellationRate' => $cancellationRate,
                'averageApprovalHours' => $averageApprovalHours,
            ],
            'analyticsDetails' => $analyticsDetails,
            'statusBreakdown' => $statusBreakdown,
            'statusDetails' => $statusDetails,
            'bookingDetails' => $bookingDetailRows,
            'mostUsedFacilities' => $mostUsedFacilities,
            'recentBookings' => $userBookings->take(5)->map(function (Booking $booking) {
                $booking->setAttribute(
                    'display_status',
                    BookingDashboardAnalytics::displayStatus($booking)
                );

                return $booking;
            })->values(),
            'upcomingBooking' => $upcomingBooking,
        ]);
    })->middleware('role:user,super_admin,facility_admin')
        ->name('user.dashboard');

    // Schedule Grid
    Route::get('/schedule', function (\Illuminate\Http\Request $request) {
        $validated = $request->validate([
            'date' => ['nullable', 'date'],
            'view' => ['nullable', 'string', Rule::in(['assigned', 'all'])],
        ]);

        $selectedDate = $validated['date'] ?? today()->toDateString();
        $selectedMonth = Carbon::parse($selectedDate);
        $monthStart = $selectedMonth->copy()->startOfMonth()->toDateString();
        $monthEnd = $selectedMonth->copy()->endOfMonth()->toDateString();
        $user = Auth::user();
        $isFacilityAdmin = $user->role === 'facility_admin';
        $scheduleView = $isFacilityAdmin
            ? ($validated['view'] ?? 'assigned')
            : 'all';
        $availabilityOnly = $isFacilityAdmin && $scheduleView === 'all';
        $canViewBookingDetails = in_array(
            $user->role,
            ['facility_admin', 'super_admin'],
            true
        ) && !$availabilityOnly;

        $facilityQuery = Facility::query();

        if ($isFacilityAdmin && !$availabilityOnly) {
            $facilityQuery->forUser($user);
        }

        $facilityQuery->with([
            'operatingHours',
            'unavailabilityPeriods' => fn ($query) => $query
                ->whereNull('ended_at')
                ->whereNotNull('scheduled_start_at')
                ->where('scheduled_end_at', '>=', now())
                ->orderBy('scheduled_start_at'),
        ]);

        $bookingQuery = Booking::query()
            // Include reservations whose date range overlaps any day in the selected month.
            ->whereRaw('COALESCE(date, booking_date) <= ?', [$monthEnd])
            ->whereRaw('COALESCE(end_date, date, booking_date) >= ?', [$monthStart])
            ->whereNotIn('status', ['declined', 'cancelled']);

        if ($isFacilityAdmin && !$availabilityOnly) {
            $bookingQuery->forUser($user);
        }

        // Every viewer receives occupancy information. Private booking fields are
        // serialized only for the owner, an assigned facility admin, or Super Admin.
        $bookingQuery->with(['user:id,name,email', 'facility:id,name']);
        $bookingRows = $bookingQuery->get([
            'id',
            'facility_id',
            'user_id',
            'date',
            'booking_date',
            'end_date',
            'start_time',
            'end_time',
            'status',
            'guest_name',
            'guest_email',
            'guest_phone',
            'notes',
            'attendees',
            'needs_manpower',
            'approved_by',
            'approved_at',
        ]);

        $safeBookings = $bookingRows->map(function (Booking $booking) use ($user, $canViewBookingDetails) {
            $canViewDetails = $canViewBookingDetails
                || (string) $booking->user_id === (string) $user->getKey();

            $row = [
                'id' => $booking->id,
                'date' => $booking->date?->format('Y-m-d'),
                'booking_date' => $booking->booking_date?->format('Y-m-d'),
                'end_date' => $booking->end_date?->format('Y-m-d'),
                'start_time' => $booking->start_time,
                'end_time' => $booking->end_time,
                'status' => $booking->status,
                'can_view_details' => $canViewDetails,
            ];

            if ($canViewDetails) {
                $row['facility_id'] = $booking->facility_id;
                $row['facility_name'] = $booking->facility?->name ?? 'Facility';
                $row += [
                    'user' => $booking->user ? [
                        'id' => $booking->user->id,
                        'name' => $booking->user->name,
                        'email' => $booking->user->email,
                    ] : null,
                    'guest_name' => $booking->guest_name,
                    'guest_email' => $booking->guest_email,
                    'guest_phone' => $booking->guest_phone,
                    'notes' => $booking->notes,
                    'attendees' => $booking->attendees,
                    'needs_manpower' => $booking->needs_manpower,
                    'approved_by' => $booking->approved_by,
                    'approved_at' => $booking->approved_at,
                ];
            }

            return $row;
        })->values();

        return Inertia::render('CalendarDashboard', [
            'selectedDate' => $selectedDate,
            'scheduleView' => $scheduleView,
            'canToggleScheduleView' => $isFacilityAdmin,
            'availabilityOnly' => $availabilityOnly,
            'serverFacilities' => $facilityQuery->get([
                'id',
                'name',
                'location',
                'type',
                'capacity',
                'description',
                'imageUrl',
                'requirement',
                'requiresWeekendConsent',
                'allowTdevsManpower',
                'booking_lead_time_days',
                'is_available',
                'unavailable_reason',
            ]),
            'serverBookings' => $safeBookings,
        ]);
    })->name('schedule.index');

    // Browse Facilities
    Route::get('/facilities', function () {
        return Inertia::render('Facilities', [
            'facilities' => Facility::with([
                'operatingHours',
                'unavailabilityPeriods' => fn ($query) => $query
                    ->whereNull('ended_at')
                    ->whereNotNull('scheduled_start_at')
                    ->where('scheduled_end_at', '>=', now())
                    ->orderBy('scheduled_start_at'),
            ])->get(),
        ]);
    })->name('facilities.index');

    // Facility Details
    Route::get('/facility/{id}', function ($id) {
        $facility = Facility::with([
            'facilityAdmins:id,name,email',
            'operatingHours',
            'unavailabilityPeriods' => fn ($query) => $query
                ->whereNull('ended_at')
                ->whereNotNull('scheduled_start_at')
                ->where('scheduled_end_at', '>=', now())
                ->orderBy('scheduled_start_at'),
        ])->findOrFail($id);

        return Inertia::render('FacilityDetails', [
            'facility' => $facility,
            'blackoutDates' => [],
            'bookings' => Booking::where('facility_id', $facility->id)
                ->whereNotIn('status', ['declined', 'cancelled'])
                ->get([
                    'id',
                    'facility_id',
                    'date',
                    'end_date',
                    'start_time',
                    'end_time',
                    'status',
                ]),
            'availablePersonnel' => [],
        ]);
    })->name('facility.show');

    // Booking Operations
    Route::post('/bookings', [BookingController::class, 'store'])
        ->name('bookings.store');

    // Recurring semester activity plans and private supporting documents.
    Route::get('/activity-plans', [ActivityPlanController::class, 'index'])
        ->middleware('role:user,super_admin,facility_admin')
        ->name('activity-plans.index');

    Route::post('/activity-plans', [ActivityPlanController::class, 'store'])
        ->middleware('role:user,super_admin,facility_admin')
        ->name('activity-plans.store');

    Route::get('/activity-plans/{activityPlan}', [ActivityPlanController::class, 'show'])
        ->middleware('role:user,super_admin,facility_admin')
        ->name('activity-plans.show');

    Route::get('/activity-plans/{activityPlan}/attachment', [ActivityPlanController::class, 'downloadAttachment'])
        ->middleware('role:user,super_admin,facility_admin')
        ->name('activity-plans.attachment');

    Route::patch('/activity-plans/{activityPlan}/approve', [ActivityPlanController::class, 'approveAll'])
        ->middleware('role:super_admin,facility_admin')
        ->name('activity-plans.approve');

    Route::patch('/activity-plans/{activityPlan}/decline', [ActivityPlanController::class, 'declineAll'])
        ->middleware('role:super_admin,facility_admin')
        ->name('activity-plans.decline');

    Route::get('/my-bookings', [BookingController::class, 'index'])
        ->name('bookings.index');

    Route::get('/receipt/{id}', [BookingController::class, 'receipt'])
        ->name('bookings.receipt');

    Route::put('/bookings/{id}/cancel', [BookingController::class, 'cancel'])
        ->name('bookings.cancel');

    Route::put('/bookings/{id}', [BookingController::class, 'update'])
        ->name('bookings.update');

    // Direct BookingController approval/decline routes intentionally removed.
    // Use the policy-protected admin.* or facilitator.* routes above.

    // Overtime extension requests: owners request; assigned admins review.
    Route::post('/bookings/{booking}/extensions', [BookingExtensionController::class, 'store'])
        ->middleware('role:user,facility_admin,super_admin')
        ->name('bookings.extensions.store');

    Route::get('/admin/overtime-extensions', [BookingExtensionController::class, 'index'])
        ->middleware('role:super_admin,facility_admin')
        ->name('overtime-extensions.index');

    Route::patch('/admin/overtime-extensions/{extensionRequest}/approve', [BookingExtensionController::class, 'approve'])
        ->middleware('role:super_admin,facility_admin')
        ->name('overtime-extensions.approve');

    Route::patch('/admin/overtime-extensions/{extensionRequest}/decline', [BookingExtensionController::class, 'decline'])
        ->middleware('role:super_admin,facility_admin')
        ->name('overtime-extensions.decline');

    // Overtime Check-In / Check-Out
    Route::post('/bookings/{booking}/check-in', [BookingCheckInOutController::class, 'checkIn'])
        ->middleware('role:user,facility_admin,super_admin')
        ->name('bookings.check-in');

    Route::post('/bookings/{booking}/check-out', [BookingCheckInOutController::class, 'checkOut'])
        ->middleware('role:user,facility_admin,super_admin')
        ->name('bookings.check-out');

    // Record an overtime payment separately from checkout.
    Route::post('/bookings/{booking}/overtime-payment', [
        BookingCheckInOutController::class,
        'recordOvertimePayment',
    ])
        ->middleware('role:facility_admin,super_admin')
        ->name('bookings.overtime-payment');

    // Active Bookings Monitor JSON Endpoint
    Route::get('/admin/active-bookings', [
        BookingCheckInOutController::class,
        'activeBookings',
    ])
        ->middleware('role:super_admin,facility_admin')
        ->name('admin.active-bookings');

    // Finalized Overtime Billing JSON Endpoint
    Route::get('/admin/overtime-billing', [
        BookingCheckInOutController::class,
        'overtimeBilling',
    ])
        ->middleware('role:super_admin,facility_admin')
        ->name('admin.overtime-billing');

    // Profile Settings
    Route::get('/profile', [ProfileController::class, 'edit'])
        ->name('profile.edit');

    Route::patch('/profile', [ProfileController::class, 'update'])
        ->name('profile.update');

    Route::delete('/profile', [ProfileController::class, 'destroy'])
        ->name('profile.destroy');

    // User Tickets
    Route::get('/my-tickets', [UserConcernController::class, 'myTickets'])
        ->name('concerns.my-tickets');

    Route::patch('/my-tickets/{concern}', [UserConcernController::class, 'updateMyTicket'])
        ->name('concerns.my-tickets.update');

    // Super Admin — Reply to Concerns
    Route::post('/admin/concerns/{concern}/reply', [UserConcernController::class, 'reply'])
        ->middleware('role:super_admin')
        ->name('admin.concerns.reply');

    // Super Admin — Edit an Existing Concern Reply
    Route::patch('/admin/concerns/{concern}/reply', [UserConcernController::class, 'updateReply'])
        ->middleware('role:super_admin')
        ->name('admin.concerns.updateReply');

    // Notification Center: full read/unread history with filters.
    Route::get('/notifications', [NotificationController::class, 'index'])
        ->name('notifications.index');

    // Notification: Mark All as Read
    Route::post('/notifications/clear', function () {
        $user = Auth::user();
        $user->unreadNotifications->markAsRead();

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Notifications cleared.',
        ]);
    })->name('notifications.clear');

    // Notification: Mark Single Notification as Read
    Route::post('/notifications/{notification}/read', function ($notificationId) {
        $user = Auth::user();

        $notification = DatabaseNotification::query()
            ->where('notifiable_type', \App\Models\User::class)
            ->where('notifiable_id', $user->id)
            ->where('id', $notificationId)
            ->firstOrFail();

        $notification->markAsRead();

        return redirect()->back();
    })->name('notifications.read');

    Route::get('/bookings/{booking}/attachments/{type}', [BookingAttachmentController::class, 'download'])
        ->whereIn('type', ['activity-plan', 'sir-rene-signature'])
        ->name('bookings.attachments.download');

    // Serve Consent Files
    Route::get('/bookings/{booking}/consent', function (Booking $booking) {
        $user = Auth::user();

        // A facility admin may only access consent files for assigned facilities.
        if ($user->role === 'facility_admin') {
            $facility = $booking->facility;

            abort_unless($facility, 404);

            $isAssigned = $facility->facilityAdmins()
                ->where('users.id', $user->id)
                ->exists();

            abort_unless($isAssigned, 403);
        } elseif ($user->role !== 'super_admin') {
            abort(403);
        }

        abort_unless(
            $booking->consent_file_uploaded && $booking->consent_file_path,
            404
        );

        $disk = Storage::disk('tigris');
        $path = $booking->consent_file_path;

        // Only allow files inside the designated consent-letter directory.
        abort_unless(
            is_string($path)
                && str_starts_with($path, 'consent-letters/')
                && ! str_contains($path, '..')
                && $disk->exists($path),
            404
        );

        $downloadName = basename(
            $booking->consent_file_name ?: 'consent-letter.pdf'
        );

        $stream = function () use ($disk, $path) {
            echo $disk->get($path);
        };

        $extension = strtolower(pathinfo($downloadName, PATHINFO_EXTENSION));
        $contentType = match ($extension) {
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            default => 'application/octet-stream',
        };

        // The viewer receives authorized PDF bytes inside the Inertia page
        // response. No PDF URL is requested or navigated to during View.
        if (request()->boolean('viewer')) {
            $pdfDataBase64 = $extension === 'pdf'
                ? base64_encode($disk->get($path))
                : null;

            $response = Inertia::render('ConsentPreview', [
                'fileName' => $downloadName,
                'fileExtension' => $extension,
                'pdfDataBase64' => $pdfDataBase64,
                'downloadUrl' => route('bookings.consent', [
                    'booking' => $booking->id,
                ]),
            ])->toResponse(request());

            $response->headers->set('Cache-Control', 'private, no-store, max-age=0');
            $response->headers->set('X-Content-Type-Options', 'nosniff');
            $response->headers->set('Referrer-Policy', 'no-referrer');

            return $response;
        }

        // The regular attachment route is used only by the explicit Download button.
        return response()->streamDownload(
            $stream,
            $downloadName,
            [
                'Content-Type' => $contentType,
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'private, no-store, max-age=0',
            ]
        );
    })->name('bookings.consent');
});

// Public Concern Submission
Route::post('/concerns', [UserConcernController::class, 'store'])
    ->name('concerns.store');

// Authentication Routes
require __DIR__ . '/auth.php';

// Fallback 404 Page
Route::fallback(fn () => Inertia::render('Error/HttpError', [
    'status' => 404,
    'message' => 'We could not find the page you were looking for.',
])->toResponse(request())->setStatusCode(404));

// Google SSO Routes
Route::middleware('guest')->group(function () {
    Route::get('/auth/google', [GoogleController::class, 'redirectToGoogle'])
        ->name('auth.google');

    Route::get('/auth/google/callback', [GoogleController::class, 'handleGoogleCallback']);
});