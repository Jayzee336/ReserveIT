import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
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
} from 'lucide-react';

function Stat({ label, value }) {
    return (
        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-[#6A535C]">{value}</p>
        </div>
    );
}

function StatusBadge({ status }) {
    const normalized = String(status || '').toLowerCase();

    const styles = {
        pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
        approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        declined: 'bg-red-50 text-red-700 ring-red-600/20',
        cancelled: 'bg-gray-100 text-gray-600 ring-gray-500/20',
    };

    return (
        <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                styles[normalized] ?? styles.pending
            }`}
        >
            {String(status || '').toUpperCase()}
        </span>
    );
}

function BookingDetailModal({ booking, onClose }) {
    if (!booking) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl"
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
                            {booking.attendees === 1 ? 'person' : 'people'}
                        </p>
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
    pendingBookings = [],
    recentConcerns = [],
}) {
    const [bookingsList, setBookingsList] = useState(pendingBookings);
    const [processingId, setProcessingId] = useState(null);
    const [viewBooking, setViewBooking] = useState(null);
    const [confirmApproveId, setConfirmApproveId] = useState(null);
    const [declineModalOpen, setDeclineModalOpen] = useState(false);
    const [declineReason, setDeclineReason] = useState('');
    const [declineBookingId, setDeclineBookingId] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [timeFilter, setTimeFilter] = useState('all');

    useEffect(() => {
        setBookingsList(pendingBookings);
    }, [pendingBookings]);

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
        <AuthenticatedLayout
            header={
                <h1 className="text-2xl font-bold">
                    Super Admin Dashboard
                </h1>
            }
        >
            <Head title="Admin Dashboard" />

            <div className="space-y-6 p-6">
                {/* Dashboard quick actions */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <Link
                        href={route('admin.active-bookings.page')}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6A535C] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#533e45] focus:outline-none focus:ring-2 focus:ring-[#846A75] focus:ring-offset-2"
                    >
                        <Activity className="h-4 w-4" />
                        Active Bookings Monitor
                    </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Stat label="Total facilities" value={stats.totalFacilities ?? 0} />
                    <Stat label="All bookings" value={stats.totalBookings ?? 0} />
                    <Stat label="Pending approval" value={stats.pendingApprovals ?? 0} />
                    <Stat label="Pending concerns" value={stats.pendingConcerns ?? 0} />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <section className="rounded-2xl bg-white p-5 shadow-sm">
                        <h2 className="font-semibold text-slate-900">
                            Booking volume over time
                        </h2>

                        <div className="mt-6 flex h-44 items-end gap-3">
                            {usageOverTime.map((item) => (
                                <div
                                    key={item.label}
                                    className="flex flex-1 flex-col items-center gap-2"
                                >
                                    <span className="text-xs font-semibold">
                                        {item.bookings}
                                    </span>
                                    <div
                                        className="w-full rounded-t-lg bg-[#846A75]"
                                        style={{
                                            height: `${(item.bookings / maximum) * 100}%`,
                                            minHeight: item.bookings ? '8px' : '2px',
                                        }}
                                    />
                                    <span className="text-[10px] text-slate-500">
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-2xl bg-white p-5 shadow-sm">
                        <h2 className="font-semibold text-slate-900">
                            Most used facilities
                        </h2>

                        <div className="mt-4 space-y-3">
                            {mostUsedFacilities.length ? (
                                mostUsedFacilities.map((facility) => (
                                    <div
                                        key={facility.name}
                                        className="flex justify-between rounded-xl bg-stone-50 px-3 py-2 text-sm"
                                    >
                                        <span>{facility.name}</span>
                                        <span className="font-semibold text-[#6A535C]">
                                            {facility.bookings} bookings
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500">
                                    No booking data yet.
                                </p>
                            )}
                        </div>
                    </section>
                </div>

                <section className="rounded-2xl bg-white p-5 shadow-sm">
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
                                    className="flex cursor-pointer flex-col gap-3 rounded-xl border border-stone-100 p-3 transition hover:border-gray-200 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                                    onClick={() => setViewBooking(booking)}
                                >
                                    <div>
                                        <p className="font-medium text-stone-800">
                                            {booking.facility?.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {booking.user?.name ?? booking.guest_name ?? 'Guest'} ·{' '}
                                            {booking.booking_date ?? booking.date} · {booking.start_time}–{booking.end_time}
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
                                            className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
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

                <section className="rounded-2xl bg-white p-5 shadow-sm">
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
            </div>

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