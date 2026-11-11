import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Download,
    FileText,
    Pencil,
    Save,
    XCircle,
} from 'lucide-react';

const STATUS_STYLES = {
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    declined: 'border-rose-200 bg-rose-50 text-rose-800',
    partially_approved: 'border-blue-200 bg-blue-50 text-blue-800',
    cancelled: 'border-slate-200 bg-slate-100 text-slate-700',
};

const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return date.toLocaleDateString('en-PH', {
        month: 'long',
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

const statusLabel = (value) => String(value || 'pending').replaceAll('_', ' ');

const localToday = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function Show({ activityPlan }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const isAdmin = ['super_admin', 'facility_admin'].includes(user?.role);
    const [wholePlanDecline, setWholePlanDecline] = useState(false);
    const [wholePlanReason, setWholePlanReason] = useState('');
    const [sessionDeclineId, setSessionDeclineId] = useState(null);
    const [sessionDeclineReason, setSessionDeclineReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const isPlanOwner = String(activityPlan.user_id) === String(user?.id);
    const [editingSessionId, setEditingSessionId] = useState(null);
    const [editData, setEditData] = useState({
        date: '', start_time: '', end_time: '', attendees: 1, needs_manpower: false, notes: '',
    });

    const updateSession = (session, action, reason = '') => {
        if (processing) return;
        setProcessing(true);

        const routeName = action === 'approve'
            ? 'facilitator.bookings.approve'
            : 'facilitator.bookings.decline';
        const payload = action === 'approve' ? {} : { rejection_reason: reason };

        router.patch(route(routeName, session.id), payload, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(action === 'approve' ? 'Session approved.' : 'Session declined.');
                setSessionDeclineId(null);
                setSessionDeclineReason('');
            },
            onError: (errors) => toast.error(Object.values(errors)[0] || 'Unable to update this session.'),
            onFinish: () => setProcessing(false),
        });
    };

    const beginSessionEdit = (session) => {
        setEditingSessionId(session.id);
        setEditData({
            date: String(session.date || session.booking_date || '').slice(0, 10),
            start_time: String(session.start_time || '').slice(0, 5),
            end_time: String(session.end_time || '').slice(0, 5),
            attendees: session.attendees || 1,
            needs_manpower: Boolean(session.needs_manpower),
            notes: session.notes || '',
        });
    };

    const saveSessionEdit = (event) => {
        event.preventDefault();
        if (processing || !editingSessionId) return;

        setProcessing(true);
        router.put(route('bookings.update', editingSessionId), editData, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Session updated.');
                setEditingSessionId(null);
            },
            onError: (errors) => toast.error(Object.values(errors)[0] || 'Unable to update this session.'),
            onFinish: () => setProcessing(false),
        });
    };

    const approvePlan = () => {
        if (processing) return;
        setProcessing(true);
        router.patch(route('activity-plans.approve', activityPlan.id), {}, {
            preserveScroll: true,
            onSuccess: () => toast.success('Eligible pending sessions were approved.'),
            onError: (errors) => toast.error(Object.values(errors)[0] || 'Unable to approve this activity plan.'),
            onFinish: () => setProcessing(false),
        });
    };

    const declinePlan = (event) => {
        event.preventDefault();
        if (processing || !wholePlanReason.trim()) return;
        setProcessing(true);
        router.patch(route('activity-plans.decline', activityPlan.id), {
            reason: wholePlanReason.trim(),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('The activity plan was declined.');
                setWholePlanDecline(false);
                setWholePlanReason('');
            },
            onError: (errors) => toast.error(Object.values(errors)[0] || 'Unable to decline this activity plan.'),
            onFinish: () => setProcessing(false),
        });
    };

    const status = String(activityPlan.status || 'pending').toLowerCase();
    const sessions = activityPlan.bookings || [];

    return (
        <AuthenticatedLayout
            user={user}
            header={<h2 className="text-lg font-semibold text-slate-800">Activity Plan</h2>}
        >
            <Head title={`${activityPlan.title} | ReserveIT`} />

            <main className="mx-auto w-full max-w-5xl min-w-0 space-y-5 px-3 py-5 sm:px-6 sm:py-7">
                <Link
                    href={route('facility.show', activityPlan.facility_id)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#493344]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to facility
                </Link>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wide text-[#C65B8A]">Recurring activity plan</p>
                            <h1 className="mt-1 break-words text-xl font-bold text-slate-900 sm:text-2xl">{activityPlan.title}</h1>
                            <p className="mt-1 text-sm text-slate-500">{activityPlan.facility?.name} · Submitted by {activityPlan.user?.name || 'User'}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
                            {statusLabel(status)}
                        </span>
                    </div>

                    {activityPlan.description && (
                        <p className="mt-4 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">{activityPlan.description}</p>
                    )}

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Plan period</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(activityPlan.start_date)} – {formatDate(activityPlan.end_date)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Recurring days</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                                {(activityPlan.recurrence_days || []).map((day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Number(day)]).join(', ') || 'Custom sessions'}
                            </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Sessions</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">{sessions.length} scheduled</p>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="rounded-lg bg-[#F8EDF2] p-2 text-[#493344]">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">{activityPlan.attachment_name || 'Activity plan document'}</p>
                                <p className="text-xs text-slate-500">Private supporting document</p>
                            </div>
                        </div>
                        <a
                            href={route('activity-plans.attachment', activityPlan.id)}
                            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            <Download className="h-4 w-4" />
                            Download
                        </a>
                    </div>

                    {isAdmin && status !== 'declined' && status !== 'cancelled' && (
                        <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setWholePlanDecline(true)}
                                disabled={processing}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                            >
                                <XCircle className="h-4 w-4" />
                                Decline entire plan
                            </button>
                            <button
                                type="button"
                                onClick={approvePlan}
                                disabled={processing || status === 'approved'}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C65B8A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#A94B75] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Approve eligible sessions
                            </button>
                        </div>
                    )}
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:px-6">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Individual sessions</h2>
                            <p className="mt-1 text-xs text-slate-500">Each session can be reviewed independently.</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">{sessions.length} sessions</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {sessions.map((session, index) => {
                            const sessionStatus = String(session.status || 'pending').toLowerCase();
                            return (
                                <article key={session.id} className="grid min-w-0 grid-cols-1 gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-bold text-slate-800">Session {index + 1}</span>
                                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${STATUS_STYLES[sessionStatus] || STATUS_STYLES.pending}`}>
                                                {statusLabel(sessionStatus)}
                                            </span>
                                        </div>
                                        <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                                            <CalendarDays className="h-4 w-4 shrink-0 text-[#C65B8A]" />
                                            {formatDate(session.date || session.booking_date)}
                                        </p>
                                        <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                            <Clock3 className="h-3.5 w-3.5 shrink-0" />
                                            {formatTime(session.start_time)} – {formatTime(session.end_time)}
                                            <span>·</span>
                                            {session.attendees || 1} attendees
                                        </p>
                                        {session.rejection_reason && (
                                            <p className="mt-1 break-words text-xs text-rose-700">Declined: {session.rejection_reason}</p>
                                        )}
                                    </div>

                                    {isPlanOwner && sessionStatus === 'pending' && (
                                        <div className="sm:col-span-2">
                                            {editingSessionId === session.id ? (
                                                <form onSubmit={saveSessionEdit} className="grid grid-cols-1 gap-3 rounded-xl border border-[#D9C8D4] bg-[#FBF8F9] p-3 sm:grid-cols-2 lg:grid-cols-3">
                                                    <label className="text-[10px] font-semibold text-slate-500">Session date
                                                        <input type="date" required min={localToday()} value={editData.date} onChange={(event) => setEditData((current) => ({ ...current, date: event.target.value }))} className="mt-1 w-full rounded-lg border-slate-200 text-xs" />
                                                    </label>
                                                    <label className="text-[10px] font-semibold text-slate-500">Start time
                                                        <input type="time" required step="900" value={editData.start_time} onChange={(event) => setEditData((current) => ({ ...current, start_time: event.target.value }))} className="mt-1 w-full rounded-lg border-slate-200 text-xs" />
                                                    </label>
                                                    <label className="text-[10px] font-semibold text-slate-500">End time
                                                        <input type="time" required step="900" value={editData.end_time} onChange={(event) => setEditData((current) => ({ ...current, end_time: event.target.value }))} className="mt-1 w-full rounded-lg border-slate-200 text-xs" />
                                                    </label>
                                                    <label className="text-[10px] font-semibold text-slate-500">Attendees
                                                        <input type="number" required min="1" max={activityPlan.facility?.capacity || undefined} value={editData.attendees} onChange={(event) => setEditData((current) => ({ ...current, attendees: Number(event.target.value) }))} className="mt-1 w-full rounded-lg border-slate-200 text-xs" />
                                                    </label>
                                                    <label className="flex items-center gap-2 self-end rounded-lg bg-white p-2.5 text-xs font-medium text-slate-700">
                                                        <input type="checkbox" checked={editData.needs_manpower} disabled={!activityPlan.facility?.allowTdevsManpower} onChange={(event) => setEditData((current) => ({ ...current, needs_manpower: event.target.checked }))} className="rounded border-slate-300 text-[#493344]" />
                                                        Request TDEVS manpower
                                                    </label>
                                                    <label className="text-[10px] font-semibold text-slate-500 sm:col-span-2 lg:col-span-3">Session notes
                                                        <textarea rows={2} value={editData.notes} onChange={(event) => setEditData((current) => ({ ...current, notes: event.target.value }))} className="mt-1 w-full rounded-lg border-slate-200 text-xs" />
                                                    </label>
                                                    <div className="flex flex-wrap justify-end gap-2 sm:col-span-2 lg:col-span-3">
                                                        <button type="button" onClick={() => setEditingSessionId(null)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button>
                                                        <button type="submit" disabled={processing} className="inline-flex items-center gap-1.5 rounded-lg bg-[#493344] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" /> Save session changes</button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <div className="mt-3">
                                                    <button type="button" onClick={() => beginSessionEdit(session)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /> Edit this session</button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {isAdmin && sessionStatus === 'pending' && (
                                        <div className="flex flex-wrap gap-2 sm:justify-end">
                                            <button
                                                type="button"
                                                onClick={() => updateSession(session, 'approve')}
                                                disabled={processing}
                                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                            >
                                                Approve session
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSessionDeclineId(session.id);
                                                    setSessionDeclineReason('');
                                                }}
                                                disabled={processing}
                                                className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                            >
                                                Decline session
                                            </button>
                                        </div>
                                    )}

                                    {sessionDeclineId === session.id && (
                                        <form
                                            onSubmit={(event) => {
                                                event.preventDefault();
                                                updateSession(session, 'decline', sessionDeclineReason);
                                            }}
                                            className="space-y-2 sm:col-span-2"
                                        >
                                            <textarea
                                                required
                                                rows={2}
                                                value={sessionDeclineReason}
                                                onChange={(event) => setSessionDeclineReason(event.target.value)}
                                                placeholder="Reason for declining this session"
                                                className="block w-full rounded-lg border border-slate-200 p-2.5 text-sm"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button type="button" onClick={() => setSessionDeclineId(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button>
                                                <button type="submit" disabled={processing || !sessionDeclineReason.trim()} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Confirm decline</button>
                                            </div>
                                        </form>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                </section>
            </main>

            {wholePlanDecline && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <button type="button" aria-label="Close decline dialog" className="absolute inset-0" onClick={() => setWholePlanDecline(false)} />
                    <form onSubmit={declinePlan} className="relative w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Decline entire activity plan?</h3>
                            <p className="mt-1 text-sm text-slate-500">All pending or approved sessions that have not checked in will be declined.</p>
                        </div>
                        <label className="block text-sm font-semibold text-slate-700">
                            Reason
                            <textarea required rows={3} value={wholePlanReason} onChange={(event) => setWholePlanReason(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 p-3 text-sm font-normal" />
                        </label>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setWholePlanDecline(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
                            <button type="submit" disabled={processing || !wholePlanReason.trim()} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Decline plan</button>
                        </div>
                    </form>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
