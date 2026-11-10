import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Clock3, Save } from 'lucide-react';

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
            { hours },
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Facility operating hours saved.'),
                onError: (errors) => toast.error(Object.values(errors)[0] || 'Please review the operating hours.'),
                onFinish: () => setIsSaving(false),
            }
        );
    };

    return (
        <AuthenticatedLayout
            user={auth?.user}
            header={<h2 className="text-lg font-semibold text-slate-800">Facility Booking Settings</h2>}
        >
            <Head title={`Booking Settings · ${facility.name} | ReserveIT`} />

            <div className="mx-auto w-full max-w-4xl min-w-0 space-y-5 px-3 py-5 sm:px-6 sm:py-7">
                <Link
                    href={route('facility.show', facility.id)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#6A535C]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to {facility.name}
                </Link>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wide text-[#846A75]">Operating hours</p>
                            <h1 className="mt-1 break-words text-xl font-bold text-slate-900 sm:text-2xl">{facility.name}</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                                Configure the times when this facility accepts bookings. Closed days cannot be reserved. These hours apply to all new bookings and activity sessions for this facility.
                            </p>
                        </div>
                        <span className="rounded-full bg-[#F7F0F3] px-3 py-1 text-xs font-semibold text-[#543F48]">
                            {auth?.user?.role === 'super_admin' ? 'Super Admin controls' : 'Assigned facility'}
                        </span>
                    </div>

                    <form onSubmit={submit} className="mt-6 space-y-3">
                        {hours.map((item) => (
                            <div key={item.day_of_week} className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[minmax(130px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                                <div className="flex items-center gap-2">
                                    <Clock3 className="h-4 w-4 shrink-0 text-[#846A75]" />
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
                                        className="h-4 w-4 rounded border-slate-300 text-[#6A535C] focus:ring-[#A98C97]"
                                    />
                                    Closed
                                </label>
                            </div>
                        ))}

                        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                            <Link
                                href={route('facility.show', facility.id)}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6A535C] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#543F48] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Save className="h-4 w-4" />
                                {isSaving ? 'Saving…' : 'Save operating hours'}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
