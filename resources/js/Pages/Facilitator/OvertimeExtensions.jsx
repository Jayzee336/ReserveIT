import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    MapPin,
    UserRound,
    XCircle,
} from 'lucide-react';

const statusStyle = {
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    declined: 'border-rose-200 bg-rose-50 text-rose-800',
};

const formatDate = (value) => {
    if (!value) return '—';
    return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('en-PH', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const formatTime = (value) => {
    if (!value) return '—';
    const [hourText, minuteText] = String(value).slice(0, 5).split(':');
    const hour = Number(hourText);
    return `${hour % 12 || 12}:${minuteText} ${hour >= 12 ? 'PM' : 'AM'}`;
};

export default function OvertimeExtensions({ extensionRequests }) {
    const openedFromApprovals = typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).get('from') === 'approvals';
    const [processingId, setProcessingId] = useState(null);
    const [declineId, setDeclineId] = useState(null);
    const [declineReason, setDeclineReason] = useState('');

    const decide = (request, action, reason = '') => {
        if (processingId) return;
        setProcessingId(request.id);

        const routeName = action === 'approve'
            ? 'overtime-extensions.approve'
            : 'overtime-extensions.decline';
        const payload = action === 'approve' ? {} : { decision_reason: reason };

        router.patch(route(routeName, request.id), payload, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(action === 'approve'
                    ? 'Extension approved and booking end time updated.'
                    : 'Extension request declined.');
                setDeclineId(null);
                setDeclineReason('');
            },
            onError: (errors) => toast.error(Object.values(errors)[0] || 'Unable to update the extension request.'),
            onFinish: () => setProcessingId(null),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-2">
                    <Clock3 className="h-5 w-5 text-[#6A535C]" />
                    <h2 className="text-lg font-semibold text-gray-800">Overtime Extension Requests</h2>
                </div>
            }
        >
            <Head title="Overtime Extensions | ReserveIT" />

            <main className="mx-auto w-full max-w-[1400px] space-y-5 px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        {openedFromApprovals && (
                            <Link href={route('facilitator.bookings.index')} className="inline-flex items-center gap-1 text-xs font-semibold text-[#745D67] hover:underline">
                                <ArrowLeft className="h-3.5 w-3.5" /> Back to booking approvals
                            </Link>
                        )}
                        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Overtime extension requests</h1>
                        <p className="mt-1 text-sm text-slate-500">Review requested reservation extensions. Approval changes the booking end time only after availability and operating hours are rechecked.</p>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
                        {(extensionRequests?.data || []).filter((item) => item.status === 'pending').length} pending on this page
                    </span>
                </div>

                <section className="space-y-3">
                    {(extensionRequests?.data || []).length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
                            <Clock3 className="mx-auto h-8 w-8 text-slate-300" />
                            <p className="mt-3 text-sm font-semibold text-slate-700">No extension requests found</p>
                            <p className="mt-1 text-xs text-slate-500">Requests from users for your managed facilities will appear here.</p>
                        </div>
                    ) : extensionRequests.data.map((item) => {
                        const booking = item.booking || {};
                        const facility = booking.facility || {};
                        return (
                            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="break-words text-sm font-bold text-slate-900">{facility.name || 'Facility booking'}</h2>
                                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                            <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" /> {item.requester?.name || booking.user?.name || 'Booking owner'}</span>
                                            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {facility.location || 'Location not recorded'}</span>
                                        </p>
                                    </div>
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusStyle[item.status] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>{item.status}</span>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Booking date</p>
                                        <p className="mt-1 text-sm font-bold text-slate-800">{formatDate(booking.date || booking.booking_date)}{booking.end_date && String(booking.end_date).slice(0, 10) !== String(booking.date || booking.booking_date).slice(0, 10) ? ' – ' + formatDate(booking.end_date) : ''}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Current booking time</p>
                                        <p className="mt-1 text-sm font-bold text-slate-800">{formatTime(booking.start_time)} – {formatTime(item.original_end_time)}</p>
                                    </div>
                                    <div className="rounded-lg bg-[#F7F0F3] p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#846A75]">Requested new end time</p>
                                        <p className="mt-1 text-sm font-bold text-[#543F48]">{formatTime(item.requested_end_time)} <span className="text-xs font-semibold">(+{item.requested_minutes} min)</span></p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Request submitted</p>
                                        <p className="mt-1 text-sm font-bold text-slate-800">{item.created_at ? new Date(item.created_at).toLocaleString('en-PH') : '—'}</p>
                                    </div>
                                </div>

                                <div className="mt-3 rounded-xl border border-slate-100 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Request reason</p>
                                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{item.reason}</p>
                                </div>

                                {item.decision_reason && (
                                    <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50/60 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700">Decision note</p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-rose-800">{item.decision_reason}</p>
                                    </div>
                                )}

                                {item.status === 'pending' && (
                                    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                                        {declineId === item.id ? (
                                            <div className="w-full space-y-2">
                                                <label className="block text-xs font-semibold text-slate-600">
                                                    Reason for declining
                                                    <textarea value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} required rows={2} maxLength={1000} className="mt-1 w-full rounded-lg border-slate-200 text-sm" />
                                                </label>
                                                <div className="flex justify-end gap-2">
                                                    <button type="button" onClick={() => { setDeclineId(null); setDeclineReason(''); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button>
                                                    <button type="button" disabled={processingId === item.id || declineReason.trim().length < 3} onClick={() => decide(item, 'decline', declineReason.trim())} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Confirm decline</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <button type="button" disabled={processingId === item.id} onClick={() => { setDeclineId(item.id); setDeclineReason(''); }} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" /> Decline</button>
                                                <button type="button" disabled={processingId === item.id} onClick={() => decide(item, 'approve')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" /> {processingId === item.id ? 'Processing…' : 'Approve extension'}</button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {item.status !== 'pending' && item.reviewer?.name && (
                                    <p className="mt-3 text-xs text-slate-500">Reviewed by {item.reviewer.name}{item.reviewed_at ? ` · ${new Date(item.reviewed_at).toLocaleString('en-PH')}` : ''}</p>
                                )}
                            </article>
                        );
                    })}
                </section>
            </main>
        </AuthenticatedLayout>
    );
}
