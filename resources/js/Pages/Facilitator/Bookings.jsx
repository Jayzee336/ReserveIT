import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
    CheckCircle2,
    XCircle,
    Clock,
    User as UserIcon,
    Eye,
    Calendar,
    Users,
    Search,
    FileText,
    Trash2,
    LogIn,
    LogOut,
    ShieldAlert,
} from 'lucide-react';

const STATUS_STYLES = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    declined: 'bg-red-50 text-red-700 ring-red-600/20',
    cancelled: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

function StatusBadge({ status }) {
    const normalized = String(status || '').toLowerCase();

    return (
        <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                STATUS_STYLES[normalized] ?? STATUS_STYLES.pending
            }`}
        >
            {String(status || '').toUpperCase()}
        </span>
    );
}

function formatTimestamp(value) {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleString();
}

/**
 * Compare date-only values without converting them to UTC.
 * Booking dates are expected in YYYY-MM-DD format.
 */
function getLocalDateString() {
    const now = new Date();

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
    ].join('-');
}

function isPastBookingDate(booking) {
    const date = String(
        booking?.date ?? booking?.booking_date ?? '',
    ).slice(0, 10);

    return /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        date < getLocalDateString();
}

function getFirstErrorMessage(errors, fallback) {
    if (!errors || typeof errors !== 'object') {
        return fallback;
    }

    const message =
        errors.check_in ||
        errors.reason ||
        errors.check_out ||
        errors.message ||
        Object.values(errors).find((value) => typeof value === 'string');

    return typeof message === 'string' ? message : fallback;
}

function CheckInOutStatus({ booking }) {
    if (booking.checked_out_at) {
        return (
            <div className="space-y-1 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 font-semibold text-gray-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Checked out
                </span>
                <p>{formatTimestamp(booking.checked_out_at)}</p>
            </div>
        );
    }

    if (booking.checked_in_at) {
        return (
            <div className="space-y-1 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Checked in
                </span>
                <p>{formatTimestamp(booking.checked_in_at)}</p>
            </div>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
            <Clock className="h-3.5 w-3.5" />
            Not checked in
        </span>
    );
}

function CheckInOutActions({
    booking,
    onCheckIn,
    onCheckOut,
    isProcessing,
}) {
    if (String(booking.status || '').toLowerCase() !== 'approved') {
        return <span className="text-xs text-gray-400">Not available</span>;
    }

    if (booking.checked_out_at) {
        return <span className="text-xs text-gray-500">Completed</span>;
    }

    if (booking.checked_in_at) {
        return (
            <button
                type="button"
                onClick={() => onCheckOut(booking.id)}
                disabled={isProcessing}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <LogOut className="h-3.5 w-3.5" />
                {isProcessing ? 'Processing…' : 'Check Out'}
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={() => onCheckIn(booking)}
            disabled={isProcessing}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
            <LogIn className="h-3.5 w-3.5" />
            {isProcessing ? 'Processing…' : 'Check In'}
        </button>
    );
}

function PendingBookingCard({
    booking,
    onView,
    onApprove,
    onDecline,
    isProcessing,
}) {
    return (
        <div
            className="cursor-pointer rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-gray-200 hover:shadow-md"
            onClick={() => onView(booking)}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-gray-900">
                        {booking.facility?.name ?? 'Unknown Facility'}
                    </h3>

                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                        <UserIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                            {booking.user?.name ?? booking.guest_name ?? 'Guest'}
                        </span>
                    </p>

                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {booking.date ?? booking.booking_date} · {booking.start_time} - {booking.end_time}
                    </p>

                    {booking.notes && (
                        <p className="mt-2 line-clamp-2 whitespace-pre-line text-xs text-gray-400">
                            {booking.notes}
                        </p>
                    )}
                </div>

                <StatusBadge status={booking.status} />
            </div>

            <div
                className="mt-4 flex gap-2"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={() => onView(booking)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                >
                    <Eye className="h-4 w-4" />
                    View
                </button>

                <button
                    type="button"
                    onClick={() => onApprove(booking.id)}
                    disabled={isProcessing}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                </button>

                <button
                    type="button"
                    onClick={() => onDecline(booking.id)}
                    disabled={isProcessing}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                >
                    <XCircle className="h-4 w-4" />
                    Decline
                </button>
            </div>
        </div>
    );
}

function BookingDetailModal({
    booking,
    onClose,
    onCheckIn,
    onCheckOut,
    processingId,
}) {
    if (!booking) return null;

    const isApproved =
        String(booking.status || '').toLowerCase() === 'approved';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4"
            onClick={onClose}
        >
            <div
                className="my-auto w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl"
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
                            <p className="mt-0.5 text-xs text-gray-500">
                                {booking.user?.email ?? booking.guest_email}
                            </p>
                        )}
                    </div>

                    <div className="rounded-xl bg-stone-50 p-4">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Date & Time
                        </p>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {booking.date ?? booking.booking_date}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-600">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            {booking.start_time} – {booking.end_time}
                        </p>
                    </div>

                    <div className="rounded-xl bg-stone-50 p-4">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Attendees
                        </p>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                            <Users className="h-3.5 w-3.5 text-gray-400" />
                            {booking.attendees ?? 1}{' '}
                            {Number(booking.attendees ?? 1) === 1
                                ? 'person'
                                : 'people'}
                        </p>

                        {booking.needs_manpower && (
                            <span className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                Needs manpower
                            </span>
                        )}
                    </div>

                    {booking.guest_phone && (
                        <div className="rounded-xl bg-stone-50 p-4">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Contact Phone
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                                {booking.guest_phone}
                            </p>
                        </div>
                    )}

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

                    {booking.approved_by && (
                        <div className="rounded-xl bg-emerald-50 p-4 sm:col-span-2">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                                Approved By
                            </p>
                            <p className="text-sm text-emerald-700">
                                {booking.approved_by}
                                {booking.approved_at
                                    ? ` · ${formatTimestamp(booking.approved_at)}`
                                    : ''}
                            </p>
                        </div>
                    )}

                    {isApproved && (
                        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:col-span-2">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
                                Facility Check-In / Check-Out
                            </p>

                            <div className="mb-4">
                                <CheckInOutStatus booking={booking} />
                            </div>

                            <CheckInOutActions
                                booking={booking}
                                onCheckIn={onCheckIn}
                                onCheckOut={onCheckOut}
                                isProcessing={processingId === booking.id}
                            />
                        </div>
                    )}

                    {booking.consent_file_uploaded && (
                        <div className="rounded-xl bg-indigo-50 p-4 sm:col-span-2">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                                Consent Letter
                            </p>
                            <a
                                href={route('bookings.consent', booking.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 underline hover:text-indigo-900"
                            >
                                <FileText className="h-4 w-4" />
                                {booking.consent_file_name ||
                                    'Download consent letter'}
                            </a>
                        </div>
                    )}
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

function PastBookingOverrideModal({
    booking,
    reason,
    setReason,
    onSubmit,
    onCancel,
    isProcessing,
}) {
    if (!booking) return null;

    const trimmedLength = reason.trim().length;
    const isValidReason = trimmedLength >= 10 && trimmedLength <= 1000;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"
            onClick={onCancel}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="past-booking-override-title"
                className="my-auto w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100">
                        <ShieldAlert className="h-6 w-6 text-amber-700" />
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                            Super Admin Override
                        </p>
                        <h3
                            id="past-booking-override-title"
                            className="mt-1 text-xl font-semibold text-gray-900"
                        >
                            Check in a past-dated booking
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                            This booking's scheduled date has passed. Enter a
                            reason to authorize the check-in. The reason will
                            be recorded in the activity log.
                        </p>
                    </div>
                </div>

                <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-gray-900">
                        {booking.facility?.name ?? 'Unknown Facility'}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                        {booking.user?.name ?? booking.guest_name ?? 'Guest'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        Scheduled date:{' '}
                        {booking.date ?? booking.booking_date ?? 'Unknown'}
                    </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="past-booking-override-reason"
                            className="mb-2 block text-sm font-semibold text-gray-800"
                        >
                            Reason for override
                        </label>

                        <textarea
                            id="past-booking-override-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            maxLength={1000}
                            minLength={10}
                            required
                            autoFocus
                            placeholder="Explain why this past-dated booking needs to be checked in..."
                            className="block w-full resize-y rounded-2xl border border-gray-200 p-3 text-sm text-gray-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                        />

                        <div className="mt-2 flex items-start justify-between gap-3">
                            <p className="text-xs text-gray-500">
                                Enter at least 10 characters. Be specific and
                                factual.
                            </p>
                            <span
                                className={`shrink-0 text-xs font-medium ${
                                    isValidReason
                                        ? 'text-emerald-600'
                                        : 'text-gray-500'
                                }`}
                            >
                                {trimmedLength}/1000
                            </span>
                        </div>

                        {trimmedLength > 0 && trimmedLength < 10 && (
                            <p className="mt-2 text-xs text-red-600">
                                The reason must contain at least 10 non-space
                                characters.
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isProcessing}
                            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={isProcessing || !isValidReason}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <LogIn className="h-4 w-4" />
                            {isProcessing
                                ? 'Checking in…'
                                : 'Confirm Override & Check In'}
                        </button>
                    </div>
                </form>
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
                        This action will confirm the booking. You cannot undo
                        this.
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

export default function Bookings({
    pendingBookings = [],
    reviewedBookings = [],
    pastUnapprovedBookings = [],
    filters = {},
}) {
    const page = usePage();
    const user = page.props.auth?.user;
    const isSuperAdmin = user?.role === 'super_admin';
    const routePrefix = isSuperAdmin ? 'admin' : 'facilitator';

    const [processingId, setProcessingId] = useState(null);
    const [declineModalOpen, setDeclineModalOpen] = useState(false);
    const [declineReason, setDeclineReason] = useState('');
    const [declineBookingId, setDeclineBookingId] = useState(null);
    const [viewBooking, setViewBooking] = useState(null);
    const [confirmApproveId, setConfirmApproveId] = useState(null);

    const [overrideBooking, setOverrideBooking] = useState(null);
    const [overrideReason, setOverrideReason] = useState('');

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const debounceTimer = useRef(null);

    useEffect(() => {
        setSearchQuery(filters.search || '');
        setStatusFilter(filters.status || '');
    }, [filters.search, filters.status]);

    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({
                only: [
                    'pendingBookings',
                    'reviewedBookings',
                    'pastUnapprovedBookings',
                ],
                preserveScroll: true,
                preserveState: true,
            });
        }, 30000);

        return () => {
            clearInterval(interval);

            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    const debouncedFilterReload = useCallback((search, status) => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            router.get(
                window.location.pathname,
                {
                    search: search || null,
                    status: status || null,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 350);
    }, []);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        debouncedFilterReload(value, statusFilter);
    };

    const handleStatusChange = (e) => {
        const value = e.target.value;
        setStatusFilter(value);
        debouncedFilterReload(searchQuery, value);
    };

    const filteredPending = useMemo(() => {
        if (!searchQuery.trim()) return pendingBookings;

        const query = searchQuery.toLowerCase();

        return pendingBookings.filter(
            (booking) =>
                booking.facility?.name?.toLowerCase().includes(query) ||
                booking.user?.name?.toLowerCase().includes(query) ||
                booking.guest_name?.toLowerCase().includes(query),
        );
    }, [pendingBookings, searchQuery]);

    const filteredReviewed = useMemo(() => {
        if (!searchQuery.trim()) return reviewedBookings;

        const query = searchQuery.toLowerCase();

        return reviewedBookings.filter(
            (booking) =>
                booking.facility?.name?.toLowerCase().includes(query) ||
                booking.user?.name?.toLowerCase().includes(query) ||
                booking.guest_name?.toLowerCase().includes(query),
        );
    }, [reviewedBookings, searchQuery]);

    const filteredPastUnapproved = useMemo(() => {
        if (!searchQuery.trim()) return pastUnapprovedBookings;

        const query = searchQuery.toLowerCase();

        return pastUnapprovedBookings.filter(
            (booking) =>
                booking.facility?.name?.toLowerCase().includes(query) ||
                booking.user?.name?.toLowerCase().includes(query) ||
                booking.guest_name?.toLowerCase().includes(query),
        );
    }, [pastUnapprovedBookings, searchQuery]);

    const handleView = (booking) => setViewBooking(booking);
    const handleApproveClick = (bookingId) => setConfirmApproveId(bookingId);

    const handleDeleteBooking = (bookingId) => {
        if (
            !confirm(
                'Delete this past unapproved booking? This action cannot be undone.',
            )
        ) {
            return;
        }

        setProcessingId(bookingId);

        router.delete(route(`${routePrefix}.bookings.destroy`, bookingId), {
            preserveScroll: true,
            onSuccess: () => toast.success('Past unapproved booking deleted.'),
            onError: () => toast.error('Failed to delete booking.'),
            onFinish: () => setProcessingId(null),
        });
    };

    const handleDeleteAll = () => {
        if (
            !confirm(
                `Delete ALL ${filteredPastUnapproved.length} past unapproved booking(s)? This action cannot be undone.`,
            )
        ) {
            return;
        }

        setProcessingId('all');

        router.delete(route(`${routePrefix}.bookings.destroyAll`), {
            preserveScroll: true,
            onSuccess: () => toast.success('All past unapproved bookings deleted.'),
            onError: () => toast.error('Failed to delete bookings.'),
            onFinish: () => setProcessingId(null),
        });
    };

    const confirmApprove = (bookingId) => {
        setProcessingId(bookingId);

        router.patch(
            route(`${routePrefix}.bookings.approve`, bookingId),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Booking approved.');
                    setConfirmApproveId(null);
                },
                onError: () =>
                    toast.error('Something went wrong. Please try again.'),
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

        if (!declineBookingId) return;

        setProcessingId(declineBookingId);

        router.patch(
            route(`${routePrefix}.bookings.decline`, declineBookingId),
            { rejection_reason: declineReason.trim() },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Booking declined.');
                    setDeclineModalOpen(false);
                },
                onError: () =>
                    toast.error('Something went wrong. Please try again.'),
                onFinish: () => {
                    setProcessingId(null);
                    setDeclineBookingId(null);
                },
            },
        );
    };

    /**
     * Normal check-ins submit immediately.
     * Past-dated bookings require a reason when checked in by a Super Admin.
     * Laravel remains responsible for enforcing authorization and validation.
     */
    const handleCheckIn = (booking) => {
        if (processingId !== null || !booking?.id) return;

        if (isPastBookingDate(booking)) {
            if (!isSuperAdmin) {
                toast.error(
                    'Check-in is not allowed for past-dated bookings. Contact a Super Admin for assistance.',
                );
                return;
            }

            setOverrideBooking(booking);
            setOverrideReason('');
            return;
        }

        submitCheckIn(booking.id);
    };

    const submitCheckIn = (bookingId, reason = null) => {
        if (processingId !== null) return;

        const requestData =
            typeof reason === 'string'
                ? { reason: reason.trim() }
                : {};

        setProcessingId(bookingId);

        router.post(
            route('bookings.check-in', bookingId),
            requestData,
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        typeof reason === 'string'
                            ? 'Past-dated booking checked in. Override reason recorded.'
                            : 'Booking checked in.',
                    );

                    const checkedInAt = new Date().toISOString();

                    setViewBooking((current) =>
                        current?.id === bookingId
                            ? {
                                  ...current,
                                  checked_in_at: checkedInAt,
                              }
                            : current,
                    );

                    setOverrideBooking(null);
                    setOverrideReason('');
                },
                onError: (errors) => {
                    toast.error(
                        getFirstErrorMessage(
                            errors,
                            'Unable to check in this booking. Please refresh and try again.',
                        ),
                    );
                },
                onFinish: () => setProcessingId(null),
            },
        );
    };

    const submitPastBookingOverride = (e) => {
        e.preventDefault();

        if (!overrideBooking) return;

        const reason = overrideReason.trim();

        if (reason.length < 10) {
            toast.error(
                'The override reason must be at least 10 characters.',
            );
            return;
        }

        if (reason.length > 1000) {
            toast.error(
                'The override reason cannot exceed 1000 characters.',
            );
            return;
        }

        submitCheckIn(overrideBooking.id, reason);
    };

    const cancelPastBookingOverride = () => {
        if (processingId === overrideBooking?.id) return;

        setOverrideBooking(null);
        setOverrideReason('');
    };

    const handleCheckOut = (bookingId) => {
        if (processingId !== null) return;

        setProcessingId(bookingId);

        router.post(
            route('bookings.check-out', bookingId),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Booking checked out.');

                    setViewBooking((current) =>
                        current?.id === bookingId
                            ? {
                                  ...current,
                                  checked_out_at: new Date().toISOString(),
                              }
                            : current,
                    );
                },
                onError: (errors) => {
                    toast.error(
                        getFirstErrorMessage(
                            errors,
                            'Unable to check out this booking. Please refresh and try again.',
                        ),
                    );
                },
                onFinish: () => setProcessingId(null),
            },
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <h1 className="text-2xl font-bold text-gray-900">
                    Booking Approvals
                </h1>
            }
        >
            <Head title="Booking Approvals" />

            <div className="space-y-8 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Search by facility, user or guest name…"
                            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={handleStatusChange}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-56"
                    >
                        <option value="">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="declined">Declined</option>
                        <option value="past_unapproved">Past Unapproved</option>
                    </select>
                </div>

                {(!statusFilter || statusFilter === 'pending') && (
                    <div>
                        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
                            Pending Decisions ({filteredPending.length})
                        </h2>

                        {filteredPending.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
                                <p className="text-sm text-gray-400">
                                    {searchQuery
                                        ? 'No pending bookings match your search.'
                                        : 'No pending bookings right now.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredPending.map((booking) => (
                                    <PendingBookingCard
                                        key={booking.id}
                                        booking={booking}
                                        onView={handleView}
                                        onApprove={handleApproveClick}
                                        onDecline={handleDeclineClick}
                                        isProcessing={
                                            processingId === booking.id
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {statusFilter === 'past_unapproved' && (
                    <div>
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                                Past Unapproved Bookings (
                                {filteredPastUnapproved.length})
                            </h2>

                            {filteredPastUnapproved.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleDeleteAll}
                                    disabled={processingId === 'all'}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {processingId === 'all'
                                        ? 'Deleting…'
                                        : 'Delete All'}
                                </button>
                            )}
                        </div>

                        <p className="mb-4 text-xs text-gray-400">
                            Requests whose scheduled date has already passed
                            without an explicit approval or rejection.
                        </p>

                        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Facility
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Requested By
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {filteredPastUnapproved.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-6 py-8 text-center text-sm text-gray-400"
                                            >
                                                {searchQuery
                                                    ? 'No past unapproved bookings match your search.'
                                                    : 'No past unapproved bookings found.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPastUnapproved.map(
                                            (booking) => (
                                                <tr key={booking.id}>
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                        {booking.facility
                                                            ?.name ?? 'Unknown'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {booking.user?.name ??
                                                            booking.guest_name ??
                                                            'Guest'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {booking.date ??
                                                            booking.booking_date}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <StatusBadge
                                                            status={
                                                                booking.status
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleView(
                                                                        booking,
                                                                    )
                                                                }
                                                                className="rounded-lg bg-gray-50 p-2 text-gray-600 hover:bg-gray-100"
                                                                title="View details"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleApproveClick(
                                                                        booking.id,
                                                                    )
                                                                }
                                                                disabled={
                                                                    processingId ===
                                                                    booking.id
                                                                }
                                                                className="rounded-lg bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                                                                title="Approve"
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDeclineClick(
                                                                        booking.id,
                                                                    )
                                                                }
                                                                disabled={
                                                                    processingId ===
                                                                    booking.id
                                                                }
                                                                className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-50"
                                                                title="Decline"
                                                            >
                                                                <XCircle className="h-3.5 w-3.5" />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDeleteBooking(
                                                                        booking.id,
                                                                    )
                                                                }
                                                                disabled={
                                                                    processingId ===
                                                                    booking.id
                                                                }
                                                                className="rounded-lg bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                                                                title="Delete booking"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ),
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {(!statusFilter ||
                    (statusFilter !== 'pending' &&
                        statusFilter !== 'past_unapproved')) && (
                    <div>
                        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
                            {statusFilter
                                ? `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Decisions`
                                : 'Recent Decisions'}
                        </h2>

                        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Facility
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Requested By
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Check-In / Out
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {filteredReviewed.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-6 py-8 text-center text-sm text-gray-400"
                                            >
                                                No matching decisions found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredReviewed.map((booking) => (
                                            <tr key={booking.id}>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {booking.facility?.name ??
                                                        'Unknown'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {booking.user?.name ??
                                                        booking.guest_name ??
                                                        'Guest'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {booking.date ??
                                                        booking.booking_date}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge
                                                        status={booking.status}
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    {String(
                                                        booking.status || '',
                                                    ).toLowerCase() ===
                                                    'approved' ? (
                                                        <CheckInOutStatus
                                                            booking={booking}
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-gray-400">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col items-start gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleView(
                                                                    booking,
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                            View
                                                        </button>

                                                        <CheckInOutActions
                                                            booking={booking}
                                                            onCheckIn={
                                                                handleCheckIn
                                                            }
                                                            onCheckOut={
                                                                handleCheckOut
                                                            }
                                                            isProcessing={
                                                                processingId ===
                                                                booking.id
                                                            }
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <BookingDetailModal
                booking={viewBooking}
                onClose={() => setViewBooking(null)}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                processingId={processingId}
            />

            <PastBookingOverrideModal
                booking={overrideBooking}
                reason={overrideReason}
                setReason={setOverrideReason}
                onSubmit={submitPastBookingOverride}
                onCancel={cancelPastBookingOverride}
                isProcessing={processingId === overrideBooking?.id}
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

                        <form
                            onSubmit={submitDecline}
                            className="space-y-4"
                        >
                            <textarea
                                value={declineReason}
                                onChange={(e) =>
                                    setDeclineReason(e.target.value)
                                }
                                rows={5}
                                className="block w-full rounded-2xl border border-gray-200 p-3 text-sm text-gray-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                placeholder="Share a short reason for the decline..."
                                required
                            />

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDeclineModalOpen(false)
                                    }
                                    disabled={
                                        processingId === declineBookingId
                                    }
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
                                    {processingId === declineBookingId
                                        ? 'Saving…'
                                        : 'Save reason'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}