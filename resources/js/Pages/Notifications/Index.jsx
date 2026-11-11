import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    Bell,
    BellRing,
    CalendarClock,
    CalendarX,
    CheckCircle2,
    CheckCheck,
    Clock3,
    Search,
    SlidersHorizontal,
    XCircle,
    ArrowUpRight,
    Inbox,
    ArrowLeft,
    Ticket,
} from 'lucide-react';

const CATEGORY_STYLES = {
    request: { label: 'Booking request', className: 'bg-blue-50 text-blue-700', icon: CalendarClock },
    approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
    rejected: { label: 'Rejected', className: 'bg-rose-50 text-rose-700', icon: XCircle },
    cancelled: { label: 'Cancelled', className: 'bg-amber-50 text-amber-700', icon: CalendarX },
    ticket: { label: 'Support ticket', className: 'bg-[#EEF3F8] text-[#493344]', icon: Ticket },
    other: { label: 'Update', className: 'bg-stone-100 text-stone-600', icon: Bell },
};

const formatDate = (value) => {
    if (!value) return 'Date unavailable';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const ticketDestination = (role, ticketId) => {
    if (!ticketId) return null;
    if (role === 'super_admin') return route('admin.concerns.index');
    return route('concerns.my-tickets');
};

const bookingDestination = (role, bookingId) => {
    if (!bookingId) return null;
    const params = { booking: bookingId };
    if (role === 'super_admin') return route('admin.bookings.index', params);
    if (role === 'facility_admin') return route('facilitator.bookings.index', params);
    return route('bookings.index', params);
};

export default function NotificationIndex({ notificationHistory, unreadCount = 0, filters = {} }) {
    const user = usePage().props.auth?.user;
    const [search, setSearch] = useState(filters.search ?? '');
    const [isMarkingAll, setIsMarkingAll] = useState(false);

    const applyFilters = (next = {}) => {
        router.get(route('notifications.index'), {
            status: next.status ?? filters.status ?? 'all',
            category: next.category ?? filters.category ?? 'all',
            search: next.search ?? search,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const markAllRead = () => {
        if (isMarkingAll || unreadCount < 1) return;
        setIsMarkingAll(true);
        router.post(route('notifications.clear'), {}, {
            preserveScroll: true,
            onFinish: () => setIsMarkingAll(false),
        });
    };

    const notificationDestination = (notification) => notification.ticket_id
        ? ticketDestination(user?.role, notification.ticket_id)
        : bookingDestination(user?.role, notification.booking_id);

    const openNotification = (notification) => {
        const destination = notificationDestination(notification);
        if (destination) {
            router.post(route('notifications.read', notification.id), {}, {
                preserveScroll: true,
                onSuccess: () => router.visit(destination),
            });
        } else if (!notification.read) {
            router.post(route('notifications.read', notification.id), {}, {
                preserveScroll: true,
            });
        }
    };

    const statusOptions = [
        { value: 'all', label: 'All' },
        { value: 'unread', label: 'Unread' },
        { value: 'read', label: 'Read' },
    ];
    const categoryOptions = [
        { value: 'all', label: 'All types' },
        { value: 'request', label: 'Requests' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'ticket', label: 'Support tickets' },
        { value: 'other', label: 'Other' },
    ];

    return (
        <AuthenticatedLayout header="Notification Center">
            <Head title="Notification Center" />

            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-center">
                    <Link
                        href={user?.role === 'super_admin' ? route('admin.dashboard') : user?.role === 'facility_admin' ? route('facilitator.dashboard') : route('user.dashboard')}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E8E1E7] bg-white px-4 py-2 text-sm font-semibold text-[#493344] shadow-sm transition hover:bg-[#FCFAFB]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to dashboard
                    </Link>
                </div>
                <section className="overflow-hidden rounded-3xl border border-[#E8E1E7] bg-white shadow-sm">
                    <div className="bg-gradient-to-r from-[#493344] to-[#604457] px-6 py-7 text-white sm:px-8">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">ReserveIT updates</p>
                                <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Notification Center</h1>
                                <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
                                    Review reservation updates, support ticket activity, and other account notifications in one place.
                                </p>
                                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                                    <span className="h-2 w-2 rounded-full bg-white/90" />
                                    {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
                                <BellRing className="h-7 w-7" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5 p-5 sm:p-7">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-wrap gap-2">
                                {statusOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => applyFilters({ status: option.value })}
                                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${(filters.status ?? 'all') === option.value ? 'bg-[#B96B8D] text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={markAllRead}
                                disabled={isMarkingAll || unreadCount < 1}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E8E1E7] px-4 py-2.5 text-xs font-semibold text-[#493344] transition hover:bg-[#FCFAFB] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <CheckCheck className="h-4 w-4" />
                                {isMarkingAll ? 'Marking read…' : 'Mark all as read'}
                            </button>
                        </div>

                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                applyFilters({ search });
                            }}
                            className="flex flex-col gap-3 sm:flex-row"
                        >
                            <div className="relative flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search event title, facility, details, booking ID, or ticket ID…"
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#B96B8D] focus:bg-white focus:ring-2 focus:ring-[#EADDE1]"
                                />
                            </div>
                            <button type="submit" className="rounded-xl bg-[#B96B8D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#96516F]">
                                Search
                            </button>
                        </form>

                        <div className="flex flex-wrap items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4 text-stone-400" />
                            <span className="mr-1 text-xs font-semibold text-stone-500">Type:</span>
                            {categoryOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => applyFilters({ category: option.value })}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${(filters.category ?? 'all') === option.value ? 'bg-[#F8EDF2] text-[#493344]' : 'text-stone-500 hover:bg-stone-100'}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-stone-100 pt-2">
                            {notificationHistory?.data?.length ? (
                                <div className="space-y-3">
                                    {notificationHistory.data.map((notification) => {
                                        const meta = CATEGORY_STYLES[notification.category] ?? CATEGORY_STYLES.other;
                                        const Icon = meta.icon;
                                        const destination = notificationDestination(notification);

                                        return (
                                            <article key={notification.id} className={`flex flex-col gap-4 rounded-2xl border p-4 transition sm:flex-row sm:items-start sm:p-5 ${notification.read ? 'border-stone-100 bg-white' : 'border-[#E8E1E7] bg-[#FCFAF9] shadow-sm'}`}>
                                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.className}`}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <h2 className={`break-words text-sm ${notification.read ? 'font-semibold text-stone-700' : 'font-bold text-stone-900'}`}>
                                                                {notification.event_title || notification.title}
                                                            </h2>
                                                            {notification.event_title && (
                                                                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-stone-400">
                                                                    {notification.title}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${meta.className}`}>{meta.label}</span>
                                                        {!notification.read && <span className="h-2 w-2 rounded-full bg-rose-500" title="Unread" />}
                                                    </div>
                                                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-600">{notification.message}</p>
                                                    {(notification.facility_name || notification.booking_date || notification.start_time) && (
                                                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 rounded-xl bg-stone-50 px-3 py-2.5 text-xs text-stone-500">
                                                            {notification.facility_name && <span><strong className="font-semibold text-stone-700">Facility:</strong> {notification.facility_name}</span>}
                                                            {notification.booking_date && <span><strong className="font-semibold text-stone-700">Date:</strong> {notification.booking_date}</span>}
                                                            {notification.start_time && notification.end_time && <span><strong className="font-semibold text-stone-700">Time:</strong> {notification.start_time.slice(0, 5)}–{notification.end_time.slice(0, 5)}</span>}
                                                        </div>
                                                    )}
                                                    <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-stone-400">
                                                        <Clock3 className="h-3.5 w-3.5" />
                                                        {formatDate(notification.created_at)}
                                                        {notification.ticket_id ? <span>· Ticket #{notification.ticket_id}</span> : notification.booking_id ? <span>· Booking #{String(notification.booking_id).slice(0, 8)}</span> : null}
                                                    </p>
                                                </div>
                                                {destination && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openNotification(notification)}
                                                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#B96B8D] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#96516F]"
                                                    >
                                                        {notification.ticket_id ? 'View ticket' : 'View booking'} <ArrowUpRight className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                                {!destination && !notification.read && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openNotification(notification)}
                                                        className="shrink-0 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                                                    >
                                                        Mark as read
                                                    </button>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-16 text-center">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
                                        <Inbox className="h-7 w-7" />
                                    </div>
                                    <h2 className="mt-4 text-base font-semibold text-stone-800">No notifications found</h2>
                                    <p className="mt-1 text-sm text-stone-500">Try changing your filters, or check back when you receive an update.</p>
                                </div>
                            )}
                        </div>

                        {notificationHistory?.links?.length > 3 && (
                            <div className="flex flex-wrap items-center justify-center gap-2 border-t border-stone-100 pt-5">
                                {notificationHistory.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url ?? '#'}
                                        preserveScroll
                                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${link.active ? 'bg-[#B96B8D] text-white' : link.url ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' : 'cursor-not-allowed text-stone-300'}`}
                                        aria-disabled={!link.url}
                                    >
                                        <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
