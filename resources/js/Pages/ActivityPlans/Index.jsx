import { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    CalendarDays, Clock3, FileText, Plus, Trash2, Upload,
    ClipboardList, ArrowLeft, Users,
} from 'lucide-react';

const weekdayOptions = [
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' },
    { value: 0, label: 'Sunday', short: 'Sun' },
];

const localDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const today = localDate(new Date());
const addDaysToDateString = (days) => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() + days);
    return localDate(date);
};
const endDefault = localDate(new Date(new Date().getFullYear(), new Date().getMonth() + 3, new Date().getDate(), 12));

const formatDate = (value) => {
    if (!value) return '—';
    return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const statusStyle = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    declined: 'bg-rose-50 text-rose-700 border-rose-200',
    partially_approved: 'bg-sky-50 text-sky-700 border-sky-200',
};

export default function Index({ plans, facilities = [] }) {
    const { auth, systemSettings = {} } = usePage().props;
    const [sessions, setSessions] = useState([]);
    const [excludedDates, setExcludedDates] = useState([]);
    const [manualDate, setManualDate] = useState('');
    const initialQuery = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const queryFacilityId = initialQuery?.get('facility_id');
    const queryDate = initialQuery?.get('date');
    const returnTo = initialQuery?.get('return_to');
    const returnFacilityId = initialQuery?.get('facility_id');
    const validQueryFacility = facilities.some((facility) => String(facility.id) === String(queryFacilityId));
    const initialStartDate = queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) ? queryDate : today;
    const form = useForm({
        facility_id: validQueryFacility ? queryFacilityId : (facilities[0]?.id ?? ''),
        title: '',
        description: '',
        start_date: initialStartDate,
        end_date: initialStartDate > today ? initialStartDate : endDefault,
        recurrence_days: [1, 2, 3, 4, 5],
        weekday_times: {
            0: { start_time: '09:00', end_time: '10:00' },
            1: { start_time: '09:00', end_time: '10:00' },
            2: { start_time: '09:00', end_time: '10:00' },
            3: { start_time: '09:00', end_time: '10:00' },
            4: { start_time: '09:00', end_time: '10:00' },
            5: { start_time: '09:00', end_time: '10:00' },
            6: { start_time: '09:00', end_time: '10:00' },
        },
        activity_plan_file: null,
        consent_letter: null,
    });

    const selectedFacility = useMemo(
        () => facilities.find((facility) => String(facility.id) === String(form.data.facility_id)),
        [facilities, form.data.facility_id]
    );
    const bookingLeadTimeDays = Math.max(0, Number(selectedFacility?.booking_lead_time_days ?? 0));
    const earliestBookingDate = addDaysToDateString(bookingLeadTimeDays);
    const sessionsBeforeLeadTime = sessions.filter((session) => session.date < earliestBookingDate);

    useEffect(() => {
        if (!form.data.start_date || !form.data.end_date) {
            setSessions([]);
            return;
        }

        const start = new Date(`${form.data.start_date}T12:00:00`);
        const end = new Date(`${form.data.end_date}T12:00:00`);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
            setSessions([]);
            return;
        }

        const existingByDate = new Map(sessions.map((session) => [session.date, session]));
        const next = [];
        const cursor = new Date(start);
        let scanned = 0;

        while (cursor <= end && scanned <= 366) {
            const date = localDate(cursor);
            const weekday = cursor.getDay();

            if (form.data.recurrence_days.includes(weekday) && !excludedDates.includes(date)) {
                const defaults = form.data.weekday_times[weekday] || {
                    start_time: '09:00',
                    end_time: '10:00',
                };
                next.push(existingByDate.get(date) || {
                    date,
                    start_time: defaults.start_time,
                    end_time: defaults.end_time,
                    attendees: 1,
                    needs_manpower: false,
                    notes: '',
                });
            }

            cursor.setDate(cursor.getDate() + 1);
            scanned += 1;
        }

        setSessions(next);
    }, [
        form.data.start_date,
        form.data.end_date,
        form.data.recurrence_days.join(','),
        JSON.stringify(form.data.weekday_times),
        excludedDates.join(','),
    ]);

    const scheduledClosureConflicts = sessions.flatMap((session) => {
        const sessionStart = new Date(`${session.date}T${session.start_time}:00`);
        const sessionEnd = new Date(`${session.date}T${session.end_time}:00`);
        if (session.end_time === '00:00') sessionEnd.setDate(sessionEnd.getDate() + 1);

        return (selectedFacility?.unavailability_periods ?? [])
            .filter((period) => {
                if (period.ended_at || !period.scheduled_start_at || !period.scheduled_end_at) return false;
                const closureStart = new Date(period.scheduled_start_at);
                const closureEnd = new Date(period.scheduled_end_at);
                return (
                    !Number.isNaN(closureStart.getTime())
                    && !Number.isNaN(closureEnd.getTime())
                    && sessionStart < closureEnd
                    && sessionEnd > closureStart
                );
            })
            .map((period) => ({
                date: session.date,
                reason: period.reason,
                start: period.scheduled_start_at,
                end: period.scheduled_end_at,
            }));
    });

    const anyWeekendSession = sessions.some((session) => {
        const day = new Date(`${session.date}T12:00:00`).getDay();
        return day === 0 || day === 6;
    });
    const consentRequired = Boolean(
        systemSettings.require_consent_letter ||
        selectedFacility?.requirement === 'CONSENT_REQUIRED' ||
        (selectedFacility?.requiresWeekendConsent && anyWeekendSession)
    );

    const toggleWeekday = (day) => {
        const current = form.data.recurrence_days;
        const next = current.includes(day)
            ? current.filter((item) => item !== day)
            : [...current, day];
        form.setData('recurrence_days', next);
        setExcludedDates([]);
    };

    const updateDefaultTime = (day, field, value) => {
        const nextTimes = {
            ...form.data.weekday_times,
            [day]: {
                ...(form.data.weekday_times[day] || {}),
                [field]: value,
            },
        };
        form.setData('weekday_times', nextTimes);
        setSessions((current) => current.map((session) => {
            const sessionDay = new Date(`${session.date}T12:00:00`).getDay();
            return sessionDay === day ? { ...session, [field]: value } : session;
        }));
    };

    const updateSession = (date, field, value) => {
        setSessions((current) => current.map((session) =>
            session.date === date ? { ...session, [field]: value } : session
        ));
    };

    const removeSession = (date) => {
        setExcludedDates((current) => [...new Set([...current, date])]);
        setSessions((current) => current.filter((session) => session.date !== date));
    };

    const addSession = () => {
        if (!manualDate || manualDate < form.data.start_date || manualDate > form.data.end_date) {
            form.setError('sessions', 'Choose a date within the activity plan range.');
            return;
        }

        const weekday = new Date(`${manualDate}T12:00:00`).getDay();
        if (!form.data.recurrence_days.includes(weekday)) {
            form.setError('sessions', 'The added date must use one of the selected weekdays.');
            return;
        }

        if (sessions.some((session) => session.date === manualDate)) {
            form.setError('sessions', 'A session already exists on that date.');
            return;
        }

        const defaults = form.data.weekday_times[weekday];
        setExcludedDates((current) => current.filter((date) => date !== manualDate));
        setSessions((current) => [...current, {
            date: manualDate,
            start_time: defaults.start_time,
            end_time: defaults.end_time,
            attendees: 1,
            needs_manpower: false,
            notes: '',
        }].sort((a, b) => a.date.localeCompare(b.date)));
        setManualDate('');
        form.clearErrors('sessions');
    };

    const submit = (event) => {
        event.preventDefault();

        if (sessions.length === 0) {
            form.setError('sessions', 'Select at least one weekday and date range that generates a session.');
            return;
        }

        if (sessionsBeforeLeadTime.length > 0) {
            form.setError(
                'sessions',
                `Every session for this facility must be at least ${bookingLeadTimeDays} calendar days ahead. Adjust or remove: ${sessionsBeforeLeadTime.map((session) => formatDate(session.date)).join(', ')}.`
            );
            return;
        }

        if (scheduledClosureConflicts.length > 0) {
            form.setError(
                'sessions',
                `One or more sessions overlap a scheduled facility closure. Review ${scheduledClosureConflicts.map((item) => formatDate(item.date)).join(', ')}.`
            );
            return;
        }

        if (sessions.length > 366) {
            form.setError('sessions', 'A single activity plan can contain up to 366 sessions. Shorten the date range or create separate plans.');
            return;
        }

        router.post(route('activity-plans.store'), {
            ...form.data,
            sessions,
        }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset('title', 'description', 'activity_plan_file', 'consent_letter');
                setSessions([]);
                setExcludedDates([]);
            },
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-[#6A535C]" />
                    <h2 className="text-lg font-semibold text-gray-800">Activity Plans</h2>
                </div>
            }
        >
            <Head title="Activity Plans | ReserveIT" />

            <div className="mx-auto w-full max-w-[1500px] space-y-6 px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        {returnTo === 'schedule' ? (
                            <Link href={route('schedule.index', queryDate ? { date: queryDate } : {})} className="inline-flex items-center gap-1 text-xs font-semibold text-[#745D67] hover:underline">
                                <ArrowLeft className="h-3.5 w-3.5" /> Back to schedule grid
                            </Link>
                        ) : returnTo === 'facility' && returnFacilityId ? (
                            <Link href={route('facility.show', returnFacilityId)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#745D67] hover:underline">
                                <ArrowLeft className="h-3.5 w-3.5" /> Back to facility
                            </Link>
                        ) : null}
                        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Recurring activity plans</h1>
                        <p className="mt-1 max-w-3xl text-sm text-slate-500">
                            Schedule repeated facility sessions across selected weekdays. Each date becomes its own booking and can be reviewed separately.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Create an activity plan</h2>
                            <p className="mt-1 text-xs text-slate-500">Choose recurring weekdays, then customize or remove individual sessions.</p>
                        </div>
                        <span className="rounded-full bg-[#F7F0F3] px-3 py-1.5 text-xs font-semibold text-[#543F48]">
                            {sessions.length} generated session{sessions.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Facility</label>
                            <select value={form.data.facility_id} onChange={(e) => form.setData('facility_id', e.target.value)} required className="w-full rounded-xl border-slate-200 text-sm focus:border-[#A98C97] focus:ring-[#A98C97]">
                                <option value="">Choose a facility</option>
                                {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
                            </select>
                            {form.errors.facility_id && <p className="mt-1 text-xs text-rose-600">{form.errors.facility_id}</p>}
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Activity title</label>
                            <input value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} required maxLength={255} placeholder="e.g. Weekly student organization meeting" className="w-full rounded-xl border-slate-200 text-sm focus:border-[#A98C97] focus:ring-[#A98C97]" />
                            {form.errors.title && <p className="mt-1 text-xs text-rose-600">{form.errors.title}</p>}
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Start date</label>
                            <input type="date" min={today} value={form.data.start_date} onChange={(e) => { form.setData('start_date', e.target.value); setExcludedDates([]); }} required className="w-full rounded-xl border-slate-200 text-sm focus:border-[#A98C97] focus:ring-[#A98C97]" />
                            {form.errors.start_date && <p className="mt-1 text-xs text-rose-600">{form.errors.start_date}</p>}
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-600">End date</label>
                            <input type="date" min={form.data.start_date || today} value={form.data.end_date} onChange={(e) => { form.setData('end_date', e.target.value); setExcludedDates([]); }} required className="w-full rounded-xl border-slate-200 text-sm focus:border-[#A98C97] focus:ring-[#A98C97]" />
                            {form.errors.end_date && <p className="mt-1 text-xs text-rose-600">{form.errors.end_date}</p>}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                        <h3 className="text-sm font-bold text-slate-800">Repeat on</h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {weekdayOptions.map((day) => (
                                <label key={day.value} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${form.data.recurrence_days.includes(day.value) ? 'border-[#A98C97] bg-[#F7F0F3] text-[#543F48]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                                    <input type="checkbox" checked={form.data.recurrence_days.includes(day.value)} onChange={() => toggleWeekday(day.value)} className="rounded border-slate-300 text-[#6A535C] focus:ring-[#A98C97]" />
                                    {day.label}
                                </label>
                            ))}
                        </div>
                        {form.errors.recurrence_days && <p className="mt-2 text-xs text-rose-600">{form.errors.recurrence_days}</p>}
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {weekdayOptions.filter((day) => form.data.recurrence_days.includes(day.value)).map((day) => (
                                <div key={day.value} className="rounded-lg bg-slate-50 p-3">
                                    <p className="mb-2 text-xs font-bold text-slate-700">{day.label} default time</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="text-[10px] font-semibold text-slate-500">Start<input type="time" step="900" value={form.data.weekday_times[day.value].start_time} onChange={(e) => updateDefaultTime(day.value, 'start_time', e.target.value)} className="mt-1 w-full rounded-lg border-slate-200 bg-white text-xs" /></label>
                                        <label className="text-[10px] font-semibold text-slate-500">End<input type="time" step="900" value={form.data.weekday_times[day.value].end_time} onChange={(e) => updateDefaultTime(day.value, 'end_time', e.target.value)} className="mt-1 w-full rounded-lg border-slate-200 bg-white text-xs" /></label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Review generated sessions</h3>
                                <p className="mt-1 text-xs text-slate-500">Change a single date's time, attendees, manpower request, or notes without changing the other sessions.</p>
                            </div>
                            <div className="flex items-end gap-2">
                                <label className="text-[10px] font-semibold text-slate-500">Add a date<input type="date" min={form.data.start_date && form.data.start_date > earliestBookingDate ? form.data.start_date : earliestBookingDate} max={form.data.end_date} value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="mt-1 block rounded-lg border-slate-200 text-xs" /></label>
                                <button type="button" onClick={addSession} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /> Add</button>
                            </div>
                        </div>

                        {scheduledClosureConflicts.length > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                                <p className="text-xs font-bold text-amber-900">
                                    Scheduled closure overlaps {scheduledClosureConflicts.length} session time(s)
                                </p>
                                <div className="mt-2 space-y-1">
                                    {scheduledClosureConflicts.map((item, index) => (
                                        <p key={`${item.date}-${index}`} className="break-words text-xs text-amber-800">
                                            {formatDate(item.date)} · {item.reason}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}
                        {bookingLeadTimeDays > 0 && (
                            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                {selectedFacility?.name} requires {bookingLeadTimeDays} calendar days advance notice. Earliest session date: {formatDate(earliestBookingDate)}.
                            </p>
                        )}
                        {sessionsBeforeLeadTime.length > 0 && (
                            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                {sessionsBeforeLeadTime.length} generated session(s) are earlier than the required date. Remove or adjust those dates before submitting.
                            </p>
                        )}
                        {form.errors.sessions && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{form.errors.sessions}</p>}

                        {sessions.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">Select at least one weekday and a valid date range to generate sessions.</div>
                        ) : (
                            <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                                {sessions.map((session) => (
                                    <div key={session.date} className="rounded-xl border border-slate-200 p-3 sm:p-4">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <CalendarDays className="h-4 w-4 shrink-0 text-[#846A75]" />
                                                <p className="truncate text-sm font-bold text-slate-800">{formatDate(session.date)} · {weekdayOptions.find((day) => day.value === new Date(`${session.date}T12:00:00`).getDay())?.label}</p>
                                            </div>
                                            <button type="button" onClick={() => removeSession(session.date)} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                            <label className="text-[10px] font-semibold text-slate-500">Start time<input type="time" step="900" value={session.start_time} onChange={(e) => updateSession(session.date, 'start_time', e.target.value)} className="mt-1 w-full rounded-lg border-slate-200 text-xs" /></label>
                                            <label className="text-[10px] font-semibold text-slate-500">End time<input type="time" step="900" value={session.end_time} onChange={(e) => updateSession(session.date, 'end_time', e.target.value)} className="mt-1 w-full rounded-lg border-slate-200 text-xs" /></label>
                                            <label className="text-[10px] font-semibold text-slate-500">Attendees<input type="number" min="1" max={selectedFacility?.capacity || undefined} value={session.attendees} onChange={(e) => updateSession(session.date, 'attendees', Number(e.target.value))} className="mt-1 w-full rounded-lg border-slate-200 text-xs" /></label>
                                            <label className="flex cursor-pointer items-center gap-2 self-end rounded-lg border border-transparent bg-slate-50 p-2.5 text-xs font-medium text-slate-700 transition-all duration-150 hover:border-[#D8C5CC] hover:bg-[#F7F0F3] hover:text-[#543F48]"><input type="checkbox" checked={Boolean(session.needs_manpower)} disabled={!selectedFacility?.allowTdevsManpower} onChange={(e) => updateSession(session.date, 'needs_manpower', e.target.checked)} className="rounded border-slate-300 text-[#6A535C] focus:ring-[#A98C97]" /> Request TDEVS manpower</label>
                                        </div>
                                        <label className="mt-3 block text-[10px] font-semibold text-slate-500">Session notes (optional)<input type="text" value={session.notes || ''} onChange={(e) => updateSession(session.date, 'notes', e.target.value)} maxLength={10000} placeholder="Additional details for this session" className="mt-1 w-full rounded-lg border-slate-200 text-xs" /></label>
                                    </div>
                                ))}
                            </div>
                        )}
                        {sessions.length > 100 && <p className="text-xs text-rose-600">The current form limit is 366 sessions. Shorten the range or split it into multiple plans.</p>}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-dashed border-slate-300 p-4 transition-colors duration-150 hover:border-[#A98C97] hover:bg-[#FCF9FA]">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Upload className="h-4 w-4" /> Activity plan document <span className="text-rose-600">*</span></div>
                            <p className="mt-1 text-xs text-slate-500">PDF, DOC, or DOCX · up to 10 MB · stored privately</p>
                            <input type="file" accept=".pdf,.doc,.docx" required onChange={(e) => form.setData('activity_plan_file', e.target.files?.[0] || null)} className="mt-3 block w-full cursor-pointer rounded-lg border border-transparent p-1 text-xs text-slate-600 transition-colors duration-150 hover:border-[#D8C5CC] hover:bg-[#F7F0F3] file:mr-3 file:rounded-lg file:border-0 file:bg-[#F7F0F3] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#543F48]" />
                            {form.errors.activity_plan_file && <p className="mt-1 text-xs text-rose-600">{form.errors.activity_plan_file}</p>}
                        </div>
                        <div className="rounded-xl border border-dashed border-slate-300 p-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><FileText className="h-4 w-4" /> Consent letter {consentRequired && <span className="text-rose-600">*</span>}</div>
                            <p className="mt-1 text-xs text-slate-500">{consentRequired ? 'Required for this facility or at least one selected session.' : 'Optional unless the selected dates or facility require it.'} PDF, DOC, or DOCX · up to 5 MB</p>
                            <input type="file" accept=".pdf,.doc,.docx" required={consentRequired} onChange={(e) => form.setData('consent_letter', e.target.files?.[0] || null)} className="mt-3 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700" />
                            {form.errors.consent_letter && <p className="mt-1 text-xs text-rose-600">{form.errors.consent_letter}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Activity description (optional)</label>
                        <textarea value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} rows={3} maxLength={10000} className="w-full rounded-xl border-slate-200 text-sm focus:border-[#A98C97] focus:ring-[#A98C97]" placeholder="Purpose, intended participants, and other activity details" />
                        {form.errors.description && <p className="mt-1 text-xs text-rose-600">{form.errors.description}</p>}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <p className="max-w-2xl text-xs leading-5 text-slate-500">
                            Each session is submitted as an individual booking. The facility administrator can review the complete plan or decide on individual sessions. The uploaded activity plan and consent letter are stored privately.
                        </p>
                        <button type="submit" disabled={form.processing || sessions.length === 0 || sessions.length > 366 || facilities.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-[#6A535C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#543F48] disabled:cursor-not-allowed disabled:opacity-50">
                            <Plus className="h-4 w-4" /> {form.processing ? 'Submitting…' : 'Submit activity plan'}
                        </button>
                    </div>
                </form>

                <section className="space-y-3">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">{auth?.user?.role === 'user' ? 'Your submitted plans' : 'Activity plans for your facilities'}</h2>
                        <p className="mt-1 text-xs text-slate-500">Open a plan to review all of its individual sessions and decisions.</p>
                    </div>
                    {plans?.data?.length ? plans.data.map((plan) => {
                        const bookingStatuses = plan.bookings || [];
                        const approved = bookingStatuses.filter((item) => item.status === 'approved').length;
                        const pending = bookingStatuses.filter((item) => item.status === 'pending').length;
                        return (
                            <Link key={plan.id} href={route('activity-plans.show', plan.id)} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#C9B7BF] hover:shadow-md sm:p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="break-words text-sm font-bold text-slate-900">{plan.title}</h3>
                                        <p className="mt-1 text-xs text-slate-500">{plan.facility?.name || 'Facility'} · {formatDate(plan.start_date)} – {formatDate(plan.end_date)}</p>
                                        {auth?.user?.role !== 'user' && <p className="mt-1 text-xs text-slate-500">Submitted by {plan.user?.name || 'User'}</p>}
                                    </div>
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusStyle[plan.status] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>{String(plan.status || 'pending').replace('_', ' ')}</span>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {bookingStatuses.length} sessions</span>
                                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {approved} approved</span>
                                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {pending} pending</span>
                                    {plan.attachment_name && <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Document attached</span>}
                                </div>
                            </Link>
                        );
                    }) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">No activity plans have been submitted yet.</div>
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
