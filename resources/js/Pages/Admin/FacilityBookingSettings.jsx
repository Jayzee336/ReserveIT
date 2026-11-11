import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Clock3, Save, CalendarClock, XCircle } from 'lucide-react';

const DAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

export default function FacilityBookingSettings({
    facility,
    operatingHours = [],
    defaultOpeningTime = '08:00',
    defaultClosingTime = '17:00',
    scheduledClosures = [],
    canConfigureOvertimeFee = false,
}) {
    const { auth } = usePage().props;
    const [hours, setHours] = useState(() => DAYS.map((day, dayOfWeek) => {
        const saved = operatingHours.find((item) => Number(item.day_of_week) === dayOfWeek);

        return {
            day_of_week: dayOfWeek,
            is_closed: saved ? Boolean(saved.is_closed) : false,
            opens_at: String(saved?.opens_at ?? defaultOpeningTime).slice(0, 5),
            closes_at: String(saved?.closes_at ?? defaultClosingTime).slice(0, 5),
        };
    }));
    const [isSaving, setIsSaving] = useState(false);
    const [overtimeFeeEnabled, setOvertimeFeeEnabled] = useState(Boolean(facility.overtime_fee_enabled));
    const [overtimeFeePerHour, setOvertimeFeePerHour] = useState(String(facility.overtime_fee_per_hour ?? '0'));
    const toLocalDateTime = (date) => {
        const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return offsetDate.toISOString().slice(0, 16);
    };
    const [closureForm, setClosureForm] = useState(() => ({
        reason: '',
        scheduled_start_at: toLocalDateTime(new Date(Date.now() + 60 * 60 * 1000)),
        scheduled_end_at: toLocalDateTime(new Date(Date.now() + 2 * 60 * 60 * 1000)),
    }));
    const [isSchedulingClosure, setIsSchedulingClosure] = useState(false);
    const [restoringClosureId, setRestoringClosureId] = useState(null);

    const formatClosureDate = (value) => value
        ? new Date(value).toLocaleString('en-PH', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit',
        })
        : '—';

    const scheduleClosure = (event) => {
        event.preventDefault();
        if (isSchedulingClosure || !closureForm.reason.trim()) return;

        setIsSchedulingClosure(true);
        router.post(
            route('admin.facilities.scheduled-closures.store', facility.id),
            closureForm,
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Scheduled closure saved. Affected booking owners have been notified.');
                    setClosureForm((current) => ({ ...current, reason: '' }));
                },
                onError: (errors) => toast.error(Object.values(errors)[0] || 'Review the scheduled closure dates.'),
                onFinish: () => setIsSchedulingClosure(false),
            }
        );
    };

    const restoreScheduledClosure = (period) => {
        if (restoringClosureId !== null) return;

        setRestoringClosureId(period.id);
        router.patch(
            route('admin.facilities.scheduled-closures.restore', {
                facility: facility.id,
                period: period.id,
            }),
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Scheduled closure cancelled. Affected booking owners have been notified.'),
                onError: (errors) => toast.error(Object.values(errors)[0] || 'Unable to cancel the scheduled closure.'),
                onFinish: () => setRestoringClosureId(null),
            }
        );
    };

    const updateDay = (dayOfWeek, field, value) => {
        setHours((current) => current.map((item) => (
            item.day_of_week === dayOfWeek
                ? { ...item, [field]: value }
                : item
        )));
    };

    const submit = (event) => {
        event.preventDefault();
        if (isSaving) return;

        setIsSaving(true);
        router.put(
            route('admin.facilities.booking-settings.update', facility.id),
            { hours, overtime_fee_enabled: overtimeFeeEnabled, overtime_fee_per_hour: overtimeFeePerHour },
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Facility operating hours saved.'),
                onError: (errors) => toast.error(Object.values(errors)[0] || 'Please review the operating hours.'),
                onFinish: () => setIsSaving(false),
            }
        );
    };

    const backHref = auth?.user?.role === 'facility_admin'
        ? route('facilitator.managed-facilities.index')
        : route('admin.facilities.index');

    return (
        <AuthenticatedLayout
            user={auth?.user}
            header={<h2 className="text-lg font-semibold text-slate-800">Facility Booking Settings</h2>}
        >
            <Head title={`Booking Settings · ${facility.name} | ReserveIT`} />

            <div className="mx-auto w-full max-w-4xl min-w-0 space-y-5 px-3 py-5 sm:px-6 sm:py-7">
                <Link
                    href={backHref}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#263348]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Managed Facilities
                </Link>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wide text-[#C65B8A]">Operating hours</p>
                            <h1 className="mt-1 break-words text-xl font-bold text-slate-900 sm:text-2xl">{facility.name}</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                                Configure the times when this facility accepts bookings. Closed days cannot be reserved. These hours apply to all new bookings and activity sessions for this facility.
                            </p>
                        </div>
                        <span className="rounded-full bg-[#F8EAF0] px-3 py-1 text-xs font-semibold text-[#A94B75]">
                            {auth?.user?.role === 'super_admin' ? 'Super Admin controls' : 'Assigned facility'}
                        </span>
                    </div>

                    <form onSubmit={submit} className="mt-6 space-y-3">
                        {hours.map((item) => (
                            <div key={item.day_of_week} className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[minmax(130px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                                <div className="flex items-center gap-2">
                                    <Clock3 className="h-4 w-4 shrink-0 text-[#C65B8A]" />
                                    <span className="text-sm font-semibold text-slate-800">{DAYS[item.day_of_week]}</span>
                                </div>

                                <label className="min-w-0 text-xs font-medium text-slate-500">
                                    Opens
                                    <input
                                        type="time"
                                        value={item.opens_at}
                                        disabled={item.is_closed}
                                        onChange={(event) => updateDay(item.day_of_week, 'opens_at', event.target.value)}
                                        className="mt-1 block w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                                    />
                                </label>

                                <label className="min-w-0 text-xs font-medium text-slate-500">
                                    Closes
                                    <input
                                        type="time"
                                        value={item.closes_at}
                                        disabled={item.is_closed}
                                        onChange={(event) => updateDay(item.day_of_week, 'closes_at', event.target.value)}
                                        className="mt-1 block w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                                    />
                                </label>

                                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 sm:justify-end">
                                    <input
                                        type="checkbox"
                                        checked={item.is_closed}
                                        onChange={(event) => updateDay(item.day_of_week, 'is_closed', event.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-[#263348] focus:ring-[#B96D91]"
                                    />
                                    Closed
                                </label>
                            </div>
                        ))}

                        {canConfigureOvertimeFee && (
                        <div className="rounded-xl border border-[#EEDFE6] bg-[#FFFCFD] p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-slate-900">Overtime fee settings</h3>
                                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
                                        Configure the hourly overtime fee for this facility. Only the designated billable facilities can have this enabled. The rate is saved with each completed booking so later changes do not alter old charges.
                                    </p>
                                </div>
                                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={overtimeFeeEnabled}
                                        onChange={(event) => setOvertimeFeeEnabled(event.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-[#263348] focus:ring-[#B96D91]"
                                    />
                                    Enable overtime fee
                                </label>
                            </div>
                            <label className="mt-4 block max-w-xs text-xs font-semibold text-slate-600">
                                Overtime rate per hour (₱)
                                <input
                                    type="number"
                                    min="0"
                                    max="100000"
                                    step="0.01"
                                    value={overtimeFeePerHour}
                                    disabled={!overtimeFeeEnabled}
                                    onChange={(event) => setOvertimeFeePerHour(event.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                                />
                            </label>
                        </div>

                        )}

                        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                            <Link
                                href={backHref}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C65B8A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A94B75] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Save className="h-4 w-4" />
                                {isSaving ? 'Saving…' : 'Save operating hours'}
                            </button>
                        </div>
                    </form>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="flex items-start gap-3">
                        <span className="rounded-xl bg-amber-50 p-2 text-amber-700">
                            <CalendarClock className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-[#C65B8A]">Temporary closure</p>
                            <h2 className="mt-1 text-lg font-bold text-slate-900">Schedule a facility closure</h2>
                            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
                                Block a specific future date and time without making the facility unavailable for the entire day. Only owners with overlapping pending or approved bookings will be notified.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={scheduleClosure} className="mt-5 grid gap-4 sm:grid-cols-2">
                        <label className="block text-xs font-semibold text-slate-600">
                            Closure starts
                            <input
                                type="datetime-local"
                                required
                                min={toLocalDateTime(new Date()).slice(0, 16)}
                                value={closureForm.scheduled_start_at}
                                onChange={(event) => setClosureForm((current) => ({
                                    ...current,
                                    scheduled_start_at: event.target.value,
                                    scheduled_end_at: current.scheduled_end_at <= event.target.value
                                        ? event.target.value
                                        : current.scheduled_end_at,
                                }))}
                                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800"
                            />
                        </label>
                        <label className="block text-xs font-semibold text-slate-600">
                            Closure ends
                            <input
                                type="datetime-local"
                                required
                                min={closureForm.scheduled_start_at}
                                value={closureForm.scheduled_end_at}
                                onChange={(event) => setClosureForm((current) => ({
                                    ...current,
                                    scheduled_end_at: event.target.value,
                                }))}
                                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800"
                            />
                        </label>
                        <label className="block sm:col-span-2">
                            <span className="text-xs font-semibold text-slate-600">Reason for closure</span>
                            <textarea
                                rows={3}
                                required
                                maxLength={2000}
                                value={closureForm.reason}
                                onChange={(event) => setClosureForm((current) => ({
                                    ...current,
                                    reason: event.target.value,
                                }))}
                                placeholder="Example: Electrical maintenance from 1:00 PM to 3:00 PM."
                                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800"
                            />
                        </label>
                        <div className="flex justify-end sm:col-span-2">
                            <button
                                type="submit"
                                disabled={isSchedulingClosure || !closureForm.reason.trim()}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C65B8A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A94B75] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <CalendarClock className="h-4 w-4" />
                                {isSchedulingClosure ? 'Saving closure…' : 'Save scheduled closure'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 border-t border-slate-100 pt-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-slate-900">Upcoming scheduled closures</h3>
                            <span className="text-xs text-slate-500">{scheduledClosures.length} scheduled</span>
                        </div>

                        {scheduledClosures.length ? (
                            <div className="mt-3 space-y-2">
                                {scheduledClosures.map((period) => (
                                    <div key={period.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="break-words text-sm font-semibold text-slate-800">{period.reason}</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {formatClosureDate(period.scheduled_start_at)} – {formatClosureDate(period.scheduled_end_at)}
                                            </p>
                                            <p className="mt-1 text-[11px] text-slate-500">
                                                {Number(period.affected_user_count ?? 0)} affected booking owner(s) notified
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => restoreScheduledClosure(period)}
                                            disabled={restoringClosureId === period.id}
                                            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                                        >
                                            <XCircle className="h-3.5 w-3.5" />
                                            {restoringClosureId === period.id ? 'Cancelling…' : 'Cancel closure'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center text-sm text-slate-500">
                                No upcoming scheduled closures for this facility.
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
