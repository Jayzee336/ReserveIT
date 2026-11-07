import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import DashboardDrilldownModal from '@/Components/DashboardDrilldownModal';
import {
    ArrowRight,
    CalendarDays,
    Clock3,
    Building2,
    MapPin,
    ShieldCheck,
    Sparkles,
    CheckCircle2,
    XCircle,
    Ban,
    BarChart3,
    TrendingUp,
} from 'lucide-react';

const DASHBOARD_STATUS_ORDER = ['pending', 'approved', 'completed', 'declined', 'cancelled'];

const STATUS_STYLES = {
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    declined: 'border-rose-200 bg-rose-50 text-rose-800',
    completed: 'border-sky-200 bg-sky-50 text-sky-800',
    cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
};

const STATUS_LABELS = {
    pending: 'Pending review',
    approved: 'Confirmed',
    declined: 'Declined',
    completed: 'Completed',
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

function MetricCard({ icon: Icon, label, value, detail, onClick, href }) {
    const content = (
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value ?? 0}</p>
                <p className="mt-1 text-xs text-slate-500">{detail}</p>
                {(onClick || href) && <span className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-[#846A75] opacity-80">View details ↗</span>}
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F4ECEF] text-[#6A535C]">
                <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
        </div>
    );
    const classes = "ri-panel ri-panel-interactive min-w-0 p-5 text-left transition hover:-translate-y-0.5 hover:border-[#BDAAB2] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#846A75] focus:ring-offset-2 sm:p-6";
    if (href) return <Link href={href} className={classes}>{content}</Link>;
    if (onClick) return <button type="button" onClick={onClick} className={`w-full ${classes}`}>{content}</button>;
    return <article className={classes}>{content}</article>;
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

export default function Dashboard({
    auth,
    stats,
    upcomingBooking,
    bookingTrends = [],
    statusBreakdown = [],
    mostUsedFacilities = [],
    recentBookings = [],
    bookingDetails = [],
    statusDetails = {},
}) {
    const metrics = stats ?? {
        totalBookings: 0,
        activeRooms: 0,
        pendingRequests: 0,
        approvedBookings: 0,
        completedBookings: 0,
        declinedBookings: 0,
        cancelledBookings: 0,
    };
    const trendMaximum = Math.max(...bookingTrends.map((item) => item.bookings), 1);
    const firstName = auth?.user?.name?.trim()?.split(/\s+/)[0] || 'there';
    const [selectedDetail, setSelectedDetail] = useState(null);
    const [selectedTrendLabel, setSelectedTrendLabel] = useState(null);
    const selectedTrend = bookingTrends.find((item) => item.label === selectedTrendLabel);
    const displayedStatusBreakdown = DASHBOARD_STATUS_ORDER.map((status) => {
        const item = statusBreakdown.find((entry) => entry.status === status);
        return {
            status,
            count: Number(item?.count ?? 0),
            percentage: Number(item?.percentage ?? 0),
        };
    });


    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="ri-page-shell space-y-7">
                <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#6A535C] px-6 py-8 text-white shadow-[var(--ri-shadow-md)] sm:px-8 sm:py-10">
                    <div className="pointer-events-none absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full bg-[#846A75]/50 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-32 right-1/3 -z-10 h-64 w-64 rounded-full bg-[#B88D59]/20 blur-3xl" />

                    <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <span className="ri-page-eyebrow !text-[#FDF6F0]">
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
                                className="ri-btn-primary !min-h-12 !border-white/10 !bg-white !px-5 !text-[#6A535C] hover:!border-white hover:!bg-[#FFF8F2]"
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

                <section aria-label="Booking overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <MetricCard icon={CalendarDays} label="Total bookings" value={metrics.totalBookings} detail="All requests on your account" onClick={() => setSelectedDetail({ title: 'All your bookings', description: 'Every reservation submitted from your account.', items: bookingDetails, mode: 'bookings' })} />
                    <MetricCard icon={Building2} label="Available venues" value={metrics.activeRooms} detail="Spaces currently listed" href={route('facilities.index')} />
                </section>

                <section aria-label="Your booking analytics" className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.9fr)]">
                    <article className="ri-panel min-w-0 p-5 sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="ri-page-eyebrow !text-[#6A535C]">Your activity</p>
                                <h2 className="mt-1 text-lg font-bold text-slate-900">Booking activity</h2>
                                <p className="mt-1 text-xs text-slate-500">Monthly reservations over the last six months.</p>
                            </div>
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4ECEF] text-[#6A535C]"><TrendingUp className="h-5 w-5" /></span>
                        </div>
                        <div className="mt-6 grid grid-cols-6 items-end gap-2 sm:gap-4">
                            {bookingTrends.map((item) => {
                                const facilityHint = (item.facilities ?? []).map((facility) => `${facility.name}: ${facility.bookings}`).join(', ');
                                return (
                                    <div key={item.label} className="flex min-w-0 flex-col items-center gap-2">
                                        <span className="text-xs font-semibold text-slate-700">{item.bookings}</span>
                                        <button type="button" onClick={() => setSelectedTrendLabel(item.label)}
                                            title={`${item.label}: ${item.bookings} bookings. ${facilityHint || 'No facility details'}`}
                                            aria-label={`View facilities booked in ${item.label}`}
                                            className={`flex h-32 w-full items-end rounded-t-lg bg-[#F4ECEF] outline-none ring-offset-2 transition hover:ring-2 hover:ring-[#846A75] focus:ring-2 focus:ring-[#846A75] ${selectedTrendLabel === item.label ? 'ring-2 ring-[#6A535C]' : ''}`}>
                                            <span className="block w-full rounded-t-lg bg-[#846A75] transition-all"
                                                style={{ height: item.bookings > 0 ? `${Math.max(8, (item.bookings / trendMaximum) * 100)}%` : '3px' }} />
                                        </button>
                                        <span className="truncate text-[10px] text-slate-500">{item.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                        {selectedTrend && (
                            <div className="mt-4 rounded-xl border border-[#E7DDE1] bg-[#FFFAF7] p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-bold text-[#6A535C]">{selectedTrend.label} facility activity</p>
                                        <p className="text-xs text-slate-500">{selectedTrend.bookings} bookings across {(selectedTrend.facilities ?? []).length} facilities</p>
                                    </div>
                                    <button type="button" onClick={() => setSelectedTrendLabel(null)} className="text-xs font-semibold text-[#6A535C] hover:underline">Clear</button>
                                </div>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {(selectedTrend.facilities ?? []).map((facility) => (
                                        <div key={facility.name} className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs">
                                            <span className="text-slate-700">{facility.name}</span>
                                            <span className="font-bold text-[#6A535C]">{facility.bookings}</span>
                                        </div>
                                    ))}
                                    {(selectedTrend.facilities ?? []).length === 0 && <p className="text-xs text-slate-500">No bookings in this period.</p>}
                                </div>
                            </div>
                        )}
                        {bookingTrends.length === 0 && <p className="mt-6 text-sm text-slate-500">No booking activity yet.</p>}
                    </article>

                    <article className="ri-panel p-5 sm:p-6">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4ECEF] text-[#6A535C]"><BarChart3 className="h-5 w-5" /></span>
                            <div>
                                <p className="ri-page-eyebrow !text-[#6A535C]">Your reservations</p>
                                <h2 className="text-lg font-bold text-[#6A535C]">Status breakdown</h2>
                            </div>
                        </div>
                        <div className="mt-5 space-y-4">
                            {displayedStatusBreakdown.map((item) => {
                                const statusColors = { pending: 'bg-amber-400', approved: 'bg-emerald-500', completed: 'bg-sky-500', declined: 'bg-rose-500', cancelled: 'bg-slate-400' };
                                return (
                                    <button key={item.status} type="button"
                                        onClick={() => setSelectedDetail({ title: `${item.status[0].toUpperCase()}${item.status.slice(1)} bookings`, description: `Your ${item.status} reservations.`, items: statusDetails[item.status] ?? [], mode: 'bookings' })}
                                        className="block w-full rounded-lg p-1 text-left transition hover:bg-[#FFFAF7] focus:outline-none focus:ring-2 focus:ring-[#846A75]">
                                        <div className="mb-1.5 flex justify-between gap-3 text-xs">
                                            <span className="font-semibold capitalize text-slate-700">{item.status}</span>
                                            <span className="text-slate-500">{item.count} · {item.percentage.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div className={`h-full rounded-full ${statusColors[item.status] ?? 'bg-slate-400'}`} style={{ width: `${Math.max(0, Math.min(100, item.percentage))}%` }} />
                                        </div>
                                    </button>
                                );
                            })}
                            {statusBreakdown.length === 0 && <p className="text-sm text-slate-500">No reservations to summarize.</p>}
                        </div>
                    </article>
                </section>

                <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <article className="ri-panel p-5 sm:p-6">
                        <h2 className="font-bold text-slate-900">Your most booked facilities</h2>
                        <div className="mt-4 space-y-3">
                            {mostUsedFacilities.length ? mostUsedFacilities.map((facility) => (
                                <div key={facility.name} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--ri-surface-subtle)] px-4 py-3 text-sm">
                                    <span className="font-medium text-slate-700">{facility.name}</span>
                                    <span className="shrink-0 font-semibold text-[#6A535C]">{facility.bookings} bookings</span>
                                </div>
                            )) : <p className="text-sm text-slate-500">You have not booked a facility yet.</p>}
                        </div>
                    </article>
                    <article className="ri-panel p-5 sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="font-bold text-slate-900">Recent booking activity</h2>
                            <Link href={route('bookings.index')} className="text-xs font-semibold text-[#6A535C]">View all</Link>
                        </div>
                        <div className="mt-4 space-y-3">
                            {recentBookings.length ? recentBookings.slice(0, 5).map((booking) => (
                                <div key={booking.id} className="flex items-center justify-between gap-3 border-b border-[var(--ri-border)] pb-3 last:border-0">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-800">{booking.facility?.name ?? 'Facility'}</p>
                                        <p className="text-xs text-slate-500">{formatDate(booking.booking_date ?? booking.date)} · {formatTime(booking.start_time)}</p>
                                    </div>
                                    <StatusBadge status={booking.display_status || booking.status} />
                                </div>
                            )) : <p className="text-sm text-slate-500">No recent booking activity.</p>}
                        </div>
                    </article>
                </section>

                <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.85fr)]">
                    <article className="ri-panel min-w-0 overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ri-border)] px-5 py-5 sm:px-6">
                            <div>
                                <p className="ri-page-eyebrow !text-[#6A535C]">Coming up</p>
                                <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                                    Next reservation
                                </h2>
                            </div>
                            <Link
                                href={route('bookings.index')}
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6A535C] transition hover:text-[#533E45]"
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
                                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6A535C]">
                                                Reservation details
                                            </p>
                                            <h3 className="mt-2 break-words text-xl font-bold tracking-tight text-slate-900">
                                                {upcomingBooking.facility?.name ?? 'Facility'}
                                            </h3>
                                            <div className="mt-4 space-y-2.5 text-sm text-slate-600">
                                                <p className="flex items-center gap-2">
                                                    <CalendarDays className="h-4 w-4 shrink-0 text-[#6A535C]" />
                                                    {formatDate(upcomingBooking.date)}
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <Clock3 className="h-4 w-4 shrink-0 text-[#6A535C]" />
                                                    {formatTime(upcomingBooking.start_time)} – {formatTime(upcomingBooking.end_time)}
                                                </p>
                                                {upcomingBooking.facility?.location && (
                                                    <p className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 shrink-0 text-[#6A535C]" />
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
                                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4ECEF] text-[#6A535C]">
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
                                        className="ri-btn-primary mt-5 !border-[#6A535C] !bg-[#6A535C] hover:!border-[#533E45] hover:!bg-[#533E45]"
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
                                <p className="ri-page-eyebrow !text-[#6A535C]">Before you book</p>
                                <h2 className="text-base font-bold text-slate-900">
                                    Helpful reminders
                                </h2>
                            </div>
                        </div>

                        <ul className="mt-5 space-y-4">
                            <li className="flex gap-3">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6A535C]" />
                                <p className="text-sm leading-6 text-slate-600">
                                    Submit requests early so the facility team has time to review them.
                                </p>
                            </li>
                            <li className="flex gap-3">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6A535C]" />
                                <p className="text-sm leading-6 text-slate-600">
                                    Review the facility requirements before sending your request.
                                </p>
                            </li>
                            <li className="flex gap-3">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6A535C]" />
                                <p className="text-sm leading-6 text-slate-600">
                                    Check your booking status for approval updates and next steps.
                                </p>
                            </li>
                        </ul>

                        <Link
                            href={route('schedule.index')}
                            className="mt-6 flex items-center justify-between rounded-xl border border-[var(--ri-border)] px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#6A535C] hover:bg-[#F4ECEF] hover:text-[#533E45]"
                        >
                            View facility schedule
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </aside>
                </section>
            </div>

            <DashboardDrilldownModal
                title={selectedDetail?.title}
                description={selectedDetail?.description}
                items={selectedDetail?.items ?? []}
                mode={selectedDetail?.mode ?? 'bookings'}
                onClose={() => setSelectedDetail(null)}
            />
        </AuthenticatedLayout>
    );
}
