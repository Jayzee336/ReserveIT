import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import DashboardDrilldownModal from '@/Components/DashboardDrilldownModal';
import BookingConsentAttachment from '@/Components/BookingConsentAttachment';
import {
    Activity,
    CheckCircle2,
    Eye,
    XCircle,
    Clock,
    User as UserIcon,
    Calendar,
    Users,
    Plus,
    Sparkles,
    ArrowRight,
    BarChart3,
    TrendingUp,
} from 'lucide-react';

const DASHBOARD_STATUS_ORDER = ['pending', 'approved', 'completed', 'declined', 'cancelled'];

function formatTime(value) {
    if (!value) return '—';
    const [hourText, minuteText] = String(value).slice(0, 5).split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return String(value);
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function Stat({ label, value, onClick }) {
    const content = <><span className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-slate-500">{label}</span>{onClick && <span className="text-[10px] font-bold uppercase tracking-wide text-[#846A75] opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">View details</span>}</span><p className="mt-2 text-3xl font-bold tracking-tight text-[#6A535C]">{value}</p></>;
    const classes = "ri-panel min-w-0 p-5 text-left transition hover:-translate-y-0.5 hover:border-[#BDAAB2] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#846A75] focus:ring-offset-2";
    return onClick ? <button type="button" onClick={onClick} className={`group w-full ${classes}`}>{content}</button> : <div className={classes}>{content}</div>;
}

function AnalyticsStat({ label, value, hint, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group min-w-0 rounded-xl border border-[var(--ri-border)] bg-[var(--ri-surface-subtle)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#846A75] hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#846A75] focus:ring-offset-2"
        >
            <span className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                <span>{label}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#846A75] opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">View details</span>
            </span>
            <span className="mt-2 block break-words text-xl font-bold text-[#6A535C]">{value}</span>
            <span className="mt-1 block text-[11px] leading-4 text-slate-500">{hint}</span>
        </button>
    );
}

function StatusBadge({ status }) {
    const normalized = String(status || '').toLowerCase();

    const styles = {
        pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
        approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        completed: 'bg-sky-50 text-sky-700 ring-sky-600/20',
        declined: 'bg-rose-50 text-rose-700 ring-rose-600/20',
        cancelled: 'bg-gray-100 text-gray-600 ring-gray-500/20',
    };

    return (
        <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                styles[normalized] ?? styles.pending
            }`}
        >
            {normalized === 'pending' ? 'PENDING · SLOT HELD' : normalized === 'approved' ? 'APPROVED · CONFIRMED' : String(status || 'Unknown').toUpperCase()}
        </span>
    );
}

function BookingDetailModal({ booking, onClose }) {
    if (!booking) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4"
            onClick={onClose}
        >
            <div
                className="my-auto max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-6 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#6A535C]">
                            Booking Details
                        </p>
                        <h3 className="mt-1 text-xl font-semibold text-gray-900">
                            {booking.facility?.name ?? 'Unknown Facility'}
                        </h3>
                        {booking.facility?.location && (
                            <p className="mt-1 text-sm text-gray-500">{booking.facility.location}</p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close booking details"
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-stone-50 p-4">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Status
                        </p>
                        <StatusBadge status={booking.status} />
                        {String(booking.status).toLowerCase() === 'pending' && (
                            <p className="mt-2 text-xs leading-5 text-amber-800">This request temporarily holds the selected time slot. It is not a confirmed reservation until approved.</p>
                        )}
                        {String(booking.status).toLowerCase() === 'approved' && (
                            <p className="mt-2 text-xs leading-5 text-emerald-700">This is an approved and confirmed reservation.</p>
                        )}
                    </div>

                    <div className="rounded-xl bg-stone-50 p-4">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Requested By
                        </p>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                            <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                            {booking.user?.name ?? booking.guest_name ?? 'Guest'}
                        </p>
                        {(booking.user?.email || booking.guest_email) && (
                            <p className="mt-1 text-xs text-gray-500">
                                {booking.user?.email ?? booking.guest_email}
                            </p>
                        )}
                        {booking.guest_phone && (
                            <p className="mt-1 text-xs text-gray-500">
                                {booking.guest_phone}
                            </p>
                        )}
                    </div>

                    <div className="rounded-xl bg-stone-50 p-4">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Date &amp; Time
                        </p>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {booking.date ?? booking.booking_date ?? 'Date unavailable'}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-600">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                        </p>
                    </div>

                    <div className="rounded-xl bg-stone-50 p-4">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Attendees
                        </p>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                            <Users className="h-3.5 w-3.5 text-gray-400" />
                            {booking.attendees ?? 1}{' '}
                            {(booking.attendees ?? 1) === 1 ? 'person' : 'people'}
                        </p>
                        {booking.needs_manpower && (
                            <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                Needs manpower
                            </span>
                        )}
                    </div>

                    {booking.notes && (
                        <div className="rounded-xl bg-stone-50 p-4 sm:col-span-2">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Notes
                            </p>
                            <p className="whitespace-pre-wrap text-sm text-gray-700">
                                {booking.notes}
                            </p>
                        </div>
                    )}

                    {booking.decline_reason && (
                        <div className="rounded-xl bg-red-50 p-4 sm:col-span-2">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-red-600">
                                Decline Reason
                            </p>
                            <p className="text-sm text-red-700">
                                {booking.decline_reason}
                            </p>
                        </div>
                    )}
                    <BookingConsentAttachment booking={booking} />
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-[#6A535C] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#533e45]"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function ConfirmApproveModal({
    bookingId,
    onConfirm,
    onCancel,
    isProcessing,
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
                <div className="mb-4 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900">
                        Approve this booking?
                    </h3>

                    <p className="mt-2 text-sm text-gray-500">
                        This action will confirm the booking. You cannot undo this.
                    </p>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={() => onConfirm(bookingId)}
                        disabled={isProcessing}
                        className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isProcessing ? 'Approving…' : 'Yes, approve'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function FacilitatorDashboard({
    stats = {},
    pendingBookings = [],
    facilities = [],
    selectedFacilityId = null,
    todaySchedule = {},
    analytics = {},
    analyticsFilters = {},
    usageOverTime = [],
    statusBreakdown = [],
    statusDetails = {},
    analyticsDetails = {},
    mostUsedFacilities = [],
}) {
    const { auth } = usePage().props;
    const firstName = auth?.user?.name?.trim()?.split(/\s+/)[0] || 'there';
    const [analyticsFrom, setAnalyticsFrom] = useState(analyticsFilters.from ?? '');
    const [analyticsTo, setAnalyticsTo] = useState(analyticsFilters.to ?? '');
    const [analyticsGroupBy, setAnalyticsGroupBy] = useState(analyticsFilters.group_by ?? 'month');
    const [analyticsFacility, setAnalyticsFacility] = useState(selectedFacilityId ?? '');
    const [processingId, setProcessingId] = useState(null);
    const [viewBooking, setViewBooking] = useState(null);
    const [confirmApproveId, setConfirmApproveId] = useState(null);
    const [declineModalOpen, setDeclineModalOpen] = useState(false);
    const [declineReason, setDeclineReason] = useState('');
    const [declineBookingId, setDeclineBookingId] = useState(null);
    const [selectedAnalyticsDetail, setSelectedAnalyticsDetail] = useState(null);
    const [selectedTrendLabel, setSelectedTrendLabel] = useState(null);

    useEffect(() => {
        setAnalyticsFacility(selectedFacilityId ?? '');
    }, [selectedFacilityId]);

    const selectedTrend = usageOverTime.find((item) => item.label === selectedTrendLabel);
    const displayedStatusBreakdown = DASHBOARD_STATUS_ORDER.map((status) => {
        const item = statusBreakdown.find((entry) => entry.status === status);
        return {
            status,
            count: Number(item?.count ?? 0),
            percentage: Number(item?.percentage ?? 0),
        };
    });


    const pendingApprovals = stats?.pendingApprovals ?? 0;
    const todayBookings = stats?.todayBookings ?? 0;
    const weeklyUtilizationRate = stats?.weeklyUtilizationRate ?? 0;
    const activeOccupancy = stats?.activeOccupancy ?? 0;

    const applyAnalyticsFilters = (event) => {
        event.preventDefault();
        router.get(route('facilitator.dashboard'), {
            facility_id: analyticsFacility || undefined,
            from: analyticsFrom,
            to: analyticsTo,
            group_by: analyticsGroupBy,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleFacilityChange = (event) => {
        setAnalyticsFacility(event.target.value);
    };

    const confirmApprove = (bookingId) => {
        setProcessingId(bookingId);

        router.patch(
            route('facilitator.bookings.approve', bookingId),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Booking approved.');
                    setConfirmApproveId(null);
                },
                onError: () => {
                    toast.error('Something went wrong. Please try again.');
                },
                onFinish: () => setProcessingId(null),
            },
        );
    };

    const handleDeclineClick = (bookingId) => {
        setDeclineBookingId(bookingId);
        setDeclineReason('');
        setDeclineModalOpen(true);
    };

    const submitDecline = (e) => {
        e.preventDefault();

        if (!declineBookingId || !declineReason.trim()) {
            toast.error('Please provide a reason for declining this booking.');
            return;
        }

        setProcessingId(declineBookingId);

        router.patch(
            route('facilitator.bookings.decline', declineBookingId),
            {
                rejection_reason: declineReason.trim(),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Booking declined.');
                    setDeclineModalOpen(false);
                    setDeclineReason('');
                },
                onError: () => {
                    toast.error('Something went wrong. Please try again.');
                },
                onFinish: () => {
                    setProcessingId(null);
                    setDeclineBookingId(null);
                },
            },
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Facilitator Dashboard" />

            <div className="ri-page-shell space-y-7">
                <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#6A535C] px-6 py-8 text-white shadow-[var(--ri-shadow-md)] sm:px-8 sm:py-10">
                    <div className="pointer-events-none absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full bg-[#846A75]/50 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-32 right-1/3 -z-10 h-64 w-64 rounded-full bg-[#B88D59]/20 blur-3xl" />
                    <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-2xl">
                            <span className="ri-page-eyebrow !text-[#FDF6F0]">
                                <Sparkles className="h-3.5 w-3.5" />
                                Facility operations
                            </span>
                            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                                Welcome back, {firstName}.
                            </h1>
                            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                                Manage your assigned facilities, review reservation requests, and monitor daily operations.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                            <Link
                                href={route('facilities.index')}
                                className="ri-btn-primary !min-h-12 !border-white/10 !bg-white !px-5 !text-[#6A535C] hover:!border-white hover:!bg-[#FFF8F2]"
                            >
                                <Plus className="h-4 w-4" />
                                Book a Facility
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href={route('admin.active-bookings.page')}
                                className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                            >
                                <Activity className="h-4 w-4" />
                                Active Bookings Monitor
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Statistics */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Stat label="Pending approvals" value={pendingApprovals} onClick={() => setSelectedAnalyticsDetail({ title: 'Pending approvals', description: 'Requests awaiting a decision for facilities assigned to you.', items: pendingBookings, mode: 'bookings' })} />
                    <Stat label="Today's bookings" value={todayBookings} onClick={() => setSelectedAnalyticsDetail({ title: "Today's bookings", description: 'Ongoing, upcoming, and completed bookings scheduled for today.', items: [...(todaySchedule?.ongoing ?? []), ...(todaySchedule?.upcoming ?? []), ...(todaySchedule?.completed ?? [])], mode: 'bookings' })} />
                    <Stat label="Weekly utilization" value={`${weeklyUtilizationRate}%`} onClick={() => setSelectedAnalyticsDetail({ title: 'Weekly utilization', description: 'Booking activity included in the current assigned-facility analytics view.', items: analyticsDetails.totalBookings ?? [], mode: 'bookings' })} />
                    <Stat label="Active occupancy" value={activeOccupancy} onClick={() => setSelectedAnalyticsDetail({ title: 'Active occupancy', description: 'Currently ongoing bookings at facilities assigned to you.', items: todaySchedule?.ongoing ?? [], mode: 'bookings' })} />
                </div>

                {/* Pending Bookings List */}
                <section className="ri-panel p-5 sm:p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="font-semibold text-slate-900">
                            Bookings Awaiting Review
                        </h2>

                        <Link
                            href={route('facilitator.bookings.index')}
                            className="text-sm font-semibold text-[#6A535C] hover:underline"
                        >
                            View All Approvals
                        </Link>
                    </div>

                    <div className="mt-4 space-y-3">
                        {pendingBookings.length ? (
                            pendingBookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    className="flex flex-col gap-3 rounded-xl border border-[#E7DDE1] bg-[var(--ri-surface-subtle)] p-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <p className="font-semibold text-[#6A535C]">
                                            {booking.facility?.name ?? 'Unknown Facility'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {booking.user?.name ?? booking.guest_name ?? 'Guest'}
                                            {' · '}
                                            {booking.booking_date ?? booking.date ?? 'Date unavailable'}
                                            {' · '}
                                            {formatTime(booking.start_time)}–{formatTime(booking.end_time)}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setViewBooking(booking)}
                                            className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                                        >
                                            <Eye className="mr-1 inline-block h-4 w-4" />
                                            View
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setConfirmApproveId(booking.id)}
                                            disabled={processingId === booking.id}
                                            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            <CheckCircle2 className="mr-1 inline-block h-4 w-4" />
                                            Approve
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleDeclineClick(booking.id)}
                                            disabled={processingId === booking.id}
                                            className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                        >
                                            <XCircle className="mr-1 inline-block h-4 w-4" />
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500">
                                No bookings awaiting review.
                            </p>
                        )}
                    </div>
                </section>
                {/* Today's Schedule */}
                <section className="ri-panel p-5 sm:p-6">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="font-semibold text-slate-900">
                            Today's Operational Schedule
                        </h2>
                        <p className="text-sm text-slate-500">
                            Live view of ongoing, upcoming, and completed bookings.
                        </p>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-3">
                        {[
                            { key: 'ongoing', title: 'Ongoing' },
                            { key: 'upcoming', title: 'Upcoming' },
                            { key: 'completed', title: 'Completed' },
                        ].map((group) => {
                            const items = todaySchedule?.[group.key] ?? [];

                            return (
                                <div
                                    key={group.key}
                                    className="rounded-xl border border-[var(--ri-border)] bg-[var(--ri-surface-subtle)] p-4"
                                >
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        {group.title}
                                    </h3>

                                    <div className="mt-3 space-y-2">
                                        {items.length ? (
                                            items.map((booking) => (
                                                <button
                                                    key={booking.id}
                                                    type="button"
                                                    onClick={() => setViewBooking(booking)}
                                                    className="group flex w-full min-w-0 flex-col gap-1 rounded-xl border border-[var(--ri-border)] bg-white/80 p-3 text-left transition hover:border-[#BDAAB2] hover:bg-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#846A75]"
                                                >
                                                    <p className="text-sm font-semibold text-[#6A535C]">
                                                        {booking.facility?.name ?? 'Facility'}
                                                    </p>
                                                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#846A75] opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">View details</span>
                                                    <p className="text-xs text-slate-500">
                                                        {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                                                    </p>
                                                    <p className="text-sm text-slate-700">
                                                        {booking.user?.name ?? booking.guest_name ?? 'Guest'}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {booking.user?.email ?? booking.guest_email ?? ''}
                                                    </p>
                                                </button>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-500">
                                                No bookings.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Assigned-facility analytics */}
                <section className="ri-panel space-y-5 p-5 sm:p-6">
                    <div>
                        <p className="ri-page-eyebrow">Assigned facility insights</p>
                        <h2 className="mt-1 font-semibold text-slate-900">Client &amp; operations analytics</h2>
                        <p className="mt-1 text-xs text-slate-500">{analytics.periodLabel ?? 'Last six months'} · metrics include only facilities assigned to you and the selected facility scope.</p>
                    </div>
                    <form onSubmit={applyAnalyticsFilters} className="grid gap-3 rounded-xl border border-[var(--ri-border)] bg-[var(--ri-surface-subtle)] p-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto_auto] xl:items-end">
                        <label className="block text-xs font-semibold text-slate-600">
                            Facility scope
                            <select value={analyticsFacility} onChange={handleFacilityChange} className="mt-1 block w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-normal text-slate-700">
                                <option value="">All assigned facilities</option>
                                {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
                            </select>
                        </label>
                        <label className="block text-xs font-semibold text-slate-600">
                            From
                            <input type="date" value={analyticsFrom} onChange={(event) => setAnalyticsFrom(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-normal text-slate-700"/>
                        </label>
                        <label className="block text-xs font-semibold text-slate-600">
                            To
                            <input type="date" min={analyticsFrom || undefined} value={analyticsTo} onChange={(event) => setAnalyticsTo(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-normal text-slate-700"/>
                        </label>
                        <label className="block text-xs font-semibold text-slate-600">
                            Trend interval
                            <select value={analyticsGroupBy} onChange={(event) => setAnalyticsGroupBy(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-normal text-slate-700">
                                <option value="day">Daily</option>
                                <option value="week">Weekly</option>
                                <option value="month">Monthly</option>
                            </select>
                        </label>
                        <button type="submit" className="rounded-lg bg-[#6A535C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#533e45]">Apply</button>
                        <button type="button" onClick={() => { setAnalyticsFrom(''); setAnalyticsTo(''); setAnalyticsGroupBy('month'); setAnalyticsFacility(''); router.get(route('facilitator.dashboard'), {}, { preserveState: true, preserveScroll: true, replace: true }); }} className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-stone-100">Reset</button>
                    </form>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <AnalyticsStat label="Unique clients" value={analytics.uniqueClients ?? 0} hint="Clients with at least one booking in the selected period" onClick={() => setSelectedAnalyticsDetail({title:'Unique clients',description:'Clients with at least one booking in the selected period.',items:analyticsDetails.uniqueClients ?? [],mode:'clients'})}/>
                        <AnalyticsStat label="Returning clients" value={analytics.returningClients ?? 0} hint="Clients with more than one booking" onClick={() => setSelectedAnalyticsDetail({title:'Returning clients',description:'Clients with more than one booking in the selected period.',items:analyticsDetails.returningClients ?? [],mode:'clients'})}/>
                        <AnalyticsStat label="Approval rate" value={`${analytics.approvalRate ?? 0}%`} hint="Approved out of approved and declined decisions" onClick={() => setSelectedAnalyticsDetail({title:'Approval rate details',description:'Bookings included in approved-versus-declined decisions.',items:analyticsDetails.approvalRate ?? [],mode:'bookings'})}/>
                        <AnalyticsStat label="Cancellation rate" value={`${analytics.cancellationRate ?? 0}%`} hint="Cancelled out of all requests" onClick={() => setSelectedAnalyticsDetail({title:'Cancellation details',description:'Cancelled bookings in the selected period.',items:analyticsDetails.cancellationRate ?? [],mode:'bookings'})}/>
                        <AnalyticsStat label="Average approval time" value={analytics.averageApprovalHours != null ? `${analytics.averageApprovalHours} hrs` : '—'} hint="From request creation to approval" onClick={() => setSelectedAnalyticsDetail({title:'Approval time details',description:'Approved bookings with recorded approval timestamps.',items:analyticsDetails.approvalTime ?? [],mode:'bookings'})}/>
                        <AnalyticsStat label="Peak booking hour" value={analytics.peakHour ?? '—'} hint={`${analytics.peakHourBookings ?? 0} bookings started in this hour`} onClick={() => setSelectedAnalyticsDetail({title:'Peak-hour bookings',description:'Bookings that started during the busiest hour.',items:analyticsDetails.peakHour ?? [],mode:'bookings'})}/>
                        <AnalyticsStat label="Overtime minutes" value={`${analytics.overtimeMinutes ?? 0} min`} hint={`${analytics.overtimeBookings ?? 0} bookings with recorded overtime`} onClick={() => setSelectedAnalyticsDetail({title:'Overtime details',description:'Bookings with recorded overtime minutes and charges.',items:analyticsDetails.overtimeBookings ?? [],mode:'bookings'})}/>
                        <AnalyticsStat label="Recorded overtime fees" value={`₱${Number(analytics.overtimeFees ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} hint="Recorded overtime charges in the selected period" onClick={() => setSelectedAnalyticsDetail({title:'Overtime fee details',description:'Bookings with recorded overtime fees and payment status.',items:analyticsDetails.overtimeBookings ?? [],mode:'bookings'})}/>
                    </div>
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.9fr)]">
                        <div className="flex min-h-[20rem] flex-col rounded-xl border border-[var(--ri-border)] p-4">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-[#6A535C]"/>
                                <h3 className="text-sm font-semibold text-slate-900">Booking volume over time</h3>
                            </div>
                            {analyticsGroupBy === 'day' && usageOverTime.length > 8 && (
                                <p className="mt-3 text-[10px] font-medium text-slate-400" aria-live="polite">↔ Scroll horizontally to explore all days</p>
                            )}
                            <div className="mt-3 min-h-[15rem] min-w-0 flex-1 overflow-x-auto overscroll-x-contain pb-2 [touch-action:pan-x]">
                                <div className="grid h-full min-h-[15rem] items-stretch gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(usageOverTime.length, 1)}, ${analyticsGroupBy === 'day' ? '2.75rem' : 'minmax(0, 1fr)'})`, minWidth: analyticsGroupBy === 'day' ? `${Math.max(1, usageOverTime.length) * 52}px` : '100%' }}>
                                {usageOverTime.map((item) => {
                                    const maxValue = Math.max(...usageOverTime.map((point) => point.bookings), 1);
                                    const facilityHint = (item.facilities ?? []).map((facility) => `${facility.name}: ${facility.bookings}`).join(', ');
                                    return (
                                        <div key={item.label} className="flex min-w-0 flex-col items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-700">{item.bookings}</span>
                                            <button type="button" onClick={() => setSelectedTrendLabel(item.label)} title={`${item.label}: ${item.bookings} bookings. ${facilityHint || 'No facility details'}`} aria-label={`View facilities booked in ${item.label}`} className={`flex min-h-0 w-full flex-1 items-end rounded-t-lg bg-[#F4ECEF] outline-none ring-offset-2 transition hover:ring-2 hover:ring-[#846A75] focus:ring-2 focus:ring-[#846A75] ${selectedTrendLabel === item.label ? 'ring-2 ring-[#6A535C]' : ''}`}>
                                                <span className="block w-full rounded-t-lg bg-[#846A75]" style={{ height: item.bookings ? `${Math.max(8, item.bookings / maxValue * 100)}%` : '3px' }} />
                                            </button>
                                            <span title={item.label} className="w-full truncate text-center text-[10px] text-slate-500">{item.label}</span>
                                        </div>
                                    );
                                })}
                                </div>
                            </div>
                            {selectedTrend && <div className="mt-4 rounded-xl border border-[#E7DDE1] bg-[#FFFAF7] p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold text-[#6A535C]">{selectedTrend.label} facility activity</p><p className="text-xs text-slate-500">{selectedTrend.bookings} bookings across {(selectedTrend.facilities ?? []).length} facilities</p></div><button type="button" onClick={() => setSelectedTrendLabel(null)} className="text-xs font-semibold text-[#6A535C] hover:underline">Clear</button></div>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">{(selectedTrend.facilities ?? []).map((facility) => <div key={facility.name} className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs"><span className="text-slate-700">{facility.name}</span><span className="font-bold text-[#6A535C]">{facility.bookings}</span></div>)}</div>
                            </div>}
                            {usageOverTime.length === 0 && <p className="mt-4 text-sm text-slate-500">No bookings in this period.</p>}
                        </div>
                        <div className="rounded-xl border border-[var(--ri-border)] p-4">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-[#6A535C]"/>
                                <h3 className="text-sm font-semibold text-slate-900">Status breakdown</h3>
                            </div>
                            <div className="mt-5 space-y-4">
                                {displayedStatusBreakdown.map((item) => {
                                    const statusColors = { pending: 'bg-amber-400', approved: 'bg-emerald-500', completed: 'bg-sky-500', declined: 'bg-rose-500', cancelled: 'bg-slate-400' };
                                    return <button key={item.status} type="button" onClick={() => setSelectedAnalyticsDetail({title:`${item.status[0].toUpperCase()}${item.status.slice(1)} bookings`,description:`Assigned-facility ${item.status} bookings in the selected period.`,items:statusDetails[item.status] ?? [],mode:'bookings'})} className="group block w-full rounded-lg p-1 text-left transition hover:bg-[#FFFAF7] focus:outline-none focus:ring-2 focus:ring-[#846A75]">
                                        <div className="mb-1 flex justify-between text-xs"><span className="font-semibold capitalize text-slate-700">{item.status}</span><span className="text-slate-500">{item.count} · {item.percentage.toFixed(1)}%</span></div>
                                        <div className="h-2 overflow-hidden rounded-full bg-stone-200"><div className={`h-full rounded-full ${statusColors[item.status] ?? 'bg-slate-400'}`} style={{ width: `${Math.max(0, Math.min(100, item.percentage))}%` }}/></div>
                                         <span className="mt-1 block text-right text-[10px] font-semibold text-[#846A75] opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">View details</span>
                                    </button>;
                                })}
                                {statusBreakdown.length === 0 && <p className="text-sm text-slate-500">No booking data in this period.</p>}
                            </div>
                        </div>
                    </div>
                    <section className="rounded-xl border border-[var(--ri-border)] p-4">
                        <h3 className="text-sm font-bold text-slate-900">Most used facilities</h3>
                        <div className="mt-4 space-y-3">
                            {mostUsedFacilities.length ? mostUsedFacilities.map((facility) => (
                                <button
                                    key={facility.name}
                                    type="button"
                                    onClick={() => {
                                        const allBookings = Array.isArray(analyticsDetails.totalBookings)
                                            ? analyticsDetails.totalBookings
                                            : Array.isArray(analyticsDetails.totalBookings?.data)
                                                ? analyticsDetails.totalBookings.data
                                                : DASHBOARD_STATUS_ORDER.flatMap((status) => (
                                                    Array.isArray(statusDetails?.[status]) ? statusDetails[status] : []
                                                ));
                                        const facilityBookings = allBookings.filter((booking) => {
                                            const bookingFacility = booking.facility?.name
                                                ?? booking.facility_name
                                                ?? (typeof booking.facility === 'string' ? booking.facility : '');
                                            return String(bookingFacility).trim().toLowerCase() === String(facility.name).trim().toLowerCase();
                                        });
                                        setSelectedAnalyticsDetail({
                                            title: facility.name + ' bookings',
                                            description: 'Bookings for ' + facility.name + ' in the selected analytics period.',
                                            items: facilityBookings,
                                            mode: 'bookings',
                                        });
                                    }}
                                    className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[#E7DDE1] bg-[var(--ri-surface-subtle)] px-3 py-2 text-left text-sm transition hover:border-[#BDAAB2] hover:bg-[#FFFAF7] focus:outline-none focus:ring-2 focus:ring-[#846A75]"
                                >
                                    <span className="min-w-0 text-left">
                                        <span className="block truncate text-slate-700">{facility.name}</span>
                                        <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-[#846A75] opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">View details</span>
                                    </span>
                                    <span className="shrink-0 font-semibold text-[#6A535C]">{facility.bookings} bookings</span>
                                </button>
                            )) : <p className="text-sm text-slate-500">No facility usage data in this period.</p>}
                        </div>
                    </section>
                </section>

            </div>

            <DashboardDrilldownModal
                title={selectedAnalyticsDetail?.title}
                description={selectedAnalyticsDetail?.description}
                items={selectedAnalyticsDetail?.items ?? []}
                mode={selectedAnalyticsDetail?.mode ?? 'bookings'}
                onClose={() => setSelectedAnalyticsDetail(null)}
            />

            {/* Booking Details Modal */}
            <BookingDetailModal
                booking={viewBooking}
                onClose={() => setViewBooking(null)}
            />

            {/* Confirm Approval Modal */}
            {confirmApproveId !== null && (
                <ConfirmApproveModal
                    bookingId={confirmApproveId}
                    onConfirm={confirmApprove}
                    onCancel={() => setConfirmApproveId(null)}
                    isProcessing={processingId === confirmApproveId}
                />
            )}

            {/* Decline Modal */}
            {declineModalOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
                        <div className="mb-4">
                            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-600">
                                Decline booking
                            </p>
                            <h3 className="mt-1 text-xl font-semibold text-gray-900">
                                Add a reason for the rejection
                            </h3>
                        </div>

                        <form onSubmit={submitDecline} className="space-y-4">
                            <textarea
                                value={declineReason}
                                onChange={(e) => setDeclineReason(e.target.value)}
                                rows={5}
                                className="block w-full rounded-2xl border border-gray-200 p-3 text-sm text-gray-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                placeholder="Share a short reason for the decline..."
                                required
                            />

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (processingId === declineBookingId) return;
                                        setDeclineModalOpen(false);
                                        setDeclineBookingId(null);
                                        setDeclineReason('');
                                    }}
                                    disabled={processingId === declineBookingId}
                                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        processingId === declineBookingId ||
                                        declineReason.trim().length === 0
                                    }
                                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {processingId === declineBookingId ? 'Saving…' : 'Save reason'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}