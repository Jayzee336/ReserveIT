<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\DeveloperContactController;
use App\Http\Controllers\UserConcernController;

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
        ->whereDate('booking_date', today()->toDateString())
        ->where('status', 'approved')
        ->orderBy('start_time', 'asc')
        ->take(8)
        ->get([
            'id',
            'facility_id',
            'booking_date',
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
            ->where(function ($query) {
                $today = now()->toDateString();
                $query->whereDate('booking_date', '>=', $today)
                    ->orWhere(function ($legacyQuery) use ($today) {
                        $legacyQuery->whereNull('booking_date')
                            ->whereDate('date', '>=', $today);
                    });
            })
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

        $bookingQuery = Booking::query()
            ->where(function ($query) use ($selectedDate) {
                // Support both the current date column and legacy booking_date data.
                $query->whereDate('booking_date', $selectedDate)
                    ->orWhereDate('date', $selectedDate);
            })
            ->whereNotIn('status', ['declined', 'cancelled']);

        if ($isFacilityAdmin && !$availabilityOnly) {
            $bookingQuery->forUser($user);
        }

        // The all-facilities mode is strictly an availability overview. Only
        // occupancy fields are returned; customer and reservation details stay private.
        $bookingColumns = [
            'id',
            'facility_id',
            'date',
            'booking_date',
            'start_time',
            'end_time',
            'status',
        ];

        if ($canViewBookingDetails) {
            $bookingQuery->with('user:id,name,email');
            $bookingColumns = array_merge($bookingColumns, [
                'user_id',
                'guest_name',
                'guest_email',
                'notes',
                'approved_by',
                'approved_at',
            ]);
        }

        return Inertia::render('CalendarDashboard', [
            'selectedDate' => $selectedDate,
            'scheduleView' => $scheduleView,
            'canToggleScheduleView' => $isFacilityAdmin,
            'availabilityOnly' => $availabilityOnly,
            'serverFacilities' => $facilityQuery->get(['id', 'name', 'location', 'type']),
            'serverBookings' => $bookingQuery->get($bookingColumns),
        ]);
    })->name('schedule.index');

    // Browse Facilities
    Route::get('/facilities', function () {
        return Inertia::render('Facilities', [
            'facilities' => Facility::all(),
        ]);
    })->name('facilities.index');

    // Facility Details
    Route::get('/facility/{id}', function ($id) {
        $facility = Facility::with('facilityAdmins:id,name,email')
            ->findOrFail($id);

        return Inertia::render('FacilityDetails', [
            'facility' => $facility,
            'blackoutDates' => [],
            'bookings' => Booking::where('facility_id', $facility->id)
                ->whereNotIn('status', ['declined', 'cancelled'])
                ->get([
                    'id',
                    'facility_id',
                    'date',
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

    // Admin Reply to Concerns
    Route::post('/admin/concerns/{concern}/reply', [UserConcernController::class, 'reply'])
        ->middleware('role:super_admin,facility_admin')
        ->name('admin.concerns.reply');

    // Super Admin — Edit an Existing Concern Reply
    Route::patch('/admin/concerns/{concern}/reply', [UserConcernController::class, 'updateReply'])
        ->middleware('role:super_admin')
        ->name('admin.concerns.updateReply');

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

        // The View action opens this same authorization-protected route in a
        // new tab and asks the browser to display the file inline where supported.
        if (request()->boolean('preview')) {
            abort_unless(in_array($extension, ['pdf', 'doc', 'docx'], true), 415);

            $safeInlineName = str_replace(["\\r", "\\n", '"'], '', $downloadName);

            return response()->stream($stream, 200, [
                'Content-Type' => $contentType,
                'Content-Disposition' => 'inline; filename="' . $safeInlineName . '"',
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'private, no-store, max-age=0',
            ]);
        }

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