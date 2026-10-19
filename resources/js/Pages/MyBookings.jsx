import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Calendar,
    Clock,
    MapPin,
    CheckCircle,
    Clock3,
    XCircle,
    AlertTriangle,
    ExternalLink,
    X,
    History,
    Eye,
    Edit3,
    Save,
    Users,
    Building2,
    FileText,
    UserRound,
    Wrench,
    Search,
    Filter,
    RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

const OPENING_TIME = '08:00';
const CLOSING_TIME = '20:00';
const SLOT_INTERVAL_MINUTES = 15;

const toMinutes = (time) => {
    if (!time) return 0;
    const [hour, minute] = String(time).split(':').map(Number);
    return hour * 60 + (minute || 0);
};

const generateTimeSlots = () => {
    const slots = [];
    for (let minutes = toMinutes(OPENING_TIME); minutes < toMinutes(CLOSING_TIME); minutes += SLOT_INTERVAL_MINUTES) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
    slots.push(CLOSING_TIME);
    return slots;
};

const TIME_SLOTS = generateTimeSlots();

const STATUS_PRIORITY = {
    pending: 1,
    approved: 2,
    declined: 3,
    cancelled: 4,
};

const STATUS_OPTIONS = [
    { key: 'all', label: 'All Bookings' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'declined', label: 'Declined' },
    { key: 'cancelled', label: 'Cancelled' },
];

