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
    Clock3,
    PanelLeftClose,
    PanelLeftOpen,
    Volume2,
    VolumeX,
    ArrowUpRight,
    Menu,
} from 'lucide-react';

const ROLE_LABELS = {
    super_admin: 'Super Admin',
    facility_admin: 'Facility Admin',
    user: 'User',
};

const getNotificationCategory = (notification = {}) => {
    const text = `${notification.title ?? ''} ${notification.message ?? ''}`.toLowerCase();
    if (text.includes('cancel')) return { label: 'Cancelled', className: 'bg-amber-50 text-amber-700' };
    if (text.includes('reject') || text.includes('declin')) return { label: 'Rejected', className: 'bg-rose-50 text-rose-700' };
    if (text.includes('approv')) return { label: 'Approved', className: 'bg-emerald-50 text-emerald-700' };
    if (text.includes('unavailable')) return { label: 'Facility', className: 'bg-slate-100 text-slate-700' };
    if (text.includes('request') || text.includes('submitted') || text.includes('new booking')) return { label: 'Request', className: 'bg-blue-50 text-blue-700' };
    return { label: 'Update', className: 'bg-stone-100 text-stone-600' };
};

const formatNotificationDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const getBookingNotificationHref = (role, bookingId) => {
    if (!bookingId) return null;
    const params = { booking: bookingId };
    if (role === 'super_admin') return route('admin.bookings.index', params);
    if (role === 'facility_admin') return route('facilitator.bookings.index', params);
    return route('bookings.index', params);
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
                    ? 'bg-[#96516F] text-white shadow-[0_4px_14px_rgba(73,51,68,0.18)]'
                    : 'text-white/95 hover:bg-[#96516F] hover:text-white'
            }`}
        >
            <Icon
                className={`h-5 w-5 ${
                    collapsed ? 'mr-0' : 'mr-3'
                } shrink-0 opacity-80`}
            />
            {!collapsed && <span className="truncate">{children}</span>}
        </Link>
    );
}

export default function AuthenticatedLayout({ header, action, children }) {
    const page = usePage();

    // Mobile navigation drawer is separate from the persisted desktop sidebar state.
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    useEffect(() => {
        setMobileNavOpen(false);
    }, [page.url]);

    // Collapsible sidebar state (persisted locally).
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;

        try {
            return window.localStorage.getItem('sidebar_collapsed') === 'true';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem('sidebar_collapsed', String(collapsed));
        } catch {
            // The layout still works if browser storage is unavailable.
        }
    }, [collapsed]);

    // Detect browser back-forward cache restoration.
    // A full reload lets Laravel validate the current session.
    useEffect(() => {
        const handlePageShow = (event) => {
            if (event.persisted) {
                window.location.reload();
            }
        };

        window.addEventListener('pageshow', handlePageShow);

        return () => {
            window.removeEventListener('pageshow', handlePageShow);
        };
    }, []);

    // Logout state and duplicate-submission protection.
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const logoutStartedRef = useRef(false);

    // Defensive user check.
    const user = page.props.auth?.user;
    const role = user?.role;

    const isSuperAdmin = role === 'super_admin';
    const isFacilityAdmin = role === 'facility_admin';
    const isUser = role === 'user';

    // Notification state. The shared bell prop must always be a list.
    const sharedNotifications = Array.isArray(page.props.notifications)
        ? page.props.notifications
        : [];
    const [realtimeNotifications, setRealtimeNotifications] = useState(
        sharedNotifications,
    );
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [isClearingNotifications, setIsClearingNotifications] =
        useState(false);
    const [viewingNotification, setViewingNotification] = useState(null);
    const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(() => {
        if (typeof window === 'undefined') return false;

        try {
            return window.localStorage.getItem('notification_sound_enabled') === 'true';
        } catch {
            return false;
        }
    });
    const [notificationToastsEnabled, setNotificationToastsEnabled] = useState(() => {
        if (typeof window === 'undefined') return true;

        try {
            return window.localStorage.getItem('notification_toasts_enabled') !== 'false';
        } catch {
            return true;
        }
    });
    const audioContextRef = useRef(null);
    const knownNotificationIdsRef = useRef(
        new Set(sharedNotifications.map((notification) => String(notification.id))),
    );

    const prevCountRef = useRef(
        sharedNotifications.filter((notification) => !notification.read).length,
    );

    // Generate short tones locally with the Web Audio API; no audio files or paid services needed.
    const playNotificationSound = (notification = {}, force = false) => {
        if ((!notificationSoundEnabled && !force) || typeof window === 'undefined') return;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContextClass();
            }

            const context = audioContextRef.current;
            const title = String(notification.title ?? '').toLowerCase();
            const message = String(notification.message ?? '').toLowerCase();
            const text = `${title} ${message}`;

            let notes = [740];
            if (text.includes('approv')) {
                notes = [660, 880];
            } else if (text.includes('reject') || text.includes('declin')) {
                notes = [440, 330];
            } else if (text.includes('cancel')) {
                notes = [520, 390];
            }

            context.resume().then(() => {
                const startAt = context.currentTime;

                notes.forEach((frequency, index) => {
                    const oscillator = context.createOscillator();
                    const gain = context.createGain();
                    const noteStart = startAt + index * 0.16;

                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(frequency, noteStart);
                    gain.gain.setValueAtTime(0.0001, noteStart);
                    gain.gain.exponentialRampToValueAtTime(0.22, noteStart + 0.025);
                    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.14);

                    oscillator.connect(gain);
                    gain.connect(context.destination);
                    oscillator.start(noteStart);
                    oscillator.stop(noteStart + 0.15);
                });
            }).catch(() => {
                // Browsers may block audio until the user explicitly enables it.
            });
        } catch {
            // Notification delivery should continue even if audio is unavailable.
        }
    };

    const toggleNotificationSound = () => {
        const nextEnabled = !notificationSoundEnabled;
        setNotificationSoundEnabled(nextEnabled);

        if (nextEnabled) {
            // Start audio directly from the button click so the browser recognizes the user gesture.
            playNotificationSound({ title: 'Sound test' }, true);
        }
    };

    useEffect(() => {
        try {
            window.localStorage.setItem(
                'notification_sound_enabled',
                String(notificationSoundEnabled),
            );
        } catch {
            // Sound preferences remain usable for the current session.
        }
    }, [notificationSoundEnabled]);

    useEffect(() => {
        try {
            window.localStorage.setItem(
                'notification_toasts_enabled',
                String(notificationToastsEnabled),
            );
        } catch {
            // Toast preferences remain usable for the current session.
        }
    }, [notificationToastsEnabled]);

    const unreadCount = realtimeNotifications.filter(
        (notification) => !notification.read,
    ).length;

    // Synchronize notifications whenever Inertia receives fresh props.
    // Detect new IDs here (rather than inside router.reload's callback) so a
    // prop-sync render cannot mark notifications as "known" before sound plays.
    useEffect(() => {
        const freshNotifications = Array.isArray(page.props.notifications)
            ? page.props.notifications
            : [];
        const newNotifications = freshNotifications.filter(
            (notification) =>
                notification.id != null &&
                !knownNotificationIdsRef.current.has(String(notification.id)),
        );

        if (newNotifications.length > 0) {
            if (notificationToastsEnabled) {
                toast.message(
                    `${newNotifications.length} new notification${
                        newNotifications.length > 1 ? 's' : ''
                    }`,
                    {
                        description: 'You have unread updates. Check the bell icon.',
                    },
                );
            }

            // Sound preference is independent from the in-app toast preference.
            playNotificationSound(newNotifications[0]);
        }

        freshNotifications.forEach((notification) => {
            if (notification.id != null) {
                knownNotificationIdsRef.current.add(String(notification.id));
            }
        });

        setRealtimeNotifications(freshNotifications);
        prevCountRef.current = freshNotifications.filter(
            (notification) => !notification.read,
        ).length;
    }, [page.props.notifications, notificationSoundEnabled, notificationToastsEnabled]);

    // Poll the server every 10 seconds so new notifications appear without
    // requiring a manual page refresh.
    useEffect(() => {
        if (!user || isLoggingOut) return undefined;

        const pollNotifications = () => {
            router.reload({
                only: ['notifications'],
                preserveScroll: true,
                preserveState: true,
            });
        };

        pollNotifications();

        const interval = window.setInterval(pollNotifications, 10000);

        return () => window.clearInterval(interval);
    }, [user, isLoggingOut]);

    // Clear all notifications.
    const clearAllNotifications = () => {
        if (isClearingNotifications || isLoggingOut) return;

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

    // Support ticket modal state.
    const [helpOpen, setHelpOpen] = useState(false);
    const [ticketCategory, setTicketCategory] = useState('');
    const [ticketDetailedInfo, setTicketDetailedInfo] = useState('');
    const [ticketFormError, setTicketFormError] = useState('');
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

    const TICKET_DESCRIPTION_MAX_LENGTH = 1000;

    const resetTicketForm = () => {
        setTicketCategory('');
        setTicketDetailedInfo('');
        setTicketFormError('');
    };

    const closeTicketModal = () => {
        if (isSubmittingTicket) return;

        setHelpOpen(false);
        resetTicketForm();
    };

    const submitTicket = (event) => {
        event.preventDefault();

        if (isSubmittingTicket || isLoggingOut) return;

        const trimmedDescription = ticketDetailedInfo.trim();

        if (!trimmedDescription) {
            setTicketFormError('Please enter details about your concern.');
            return;
        }

        if (trimmedDescription.length > TICKET_DESCRIPTION_MAX_LENGTH) {
            setTicketFormError(
                `Your ticket description must be ${TICKET_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
            );
            return;
        }

        if (!ticketCategory) {
            setTicketFormError('Please select a concern category.');
            return;
        }

        setTicketFormError('');
        setIsSubmittingTicket(true);

        router.post(
            route('concerns.store'),
            {
                category: ticketCategory,
                detailed_info: trimmedDescription,
                message: trimmedDescription,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setHelpOpen(false);
                    resetTicketForm();
                },
                onError: (errors) => {
                    const descriptionError =
                        errors.detailed_info || errors.message;

                    if (descriptionError) {
                        setTicketFormError(descriptionError);
                    } else if (errors.category) {
                        setTicketFormError(errors.category);
                    } else {
                        setTicketFormError(
                            'Unable to submit your ticket. Please check your information and try again.',
                        );
                    }
                },
                onFinish: () => setIsSubmittingTicket(false),
            },
        );
    };

    // Log out through Laravel's Inertia endpoint.
    const handleLogout = () => {
        if (logoutStartedRef.current || isLoggingOut) return;

        logoutStartedRef.current = true;
        setIsLoggingOut(true);
        setNotificationsOpen(false);
        setHelpOpen(false);
        setViewingNotification(null);

        router.post(
            route('logout'),
            {},
            {
                onError: () => {
                    toast.error(
                        'Unable to log out. Please refresh the page and try again.',
                    );
                },
                onFinish: () => {
                    logoutStartedRef.current = false;
                    setIsLoggingOut(false);
                },
            },
        );
    };

    return (
        <div className="flex min-h-screen min-w-0 bg-[#FCFAFB]">
            {/* Mobile navigation backdrop */}
            {mobileNavOpen && (
                <button
                    type="button"
                    aria-label="Close navigation menu"
                    onClick={() => setMobileNavOpen(false)}
                    className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] md:hidden"
                />
            )}

            {/* Sidebar Navigation */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col justify-between bg-[#B96B8D] text-white shadow-xl transition-all duration-300 md:z-20 md:translate-x-0 ${
                    mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                } ${collapsed ? 'md:w-16' : 'md:w-64'}`}
            >
                <div>
                    {/* App title and sidebar collapse button */}
                    <div
                        className={`flex items-center border-b border-[#96516F] bg-[#96516F]/20 transition-all duration-300 ${
                            collapsed
                                ? 'flex-col justify-center gap-3 px-2 py-4'
                                : 'justify-between p-5'
                        }`}
                    >
                        <div className="flex items-center text-xl font-serif font-bold tracking-tight">
                            <span className="mr-0.5 rounded border-2 border-white px-1.5 shadow-sm">
                                R
                            </span>
                            {!collapsed && <span>ReserveIT</span>}
                        </div>

                        <button
                            type="button"
                            onClick={() => setCollapsed((current) => !current)}
                            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            className="hidden rounded-lg p-1.5 text-white/90 transition-colors hover:bg-[#96516F] hover:text-white md:inline-flex"
                        >
                            {collapsed ? (
                                <PanelLeftOpen className="h-5 w-5 shrink-0" />
                            ) : (
                                <PanelLeftClose className="h-5 w-5 shrink-0 opacity-80" />
                            )}
                        </button>
                    </div>

                    <nav className="mt-6 space-y-1 px-3">
                        {!collapsed && <div className="px-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#D9C8D4]">My Workspace</div>}
                        <NavLink
                            href={route('dashboard')}
                            active={route().current('dashboard')}
                            icon={LayoutDashboard}
                            collapsed={collapsed}
                        >
                            Dashboard
                        </NavLink>

                        <NavLink
                            href={route('facilities.index')}
                            active={route().current('facilities.index')}
                            icon={SquareTerminal}
                            collapsed={collapsed}
                        >
                            Facilities
                        </NavLink>

                        <NavLink
                            href={route('schedule.index')}
                            active={route().current('schedule.index')}
                            icon={CalendarDays}
                            collapsed={collapsed}
                        >
                            Schedule Grid
                        </NavLink>

                        {isSuperAdmin && (
                            <NavLink
                                href={route('bookings.index')}
                                active={route().current('bookings.index')}
                                icon={CalendarCheck}
                                collapsed={collapsed}
                            >
                                My Bookings
                            </NavLink>
                        )}

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
                                    href={route('activity-plans.index')}
                                    active={(route().current('activity-plans.index') || route().current('activity-plans.show'))}
                                    icon={CalendarDays}
                                    collapsed={collapsed}
                                >
                                    Activity Plans
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
                                    href={route('bookings.index')}
                                    active={route().current('bookings.index')}
                                    icon={CalendarCheck}
                                    collapsed={collapsed}
                                >
                                    My Bookings
                                </NavLink>

                                <NavLink
                                    href={route('activity-plans.index')}
                                    active={(route().current('activity-plans.index') || route().current('activity-plans.show'))}
                                    icon={CalendarDays}
                                    collapsed={collapsed}
                                >
                                    Activity Plans
                                </NavLink>

                                <NavLink
                                    href={route('concerns.my-tickets')}
                                    active={route().current('concerns.my-tickets')}
                                    icon={Ticket}
                                    collapsed={collapsed}
                                >
                                    My Tickets
                                </NavLink>

                                {!collapsed && (
                                    <div className="px-4 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-[#D9C8D4]">
                                        Facility Administration
                                    </div>
                                )}

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
                                    href={route('overtime-extensions.index')}
                                    active={route().current('overtime-extensions.index')}
                                    icon={Clock3}
                                    collapsed={collapsed}
                                >
                                    Extension Requests
                                </NavLink>
                            </>
                        )}

                        {isSuperAdmin && (
                            <NavLink href={route('activity-plans.index')} active={(route().current('activity-plans.index') || route().current('activity-plans.show'))} icon={CalendarDays} collapsed={collapsed}>Activity Plans</NavLink>
                        )}

                        {isSuperAdmin && (
                            <>
                                {!collapsed && (
                                    <div className="px-4 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-[#D9C8D4]">
                                        Super Administration
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
                                    href={route('overtime-extensions.index')}
                                    active={route().current('overtime-extensions.index')}
                                    icon={Clock3}
                                    collapsed={collapsed}
                                >
                                    Extension Requests
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

                                <NavLink
                                    href={route('admin.settings.edit')}
                                    active={route().current('admin.settings.edit')}
                                    icon={Settings}
                                    collapsed={collapsed}
                                >
                                    Booking Settings
                                </NavLink>
                            </>
                        )}
                    </nav>
                </div>

                {/* Sidebar footer actions */}
                <div className="border-t border-[#96516F] bg-[#96516F] p-4">
                    {/* User profile badge */}
                    <div
                        className={`mb-3 flex items-center rounded-xl border border-white/20 bg-[#96516F]/55 p-2.5 ${
                            collapsed ? 'justify-center' : 'gap-3'
                        }`}
                        title={collapsed ? user?.name ?? 'User' : undefined}
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#B96B8D]">
                            {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>

                        {!collapsed && (
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold leading-tight text-white">
                                    {user?.name ?? 'User'}
                                </p>
                                <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.15em] text-[#D9C8D4]/80">
                                    {ROLE_LABELS[role] ?? role ?? 'Guest'}
                                </p>
                            </div>
                        )}
                    </div>

                    <Link
                        href={route('profile.edit')}
                        title={collapsed ? 'Settings' : undefined}
                        className={`mb-1 flex w-full items-center rounded-xl text-sm font-medium text-white/90 transition-colors hover:bg-[#96516F] hover:text-white ${
                            collapsed
                                ? 'justify-center px-0 py-2.5'
                                : 'gap-3 px-4 py-2.5'
                        }`}
                    >
                        <Settings className="h-4 w-4 shrink-0 opacity-70" />
                        {!collapsed && <span>Settings</span>}
                    </Link>

                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        title={collapsed ? 'Logout' : undefined}
                        className={`flex w-full items-center rounded-xl text-left text-sm font-medium text-rose-200 transition-colors hover:bg-rose-900/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                            collapsed
                                ? 'justify-center px-0 py-2.5'
                                : 'gap-3 px-4 py-2.5'
                        }`}
                    >
                        <LogOut className="h-4 w-4 shrink-0 opacity-70" />
                        {!collapsed && (
                            <span>
                                {isLoggingOut ? 'Logging out…' : 'Logout'}
                            </span>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main workspace */}
            <div
                className={`flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300 ${collapsed ? 'md:ml-16' : 'md:ml-64'}`}
            >
                <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-gray-200/70 bg-white/90 px-3 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMobileNavOpen(true)}
                            aria-label="Open navigation menu"
                            aria-expanded={mobileNavOpen}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E8E1E7] bg-white text-[#B96B8D] shadow-sm transition hover:bg-[#F4E4EB] md:hidden"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <div className="min-w-0 flex-1">{header}</div>
                    </div>

                    <div className="ml-1 flex shrink-0 items-center gap-2 sm:ml-4 sm:gap-4">
                        {/* Notification bell */}
                        <div className="relative flex items-center">
                            <button
                                type="button"
                                onClick={() => setNotificationsOpen((open) => !open)}
                                aria-label="View notifications"
                                aria-expanded={notificationsOpen}
                                className="relative rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
                            >
                                <span className="sr-only">View notifications</span>
                                <Bell className="h-5 w-5" />

                                {unreadCount > 0 && (
                                    <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {notificationsOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setNotificationsOpen(false)}
                                    />

                                    <div className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-gray-100 bg-white p-3 shadow-xl ring-1 ring-black/5 sm:p-4">
                                        <div className="mb-3 border-b border-gray-100 pb-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                    Notifications
                                                </span>
                                                <span className="text-[10px] font-medium text-gray-400">
                                                    {realtimeNotifications.length} total
                                                </span>
                                            </div>

                                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={toggleNotificationSound}
                                                    aria-label={notificationSoundEnabled ? 'Turn notification sounds off' : 'Turn notification sounds on'}
                                                    aria-pressed={notificationSoundEnabled}
                                                    title={notificationSoundEnabled ? 'Notification sound on' : 'Notification sound off'}
                                                    className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${notificationSoundEnabled ? 'border-[#D9C8D4] bg-[#F4E4EB] text-[#B96B8D]' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                                >
                                                    {notificationSoundEnabled ? (
                                                        <Volume2 className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <VolumeX className="h-3.5 w-3.5" />
                                                    )}
                                                    Sound {notificationSoundEnabled ? 'On' : 'Off'}
                                                </button>

                                                <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[#F4E4EB] px-3 py-1.5 text-[11px] font-bold text-[#B96B8D]">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-[#B96B8D]" />
                                                    {unreadCount} New
                                                </span>

                                                {unreadCount > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={clearAllNotifications}
                                                        disabled={isClearingNotifications || isLoggingOut}
                                                        className="ml-auto inline-flex min-h-8 items-center justify-center rounded-full border border-[#E8E1E7] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#B96B8D] transition hover:bg-[#FCFAFB] disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {isClearingNotifications ? 'Updating…' : 'Mark all as read'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mb-2 flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                                Alert preferences
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setNotificationToastsEnabled((enabled) => !enabled)}
                                                aria-pressed={notificationToastsEnabled}
                                                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${notificationToastsEnabled ? 'bg-white text-[#B96B8D] shadow-sm' : 'text-gray-400 hover:bg-white'}`}
                                            >
                                                In-app alerts {notificationToastsEnabled ? 'On' : 'Off'}
                                            </button>
                                        </div>

                                        <div className="max-h-[min(60vh,28rem)] space-y-2 overflow-y-auto pr-1">
                                            {realtimeNotifications.length === 0 ? (
                                                <div className="py-6 text-center text-xs text-gray-400">
                                                    All caught up! No new notifications.
                                                </div>
                                            ) : (
                                                realtimeNotifications.map((notification, index) => (
                                                    <button
                                                        key={notification.id ?? index}
                                                        type="button"
                                                        onClick={() => {
                                                            if (isLoggingOut) return;

                                                            if (!notification.read) {
                                                                router.post(
                                                                    route('notifications.read', notification.id),
                                                                    {},
                                                                    {
                                                                        preserveScroll: true,
                                                                        preserveState: true,
                                                                    },
                                                                );
                                                            }

                                                            setViewingNotification(notification);
                                                            setNotificationsOpen(false);
                                                        }}
                                                        className={`w-full rounded-xl p-2.5 text-left text-xs transition hover:bg-gray-50 ${
                                                            notification.read
                                                                ? 'text-gray-500'
                                                                : 'bg-[#F4E4EB]/70 text-gray-600'
                                                        }`}
                                                    >
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p
                                                                className={`font-semibold ${
                                                                    notification.read
                                                                        ? 'text-gray-600'
                                                                        : 'text-gray-900'
                                                                }`}
                                                            >
                                                                {notification.title ?? 'System Notification'}
                                                            </p>
                                                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${getNotificationCategory(notification).className}`}>
                                                                {getNotificationCategory(notification).label}
                                                            </span>
                                                        </div>

                                                        <p className="mt-0.5 text-gray-500">
                                                            {notification.message ?? 'Update details received.'}
                                                        </p>
                                                        <p className="mt-1 text-[10px] text-gray-400">
                                                            {formatNotificationDate(notification.created_at)}
                                                            {notification.booking_id ? ` · Booking #${String(notification.booking_id).slice(0, 8)}` : ''}
                                                        </p>
                                                    </button>
                                                ))
                                            )}
                                        </div>

                                        <div className="mt-3 border-t border-gray-100 pt-3">
                                            <Link
                                                href={route('notifications.index')}
                                                onClick={() => setNotificationsOpen(false)}
                                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F4E4EB] px-3 py-2.5 text-xs font-bold text-[#B96B8D] transition hover:bg-[#F4E4EB]"
                                            >
                                                View notification history
                                                <ArrowUpRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {action && (
                            <div className="flex shrink-0 items-center">
                                {action}
                            </div>
                        )}
                    </div>
                </header>

                <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-5 lg:p-6">
                    <motion.div
                        key={page.url}
                        className="w-full min-w-0"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                    >
                        {children}
                    </motion.div>
                </main>
            </div>

            {/* Notification detail modal */}
            {viewingNotification && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
                    onClick={() => setViewingNotification(null)}
                >
                    <div
                        className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#B96B8D]">
                                    Notification
                                </p>
                                <h3 className="mt-1 text-xl font-semibold text-gray-900">
                                    {viewingNotification.title ?? 'System Notification'}
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={() => setViewingNotification(null)}
                                aria-label="Close notification"
                                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="whitespace-pre-wrap text-sm text-gray-700">
                            {viewingNotification.message ?? 'No additional details.'}
                        </p>

                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setViewingNotification(null)}
                                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                            >
                                Close
                            </button>
                            {viewingNotification.booking_id && (
                                <Link
                                    href={getBookingNotificationHref(role, viewingNotification.booking_id)}
                                    onClick={() => setViewingNotification(null)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B96B8D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#96516F]"
                                >
                                    View related booking
                                    <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            )}
                            {viewingNotification.facility_url && (
                                <Link
                                    href={viewingNotification.facility_url}
                                    onClick={() => setViewingNotification(null)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B96B8D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#96516F]"
                                >
                                    View facility
                                    <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Floating support ticket trigger */}
            <button
                type="button"
                onClick={() => {
                    if (isLoggingOut) return;

                    setTicketFormError('');
                    setHelpOpen(true);
                }}
                disabled={isLoggingOut}
                className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#B96B8D] text-xl font-semibold text-white shadow-lg transition hover:bg-[#96516F] disabled:cursor-not-allowed disabled:opacity-60 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
                aria-label="Submit a ticket"
                title="Submit a ticket"
            >
                <MessageCircleQuestion className="h-6 w-6" />
            </button>

            {/* Support ticket modal */}
            {helpOpen && (
                <div
                    className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            closeTicketModal();
                        }
                    }}
                >
                    <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#B96B8D]">
                                    Submit a Ticket
                                </p>
                                <h3 className="mt-1 text-xl font-semibold text-gray-900">
                                    Report an issue or share feedback
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Your report date will be recorded automatically when you submit.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeTicketModal}
                                disabled={isSubmittingTicket}
                                aria-label="Close ticket form"
                                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={submitTicket} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="ticket-category"
                                    className="mb-1 block text-sm font-medium text-gray-700"
                                >
                                    Concern Category
                                </label>

                                <select
                                    id="ticket-category"
                                    required
                                    value={ticketCategory}
                                    onChange={(event) => {
                                        setTicketCategory(event.target.value);
                                        setTicketFormError('');
                                    }}
                                    className="block w-full rounded-2xl border border-gray-200 p-3 text-sm text-gray-700 outline-none focus:border-[#B96B8D] focus:ring-2 focus:ring-[#F4E4EB]"
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
                                <label
                                    htmlFor="ticket-detailed-info"
                                    className="mb-1 block text-sm font-medium text-gray-700"
                                >
                                    Detailed Information
                                </label>

                                <textarea
                                    id="ticket-detailed-info"
                                    value={ticketDetailedInfo}
                                    onChange={(event) => {
                                        const nextValue = event.target.value;

                                        if (nextValue.length <= TICKET_DESCRIPTION_MAX_LENGTH) {
                                            setTicketDetailedInfo(nextValue);
                                            setTicketFormError('');
                                        }
                                    }}
                                    rows={5}
                                    maxLength={TICKET_DESCRIPTION_MAX_LENGTH}
                                    aria-describedby="ticket-description-counter ticket-description-error"
                                    aria-invalid={Boolean(ticketFormError)}
                                    className="block w-full rounded-2xl border border-gray-200 p-3 text-sm text-gray-700 outline-none focus:border-[#B96B8D] focus:ring-2 focus:ring-[#F4E4EB]"
                                    placeholder="Describe the issue or feedback in detail…"
                                    required
                                />

                                <div className="mt-1 flex items-start justify-between gap-3">
                                    <p
                                        id="ticket-description-error"
                                        role="alert"
                                        className="text-xs text-rose-600"
                                    >
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
                                    onClick={closeTicketModal}
                                    disabled={isSubmittingTicket}
                                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        isSubmittingTicket ||
                                        isLoggingOut ||
                                        !ticketCategory ||
                                        ticketDetailedInfo.trim().length === 0 ||
                                        ticketDetailedInfo.trim().length > TICKET_DESCRIPTION_MAX_LENGTH
                                    }
                                    className="rounded-xl bg-[#B96B8D] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#96516F] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmittingTicket
                                        ? 'Submitting…'
                                        : 'Submit a ticket'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
