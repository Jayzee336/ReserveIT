import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    CheckCircle2,
    XCircle,
    Eye,
    Clock,
    User as UserIcon,
    Calendar,
    Users,
    Plus,
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
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${styles[normalized] ?? styles.pending}`}>
            {String(status || '').toUpperCase()}
        </span>
    );
}

function BookingDetailModal({ booking, onClose }) {
    if (!booking) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
            <div className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 mb-6">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#6A535C]">Booking Details</p>
                        <h3 className="mt-1 text-xl font-semibold text-gray-900">{booking.facility?.name ?? 'Unknown Facility'}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700">✕</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Status</p>
                        <StatusBadge status={booking.status} />
                    </div>
                    <div className="rounded-xl bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Requested By</p>
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                            <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                            {booking.user?.name ?? booking.guest_name ?? 'Guest'}
                        </p>
                    </div>
                    <div className="rounded-xl bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Date & Time</p>
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {booking.date ?? booking.booking_date}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            {booking.start_time} – {booking.end_time}
                        </p>
                    </div>
                    <div className="rounded-xl bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Attendees</p>
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-gray-400" />
                            {booking.attendees ?? 1} {booking.attendees === 1 ? 'person' : 'people'}
                        </p>
                    </div>
                    {booking.notes && (
                        <div className="rounded-xl bg-stone-50 p-4 sm:col-span-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Notes</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{booking.notes}</p>
                        </div>
                    )}
                    {booking.decline_reason && (
                        <div className="rounded-xl bg-red-50 p-4 sm:col-span-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-1">Decline Reason</p>
                            <p className="text-sm text-red-700">{booking.decline_reason}</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button type="button" onClick={onClose} className="rounded-xl bg-[#6A535C] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#533e45]">Close</button>
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
                    <h3 className="text-xl font-semibold text-gray-900">Approve this booking?</h3>
                    <p className="mt-2 text-sm text-gray-500">This action will confirm the booking. You cannot undo this.</p>
                </div>
                <div className="flex gap-3 mt-6">
                    <button type="button" onClick={onCancel} disabled={isProcessing} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50">Cancel</button>
                    <button type="button" onClick={() => onConfirm(bookingId)} disabled={isProcessing} className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                        {isProcessing ? 'Approving…' : 'Yes, approve'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function FacilitatorDashboard({ stats = {}, pendingBookings = [], facilities = [], selectedFacilityId = null, todaySchedule = {} }) {
    const [processingId, setProcessingId] = useState(null);
    const [viewBooking, setViewBooking] = useState(null);
    const [confirmApproveId, setConfirmApproveId] = useState(null);
    const [declineModalOpen, setDeclineModalOpen] = useState(false);
    const [declineReason, setDeclineReason] = useState('');
    const [declineBookingId, setDeclineBookingId] = useState(null);

    const pendingApprovals = stats?.pendingApprovals ?? 0;
    const todayBookings = stats?.todayBookings ?? 0;
    const weeklyUtilizationRate = stats?.weeklyUtilizationRate ?? 0;
    const activeOccupancy = stats?.activeOccupancy ?? 0;

    const handleFacilityChange = (event) => {
        const facilityId = event.target.value;

        router.get(route('facilitator.dashboard'), facilityId ? { facility_id: facilityId } : {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const confirmApprove = (bookingId) => {
        setProcessingId(bookingId);
        router.patch(route('facilitator.bookings.approve', bookingId), {}, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Booking approved.');
                setConfirmApproveId(null);
            },
            onError: () => toast.error('Something went wrong. Please try again.'),
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
        router.patch(route('facilitator.bookings.decline', declineBookingId), {
            rejection_reason: declineReason.trim(),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Booking declined.');
                setDeclineModalOpen(false);
            },
            onError: () => toast.error('Something went wrong. Please try again.'),
            onFinish: () => {
                setProcessingId(null);
                setDeclineBookingId(null);
            },
        });
    };

    return (
        <AuthenticatedLayout header={<h1 className="text-2xl font-bold">Facilitator Dashboard</h1>}>
            <Head title="Facilitator Dashboard" />

            
<div className="space-y-6 p-6">
    <div className="flex flex-col gap-4 rounded-2xl border border-stone-100 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
            <h2 className="text-xl font-semibold text-slate-900">
                Operational Command Center
            </h2>
            <p className="mt-1 text-sm text-slate-500">
                Review approvals and monitor the day across your assigned facilities.
            </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
                Facility scope
                <select
                    value={selectedFacilityId ?? ''}
                    onChange={handleFacilityChange}
                    className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#6A535C]"
                >
                    <option value="">All assigned facilities</option>
                    {facilities.map((facility) => (
                        <option key={facility.id} value={facility.id}>
                            {facility.name}
                        </option>
                    ))}
                </select>
            </label>

            <Link
                href={route('facilities.index')}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 whitespace-nowrap"
            >
                <Plus className="h-4 w-4" />
                Book a Facility
            </Link>
        </div>
    </div>


                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Stat label="Pending approvals" value={pendingApprovals} />
                    <Stat label="Today's bookings" value={todayBookings} />
                    <Stat label="Weekly utilization" value={`${weeklyUtilizationRate}%`} />
                    <Stat label="Active occupancy" value={activeOccupancy} />
                </div>

                <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-slate-900">Today's Operational Schedule</h2>
                        <p className="text-sm text-slate-500">Live view of ongoing, upcoming, and completed bookings.</p>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-3">
                        {[
                            { key: 'ongoing', title: 'Ongoing' },
                            { key: 'upcoming', title: 'Upcoming' },
                            { key: 'completed', title: 'Completed' },
                        ].map((group) => {
                            const items = todaySchedule?.[group.key] ?? [];

                            return (
                                <div key={group.key} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{group.title}</h3>
                                    <div className="mt-3 space-y-2">
                                        {items.length ? items.map((booking) => (
                                            <div key={booking.id} className="rounded-xl border border-white bg-white p-3">
                                                <p className="text-sm font-semibold text-slate-800">{booking.facility?.name ?? 'Facility'}</p>
                                                <p className="text-xs text-slate-500">{booking.start_time} – {booking.end_time}</p>
                                                <p className="mt-1 text-sm text-slate-700">{booking.user?.name ?? booking.guest_name ?? 'Guest'}</p>
                                                <p className="text-xs text-slate-500">{booking.user?.email ?? booking.guest_email ?? ''}</p>
                                            </div>
                                        )) : <p className="text-sm text-slate-500">No bookings.</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Pending Bookings List */}
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-slate-900">Bookings Awaiting Review</h2>
                        <Link href={route('facilitator.bookings.index')} className="text-sm font-semibold text-[#6A535C]">View All Approvals</Link>
                    </div>

                    <div className="mt-4 space-y-3">
                        {pendingBookings.length ? (
                            pendingBookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    className="flex flex-col gap-3 rounded-xl border border-stone-100 p-3 sm:flex-row sm:items-center sm:justify-between cursor-pointer transition hover:border-gray-200 hover:shadow-sm"
                                    onClick={() => setViewBooking(booking)}
                                >
                                    <div>
                                        <p className="font-medium text-stone-800">{booking.facility?.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {booking.user?.name ?? booking.guest_name ?? 'Guest'} · {booking.booking_date} · {booking.start_time}–{booking.end_time}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => setViewBooking(booking)}
                                            className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition"
                                        >
                                            <Eye className="h-4 w-4 inline-block mr-1" /> View
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setConfirmApproveId(booking.id); }}
                                            disabled={processingId === booking.id}
                                            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                                        >
                                            <CheckCircle2 className="h-4 w-4 inline-block mr-1" /> Approve
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeclineClick(booking.id)}
                                            disabled={processingId === booking.id}
                                            className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                                        >
                                            <XCircle className="h-4 w-4 inline-block mr-1" /> Decline
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500">No bookings awaiting review.</p>
                        )}
                    </div>
                </section>
            </div>

            {/* View Detail Modal */}
            <BookingDetailModal booking={viewBooking} onClose={() => setViewBooking(null)} />

            {/* Confirm Approve Modal */}
            {confirmApproveId && (
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
                            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-600">Decline booking</p>
                            <h3 className="mt-1 text-xl font-semibold text-gray-900">Add a reason for the rejection</h3>
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
                                <button type="button" onClick={() => setDeclineModalOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100">Cancel</button>
                                <button type="submit" disabled={processingId === declineBookingId || declineReason.trim().length === 0} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">
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