const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const isValidTime = (time) => {
    if (!/^\d{2}:\d{2}$/.test(String(time || ''))) return false;

    const [hours, minutes] = time.split(':').map(Number);

    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

const timeToMinutes = (time) => {
    if (!isValidTime(time)) return null;

    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const isAlignedToSlot = (time) => {
    const minutes = timeToMinutes(time);
    return minutes !== null && minutes % SLOT_INTERVAL_MINUTES === 0;
};

const to24HourTime = (hour, minute, period) => {
    let hours = Number(hour) % 12;
    if (period === 'PM') hours += 12;

    return `${String(hours).padStart(2, '0')}:${String(Number(minute)).padStart(2, '0')}`;
};

const getTimeParts = (time) => {
    if (!isValidTime(time)) {
        return { hour: '04', minute: '00', period: 'PM' };
    }

    const [hours, minutes] = time.split(':').map(Number);
    return {
        hour: String(hours % 12 || 12).padStart(2, '0'),
        minute: String(minutes).padStart(2, '0'),
        period: hours >= 12 ? 'PM' : 'AM',
    };
};

const parseBookingNotes = (notes = '') => {
    const result = {
        event_name: '',
        department: '',
        designation: '',
        purpose: '',
        facilitator: '',
    };

    if (!String(notes || '').trim()) return result;

    let remaining = String(notes).replace(
        /\r?\n?\[Requested TDEVS manpower\]\s*$/i,
        ''
    );

    const eventMatch = remaining.match(
        /^Event:\s*(.*?)\s*\|\s*Dept:\s*(.*?)\s*\|\s*Desig:\s*(.*?)(?:\r?\n|$)/i
    );

    if (!eventMatch) {
        result.purpose = remaining.trim();
        return result;
    }

    result.event_name = eventMatch[1].trim();
    result.department = eventMatch[2].trim();
    result.designation = eventMatch[3].trim();

    remaining = remaining.slice(eventMatch[0].length).trim();

    if (/^Purpose:/i.test(remaining)) {
        remaining = remaining.replace(/^Purpose:\s*/i, '');

        const facilitatorMatch = remaining.match(
            /\s*\|\s*Facilitator:\s*([\s\S]*)$/i
        );

        if (facilitatorMatch) {
            result.facilitator = facilitatorMatch[1].trim();
            remaining = remaining.slice(0, facilitatorMatch.index).trim();
        }

        result.purpose = remaining.trim();
    } else {
        result.purpose = remaining;
    }

    return result;
};

const buildBookingNotes = (data) => {
    const hasStructuredDetails = [
        data.event_name,
        data.department,
        data.designation,
        data.purpose,
        data.facilitator,
    ].some((value) => String(value ?? '').trim());

    if (!hasStructuredDetails) return '';

    let notes =
        `Event: ${String(data.event_name ?? '').trim()}` +
        ` | Dept: ${String(data.department ?? '').trim()}` +
        ` | Desig: ${String(data.designation ?? '').trim()}` +
        `\nPurpose: ${String(data.purpose ?? '').trim()}`;

    if (String(data.facilitator ?? '').trim()) {
        notes += ` | Facilitator: ${String(data.facilitator).trim()}`;
    }

    return notes;
};

const formatDate = (date) => {
    if (!date) return 'Not specified';

    const dateString = String(date).slice(0, 10);
    const parsed = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) return String(date);

    return parsed.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const formatTime = (time) => {
    if (!time) return 'Not specified';

    const [hourString, minuteString] = String(time).slice(0, 5).split(':');
    const hour = Number(hourString);
    const minute = Number(minuteString);

    if (
        !Number.isInteger(hour) ||
        !Number.isInteger(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return String(time);
    }

    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const getStatus = (status) => String(status || 'unknown').toLowerCase().trim();

const getStatusBadgeClass = (status) => {
    switch (getStatus(status)) {
        case 'approved':
            return 'bg-green-50 text-green-700 border-green-200';
        case 'pending':
            return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'declined':
            return 'bg-red-50 text-red-700 border-red-200';
        case 'cancelled':
            return 'bg-gray-100 text-gray-600 border-gray-200';
        default:
            return 'bg-gray-100 text-gray-600 border-gray-200';
    }
};

const StatusIcon = ({ status }) => {
    const iconClass = 'mr-1.5 h-4 w-4 flex-shrink-0';

    switch (getStatus(status)) {
        case 'approved':
            return <CheckCircle className={`${iconClass} text-green-600`} />;
        case 'pending':
            return <Clock3 className={`${iconClass} text-amber-600`} />;
        case 'declined':
            return <XCircle className={`${iconClass} text-red-600`} />;
        case 'cancelled':
            return <AlertTriangle className={`${iconClass} text-gray-500`} />;
        default:
            return null;
    }
};

const FieldError = ({ message }) =>
    message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null;

const DetailField = ({ label, value, icon: Icon }) => (
    <div className="min-w-0">
        <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {label}
        </p>
        <p className="break-words whitespace-pre-wrap text-sm text-gray-800">
            {value || 'Not provided'}
        </p>
    </div>
);

const TextField = ({
    label,
    value,
    onChange,
    error,
    placeholder,
    required = false,
    multiline = false,
}) => {
    const commonClass =
        'w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500';

    return (
        <div className="min-w-0">
            <label className="mb-1 block text-xs font-semibold text-gray-600">
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
            </label>

            {multiline ? (
                <textarea
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    rows={2}
                    className={commonClass}
                    placeholder={placeholder}
                    maxLength={10000}
                    required={required}
                />
            ) : (
                <input
                    type="text"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    className={commonClass}
                    placeholder={placeholder}
                    maxLength={255}
                    required={required}
                />
            )}

            <FieldError message={error} />
        </div>
    );
};

const SummaryCard = ({ label, count, active, colorClass, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
            active ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
        } ${colorClass}`}
    >
        <p className="text-xs font-semibold">{label}</p>
        <p className="mt-2 text-2xl font-extrabold tabular-nums">{count}</p>
        <p className="mt-1 text-[10px] opacity-75">
            {active ? 'Currently selected' : 'Click to filter'}
        </p>
    </button>
);

/** Dropdown selector matching the Facilities booking form. */
const TimeSelector = ({
    label,
    value,
    onChange,
    error,
    disabled = false,
    options = TIME_SLOTS,
}) => {
    const selectClass =
        'block w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100';

    return (
        <div className="min-w-0">
            <label className="mb-1 block text-xs font-semibold text-gray-600">
                {label}
            </label>
            <select
                required
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className={selectClass}
            >
                <option value="">Select time</option>
                {options.map((time) => (
                    <option key={time} value={time}>
                        {formatTime(time)}
                    </option>
                ))}
            </select>
            <FieldError message={error} />
        </div>
    );
};

export default function MyBookings({
    auth,
    bookings = [],
    activityLogs = [],
}) {
    const [cancelModalId, setCancelModalId] = useState(null);
    const [detailModalId, setDetailModalId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const {
        data,
        setData,
        put,
        processing,
        errors,
        reset,
        transform,
    } = useForm({
        date: '',
        start_time: '',
        end_time: '',
        notes: '',
        attendees: 1,
        needs_manpower: false,
        event_name: '',
        department: '',
        designation: '',
        purpose: '',
        facilitator: '',
    });

    const userBookings = [...bookings].sort((a, b) => {
        const priorityA = STATUS_PRIORITY[getStatus(a.status)] ?? 99;
        const priorityB = STATUS_PRIORITY[getStatus(b.status)] ?? 99;

        if (priorityA !== priorityB) return priorityA - priorityB;

        const dateA = String(a.date || '').slice(0, 10);
        const dateB = String(b.date || '').slice(0, 10);

        if (dateA !== dateB) {
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA.localeCompare(dateB);
        }

        return String(a.start_time || '').localeCompare(String(b.start_time || ''));
    });

    const bookingCounts = {
        all: userBookings.length,
        pending: 0,
        approved: 0,
        declined: 0,
        cancelled: 0,
    };

    userBookings.forEach((booking) => {
        const status = getStatus(booking.status);
        if (Object.prototype.hasOwnProperty.call(bookingCounts, status)) {
            bookingCounts[status] += 1;
        }
    });

    const filteredBookings = userBookings.filter((booking) => {
        const status = getStatus(booking.status);
        const facility = booking.facility || {};
        const bookingDate = String(booking.date || '').slice(0, 10);
        const query = searchQuery.trim().toLowerCase();

        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        const searchableValues = [booking.id, facility.name, facility.location, facility.type];
        const matchesSearch =
            !query ||
            searchableValues.some((value) =>
                String(value ?? '').toLowerCase().includes(query)
            );
        const matchesStartDate = !dateFrom || (bookingDate && bookingDate >= dateFrom);
        const matchesEndDate = !dateTo || (bookingDate && bookingDate <= dateTo);

        return matchesStatus && matchesSearch && matchesStartDate && matchesEndDate;
    });

    const hasActiveFilters =
        statusFilter !== 'all' ||
        searchQuery.trim() !== '' ||
        dateFrom !== '' ||
        dateTo !== '';

    const clearFilters = () => {
        setStatusFilter('all');
        setSearchQuery('');
        setDateFrom('');
        setDateTo('');
    };

    const selectedDetailBooking = userBookings.find(
        (booking) => String(booking.id) === String(detailModalId)
    );

    const selectedFacility = selectedDetailBooking?.facility;
    const capacity = selectedFacility?.capacity;

    const hasCapacityLimit =
        capacity !== null &&
        capacity !== undefined &&
        capacity !== '' &&
        Number.isFinite(Number(capacity)) &&
        Number(capacity) > 0;

    const attendeeCount = Number(data.attendees);
    const exceedsCapacity =
        hasCapacityLimit && data.attendees !== '' && attendeeCount > Number(capacity);
    const invalidAttendeeCount =
        data.attendees === '' || !Number.isInteger(attendeeCount) || attendeeCount < 1;

    const isPending = getStatus(selectedDetailBooking?.status) === 'pending';
    const canRequestManpower = Boolean(selectedFacility?.allowTdevsManpower);

    const startMinutes = timeToMinutes(data.start_time);
    const endMinutes = timeToMinutes(data.end_time);
    const invalidTimeRange =
        startMinutes === null || endMinutes === null || startMinutes >= endMinutes;
    const invalidTimeInterval =
        (data.start_time && !isAlignedToSlot(data.start_time)) ||
        (data.end_time && !isAlignedToSlot(data.end_time));

    const handleOpenDetails = (booking) => {
        const parsedNotes = parseBookingNotes(booking.notes || '');

        setDetailModalId(booking.id);
        setIsEditing(false);
        setShowSaveConfirm(false);

        setData({
            date: booking.date ? String(booking.date).slice(0, 10) : '',
            start_time: booking.start_time?.slice(0, 5) || '',
            end_time: booking.end_time?.slice(0, 5) || '',
            notes: booking.notes || '',
            attendees: booking.attendees ?? 1,
            needs_manpower: Boolean(booking.needs_manpower),
            ...parsedNotes,
        });
    };

    const handleCloseDetails = () => {
        if (processing) return;

        setDetailModalId(null);
        setIsEditing(false);
        setShowSaveConfirm(false);
        reset();
    };

    const handleStartEditing = () => {
        if (!isPending) {
            toast.error('Only pending bookings can be edited.');
            return;
        }

        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        if (processing) return;
        if (selectedDetailBooking) handleOpenDetails(selectedDetailBooking);
    };

    const handleUpdateBooking = (e) => {
        e.preventDefault();

        if (!isPending) {
            toast.error('Only pending bookings can be edited.');
            return;
        }

        if (!data.date || !data.start_time || !data.end_time) {
            toast.error('Please complete the reservation date and times.');
            return;
        }

        if (data.date < getLocalDateString()) {
            toast.error('The reservation date cannot be in the past.');
            return;
        }

        if (invalidAttendeeCount) {
            toast.error('Attendees must be a whole number of at least 1.');
            return;
        }

        if (exceedsCapacity) {
            toast.error(`This facility allows a maximum of ${capacity} attendees.`);
            return;
        }

        if (invalidTimeRange) {
            toast.error('End time must be after start time.');
            return;
        }

        if (invalidTimeInterval) {
            toast.error(`Please select times aligned to ${SLOT_INTERVAL_MINUTES}-minute intervals.`);
            return;
        }

        setShowSaveConfirm(true);
    };

    const handleConfirmSave = () => {
        if (processing || !detailModalId) return;

        if (!isPending) {
            setShowSaveConfirm(false);
            toast.error('Only pending bookings can be edited.');
            return;
        }

        if (invalidAttendeeCount) {
            setShowSaveConfirm(false);
            toast.error('Attendees must be a whole number of at least 1.');
            return;
        }

        if (exceedsCapacity) {
            setShowSaveConfirm(false);
            toast.error(`This facility allows a maximum of ${capacity} attendees.`);
            return;
        }

        if (
            !data.date ||
            data.date < getLocalDateString() ||
            invalidTimeRange ||
            invalidTimeInterval
        ) {
            setShowSaveConfirm(false);
            toast.error('Please correct the reservation date and times.');
            return;
        }

        setShowSaveConfirm(false);

        transform((formData) => ({
            date: formData.date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            attendees: Number(formData.attendees),
            needs_manpower: canRequestManpower ? Boolean(formData.needs_manpower) : false,
            notes: buildBookingNotes(formData),
        }));

        put(`/bookings/${detailModalId}`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditing(false);
                setDetailModalId(null);
                setShowSaveConfirm(false);
                reset();
                toast.success('Booking modified successfully!');
            },
            onError: () => {
                toast.error('Could not update booking. Check the highlighted fields.');
            },
            onFinish: () => {
                transform((formData) => formData);
            },
        });
    };

    const handleCancel = (id) => {
        if (isCancelling) return;

        setIsCancelling(true);
        router.put(
            `/bookings/${id}/cancel`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCancelModalId(null);
                    toast.success('Booking cancelled.');
                },
                onError: () => toast.error('Failed to cancel booking.'),
                onFinish: () => setIsCancelling(false),
            }
        );
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-lg font-semibold leading-tight text-gray-800">
                    My Reservations
                </h2>
            }
        >
            <Head title="My Bookings" />

            <div className="w-full min-w-0 py-4">
                <div className="mx-auto w-full min-w-0 max-w-[1800px] px-3 sm:px-5 lg:px-6">
                    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                                My Bookings
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Manage, search, and track your facility reservations.
                            </p>
                        </div>
                        <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                            {filteredBookings.length} of {userBookings.length}{' '}
                            {userBookings.length === 1 ? 'booking' : 'bookings'}
                        </span>
                    </div>

                    <section aria-label="Booking status summary" className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                        <SummaryCard label="All Bookings" count={bookingCounts.all} active={statusFilter === 'all'} colorClass="border-indigo-200 bg-indigo-50 text-indigo-800" onClick={() => setStatusFilter('all')} />
                        <SummaryCard label="Pending" count={bookingCounts.pending} active={statusFilter === 'pending'} colorClass="border-amber-200 bg-amber-50 text-amber-800" onClick={() => setStatusFilter('pending')} />
                        <SummaryCard label="Approved" count={bookingCounts.approved} active={statusFilter === 'approved'} colorClass="border-green-200 bg-green-50 text-green-800" onClick={() => setStatusFilter('approved')} />
                        <SummaryCard label="Declined" count={bookingCounts.declined} active={statusFilter === 'declined'} colorClass="border-red-200 bg-red-50 text-red-800" onClick={() => setStatusFilter('declined')} />
                        <SummaryCard label="Cancelled" count={bookingCounts.cancelled} active={statusFilter === 'cancelled'} colorClass="border-gray-200 bg-gray-50 text-gray-700" onClick={() => setStatusFilter('cancelled')} />
                    </section>

                    <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <Filter className="h-4 w-4 text-indigo-600" />
                            <h2 className="text-sm font-bold text-gray-800">Find a Booking</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="xl:col-span-2">
                                <label htmlFor="booking-search" className="mb-1.5 block text-xs font-semibold text-gray-600">Search</label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <input id="booking-search" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Facility name, booking ID, location, or type..." className="w-full rounded-lg border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="booking-date-from" className="mb-1.5 block text-xs font-semibold text-gray-600">Event Date From</label>
                                <input id="booking-date-from" type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label htmlFor="booking-date-to" className="mb-1.5 block text-xs font-semibold text-gray-600">Event Date To</label>
                                <input id="booking-date-to" type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                            <div className="flex flex-wrap gap-2">
                                {STATUS_OPTIONS.map((option) => (
                                    <button key={option.key} type="button" onClick={() => setStatusFilter(option.key)} aria-pressed={statusFilter === option.key} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${statusFilter === option.key ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'}`}>
                                        {option.label}
                                        {option.key !== 'all' && <span className="ml-1.5 opacity-75">{bookingCounts[option.key]}</span>}
                                    </button>
                                ))}
                            </div>
                            {hasActiveFilters && (
                                <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Clear filters
                                </button>
                            )}
                        </div>
                        <p className="mt-3 text-xs text-gray-500">
                            Showing <strong>{filteredBookings.length}</strong> of <strong>{userBookings.length}</strong> bookings{hasActiveFilters ? ' matching your filters.' : '.'}
                        </p>
                    </section>

                    {userBookings.length === 0 ? (
                        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                            <Calendar className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                            <h3 className="text-base font-semibold text-gray-900">No bookings found</h3>
                            <p className="mt-1 text-sm text-gray-500">You have not made any facility reservations yet.</p>
                            <Link href="/dashboard" className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Browse Facilities</Link>
                        </div>
                    ) : filteredBookings.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
                            <Search className="mx-auto mb-3 h-9 w-9 text-gray-300" />
                            <h3 className="text-base font-semibold text-gray-900">No matching bookings</h3>
                            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">No reservations match your current search, status, or date range. Try changing your filters.</p>
                            <button type="button" onClick={clearFilters} className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                                <RotateCcw className="h-4 w-4" /> Clear filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                            {filteredBookings.map((booking) => {
                                const facility = booking.facility;
                                if (!facility) return null;

                                const status = getStatus(booking.status);
                                const isCancelable = ['pending', 'approved'].includes(status);

                                return (
                                    <article key={booking.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                                        <div className="flex-1 p-4">
                                            <div className="mb-3 flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <span className="mb-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">{facility.type || 'Facility'}</span>
                                                    <h3 className="break-words text-base font-bold text-gray-900">{facility.name}</h3>
                                                    <p className="mt-1 break-all text-[10px] text-gray-400">Booking ID: {booking.id}</p>
                                                </div>
                                                <span className={`inline-flex flex-shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(status)}`}>
                                                    <StatusIcon status={status} />
                                                    <span className="capitalize">{status}</span>
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:grid-cols-2">
                                                <div className="flex min-w-0 items-start gap-2">
                                                    <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" />
                                                    <span className="text-sm text-gray-800">{formatDate(booking.date)}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" />
                                                    <span className="text-sm text-gray-800">{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</span>
                                                </div>
                                                <div className="flex min-w-0 items-start gap-2 sm:col-span-2">
                                                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                                                    <span className="break-words text-sm text-gray-600">{facility.location || 'Location not specified'}</span>
                                                </div>
                                                {booking.needs_manpower && (
                                                    <div className="flex items-center gap-2 sm:col-span-2">
                                                        <Wrench className="h-4 w-4 text-indigo-600" />
                                                        <span className="text-xs font-medium text-indigo-700">TDEVS manpower requested</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3">
                                            <div className="flex flex-1 flex-wrap gap-2">
                                                <button type="button" onClick={() => handleOpenDetails(booking)} className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                                                    <Eye className="mr-1.5 h-4 w-4" /> {status === 'pending' ? 'View / Edit' : 'View Details'}
                                                </button>
                                                {status === 'approved' && (
                                                    <Link href={`/receipt/${booking.id}`} className="inline-flex items-center justify-center rounded-md bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                                                        <ExternalLink className="mr-1.5 h-4 w-4" /> Receipt
                                                    </Link>
                                                )}
                                            </div>
                                            {isCancelable && (
                                                <button type="button" onClick={() => setCancelModalId(booking.id)} className="inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
                                                    <X className="mr-1.5 h-4 w-4" /> Cancel
                                                </button>
                                            )}
                                        </div>

                                        {cancelModalId === booking.id && (
                                            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
                                                <button type="button" aria-label="Close cancellation confirmation" className="absolute inset-0 bg-gray-900/50" onClick={() => { if (!isCancelling) setCancelModalId(null); }} />
                                                <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                                                    <div className="flex items-start gap-3">
                                                        <div className="rounded-full bg-red-50 p-2"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
                                                        <div>
                                                            <h3 className="font-bold text-gray-900">Cancel booking?</h3>
                                                            <p className="mt-1 text-sm text-gray-600">Cancel your reservation for <strong>{facility.name}</strong> on {formatDate(booking.date)}?</p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-5 flex justify-end gap-2">
                                                        <button type="button" onClick={() => setCancelModalId(null)} disabled={isCancelling} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Keep Booking</button>
                                                        <button type="button" onClick={() => handleCancel(booking.id)} disabled={isCancelling} className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{isCancelling ? 'Cancelling...' : 'Confirm Cancel'}</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {selectedDetailBooking && selectedFacility && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-5">
                    <button type="button" aria-label="Close booking details" className="absolute inset-0 bg-gray-900/50 backdrop-blur-[1px]" onClick={handleCloseDetails} />
                    <div role="dialog" aria-modal="true" aria-labelledby="booking-detail-title" className="relative my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
                        <form onSubmit={handleUpdateBooking}>
                            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3 sm:px-5">
                                <div className="min-w-0">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">{selectedFacility.type || 'Facility'}</span>
                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusBadgeClass(selectedDetailBooking.status)}`}>
                                            <StatusIcon status={selectedDetailBooking.status} />
                                            <span className="capitalize">{getStatus(selectedDetailBooking.status)}</span>
                                        </span>
                                    </div>
                                    <h2 id="booking-detail-title" className="break-words text-lg font-bold text-gray-900">{selectedFacility.name}</h2>
                                    <p className="mt-0.5 break-all text-[10px] text-gray-400">Booking ID: {selectedDetailBooking.id}</p>
                                </div>
                                <button type="button" onClick={handleCloseDetails} disabled={processing} aria-label="Close" className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"><X className="h-5 w-5" /></button>
                            </div>

                            <div className="space-y-4 p-4 sm:p-5">
                                <section>
                                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800"><Calendar className="h-4 w-4 text-indigo-600" /> Reservation Schedule</h3>
                                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-600">Date</label>
                                            {isEditing ? (
                                                <>
                                                    <input type="date" value={data.date} min={getLocalDateString()} onChange={(e) => setData('date', e.target.value)} required className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                                                    <FieldError message={errors.date} />
                                                </>
                                            ) : <p className="text-sm font-medium text-gray-900">{formatDate(selectedDetailBooking.date)}</p>}
                                        </div>

                                        {isEditing ? (
                                            <>
                                                <TimeSelector
                                                    label="Start Time"
                                                    value={data.start_time}
                                                    onChange={(value) => {
                                                        setData({
                                                            ...data,
                                                            start_time: value,
                                                            end_time: '',
                                                        });
                                                    }}
                                                    error={errors.start_time}
                                                    disabled={processing}
                                                    options={TIME_SLOTS.filter((time) => time !== CLOSING_TIME)}
                                                />
                                                <TimeSelector
                                                    label="End Time"
                                                    value={data.end_time}
                                                    onChange={(value) => setData('end_time', value)}
                                                    error={errors.end_time}
                                                    disabled={processing || !data.start_time}
                                                    options={TIME_SLOTS.filter((time) => toMinutes(time) > toMinutes(data.start_time))}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <div>
                                                    <label className="mb-1 block text-xs font-semibold text-gray-600">Start Time</label>
                                                    <p className="text-sm font-medium text-gray-900">{formatTime(selectedDetailBooking.start_time)}</p>
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-semibold text-gray-600">End Time</label>
                                                    <p className="text-sm font-medium text-gray-900">{formatTime(selectedDetailBooking.end_time)}</p>
                                                </div>
                                            </>
                                        )}

                                        {isEditing && (
                                            <p className="text-xs text-gray-500 sm:col-span-3">
                                                Choose a time using 15-minute increments only: :00, :15, :30, or :45. The end time must be later than the start time.
                                            </p>
                                        )}
                                    </div>
                                </section>

                                <section>
                                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800"><Users className="h-4 w-4 text-indigo-600" /> Attendance and Manpower</h3>
                                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 p-3 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-600">Number of Attendees</label>
                                            {isEditing ? (
                                                <>
                                                    <input type="number" min="1" max={hasCapacityLimit ? capacity : undefined} step="1" value={data.attendees} onChange={(e) => setData('attendees', e.target.value)} required className={`w-full rounded-md text-sm shadow-sm focus:ring-indigo-500 ${exceedsCapacity || invalidAttendeeCount ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-indigo-500'}`} />
                                                    {hasCapacityLimit && <p className="mt-1 text-xs text-gray-500">Facility maximum: {capacity} attendees</p>}
                                                    {exceedsCapacity && <p className="mt-1 text-xs font-medium text-red-600">Attendee count exceeds this facility's capacity.</p>}
                                                    <FieldError message={errors.attendees} />
                                                </>
                                            ) : (
                                                <p className="text-sm text-gray-900">
                                                    {selectedDetailBooking.attendees ?? 'Not specified'}
                                                    {hasCapacityLimit && <span className="ml-1 text-xs text-gray-500">/ {capacity} max</span>}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <p className="mb-1 text-xs font-semibold text-gray-600">TDEVS Manpower Request</p>
                                            {canRequestManpower ? (
                                                <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
                                                    <label className={`flex items-start gap-2 ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}>
                                                        <input type="checkbox" checked={Boolean(data.needs_manpower)} disabled={!isEditing || processing} onChange={(e) => setData('needs_manpower', e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70" />
                                                        <span className="min-w-0">
                                                            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800"><Wrench className="h-4 w-4 text-indigo-600" /> Request TDEVS manpower</span>
                                                            <span className="mt-1 block text-xs text-gray-600">{data.needs_manpower ? 'Manpower is requested for this booking.' : 'No manpower is currently requested.'}</span>
                                                            {isEditing && <span className="mt-1 block text-xs font-medium text-indigo-700">Check to request, or uncheck to remove the request.</span>}
                                                        </span>
                                                    </label>
                                                </div>
                                            ) : <p className="text-sm text-gray-500">TDEVS manpower is not available for this facility.</p>}
                                            <FieldError message={errors.needs_manpower} />
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800"><FileText className="h-4 w-4 text-indigo-600" /> Booking Information</h3>
                                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 p-3 sm:grid-cols-2">
                                        {isEditing ? (
                                            <>
                                                <TextField label="Event" value={data.event_name} onChange={(value) => setData('event_name', value)} placeholder="Event name" />
                                                <TextField label="Department" value={data.department} onChange={(value) => setData('department', value)} placeholder="Department or office" />
                                                <TextField label="Designation" value={data.designation} onChange={(value) => setData('designation', value)} placeholder="Your designation" />
                                                <TextField label="Facilitator" value={data.facilitator} onChange={(value) => setData('facilitator', value)} placeholder="Facilitator name" />
                                                <div className="sm:col-span-2">
                                                    <TextField label="Purpose" value={data.purpose} onChange={(value) => setData('purpose', value)} placeholder="Purpose of the reservation" multiline />
                                                    <FieldError message={errors.notes} />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <DetailField label="Event" value={data.event_name} icon={Calendar} />
                                                <DetailField label="Department" value={data.department} icon={Building2} />
                                                <DetailField label="Designation" value={data.designation} icon={UserRound} />
                                                <DetailField label="Facilitator" value={data.facilitator} icon={UserRound} />
                                                <div className="sm:col-span-2"><DetailField label="Purpose" value={data.purpose} icon={FileText} /></div>
                                            </>
                                        )}
                                    </div>
                                </section>

                                <section>
                                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800"><History className="h-4 w-4 text-indigo-600" /> Status History</h3>
                                    <div className="rounded-lg border border-gray-100">
                                        {activityLogs.filter((log) => String(log.booking_id) === String(selectedDetailBooking.id)).length === 0 ? (
                                            <p className="p-3 text-xs text-gray-500">No status history available.</p>
                                        ) : (
                                            <ul className="max-h-32 divide-y divide-gray-100 overflow-y-auto">
                                                {activityLogs.filter((log) => String(log.booking_id) === String(selectedDetailBooking.id)).map((log) => (
                                                    <li key={log.id} className="p-3">
                                                        <div className="flex flex-wrap items-center justify-between gap-1">
                                                            <span className="text-xs font-semibold capitalize text-gray-800">{(log.action || 'Update').replace('STATUS_', '').replaceAll('_', ' ')}</span>
                                                            <span className="text-[10px] text-gray-400">{log.created_at ? new Date(log.created_at).toLocaleString() : ''}</span>
                                                        </div>
                                                        {log.notes && <p className="mt-1 text-xs text-gray-600">{log.notes}</p>}
                                                        {log.performed_by && <p className="mt-1 text-[10px] text-gray-400">Performed by: {log.performed_by}</p>}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </section>
                            </div>

                            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 sm:px-5">
                                <div className="flex gap-2">
                                    {isEditing ? (
                                        <button type="button" onClick={handleCancelEdit} disabled={processing} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50">Discard Changes</button>
                                    ) : isPending && (
                                        <button type="button" onClick={handleStartEditing} className="inline-flex items-center rounded-md border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"><Edit3 className="mr-1.5 h-4 w-4" /> Edit Details</button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {isEditing && (
                                        <button type="submit" disabled={processing || exceedsCapacity || invalidAttendeeCount || invalidTimeRange || invalidTimeInterval} className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                                            <Save className="mr-1.5 h-4 w-4" /> {processing ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    )}
                                    <button type="button" onClick={handleCloseDetails} disabled={processing} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50">Close</button>
                                </div>
                            </div>
                        </form>

                        {showSaveConfirm && (
                            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                                <button type="button" aria-label="Close save confirmation" className="absolute inset-0 bg-gray-900/60" onClick={() => { if (!processing) setShowSaveConfirm(false); }} disabled={processing} />
                                <div role="dialog" aria-modal="true" aria-labelledby="save-confirm-title" className="relative z-10 w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50"><Save className="h-5 w-5 text-indigo-600" /></div>
                                    <h3 id="save-confirm-title" className="text-base font-bold text-gray-900">Save booking changes?</h3>
                                    <p className="mt-2 text-sm text-gray-600">Your updated reservation details, including the TDEVS manpower request, will be submitted.</p>
                                    <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                                        <p className="font-semibold text-gray-800">{formatDate(data.date)}</p>
                                        <p className="mt-1 text-gray-600">{formatTime(data.start_time)} – {formatTime(data.end_time)}</p>
                                        {hasCapacityLimit && <p className="mt-1 text-xs text-gray-500">Attendees: {data.attendees} / {capacity}</p>}
                                        <p className="mt-1 text-xs text-gray-500">TDEVS manpower: <strong>{canRequestManpower && data.needs_manpower ? 'Requested' : 'Not requested'}</strong></p>
                                    </div>
                                    <div className="mt-5 flex justify-end gap-2">
                                        <button type="button" onClick={() => setShowSaveConfirm(false)} disabled={processing} className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Go Back</button>
                                        <button type="button" onClick={handleConfirmSave} disabled={processing || exceedsCapacity || invalidAttendeeCount || invalidTimeRange || invalidTimeInterval} className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Save className="mr-1.5 h-4 w-4" /> {processing ? 'Saving...' : 'Yes, Save'}</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
