import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarDays,
    Clock3,
    Building2,
    MapPin,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';

const STATUS_STYLES = {
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    declined: 'border-rose-200 bg-rose-50 text-rose-800',
    cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
};

const STATUS_LABELS = {
    pending: 'Pending review',
    approved: 'Confirmed',
    declined: 'Declined',
    cancelled: 'Cancelled',
};

function StatusBadge({ status }) {
    const normalized = String(status || '').toLowerCase();

    return (
        <span
            className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[normalized] ?? STATUS_STYLES.pending}`}
        >
            {STATUS_LABELS[normalized] ?? status ?? 'Status unavailable'}
        </span>
    );
}

function MetricCard({ icon: Icon, label, value, detail }) {
    return (
        <article className="ri-panel ri-panel-interactive min-w-0 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                        {value ?? 0}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{detail}</p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--ri-brand-soft)] text-[var(--ri-brand)]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
            </div>
        </article>
    );
}

function formatDate(value) {
    if (!value) return 'Date not provided';

    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);

    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
          });
}

function formatTime(value) {
    if (!value) return 'Time not provided';

    const [hours, minutes] = String(value).split(':').map(Number);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    });
}

export default function Dashboard({ auth, stats, upcomingBooking }) {
    const metrics = stats ?? {
        totalBookings: 0,
        activeRooms: 0,
        pendingRequests: 0,
    };
    const firstName = auth?.user?.name?.trim()?.split(/\s+/)[0] || 'there';

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="ri-page-shell space-y-7">
                <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#20212B] px-6 py-8 text-white shadow-[var(--ri-shadow-md)] sm:px-8 sm:py-10">
                    <div className="pointer-events-none absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full bg-[#745363]/50 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-32 right-1/3 -z-10 h-64 w-64 rounded-full bg-[#B88D59]/20 blur-3xl" />

                    <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <span className="ri-page-eyebrow !text-[#D8C3CF]">
                                <Sparkles className="h-3.5 w-3.5" />
                                Your campus, better organized
                            </span>
                            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                                Welcome back, {firstName}.
                            </h1>
                            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                                Keep track of your facility reservations and find the right space for your next activity.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Link
                                href={route('facilities.index')}
                                className="ri-btn-primary !min-h-12 !border-white/10 !bg-white !px-5 !text-[#20212B] hover:!border-white hover:!bg-[#F1EAF0]"
                            >
                                <Building2 className="h-4 w-4" />
                                Browse facilities
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href={route('bookings.index')}
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                            >
                                <CalendarDays className="h-4 w-4" />
                                My bookings
                            </Link>
                        </div>
                    </div>
                </section>

                <section aria-label="Booking overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <MetricCard
                        icon={CalendarDays}
                        label="Total bookings"
                        value={metrics.totalBookings}
                        detail="Reservations on your account"
                    />
                    <MetricCard
                        icon={Building2}
                        label="Available venues"
                        value={metrics.activeRooms}
                        detail="Spaces currently listed"
                    />
                    <MetricCard
                        icon={Clock3}
                        label="Pending approvals"
                        value={metrics.pendingRequests}
                        detail="Requests awaiting a decision"
                    />
                </section>

                <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.85fr)]">
                    <article className="ri-panel min-w-0 overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ri-border)] px-5 py-5 sm:px-6">
                            <div>
                                <p className="ri-page-eyebrow">Coming up</p>
                                <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                                    Next reservation
                                </h2>
                            </div>
                            <Link
                                href={route('bookings.index')}
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ri-brand)] transition hover:text-[var(--ri-brand-strong)]"
                            >
                                View all
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>

                        <div className="p-5 sm:p-6">
                            {upcomingBooking ? (
                                <div className="rounded-2xl border border-[var(--ri-border)] bg-[var(--ri-surface-subtle)] p-5 sm:p-6">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ri-brand)]">
                                                Reservation details
                                            </p>
                                            <h3 className="mt-2 break-words text-xl font-bold tracking-tight text-slate-900">
                                                {upcomingBooking.facility?.name ?? 'Facility'}
                                            </h3>
                                            <div className="mt-4 space-y-2.5 text-sm text-slate-600">
                                                <p className="flex items-center gap-2">
                                                    <CalendarDays className="h-4 w-4 shrink-0 text-[var(--ri-brand)]" />
                                                    {formatDate(upcomingBooking.date)}
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <Clock3 className="h-4 w-4 shrink-0 text-[var(--ri-brand)]" />
                                                    {formatTime(upcomingBooking.start_time)} – {formatTime(upcomingBooking.end_time)}
                                                </p>
                                                {upcomingBooking.facility?.location && (
                                                    <p className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 shrink-0 text-[var(--ri-brand)]" />
                                                        <span className="break-words">{upcomingBooking.facility.location}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <StatusBadge status={upcomingBooking.status} />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--ri-border-strong)] bg-[var(--ri-surface-subtle)] px-5 py-10 text-center">
                                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ri-brand-soft)] text-[var(--ri-brand)]">
                                        <CalendarDays className="h-6 w-6" />
                                    </span>
                                    <h3 className="mt-4 text-base font-bold text-slate-900">
                                        Nothing scheduled yet
                                    </h3>
                                    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                                        Browse campus facilities and submit a reservation request when you find a space that fits.
                                    </p>
                                    <Link
                                        href={route('facilities.index')}
                                        className="ri-btn-primary mt-5"
                                    >
                                        Explore facilities
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            )}
                        </div>
                    </article>

                    <aside className="ri-panel h-fit p-5 sm:p-6">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ri-accent-soft)] text-[var(--ri-accent)]">
                                <ShieldCheck className="h-5 w-5" />
                            </span>
                            <div>
                                <p className="ri-page-eyebrow">Before you book</p>
                                <h2 className="text-base font-bold text-slate-900">
                                    Helpful reminders
                                </h2>
                            </div>
                        </div>

                        <ul className="mt-5 space-y-4">
                            <li className="flex gap-3">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ri-brand)]" />
                                <p className="text-sm leading-6 text-slate-600">
                                    Submit requests early so the facility team has time to review them.
                                </p>
                            </li>
                            <li className="flex gap-3">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ri-brand)]" />
                                <p className="text-sm leading-6 text-slate-600">
                                    Review the facility requirements before sending your request.
                                </p>
                            </li>
                            <li className="flex gap-3">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ri-brand)]" />
                                <p className="text-sm leading-6 text-slate-600">
                                    Check your booking status for approval updates and next steps.
                                </p>
                            </li>
                        </ul>

                        <Link
                            href={route('schedule.index')}
                            className="mt-6 flex items-center justify-between rounded-xl border border-[var(--ri-border)] px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[var(--ri-brand)] hover:bg-[var(--ri-brand-soft)] hover:text-[var(--ri-brand-strong)]"
                        >
                            View facility schedule
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </aside>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
