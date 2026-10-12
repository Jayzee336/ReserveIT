import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    SquareTerminal,
    CalendarDays,
    Settings,
    LogOut,
    Building2,
    Users,
    ClipboardCheck,
    MessageSquareText,
    Bell,
    MessageCircleQuestion,
    Ticket,
    CalendarCheck,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react';

const ROLE_LABELS = {
    super_admin: 'Super Admin',
    facility_admin: 'Facility Admin',
    user: 'User',
};

function NavLink({ href, active, icon: Icon, children, collapsed = false }) {
    return (
        <Link
            href={href}
            title={collapsed ? children : undefined}
            className={`flex items-center rounded-xl text-sm font-medium transition-all ${
                collapsed ? 'justify-center px-0 py-3' : 'px-4 py-3'
            } ${
                active
                    ? 'bg-[#846A75] text-white shadow-inner'
                    : 'text-purple-100 hover:bg-[#543F48] hover:text-white'
            }`}
        >
            <Icon className={`h-5 w-5 ${collapsed ? 'mr-0' : 'mr-3'} opacity-80 shrink-0`} />
            {!collapsed && <span className="truncate">{children}</span>}
        </Link>
    );
}

export default function AuthenticatedLayout({ header, action, children }) {
    const page = usePage();

    // ── Collapsible sidebar state (persisted) ──────────────────────────────
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('sidebar_collapsed') === 'true';
    });

    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', String(collapsed));
    }, [collapsed]);

    // ── Force reload if restored from Chrome BF Cache ─────────────────────
    useEffect(() => {
        const handlePageShow = (event) => {
            if (event.persisted) {
                window.location.reload();
            }
        };

        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);

    // ── Defensive user check ───────────────────────────────────────────────
    const user = page.props.auth?.user;
    const role = user?.role;
    const isSuperAdmin = role === 'super_admin';
    const isFacilityAdmin = role === 'facility_admin';
    const isUser = role === 'user';

    // ── Notification state & Dropdown Toggle ───────────────────────────────
    const [realtimeNotifications, setRealtimeNotifications] = useState(page.props.notifications ?? []);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [isClearingNotifications, setIsClearingNotifications] = useState(false);
    const [viewingNotification, setViewingNotification] = useState(null);
    const prevCountRef = useRef(realtimeNotifications.length);

    const unreadCount = realtimeNotifications.filter((n) => !n.read).length;

    // Sync when Inertia re-shares props
    useEffect(() => {
        setRealtimeNotifications(page.props.notifications ?? []);
    }, [page.props.notifications]);

    // ── Inertia Polling: every 30 seconds ──────────────────────────────────
    useEffect(() => {
        if (!user) return;

        const interval = setInterval(() => {
            router.reload({
                only: ['notifications'],
                preserveScroll: true,
                preserveState: true,
                onSuccess: (updatedPage) => {
                    const freshNotifications = updatedPage.props.notifications ?? [];
                    const freshUnreadCount = freshNotifications.filter((n) => !n.read).length;
                    const prevCount = prevCountRef.current;

                    if (freshUnreadCount > prevCount) {
                        const newOnes = freshUnreadCount - prevCount;
                        toast.message(`${newOnes} new notification${newOnes > 1 ? 's' : ''}`, {
                            description: 'You have unread updates. Check the bell icon.',
                        });
                    }

                    prevCountRef.current = freshUnreadCount;
                    setRealtimeNotifications(freshNotifications);
                },
            });
        }, 30000);

        return () => clearInterval(interval);
    }, [user]);

    // ── Clear all notifications ─────────────────────────────────────────────
    const clearAllNotifications = () => {
        setIsClearingNotifications(true);
        router.post(
            route('notifications.clear'),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setIsClearingNotifications(false),
            },
        );
    };

    const [helpOpen, setHelpOpen] = useState(false);

    // Ticket form state
    const [ticketAppealDate, setTicketAppealDate] = useState('');
    const [ticketCategory, setTicketCategory] = useState('');
    const [ticketDetailedInfo, setTicketDetailedInfo] = useState('');
    const [ticketFormError, setTicketFormError] = useState('');
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
    const TICKET_DESCRIPTION_MAX_LENGTH = 1000;

    const submitTicket = (e) => {
        e.preventDefault();

        const trimmedDescription = ticketDetailedInfo.trim();

        if (!trimmedDescription) {
            setTicketFormError('Please enter details about your concern.');
            return;
        }

        if (trimmedDescription.length > TICKET_DESCRIPTION_MAX_LENGTH) {
            setTicketFormError(`Your ticket description must be ${TICKET_DESCRIPTION_MAX_LENGTH} characters or fewer.`);
            return;
        }

        setTicketFormError('');
        setIsSubmittingTicket(true);

        router.post(
            route('concerns.store'),
            {
                appeal_date: ticketAppealDate || null,
                category: ticketCategory || null,
                detailed_info: ticketDetailedInfo,
                message: ticketDetailedInfo,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setHelpOpen(false);
                    setTicketAppealDate('');
                    setTicketCategory('');
                    setTicketDetailedInfo('');
                    setTicketFormError('');
                },
                onError: (errors) => {
                    const descriptionError = errors.detailed_info || errors.message;
                    if (descriptionError) {
                        setTicketFormError(descriptionError);
                    }
                },
                onFinish: () => setIsSubmittingTicket(false),
            },
        );
    };

    return (
        <div className="flex min-h-screen bg-[#FDF6F0]">
            {/* Sidebar Navigation */}
            <aside
                className={`fixed z-20 flex h-full flex-col justify-between bg-[#6A535C] text-white shadow-xl transition-all duration-300 ${
                    collapsed ? 'w-16' : 'w-64'
                }`}
            >
                <div>
                    {/* Top Header with App Title & Collapse Toggle Button */}
                    <div
                        className={`flex items-center border-b border-[#543F48] transition-all duration-300 ${
                            collapsed ? 'flex-col gap-3 px-2 py-4 justify-center' : 'justify-between p-5'
                        }`}
                    >
                        <div className="flex items-center text-xl font-serif font-bold tracking-tight">
                            <span className="mr-0.5 rounded border-2 border-white px-1.5 shadow-sm">R</span>
                            {!collapsed && <span>eservedIT</span>}
                        </div>

                        <button
                            type="button"
                            onClick={() => setCollapsed((c) => !c)}
                            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            className="rounded-lg p-1.5 text-purple-100 transition-colors hover:bg-[#543F48] hover:text-white"
                        >
                            {collapsed ? (
                                <PanelLeftOpen className="h-5 w-5 shrink-0" />
                            ) : (
                                <PanelLeftClose className="h-5 w-5 shrink-0 opacity-80" />
                            )}
                        </button>
                    </div>

                    <nav className="mt-6 space-y-1 px-3">
                        <NavLink href={route('dashboard')} active={route().current('dashboard')} icon={LayoutDashboard} collapsed={collapsed}>
                            Dashboard
                        </NavLink>

                        <NavLink href={route('facilities.index')} active={route().current('facilities.index')} icon={SquareTerminal} collapsed={collapsed}>
                            Facilities
                        </NavLink>

                        <NavLink href={route('schedule.index')} active={route().current('schedule.index')} icon={CalendarDays} collapsed={collapsed}>
                            Schedule Grid
                        </NavLink>

                        {isUser && (
                            <>
                                <NavLink
                                    href={route('bookings.index')}
                                    active={route().current('bookings.index')}
                                    icon={CalendarCheck}
                                    collapsed={collapsed}
                                >
                                    My Bookings
                                </NavLink>
                                <NavLink
                                    href={route('concerns.my-tickets')}
                                    active={route().current('concerns.my-tickets')}
                                    icon={Ticket}
                                    collapsed={collapsed}
                                >
                                    My Tickets
                                </NavLink>
                            </>
                        )}

                        
{isFacilityAdmin && (
    <>
        <NavLink
            href={route('facilitator.bookings.index')}
            active={route().current('facilitator.bookings.index')}
            icon={ClipboardCheck}
            collapsed={collapsed}
        >
            Booking Approvals
        </NavLink>

        <NavLink
            href={route('facilitator.managed-facilities.index')}
            active={route().current('facilitator.managed-facilities.index')}
            icon={Building2}
            collapsed={collapsed}
        >
            Managed Facilities
        </NavLink>

        <NavLink
            href={route('bookings.index')}
            active={route().current('bookings.index')}
            icon={CalendarCheck}
            collapsed={collapsed}
        >
            My Bookings
        </NavLink>

        <NavLink
            href={route('concerns.my-tickets')}
            active={route().current('concerns.my-tickets')}
            icon={Ticket}
            collapsed={collapsed}
        >
            My Tickets
        </NavLink>
    </>
)}

                        {isSuperAdmin && (
                            <>
                                {!collapsed && (
                                    <div className="px-4 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-purple-200/60">
                                        Admin
                                    </div>
                                )}
                                <NavLink
                                    href={route('admin.bookings.index')}
                                    active={route().current('admin.bookings.index')}
                                    icon={ClipboardCheck}
                                    collapsed={collapsed}
                                >
                                    Booking Approvals
                                </NavLink>
                                <NavLink
                                    href={route('admin.facilities.index')}
                                    active={route().current('admin.facilities.index')}
                                    icon={Building2}
                                    collapsed={collapsed}
                                >
                                    Manage Facilities
                                </NavLink>
                                <NavLink
                                    href={route('admin.users.index')}
                                    active={route().current('admin.users.index')}
                                    icon={Users}
                                    collapsed={collapsed}
                                >
                                    Manage Users
                                </NavLink>
                                <NavLink
                                    href={route('admin.concerns.index')}
                                    active={route().current('admin.concerns.index')}
                                    icon={MessageSquareText}
                                    collapsed={collapsed}
                                >
                                    User Concerns
                                </NavLink>
                                <NavLink href={route('admin.settings.edit')} active={route().current('admin.settings.edit')} icon={Settings} collapsed={collapsed}>
                                    Booking Settings
                                </NavLink>
                            </>
                        )}
                    </nav>
                </div>

                {/* Sidebar Footer Context Actions */}
                <div className="border-t border-[#543F48] bg-[#5C4750] p-4">
                    {/* User Profile Badge */}
                    <div
                        className={`mb-3 flex items-center rounded-xl bg-[#4E3A43]/50 p-2.5 border border-[#543F48]/40 ${
                            collapsed ? 'justify-center' : 'gap-3'
                        }`}
                        title={collapsed ? user?.name ?? 'User' : undefined}
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#6A535C]">
                            {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        {!collapsed && (
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold leading-tight text-white">{user?.name ?? 'User'}</p>
                                <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.15em] text-purple-200/70">
                                    {ROLE_LABELS[role] ?? role ?? 'Guest'}
                                </p>
                            </div>
                        )}
                    </div>

                    <Link
                        href={route('profile.edit')}
                        title={collapsed ? 'Settings' : undefined}
                        className={`mb-1 flex w-full items-center rounded-xl text-sm font-medium text-purple-100 transition-colors hover:bg-[#4E3A43] hover:text-white ${
                            collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2.5'
                        }`}
                    >
                        <Settings className="h-4 w-4 shrink-0 opacity-70" />
                        {!collapsed && <span>Settings</span>}
                    </Link>

                    <button
                        type="button"
                        onClick={() => {
                            router.post(route('logout'), {}, {
                                onSuccess: () => {
                                    window.location.replace('/login');
                                },
                            });
                        }}
                        title={collapsed ? 'Logout' : undefined}
                        className={`flex w-full items-center rounded-xl text-left text-sm font-medium text-rose-200 transition-colors hover:bg-rose-900/30 hover:text-white ${
                            collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2.5'
                        }`}
                    >
                        <LogOut className="h-4 w-4 shrink-0 opacity-70" />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Workspace */}
            <div className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
                <header className="flex items-center justify-between border-b border-gray-200/70 bg-white/80 px-4 py-4 sm:px-8">
                    <div className="min-w-0 flex-1">{header}</div>

                    <div className="ml-4 flex items-center gap-4">
                        {/* Interactive Notification Bell Container */}
                        <div className="relative flex items-center">
                            <button
                                onClick={() => setNotificationsOpen(!notificationsOpen)}
                                className="relative rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
                            >
                                <span className="sr-only">View notifications</span>
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                                )}
                            </button>

                            {/* Notifications Dropdown Panel */}
                            {notificationsOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setNotificationsOpen(false)} />
                                    <div className="absolute right-0 top-full mt-2 z-40 w-80 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl ring-1 ring-black/5">
                                        <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Notifications</span>
                                            <div className="flex items-center gap-2">
                                                {unreadCount > 0 && (
                                                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-[#6A535C]">
                                                        {unreadCount} New
                                                    </span>
                                                )}
                                                {unreadCount > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={clearAllNotifications}
                                                        disabled={isClearingNotifications}
                                                        className="text-[10px] font-semibold text-indigo-600 transition hover:text-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {isClearingNotifications ? 'Clearing…' : 'Clear all'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto space-y-1">
                                            {realtimeNotifications.length === 0 ? (
                                                <div className="py-6 text-center text-xs text-gray-400">
                                                    All caught up! No new notifications.
                                                </div>
                                            ) : (
                                                realtimeNotifications.map((notification, index) => (
                                                    <button
                                                        key={notification.id || index}
                                                        type="button"
                                                        onClick={() => {
                                                            if (!notification.read) {
                                                                router.post(route('notifications.read', notification.id), {}, {
                                                                    preserveScroll: true,
                                                                    preserveState: true,
                                                                });
                                                            }
                                                            setViewingNotification(notification);
                                                            setNotificationsOpen(false);
                                                        }}
                                                        className={`w-full text-left rounded-xl p-2.5 text-xs transition hover:bg-gray-50 ${
                                                            notification.read ? 'text-gray-500' : 'bg-purple-50/60 text-gray-600'
                                                        }`}
                                                    >
                                                        <p className={`font-semibold ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                                                            {notification.title || 'System Notification'}
                                                        </p>
                                                        <p className="mt-0.5 text-gray-500">{notification.message || 'Update details received.'}</p>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {action && (
                            <div className="flex items-center shrink-0">
                                {action}
                            </div>
                        )}
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-8">
                    <motion.div
                        key={page.url}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                    >
                        {children}
                    </motion.div>
                </main>
            </div>

            {/* Notification Detail Modal */}
            {viewingNotification && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setViewingNotification(null)}>
                    <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#6A535C]">Notification</p>
                                <h3 className="mt-1 text-xl font-semibold text-gray-900">{viewingNotification.title || 'System Notification'}</h3>
                            </div>
                            <button type="button" onClick={() => setViewingNotification(null)} className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700">✕</button>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewingNotification.message || 'No additional details.'}</p>
                        <div className="mt-6 flex justify-end">
                            <button type="button" onClick={() => setViewingNotification(null)} className="rounded-xl bg-[#6A535C] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#533e45]">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Support Ticket Float Trigger */}
            <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#6A535C] text-xl font-semibold text-white shadow-lg transition hover:bg-[#533e45]"
                aria-label="Submit a ticket"
            >
                <MessageCircleQuestion className="h-6 w-6" />
            </button>

            {/* Support Ticket Modal Dialog */}
            {helpOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#6A535C]">Submit a Ticket</p>
                                <h3 className="mt-1 text-xl font-semibold text-gray-900">Report an issue or share feedback</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setHelpOpen(false)}
                                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={submitTicket} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Appeal Date</label>
                                <input
                                    type="date"
                                    value={ticketAppealDate}
                                    onChange={(e) => setTicketAppealDate(e.target.value)}
                                    className="block w-full rounded-2xl border border-gray-200 p-3 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Concern Category</label>
                                <select
                                    value={ticketCategory}
                                    onChange={(e) => setTicketCategory(e.target.value)}
                                    className="block w-full rounded-2xl border border-gray-200 p-3 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                >
                                    <option value="">Select a category…</option>
                                    <option value="Facility">Facility</option>
                                    <option value="UI Improvements">UI Improvements</option>
                                    <option value="Account">Account</option>
                                    <option value="Bug">Bug</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Detailed Information</label>
                                <textarea
                                    value={ticketDetailedInfo}
                                    onChange={(e) => {
                                        const nextValue = e.target.value;
                                        if (nextValue.length <= TICKET_DESCRIPTION_MAX_LENGTH) {
                                            setTicketDetailedInfo(nextValue);
                                            setTicketFormError('');
                                        }
                                    }}
                                    rows={5}
                                    maxLength={TICKET_DESCRIPTION_MAX_LENGTH}
                                    aria-describedby="ticket-description-counter ticket-description-error"
                                    aria-invalid={Boolean(ticketFormError)}
                                    className="block w-full rounded-2xl border border-gray-200 p-3 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                    placeholder="Describe the issue or feedback in detail…"
                                    required
                                />
                                <div className="mt-1 flex items-start justify-between gap-3">
                                    <p id="ticket-description-error" role="alert" className="text-xs text-rose-600">
                                        {ticketFormError}
                                    </p>
                                    <p
                                        id="ticket-description-counter"
                                        className={`ml-auto shrink-0 text-xs ${
                                            ticketDetailedInfo.length >= TICKET_DESCRIPTION_MAX_LENGTH
                                                ? 'font-semibold text-rose-600'
                                                : 'text-gray-500'
                                        }`}
                                    >
                                        {ticketDetailedInfo.length} / {TICKET_DESCRIPTION_MAX_LENGTH} characters
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setHelpOpen(false)}
                                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        isSubmittingTicket ||
                                        ticketDetailedInfo.trim().length === 0 ||
                                        ticketDetailedInfo.length > TICKET_DESCRIPTION_MAX_LENGTH
                                    }
                                    className="rounded-xl bg-[#6A535C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#533e45] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmittingTicket ? 'Submitting…' : 'Submit a ticket'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}