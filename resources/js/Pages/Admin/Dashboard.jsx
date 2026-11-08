import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import BookingConsentAttachment from '@/Components/BookingConsentAttachment';
import {
    CheckCircle2,
    XCircle,
    Eye,
    Clock,
    User as UserIcon,
    Calendar,
    Users,
    Search,
    SlidersHorizontal,
    Activity,
    Sparkles,
    ArrowRight,
} from 'lucide-react';

const DASHBOARD_STATUS_ORDER = ['pending', 'approved', 'completed', 'declined', 'cancelled'];

function displayText(value, fallback = '—') {
    if (value == null || value === '') return fallback;
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') return value.name ?? value.label ?? value.title ?? fallback;
    return fallback;
}

function formatTime(value) {
    if (!value) return '—';
    const [hourText, minuteText] = String(value).slice(0, 5).split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return String(value);
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function Stat({ label, value, onClick }) {
    const content = <><span className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-slate-500">{label}</span>{onClick && <span className="text-[10px] font-bold uppercase tracking-wide text-[#846A75] opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">View details</span>}</span><p className="mt-2 text-3xl font-bold tracking-tight text-[#6A535C]">{value ?? 0}</p></>;
    const classes = "ri-panel min-w-0 p-5 text-left transition hover:-translate-y-0.5 hover:border-[#BDAAB2] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#846A75] focus:ring-offset-2";
    return onClick ? <button type="button" onClick={onClick} className={`group w-full ${classes}`}>{content}</button> : <div className={classes}>{content}</div>;
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
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                        aria-label="Close booking details"
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
                            {booking.date ?? booking.booking_date}
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
                            {booking.attendees === 1 ? 'person' : 'people'}
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

function AnalyticsDetailModal({ detailKey, details, facilities = [], pendingBookings = [], recentConcerns = [], onClose }) {
    if (!detailKey) return null;
    const definitions = {
        facilities: { title: 'Registered facilities', description: 'Facilities currently listed in ReserveIT.', items: facilities, type: 'facilities' },
        allBookings: { title: 'Booking records', description: 'Booking records represented by the current date and facility analytics filters.', items: [...(details.pending ?? []), ...(details.approved ?? []), ...(details.completed ?? []), ...(details.declined ?? []), ...(details.cancelled ?? [])], type: 'bookings' },
        pendingConcerns: { title: 'Pending concerns', description: 'Recent concern records currently supplied to the dashboard.', items: recentConcerns.filter((item) => ['pending', 'open', 'submitted'].includes(String(item.status ?? 'pending').toLowerCase())), type: 'concerns' },
        clients: { title: 'Unique clients', description: 'Clients with at least one booking in the selected period.', items: details.clients ?? [], type: 'clients' },
        pending: { title: 'Pending bookings', description: 'Requests currently awaiting an administrator decision.', items: pendingBookings, type: 'bookings' },
        approved: { title: 'Approved bookings', description: 'Confirmed reservations that have not yet completed.', items: details.approved ?? [], type: 'bookings' },
        completed: { title: 'Completed bookings', description: 'Approved reservations that have finished.', items: details.completed ?? [], type: 'bookings' },
        declined: { title: 'Declined bookings', description: 'Requests that were declined.', items: details.declined ?? [], type: 'bookings' },
        cancelled: { title: 'Cancelled bookings', description: 'Reservations cancelled by their requester or an administrator.', items: details.cancelled ?? [], type: 'bookings' },
        returningClients: { title: 'Returning clients', description: 'Clients with more than one booking in the selected period.', items: details.returningClients ?? [], type: 'clients' },
        approvalRate: { title: 'Approval rate details', description: 'Bookings included in the approved-versus-declined calculation.', items: details.approvalRate ?? [], type: 'bookings' },
        cancellationRate: { title: 'Cancellation details', description: 'Bookings counted in the cancellation rate.', items: details.cancellationRate ?? [], type: 'bookings' },
        approvalTime: { title: 'Approval time details', description: 'Approved bookings with a recorded approval timestamp.', items: details.approvalTime ?? [], type: 'bookings' },
        peakHour: { title: 'Peak-hour bookings', description: 'Bookings that started during the busiest hour.', items: details.peakHour ?? [], type: 'bookings' },
        overtime: { title: 'Overtime details', description: 'Bookings with recorded overtime minutes and charges.', items: details.overtime ?? [], type: 'bookings' },
    };
    const definition = typeof detailKey === 'object' && detailKey?.type === 'facility'
        ? {
            title: detailKey.name + ' bookings',
            description: 'Bookings for ' + detailKey.name + ' in the selected analytics period.',
            items: detailKey.items ?? [],
            type: 'bookings',
        }
        : definitions[detailKey];
    if (!definition) return null;
    const records = Array.isArray(definition.items)
        ? definition.items
        : Array.isArray(definition.items?.data)
            ? definition.items.data
            : definition.items && typeof definition.items === 'object'
                ? Object.values(definition.items)
                : [];
    const formatTimeLabel = (value) => {
        if (!value) return '—';
        const [hourText, minuteText] = String(value).slice(0, 5).split(':');
        const hour = Number(hourText);
        return `${hour % 12 || 12}:${minuteText} ${hour >= 12 ? 'PM' : 'AM'}`;
    };
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" onClick={onClose}>
            <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4 sm:px-6">
                    <div><h2 className="text-lg font-bold text-slate-900">{definition.title}</h2><p className="mt-1 text-sm text-slate-500">{definition.description}</p></div>
                    <button type="button" onClick={onClose} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-stone-100">Close</button>
                </div>
                <div className="overflow-auto p-4 sm:p-6">
                    <p className="mb-4 text-sm font-semibold text-slate-700">{records.length} records · Current dashboard filters applied</p>
                    {records.length === 0 ? <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-10 text-center text-sm text-slate-500">No records found for this metric and filter selection.</div> : definition.type === 'clients' ? (
                        <div className="overflow-x-auto rounded-xl border border-stone-200"><table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Client</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Bookings</th><th className="px-4 py-3">Last booking</th></tr></thead>
                            <tbody className="divide-y divide-stone-100">{records.map((item, index) => <tr key={item.email || item.name + index} className="text-slate-700"><td className="px-4 py-3 font-semibold text-slate-900">{item.name}</td><td className="px-4 py-3">{item.email || '—'}</td><td className="px-4 py-3">{item.bookings}</td><td className="px-4 py-3">{item.lastBooking || '—'}</td></tr>)}</tbody>
                        </table></div>
                    ) : definition.type === 'facilities' ? (
                        <div className="space-y-2">{records.map((item) => <div key={item.id ?? item.name} className="rounded-xl border border-stone-200 bg-[#FFFAF7] px-4 py-3"><p className="font-semibold text-slate-900">{item.name ?? 'Facility'}</p><p className="mt-1 text-xs text-slate-500">{item.location ?? item.address ?? 'Facility listing'}</p></div>)}</div>
                    ) : definition.type === 'concerns' ? (
                        <div className="space-y-2">{records.map((item) => <div key={item.id} className="rounded-xl border border-stone-200 bg-[#FFFAF7] px-4 py-3"><p className="text-sm text-slate-800">{item.message ?? item.subject ?? 'Concern'}</p><p className="mt-1 text-xs text-slate-500">{item.user?.name ?? item.user?.email ?? 'Submitted by user'} · {item.status ?? 'Pending'}</p></div>)}</div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-stone-200"><table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Facility / Client</th><th className="px-4 py-3">Date &amp; time</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Approval delay</th><th className="px-4 py-3">Overtime</th><th className="px-4 py-3">Fee / payment</th></tr></thead>
                            <tbody className="divide-y divide-stone-100">{records.map((item) => <tr key={item.id} className="text-slate-700"><td className="px-4 py-3"><p className="font-semibold text-slate-900">{displayText(item.facility, 'Facility')}</p><p className="text-xs text-slate-500">{displayText(item.client)}</p></td><td className="whitespace-nowrap px-4 py-3">{item.date || '—'}<p className="text-xs text-slate-500">{formatTimeLabel(item.start_time)} – {formatTimeLabel(item.end_time)}</p></td><td className="px-4 py-3"><span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold capitalize text-slate-700">{item.display_status || item.status}</span></td><td className="px-4 py-3">{item.approval_minutes != null ? `${item.approval_minutes} min` : '—'}</td><td className="px-4 py-3">{item.overtime_minutes ? `${item.overtime_minutes} min` : '—'}</td><td className="px-4 py-3">{item.overtime_fee_amount ? `₱${Number(item.overtime_fee_amount).toFixed(2)}` : '—'}<p className="text-xs capitalize text-slate-500">{item.overtime_payment_status?.replaceAll('_', ' ') || ''}</p></td></tr>)}</tbody>
                        </table></div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ConfirmApproveModal({ bookingId, onConfirm, onCancel, isProcessing }) {
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

export default function AdminDashboard({
    stats = {},
    usageOverTime = [],
    mostUsedFacilities = [],
    operationalAnalytics = {},
    analyticsFilters = {},
    analyticsFacilities = [],
    analyticsDetails = {},
    statusBreakdown = [],
    periodComparison = {},
    pendingBookings = [],
    recentConcerns = [],
}) {
    const { auth } = usePage().props;
    const firstName = auth?.user?.name?.trim()?.split(/\s+/)[0] || 'there';
    const [bookingsList, setBookingsList] = useState(pendingBookings);
    const [processingId, setProcessingId] = useState(null);
    const [viewBooking, setViewBooking] = useState(null);
    const [analyticsDetailKey, setAnalyticsDetailKey] = useState(null);
    const [confirmApproveId, setConfirmApproveId] = useState(null);
    const [declineModalOpen, setDeclineModalOpen] = useState(false);
    const [declineReason, setDeclineReason] = useState('');
    const [declineBookingId, setDeclineBookingId] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [timeFilter, setTimeFilter] = useState('all');
    const [analyticsFrom, setAnalyticsFrom] = useState(analyticsFilters.from ?? '');
    const [analyticsTo, setAnalyticsTo] = useState(analyticsFilters.to ?? '');
    const [analyticsFacility, setAnalyticsFacility] = useState(analyticsFilters.facility_id ?? '');
    const [analyticsGroupBy, setAnalyticsGroupBy] = useState(analyticsFilters.group_by ?? 'month');
    const [selectedTrendLabel, setSelectedTrendLabel] = useState(null);
    const selectedTrend = usageOverTime.find((item) => item.label === selectedTrendLabel);
    const displayedStatusBreakdown = DASHBOARD_STATUS_ORDER.map((status) => {
        const item = statusBreakdown.find((entry) => entry.status === status);
        return {
            status,
            count: Number(item?.count ?? 0),
            percentage: Number(item?.percentage ?? 0),
        };
    });


    const applyAnalyticsFilters = (event) => {
        event.preventDefault();
        router.get(route('admin.dashboard'), {
            from: analyticsFrom,
            to: analyticsTo,
            facility_id: analyticsFacility || undefined,
            group_by: analyticsGroupBy,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const resetAnalyticsFilters = () => {
        setAnalyticsFrom('');
        setAnalyticsTo('');
        setAnalyticsFacility('');
        setAnalyticsGroupBy('month');
        router.get(route('admin.dashboard'), {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    useEffect(() => {
        setBookingsList(pendingBookings);
    }, [pendingBookings]);

    useEffect(() => {
        setAnalyticsFrom(analyticsFilters.from ?? '');
        setAnalyticsTo(analyticsFilters.to ?? '');
        setAnalyticsFacility(analyticsFilters.facility_id ?? '');
        setAnalyticsGroupBy(analyticsFilters.group_by ?? 'month');
    }, [analyticsFilters.from, analyticsFilters.to, analyticsFilters.facility_id, analyticsFilters.group_by]);

    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: ['pendingBookings'],
                preserveScroll: true,
                preserveState: true,
                onSuccess: (updatedPage) => {
                    const fresh = updatedPage.props.pendingBookings ?? [];

                    setBookingsList((prev) => {
                        if (fresh.length > prev.length) {
                            toast.info('New booking request received.');
                        }

                        return fresh;
                    });
                },
            });
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const maximum = Math.max(
        ...usageOverTime.map((item) => item.bookings),
        1
    );

    const filteredAndSortedBookings = useMemo(() => {
        let result = [...bookingsList];

        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();

            result = result.filter(
                (booking) =>
                    booking.facility?.name?.toLowerCase().includes(query) ||
                    booking.user?.name?.toLowerCase().includes(query) ||
                    booking.guest_name?.toLowerCase().includes(query)
            );
        }

        if (timeFilter !== 'all') {
            result = result.filter((booking) => {
                if (!booking.start_time) return true;

                const hour = parseInt(booking.start_time.split(':')[0], 10);

                return timeFilter === 'morning' ? hour < 12 : hour >= 12;
            });
        }

        result.sort((a, b) => {
            const dateA = a.booking_date || a.date || '';
            const dateB = b.booking_date || b.date || '';

            const dateTimeA = new Date(`${dateA} ${a.start_time || ''}`);
            const dateTimeB = new Date(`${dateB} ${b.start_time || ''}`);

            return sortOrder === 'newest'
                ? dateTimeB - dateTimeA
                : dateTimeA - dateTimeB;
        });

        return result;
    }, [bookingsList, searchQuery, sortOrder, timeFilter]);

    const confirmApprove = (bookingId) => {
        setProcessingId(bookingId);

        router.patch(route('facilitator.bookings.approve', bookingId), {}, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Booking approved.');
                setConfirmApproveId(null);
                setBookingsList((prev) =>
                    prev.filter((booking) => booking.id !== bookingId)
                );
            },
            onError: () => {
                toast.error('Something went wrong. Please try again.');
            },
            onFinish: () => setProcessingId(null),
        });
    };

    const handleDeclineClick = (bookingId) => {
        setDeclineBookingId(bookingId);
        setDeclineReason('');
        setDeclineModalOpen(true);
    };

    const submitDecline = (e) => {
        e.preventDefault();
        setProcessingId(declineBookingId);

        router.patch(
            route('facilitator.bookings.decline', declineBookingId),
            { rejection_reason: declineReason.trim() },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Booking declined.');
                    setDeclineModalOpen(false);
                    setBookingsList((prev) =>
                        prev.filter((booking) => booking.id !== declineBookingId)
                    );
                },
                onError: () => {
                    toast.error('Something went wrong. Please try again.');
                },
                onFinish: () => {
                    setProcessingId(null);
                    setDeclineBookingId(null);
                },
            }
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Admin Dashboard" />

            <div className="ri-page-shell space-y-7">
                <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#6A535C] px-6 py-8 text-white shadow-[var(--ri-shadow-md)] sm:px-8 sm:py-10">
                    <div className="pointer-events-none absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full bg-[#846A75]/50 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-32 right-1/3 -z-10 h-64 w-64 rounded-full bg-[#B88D59]/20 blur-3xl" />
                    <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <span className="ri-page-eyebrow !text-[#FDF6F0]">
                                <Sparkles className="h-3.5 w-3.5" />
                                System administration
                            </span>
                            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Welcome back, {firstName}.</h1>
                            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                                Oversee campus facilities, reservations, administrators, and system-wide operations.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                            <Link
                                href={route('schedule.index')}
                                className="ri-btn-primary !min-h-12 !border-white/10 !bg-white !px-5 !text-[#6A535C] hover:!border-white hover:!bg-[#FFF8F2]"
                            >
                                Book a Facility
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href={route('admin.active-bookings.page')}
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                            >
                                <Activity className="h-4 w-4" />
                                Active Bookings Monitor
                            </Link>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="mb-3">
                        <h2 className="font-semibold text-slate-900">System overview</h2>
                        <p className="mt-0.5 text-xs text-slate-500">Overall account totals. Use the analytics filters below for date- and facility-specific reporting.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Stat label="Total facilities" value={stats.totalFacilities ?? 0} onClick={() => setAnalyticsDetailKey('facilities')} />
                    <Stat label="All bookings" value={stats.totalBookings ?? 0} onClick={() => setAnalyticsDetailKey('allBookings')} />
                    <Stat label="Pending approval" value={stats.pendingApprovals ?? 0} onClick={() => setAnalyticsDetailKey('pending')} />
                    <Stat label="Pending concerns" value={stats.pendingConcerns ?? 0} onClick={() => setAnalyticsDetailKey('pendingConcerns')} />
                    </div>
                </section>

                <section className="ri-panel p-5 sm:p-6">
                    <div className="mb-4 flex flex-col gap-4 border-b border-stone-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-semibold text-slate-900">
                                Pending bookings
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-400">
                                Showing {filteredAndSortedBookings.length} of {bookingsList.length} requests
                            </p>
                        </div>

                        <Link
                            href={route('facilitator.bookings.index')}
                            className="shrink-0 text-sm font-semibold text-[#6A535C] hover:underline"
                        >
                            Open approvals
                        </Link>
                    </div>

                    <div className="mb-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-stone-100 bg-stone-50 p-3 md:flex-row">
                        <div className="relative w-full md:flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Search by facility, user or guest name..."
                                className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-4 text-sm text-stone-700 focus:border-[#846A75] focus:outline-none focus:ring-2 focus:ring-[#846A75]/20"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex w-full flex-wrap items-center gap-2 sm:flex-nowrap md:w-auto">
                            <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-stone-500">
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                Filter by:
                            </div>

                            <select
                                className="w-full rounded-lg border border-stone-200 bg-white py-1.5 pl-3 pr-8 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#846A75] sm:w-auto"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                            </select>

                            <select
                                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#846A75] sm:w-auto"
                                value={timeFilter}
                                onChange={(e) => setTimeFilter(e.target.value)}
                            >
                                <option value="all">All Day Hours</option>
                                <option value="morning">Morning Slots (Before 12PM)</option>
                                <option value="afternoon">Afternoon Slots (12PM onwards)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {filteredAndSortedBookings.length ? (
                            filteredAndSortedBookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    className="flex flex-col gap-3 rounded-xl border border-[#E7DDE1] bg-[var(--ri-surface-subtle)] p-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <p className="font-semibold text-[#6A535C]">
                                            {booking.facility?.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {booking.user?.name ?? booking.guest_name ?? 'Guest'} ·{' '}
                                            {booking.booking_date ?? booking.date} · {formatTime(booking.start_time)}–{formatTime(booking.end_time)}
                                        </p>
                                    </div>

                                    <div
                                        className="flex shrink-0 gap-2"
                                        onClick={(e) => e.stopPropagation()}
                                    >
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
                            <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 py-6 text-center text-sm text-slate-500">
                                No bookings matching your filter parameters found.
                            </p>
                        )}
                    </div>
                </section>

                <section className="ri-panel p-5 sm:p-6">
                    <div className="flex justify-between">
                        <h2 className="font-semibold text-slate-900">
                            Recent concerns
                        </h2>
                        <Link
                            href={route('admin.concerns.index')}
                            className="text-sm font-semibold text-[#6A535C]"
                        >
                            View all
                        </Link>
                    </div>

                    {recentConcerns.map((concern) => (
                        <p
                            key={concern.id}
                            className="mt-3 border-t border-stone-100 pt-3 text-sm"
                        >
                            {concern.message}{' '}
                            <span className="text-xs text-slate-500">
                                — {concern.user?.name ?? 'Guest'}
                            </span>
                        </p>
                    ))}
                </section>

                <section className="ri-panel space-y-4 p-5 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h2 className="font-semibold text-slate-900">Client &amp; operations analytics</h2>
                            <p className="mt-0.5 text-xs text-slate-500">{operationalAnalytics.periodLabel ?? 'Last 6 months'} · filtered by the selected date range and facility scope</p>
                        </div>
                    </div>
                    <form onSubmit={applyAnalyticsFilters} className="mb-4 grid gap-3 rounded-xl border border-[var(--ri-border)] bg-[var(--ri-surface-subtle)] p-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto_auto] lg:items-end">
                        <label className="block text-xs font-semibold text-slate-600">
                            Facility scope
                            <select value={analyticsFacility} onChange={(event) => setAnalyticsFacility(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 focus:border-[#846A75] focus:outline-none focus:ring-2 focus:ring-[#846A75]/20">
                                <option value="">All facilities</option>
                                {analyticsFacilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
                            </select>
                        </label>
                        <label className="block text-xs font-semibold text-slate-600">
                            From
                            <input type="date" value={analyticsFrom} onChange={(event) => setAnalyticsFrom(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 focus:border-[#846A75] focus:outline-none focus:ring-2 focus:ring-[#846A75]/20" />
                        </label>
                        <label className="block text-xs font-semibold text-slate-600">
                            To
                            <input type="date" min={analyticsFrom || undefined} value={analyticsTo} onChange={(event) => setAnalyticsTo(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 focus:border-[#846A75] focus:outline-none focus:ring-2 focus:ring-[#846A75]/20" />
                        </label>
                        <label className="block text-xs font-semibold text-slate-600">
                            Trend interval
                            <select value={analyticsGroupBy} onChange={(event) => setAnalyticsGroupBy(event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 focus:border-[#846A75] focus:outline-none focus:ring-2 focus:ring-[#846A75]/20">
                                <option value="day">Daily</option>
                                <option value="week">Weekly</option>
                                <option value="month">Monthly</option>
                            </select>
                        </label>
                        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6A535C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#533e45]">
                            <SlidersHorizontal className="h-4 w-4" /> Apply
                        </button>
                        <button type="button" onClick={resetAnalyticsFilters} className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-100">
                            Reset
                        </button>
                    </form>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                            ['clients', 'Unique clients', operationalAnalytics.uniqueClients ?? 0, 'Distinct account holders and guest contacts'],
                            ['returningClients', 'Returning clients', operationalAnalytics.returningClients ?? 0, 'Clients with more than one booking'],
                            ['approvalRate', 'Approval rate', `${operationalAnalytics.approvalRate ?? 0}%`, 'Approved out of approved/declined decisions'],
                            ['cancellationRate', 'Cancellation rate', `${operationalAnalytics.cancellationRate ?? 0}%`, 'Cancelled out of all requests'],
                            ['approvalTime', 'Average approval time', operationalAnalytics.averageApprovalHours == null ? 'No data' : `${operationalAnalytics.averageApprovalHours} hrs`, 'From request creation to approval'],
                            ['peakHour', 'Peak booking hour', operationalAnalytics.peakHour ?? 'No data', `${operationalAnalytics.peakHourBookings ?? 0} bookings started in this hour`],
                            ['overtime', 'Overtime minutes', `${operationalAnalytics.overtimeMinutes ?? 0} min`, `${operationalAnalytics.overtimeBookings ?? 0} bookings with recorded overtime`],
                            ['overtime', 'Overtime fees', `₱${Number(operationalAnalytics.overtimeFees ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Recorded overtime charges in the period'],
                        ].map(([key, label, value, hint], index) => (
                            <button key={`${key}-${index}`} type="button" onClick={() => setAnalyticsDetailKey(key)} className="group rounded-xl border border-[var(--ri-border)] bg-[var(--ri-surface-subtle)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#846A75] hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#846A75] focus:ring-offset-2">
                                <span className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600"><span>{label}</span><span className="text-[10px] font-bold uppercase tracking-wide text-[#846A75] opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">View details</span></span>
                                <span className="mt-2 block text-xl font-bold text-[#6A535C]">{value}</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">{hint}</span>
                            </button>
                        ))}
                    </div>
                    <div className="mt-5 grid gap-5 xl:grid-cols-2">

<section className="rounded-xl border border-[var(--ri-border)] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">Booking volume over time</h2>
                                <p className="mt-1 text-xs text-slate-500 capitalize">{analyticsFilters.group_by ?? 'month'} view</p>
                            </div>
                            <div className="rounded-lg bg-[var(--ri-surface-subtle)] px-3 py-2 text-right">
                                <p className="text-xs text-slate-500">Compared with previous {Math.max(1, Math.round((new Date(analyticsFilters.to).getTime() - new Date(analyticsFilters.from).getTime()) / 86400000) + 1)}-day period</p>
                                <p className="text-sm font-bold text-[#6A535C]">{periodComparison.change == null ? 'No previous-period data' : `${periodComparison.change > 0 ? '+' : ''}${periodComparison.change}%`}</p>
                                <p className="text-[10px] text-slate-500">{periodComparison.currentBookings ?? 0} current · {periodComparison.previousBookings ?? 0} previous</p>
                            </div>
                        </div>

                        <div className="mt-6 overflow-x-auto">
                            <div className="flex h-44 min-w-[560px] items-end gap-3">
                                {usageOverTime.map((item) => {
                                    const facilityHint = (item.facilities ?? []).map((facility) => `${facility.name}: ${facility.bookings}`).join(', ');
                                    return (
                                        <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                                            <span className="text-xs font-semibold">{item.bookings}</span>
                                            <button type="button"
                                                onClick={() => setSelectedTrendLabel(item.label)}
                                                title={`${item.label}: ${item.bookings} bookings. ${facilityHint || 'No facility details'}`}
                                                aria-label={`View facilities booked in ${item.label}`}
                                                className={`flex w-full flex-1 items-end rounded-t-lg bg-[#F4ECEF] outline-none ring-offset-2 transition hover:ring-2 hover:ring-[#846A75] focus:ring-2 focus:ring-[#846A75] ${selectedTrendLabel === item.label ? 'ring-2 ring-[#6A535C]' : ''}`}
                                            >
                                                <span className="block w-full rounded-t-lg bg-[#846A75]" style={{ height: `${(item.bookings / maximum) * 100}%`, minHeight: item.bookings ? '8px' : '2px' }}/>
                                            </button>
                                            <span className="text-[10px] text-slate-500">{item.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {selectedTrend && (
                            <div className="mt-4 rounded-xl border border-[#E7DDE1] bg-[#FFFAF7] p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div><p className="text-sm font-bold text-[#6A535C]">{selectedTrend.label} facility activity</p><p className="text-xs text-slate-500">{selectedTrend.bookings} bookings across {(selectedTrend.facilities ?? []).length} facilities</p></div>
                                    <button type="button" onClick={() => setSelectedTrendLabel(null)} className="text-xs font-semibold text-[#6A535C] hover:underline">Clear</button>
                                </div>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {(selectedTrend.facilities ?? []).map((facility) => <div key={facility.name} className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs"><span className="text-slate-700">{facility.name}</span><span className="font-bold text-[#6A535C]">{facility.bookings}</span></div>)}
                                    {(selectedTrend.facilities ?? []).length === 0 && <p className="text-xs text-slate-500">No facility activity in this period.</p>}
                                </div>
                            </div>
                        )}
                    </section>

<div className="rounded-xl border border-[var(--ri-border)] p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-[#6A535C]">Status breakdown</h3><span className="text-xs text-slate-500">{statusBreakdown.reduce((sum, item) => sum + Number(item.count || 0), 0)} bookings in selected period</span></div>
                        <div className="space-y-3">{displayedStatusBreakdown.map((item) => {
                            const statusColors = { pending: 'bg-amber-400', approved: 'bg-emerald-500', completed: 'bg-sky-500', declined: 'bg-rose-500', cancelled: 'bg-slate-400' };
                            return <button type="button" key={item.status} onClick={() => setAnalyticsDetailKey(item.status)} className="group block w-full rounded-lg p-1 text-left transition hover:bg-[#FFFAF7] focus:outline-none focus:ring-2 focus:ring-[#846A75]">
                                <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold capitalize text-slate-700">{item.status}</span><span className="text-sm font-bold text-slate-900">{item.count} <span className="ml-1 text-[10px] font-normal text-slate-500">{item.percentage.toFixed(1)}%</span></span></div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200"><div className={`h-full rounded-full ${statusColors[item.status] ?? 'bg-slate-400'}`} style={{ width: `${Math.max(0, Math.min(100, item.percentage))}%` }}/></div>
                                <span className="mt-1 block text-right text-[10px] font-semibold text-[#846A75] opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">View details</span>
                            </button>;
                        })}</div>
                    </div>

                    </div>

                    <div className="mt-5">

<section className="rounded-xl border border-[var(--ri-border)] p-4">
                        <h2 className="text-sm font-bold text-slate-900">
                            Most used facilities
                        </h2>

                        <div className="mt-4 space-y-3">
                            {mostUsedFacilities.length ? (
                                mostUsedFacilities.map((facility) => (
                                    <button
                                        key={facility.name}
                                        type="button"
                                        onClick={() => {
                                            const allBookings = [
                                                ...(analyticsDetails.pending ?? []),
                                                ...(analyticsDetails.approved ?? []),
                                                ...(analyticsDetails.completed ?? []),
                                                ...(analyticsDetails.declined ?? []),
                                                ...(analyticsDetails.cancelled ?? []),
                                            ];
                                            const facilityBookings = allBookings.filter((booking) => {
                                                const bookingFacility = booking.facility?.name
                                                    ?? booking.facility_name
                                                    ?? (typeof booking.facility === 'string' ? booking.facility : '');
                                                return String(bookingFacility).trim().toLowerCase()
                                                    === String(facility.name).trim().toLowerCase();
                                            });
                                            setAnalyticsDetailKey({
                                                type: 'facility',
                                                name: facility.name,
                                                items: facilityBookings,
                                            });
                                        }}
                                        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[#E7DDE1] bg-[var(--ri-surface-subtle)] px-3 py-2 text-left text-sm transition hover:border-[#BDAAB2] hover:bg-[#FFFAF7] focus:outline-none focus:ring-2 focus:ring-[#846A75]"
                                    >
                                        <span className="min-w-0 text-left">
                                            <span className="block truncate text-slate-700">{facility.name}</span>
                                            <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-[#846A75] opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">View details</span>
                                        </span>
                                        <span className="shrink-0 font-semibold text-[#6A535C]">
                                            {facility.bookings} bookings
                                        </span>
                                    </button>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500">
                                    No booking data yet.
                                </p>
                            )}
                        </div>
                    </section>

                    </div>

                </section>
            </div>

            <AnalyticsDetailModal detailKey={analyticsDetailKey} details={analyticsDetails} facilities={analyticsFacilities} pendingBookings={pendingBookings} recentConcerns={recentConcerns} onClose={() => setAnalyticsDetailKey(null)} />

            <BookingDetailModal
                booking={viewBooking}
                onClose={() => setViewBooking(null)}
            />

            {confirmApproveId && (
                <ConfirmApproveModal
                    bookingId={confirmApproveId}
                    onConfirm={confirmApprove}
                    onCancel={() => setConfirmApproveId(null)}
                    isProcessing={processingId === confirmApproveId}
                />
            )}

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
                                    onClick={() => setDeclineModalOpen(false)}
                                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
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