import React, { useEffect, useState } from 'react';
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
const CLOSING_TIME = '22:00';
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
    completed: 3,
    declined: 4,
    cancelled: 5,
};

const STATUS_OPTIONS = [
    { key: 'all', label: 'All Bookings' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'completed', label: 'Completed' },
    { key: 'declined', label: 'Declined' },
    { key: 'cancelled', label: 'Cancelled' },
];

const suggestExtendedEndTime = (currentEnd) => {
    const normalized = String(currentEnd || '').slice(0, 5);
    const currentMinutes = normalized === '00:00' ? 1440 : toMinutes(normalized);
    const extendedMinutes = currentMinutes + 30;

    if (currentMinutes <= 0 || extendedMinutes > 1440) return '';

    const hour = Math.floor(extendedMinutes / 60) % 24;
    const minute = extendedMinutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

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

const getStatus = (status) => {
    const normalized = String(status || 'unknown').toLowerCase().trim();

    // Older booking records may use "rejected" while current workflows use "declined".
    return normalized === 'rejected' ? 'declined' : normalized;
};

const isBookingCompleted = (booking) => {
    if (getStatus(booking?.status) !== 'approved') return false;

    const bookingEndDate = String(
        booking?.end_date || booking?.date || booking?.booking_date || ''
    ).slice(0, 10);
    const endTime = String(booking?.end_time || '').slice(0, 5);
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(bookingEndDate) || !/^\\d{2}:\\d{2}$/.test(endTime)) {
        return false;
    }

    const endDateTime = new Date(bookingEndDate + 'T' + endTime + ':00');
    return !Number.isNaN(endDateTime.getTime()) && endDateTime.getTime() <= Date.now();
};

const getBookingDisplayStatus = (booking) =>
    isBookingCompleted(booking) ? 'completed' : getStatus(booking?.status);

const getStatusBadgeClass = (status) => {
    switch (getStatus(status)) {
        case 'approved':
            return 'bg-green-50 text-green-700 border-green-200';
        case 'completed':
            return 'bg-blue-50 text-blue-700 border-blue-200';
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
        case 'completed':
            return <CheckCircle className={`${iconClass} text-blue-600`} />;
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
        'w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-[#846A75] focus:ring-[#846A75]';

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
            active ? 'ring-2 ring-[#846A75] ring-offset-1' : ''
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
        'block w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm shadow-sm focus:border-[#846A75] focus:ring-[#846A75] disabled:cursor-not-allowed disabled:bg-gray-100';

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
    openBooking = null,
    activityLogs = [],
}) {
    const [cancelModalId, setCancelModalId] = useState(null);
    const [detailModalId, setDetailModalId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [isCheckInOutProcessing, setIsCheckInOutProcessing] = useState(false);
    const [showExtensionForm, setShowExtensionForm] = useState(false);
    const [extensionEndTime, setExtensionEndTime] = useState('');
    const [extensionReason, setExtensionReason] = useState('');
    const [isExtensionSubmitting, setIsExtensionSubmitting] = useState(false);

    useEffect(() => {
        if (openBooking?.id) {
            setDetailModalId(openBooking.id);
        }
    }, [openBooking?.id]);

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
        end_date: '',
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
        const priorityA = STATUS_PRIORITY[getBookingDisplayStatus(a)] ?? 99;
        const priorityB = STATUS_PRIORITY[getBookingDisplayStatus(b)] ?? 99;

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
        completed: 0,
        declined: 0,
        cancelled: 0,
    };

    userBookings.forEach((booking) => {
        const status = getBookingDisplayStatus(booking);
        if (Object.prototype.hasOwnProperty.call(bookingCounts, status)) {
            bookingCounts[status] += 1;
        }
    });

    const filteredBookings = userBookings.filter((booking) => {
        const status = getBookingDisplayStatus(booking);
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
        const bookingEndDate = String(booking.end_date || bookingDate).slice(0, 10);
        const matchesStartDate = !dateFrom || (bookingEndDate && bookingEndDate >= dateFrom);
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

    const extensionRequests = selectedDetailBooking?.extension_requests ?? [];
    const pendingExtensionRequest = extensionRequests.find((item) => item.status === 'pending');
    const selectedFacility = selectedDetailBooking?.facility;
    const capacity = selectedFacility?.capacity;
    const selectedBookingDate = String(
        selectedDetailBooking?.date ?? selectedDetailBooking?.booking_date ?? ''
    ).slice(0, 10);
    const todayString = getLocalDateString();
    const bookingFinalDate = String(selectedDetailBooking?.end_date || selectedDetailBooking?.date || selectedDetailBooking?.booking_date || '').slice(0, 10);
    const canRequestExtension = Boolean(
        selectedDetailBooking?.checked_in_at
        && !selectedDetailBooking?.checked_out_at
        && bookingFinalDate === todayString
    );
    const selectedBookingIsPast = Boolean(selectedBookingDate && selectedBookingDate < todayString);
    const selectedBookingIsFuture = Boolean(selectedBookingDate && selectedBookingDate > todayString);
    const selectedBookingStart = selectedBookingDate && selectedDetailBooking?.start_time
        ? new Date(`${selectedBookingDate}T${String(selectedDetailBooking.start_time).slice(0, 5)}:00`)
        : null;
    const checkInOpensAt = selectedBookingStart && !Number.isNaN(selectedBookingStart.getTime())
        ? new Date(selectedBookingStart.getTime() - 15 * 60 * 1000)
        : null;
    const isTooEarlyToCheckIn = Boolean(
        checkInOpensAt && !Number.isNaN(checkInOpensAt.getTime()) && new Date() < checkInOpensAt
    );

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
        setShowExtensionForm(false);
        setExtensionEndTime(suggestExtendedEndTime(booking.end_time));
        setExtensionReason('');

        setData({
            date: booking.date ? String(booking.date).slice(0, 10) : '',
            end_date: booking.end_date ? String(booking.end_date).slice(0, 10) : (booking.date ? String(booking.date).slice(0, 10) : ''),
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
        setShowExtensionForm(false);
        setExtensionReason('');
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

        if (!data.date || !data.end_date || !data.start_time || !data.end_time || data.end_date < data.date) {
            toast.error('Please complete a valid reservation start date, end date, and time range.');
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
            !data.end_date ||
            data.date < getLocalDateString() ||
            data.end_date < data.date ||
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
            end_date: formData.end_date,
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
        const reason = cancellationReason.trim();
        if (reason.length < 5) {
            toast.error('Please provide a cancellation reason of at least 5 characters.');
            return;
        }

        setIsCancelling(true);
        router.put(
            `/bookings/${id}/cancel`,
            { cancellation_reason: reason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCancelModalId(null);
                    setCancellationReason('');
                    toast.success('Booking cancelled. The administrators have been notified.');
                },
                onError: (validationErrors) => toast.error(
                    validationErrors.cancellation_reason ||
                    validationErrors.status ||
                    'Failed to cancel booking.'
                ),
                onFinish: () => setIsCancelling(false),
            }
        );
    };

    const handleExtensionRequest = (event) => {
        event.preventDefault();

        if (!selectedDetailBooking?.id || isExtensionSubmitting) return;
        if (!extensionEndTime || extensionReason.trim().length < 5) {
            toast.error('Choose a later end time and provide a reason of at least 5 characters.');
            return;
        }

        setIsExtensionSubmitting(true);
        router.post(
            route('bookings.extensions.store', selectedDetailBooking.id),
            {
                requested_end_time: extensionEndTime,
                reason: extensionReason.trim(),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowExtensionForm(false);
                    setExtensionReason('');
                    toast.success('Extension request submitted for administrator review.');
                },
                onError: (validationErrors) => toast.error(
                    validationErrors.requested_end_time ||
                    validationErrors.reason ||
                    'Unable to submit the extension request.'
                ),
                onFinish: () => setIsExtensionSubmitting(false),
            }
        );
    };

    const handleUserCheckInOut = (action, bookingId) => {
        if (isCheckInOutProcessing || !bookingId) return;
        setIsCheckInOutProcessing(true);
        router.post(
            route(`bookings.check-${action}`, { booking: bookingId }),
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success(action === 'in'
                    ? 'You have checked in successfully.'
                    : 'You have checked out successfully. Any applicable overtime charge has been calculated.'),
                onError: (validationErrors) => toast.error(
                    validationErrors.check_in ||
                    validationErrors.check_out ||
                    Object.values(validationErrors).flat().find((value) => typeof value === 'string') ||
                    `Unable to check ${action === 'in' ? 'in' : 'out'} this booking.`
                ),
                onFinish: () => setIsCheckInOutProcessing(false),
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
                        <span className="rounded-full bg-[#F7F0F3] px-3 py-1.5 text-xs font-semibold text-[#543F48]">
                            {filteredBookings.length} of {userBookings.length}{' '}
                            {userBookings.length === 1 ? 'booking' : 'bookings'}
                        </span>
                    </div>

                    <section aria-label="Booking status summary" className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                        <SummaryCard label="All Bookings" count={bookingCounts.all} active={statusFilter === 'all'} colorClass="border-[#E8D8D1] bg-[#F7F0F3] text-[#4E3A43]" onClick={() => setStatusFilter('all')} />
                        <SummaryCard label="Pending" count={bookingCounts.pending} active={statusFilter === 'pending'} colorClass="border-amber-200 bg-amber-50 text-amber-800" onClick={() => setStatusFilter('pending')} />
                        <SummaryCard label="Approved" count={bookingCounts.approved} active={statusFilter === 'approved'} colorClass="border-green-200 bg-green-50 text-green-800" onClick={() => setStatusFilter('approved')} />
                        <SummaryCard label="Completed" count={bookingCounts.completed} active={statusFilter === 'completed'} colorClass="border-blue-200 bg-blue-50 text-blue-800" onClick={() => setStatusFilter('completed')} />
                        <SummaryCard label="Declined" count={bookingCounts.declined} active={statusFilter === 'declined'} colorClass="border-red-200 bg-red-50 text-red-800" onClick={() => setStatusFilter('declined')} />
                        <SummaryCard label="Cancelled" count={bookingCounts.cancelled} active={statusFilter === 'cancelled'} colorClass="border-gray-200 bg-gray-50 text-gray-700" onClick={() => setStatusFilter('cancelled')} />
                    </section>

                    <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <Filter className="h-4 w-4 text-[#6A535C]" />
                            <h2 className="text-sm font-bold text-gray-800">Find a Booking</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="xl:col-span-2">
                                <label htmlFor="booking-search" className="mb-1.5 block text-xs font-semibold text-gray-600">Search</label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <input id="booking-search" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Facility name, booking ID, location, or type..." className="w-full rounded-lg border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-[#846A75] focus:ring-[#846A75]" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="booking-date-from" className="mb-1.5 block text-xs font-semibold text-gray-600">Event Date From</label>
                                <input id="booking-date-from" type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-[#846A75] focus:ring-[#846A75]" />
                            </div>
                            <div>
                                <label htmlFor="booking-date-to" className="mb-1.5 block text-xs font-semibold text-gray-600">Event Date To</label>
                                <input id="booking-date-to" type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-[#846A75] focus:ring-[#846A75]" />
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                            <div className="flex flex-wrap gap-2">
                                {STATUS_OPTIONS.map((option) => (
                                    <button key={option.key} type="button" onClick={() => setStatusFilter(option.key)} aria-pressed={statusFilter === option.key} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${statusFilter === option.key ? 'border-[#6A535C] bg-[#6A535C] text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-[#E8D8D1] hover:bg-[#F7F0F3] hover:text-[#543F48]'}`}>
                                        {option.label}
                                        {option.key !== 'all' && <span className="ml-1.5 opacity-75">{bookingCounts[option.key]}</span>}
                                    </button>
                                ))}
                            </div>
                            {hasActiveFilters && (
                                <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-[#543F48] hover:bg-[#F7F0F3]">
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
                            <Link href="/dashboard" className="mt-4 inline-flex items-center rounded-md bg-[#6A535C] px-4 py-2 text-sm font-medium text-white hover:bg-[#543F48]">Browse Facilities</Link>
                        </div>
                    ) : filteredBookings.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
                            <Search className="mx-auto mb-3 h-9 w-9 text-gray-300" />
                            <h3 className="text-base font-semibold text-gray-900">No matching bookings</h3>
                            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">No reservations match your current search, status, or date range. Try changing your filters.</p>
                            <button type="button" onClick={clearFilters} className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#6A535C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#543F48]">
                                <RotateCcw className="h-4 w-4" /> Clear filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                            {filteredBookings.map((booking) => {
                                const facility = booking.facility;
                                if (!facility) return null;

                                const status = getBookingDisplayStatus(booking);
                                const isCancelable = status === 'pending' || status === 'approved';

                                return (
                                    <article key={booking.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                                        <div className="flex-1 p-4">
                                            <div className="mb-3 flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <span className="mb-1 inline-flex rounded-full bg-[#F7F0F3] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#543F48]">{facility.type || 'Facility'}</span>
                                                    <h3 className="break-words text-base font-bold text-gray-900">{facility.name}</h3>
                                                    <p className="mt-1 break-all text-[10px] text-gray-400">Booking ID: {booking.id}</p>
                                                </div>
                                                <span className={`inline-flex flex-shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(status)}`}>
                                                    <StatusIcon status={status} />
                                                    <span className="capitalize">{status === 'pending' ? 'Pending approval' : status === 'approved' ? 'Approved · confirmed' : status}</span>
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:grid-cols-2">
                                                <div className="flex min-w-0 items-start gap-2">
                                                    <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#846A75]" />
                                                    <span className="text-sm text-gray-800">{formatDate(booking.date)}{booking.end_date && String(booking.end_date).slice(0, 10) !== String(booking.date).slice(0, 10) ? ' – ' + formatDate(booking.end_date) : ''}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#846A75]" />
                                                    <span className="text-sm text-gray-800">{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</span>
                                                </div>
                                                <div className="flex min-w-0 items-start gap-2 sm:col-span-2">
                                                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                                                    <span className="break-words text-sm text-gray-600">{facility.location || 'Location not specified'}</span>
                                                </div>
                                                {booking.needs_manpower && (
                                                    <div className="flex items-center gap-2 sm:col-span-2">
                                                        <Wrench className="h-4 w-4 text-[#6A535C]" />
                                                        <span className="text-xs font-medium text-[#543F48]">TDEVS manpower requested</span>
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
                                                    <Link href={`/receipt/${booking.id}`} className="inline-flex items-center justify-center rounded-md bg-[#F7F0F3] px-3 py-2 text-xs font-semibold text-[#543F48] hover:bg-[#EFE4E9]">
                                                        <ExternalLink className="mr-1.5 h-4 w-4" /> Receipt
                                                    </Link>
                                                )}
                                            </div>
                                            {isCancelable && (
                                                <button type="button" onClick={() => { setCancellationReason(''); setCancelModalId(booking.id); }} className="inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
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
                                                            <p className="mt-1 text-sm text-gray-600">Cancel your reservation for <strong>{facility.name}</strong> on {formatDate(booking.date)}{booking.end_date && String(booking.end_date).slice(0, 10) !== String(booking.date).slice(0, 10) ? ' through ' + formatDate(booking.end_date) : ''}?</p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4">
                                                        <label htmlFor={`cancellation-reason-${booking.id}`} className="mb-1.5 block text-xs font-semibold text-gray-700">
                                                            Reason for cancellation <span className="text-red-600">*</span>
                                                        </label>
                                                        <textarea
                                                            id={`cancellation-reason-${booking.id}`}
                                                            value={cancellationReason}
                                                            onChange={(event) => setCancellationReason(event.target.value)}
                                                            rows={3}
                                                            minLength={5}
                                                            maxLength={1000}
                                                            required
                                                            disabled={isCancelling}
                                                            placeholder="Tell the administrators why you need to cancel this reservation..."
                                                            className="w-full resize-y rounded-lg border border-gray-300 p-3 text-sm text-gray-700 shadow-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:opacity-60"
                                                        />
                                                        <p className="mt-1 text-xs text-gray-500">At least 5 characters. The assigned facility administrators and Super Admins will be notified.</p>
                                                    </div>
                                                    <div className="mt-5 flex justify-end gap-2">
                                                        <button type="button" onClick={() => { setCancelModalId(null); setCancellationReason(''); }} disabled={isCancelling} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Keep Booking</button>
                                                        <button type="button" onClick={() => handleCancel(booking.id)} disabled={isCancelling || cancellationReason.trim().length < 5} className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{isCancelling ? 'Cancelling...' : 'Confirm Cancel'}</button>
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
                                        <span className="rounded-full bg-[#F7F0F3] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#543F48]">{selectedFacility.type || 'Facility'}</span>
                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusBadgeClass(selectedDetailBooking.status)}`}>
                                            <StatusIcon status={selectedDetailBooking.status} />
                                            <span className="capitalize">{getStatus(selectedDetailBooking.status)}</span>
                                        </span>
                                    </div>
                                    {getStatus(selectedDetailBooking.status) === 'pending' && (
                                        <p className="mt-2 max-w-xl text-xs leading-5 text-amber-800">
                                            Pending approval: this time slot is temporarily held for your request. It is not a confirmed reservation until an administrator approves it.
                                        </p>
                                    )}
                                    {getStatus(selectedDetailBooking.status) === 'approved' && (
                                        <p className="mt-2 max-w-xl text-xs leading-5 text-emerald-700">
                                            Approved: your reservation is confirmed.
                                        </p>
                                    )}
                                    <h2 id="booking-detail-title" className="break-words text-lg font-bold text-gray-900">{selectedFacility.name}</h2>
                                    <p className="mt-0.5 break-all text-[10px] text-gray-400">Booking ID: {selectedDetailBooking.id}</p>
                                </div>
                                <button type="button" onClick={handleCloseDetails} disabled={processing} aria-label="Close" className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"><X className="h-5 w-5" /></button>
                            </div>

                            <div className="space-y-4 p-4 sm:p-5">
                                <section>
                                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800"><Calendar className="h-4 w-4 text-[#6A535C]" /> Reservation Schedule</h3>
                                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-600">Date</label>
                                            {isEditing ? (
                                                <>
                                                    <input type="date" value={data.date} min={getLocalDateString()} onChange={(e) => {
                                                        const nextDate = e.target.value;
                                                        setData({
                                                            ...data,
                                                            date: nextDate,
                                                            end_date: data.end_date < nextDate ? nextDate : data.end_date,
                                                        });
                                                    }} required className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-[#846A75] focus:ring-[#846A75]" />
                                                    <FieldError message={errors.date} />
                                                </>
                                            ) : <p className="text-sm font-medium text-gray-900">{formatDate(selectedDetailBooking.date)}{selectedDetailBooking.end_date && String(selectedDetailBooking.end_date).slice(0, 10) !== String(selectedDetailBooking.date).slice(0, 10) ? ' – ' + formatDate(selectedDetailBooking.end_date) : ''}</p>}
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-600">End Date</label>
                                            {isEditing ? (
                                                <>
                                                    <input type="date" value={data.end_date} min={data.date || getLocalDateString()} onChange={(e) => setData('end_date', e.target.value)} required className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-[#846A75] focus:ring-[#846A75]" />
                                                    <FieldError message={errors.end_date} />
                                                </>
                                            ) : <p className="text-sm font-medium text-gray-900">{formatDate(selectedDetailBooking.end_date || selectedDetailBooking.date)}</p>}
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

                                {selectedDetailBooking.approved_by && (
                                    <section className={`rounded-lg border p-3 ${getStatus(selectedDetailBooking.status) === 'declined' ? 'border-red-100 bg-red-50' : 'border-emerald-100 bg-emerald-50'}`}>
                                        <p className={`text-xs font-bold uppercase tracking-wide ${getStatus(selectedDetailBooking.status) === 'declined' ? 'text-red-700' : 'text-emerald-700'}`}>
                                            {getStatus(selectedDetailBooking.status) === 'declined' ? 'Declined by' : 'Approved by'}
                                        </p>
                                        <p className={`mt-1 text-sm font-semibold ${getStatus(selectedDetailBooking.status) === 'declined' ? 'text-red-900' : 'text-emerald-900'}`}>
                                            {selectedDetailBooking.approved_by}
                                        </p>
                                        {selectedDetailBooking.approved_at && (
                                            <p className={`mt-0.5 text-xs ${getStatus(selectedDetailBooking.status) === 'declined' ? 'text-red-800' : 'text-emerald-800'}`}>
                                                {getStatus(selectedDetailBooking.status) === 'declined' ? 'Declined on ' : 'Approved on '}
                                                {new Date(selectedDetailBooking.approved_at).toLocaleString('en-PH', {
                                                    year: 'numeric', month: 'short', day: 'numeric',
                                                    hour: 'numeric', minute: '2-digit', hour12: true,
                                                })}
                                            </p>
                                        )}
                                    </section>
                                )}

                                {getStatus(selectedDetailBooking.status) === 'declined' &&
                                    (selectedDetailBooking.decline_reason || selectedDetailBooking.rejection_reason) && (
                                        <section className="rounded-lg border border-red-100 bg-red-50/70 p-3">
                                            <p className="text-xs font-bold uppercase tracking-wide text-red-700">Reason for decline</p>
                                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-red-900">
                                                {selectedDetailBooking.decline_reason || selectedDetailBooking.rejection_reason}
                                            </p>
                                        </section>
                                    )}

                                {selectedDetailBooking.cancellation_reason && (
                                    <section className="rounded-lg border border-red-100 bg-red-50 p-3">
                                        <p className="text-xs font-bold uppercase tracking-wide text-red-700">Cancellation reason</p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-red-900">{selectedDetailBooking.cancellation_reason}</p>
                                    </section>
                                )}

                                {getStatus(selectedDetailBooking.status) === 'approved' && (
                                    <section className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                                        <h3 className="mb-2 text-sm font-bold text-gray-800">Your check-in / check-out</h3>
                                        <div className="mb-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
                                            <p>
                                                <span className="font-semibold text-gray-800">Check-in: </span>
                                                {selectedDetailBooking.checked_in_at
                                                    ? new Date(selectedDetailBooking.checked_in_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                                                    : 'Not checked in'}
                                            </p>
                                            <p>
                                                <span className="font-semibold text-gray-800">Check-out: </span>
                                                {selectedDetailBooking.checked_out_at
                                                    ? new Date(selectedDetailBooking.checked_out_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                                                    : 'Not checked out'}
                                            </p>
                                        </div>
                                        {selectedDetailBooking.checked_in_at && !selectedDetailBooking.checked_out_at && (
                                            <button
                                                type="button"
                                                onClick={() => handleUserCheckInOut('out', selectedDetailBooking.id)}
                                                disabled={isCheckInOutProcessing}
                                                className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isCheckInOutProcessing ? 'Processing...' : 'Check Out'}
                                            </button>
                                        )}
                                        {!selectedDetailBooking.checked_in_at && !selectedDetailBooking.checked_out_at && !selectedBookingIsPast && !selectedBookingIsFuture && !isTooEarlyToCheckIn && (
                                            <button
                                                type="button"
                                                onClick={() => handleUserCheckInOut('in', selectedDetailBooking.id)}
                                                disabled={isCheckInOutProcessing}
                                                className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isCheckInOutProcessing ? 'Processing...' : 'Check In'}
                                            </button>
                                        )}
                                        {!selectedDetailBooking.checked_in_at && selectedBookingIsFuture && (
                                            <p className="text-xs font-medium text-amber-800">Check-in becomes available on the scheduled date, beginning 15 minutes before the start time.</p>
                                        )}
                                        {!selectedDetailBooking.checked_in_at && selectedBookingIsPast && (
                                            <p className="text-xs font-medium text-amber-800">This booking date has passed. Contact a Super Admin if a check-in correction is needed.</p>
                                        )}
                                        {!selectedDetailBooking.checked_in_at && !selectedBookingIsPast && !selectedBookingIsFuture && isTooEarlyToCheckIn && (
                                            <p className="text-xs font-medium text-amber-800">
                                                Check-in opens at {checkInOpensAt.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })}.
                                            </p>
                                        )}
                                        <p className="mt-2 text-xs text-gray-500">
                                            The booking owner can check in from 15 minutes before the scheduled start. After check-in, check out here to record the actual end time and calculate any applicable overtime charge.
                                        </p>
                                        {selectedDetailBooking.checked_out_at && Number(selectedDetailBooking.overtime_fee_amount ?? 0) > 0 && (
                                            <p className="mt-2 text-xs font-semibold text-amber-800">
                                                Final overtime charge: ₱{Number(selectedDetailBooking.overtime_fee_amount).toFixed(2)} · {selectedDetailBooking.overtime_payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                                            </p>
                                        )}
                                    </section>
                                )}

                                {(canRequestExtension || extensionRequests.length > 0) && (
                                    <section className="rounded-lg border border-violet-100 bg-violet-50/50 p-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-800">{canRequestExtension ? 'Request an overtime extension' : 'Overtime extension history'}</h3>
                                                <p className="mt-1 text-xs leading-5 text-gray-600">
                                                    {canRequestExtension
                                                        ? 'Request additional time while this booking is active. The reservation end time changes only after an administrator approves the request.'
                                                        : 'Review previous extension requests and administrator decisions for this reservation.'}
                                                </p>
                                            </div>
                                            {pendingExtensionRequest && (
                                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-800">
                                                    Awaiting review
                                                </span>
                                            )}
                                        </div>

                                        {extensionRequests.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {extensionRequests.slice(0, 3).map((item) => (
                                                    <div key={item.id} className="rounded-lg border border-violet-100 bg-white p-2.5">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <p className="text-xs font-semibold text-gray-800">
                                                                Requested until {formatTime(item.requested_end_time)}
                                                            </p>
                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${item.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : item.status === 'declined' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                                                                {item.status}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs text-gray-500">{item.requested_minutes} additional minutes · {item.reason}</p>
                                                        {item.decision_reason && <p className="mt-1 text-xs text-rose-700">Decision: {item.decision_reason}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {canRequestExtension && (pendingExtensionRequest ? (
                                            <p className="mt-3 text-xs font-medium text-amber-800">
                                                Your request is waiting for the assigned Facility Admin or a Super Admin. The original booking end time remains in effect until approval.
                                            </p>
                                        ) : (
                                            <div className="mt-3">
                                                {!showExtensionForm ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setExtensionEndTime(suggestExtendedEndTime(selectedDetailBooking.end_time));
                                                            setShowExtensionForm(true);
                                                        }}
                                                        disabled={!suggestExtendedEndTime(selectedDetailBooking.end_time)}
                                                        className="inline-flex items-center justify-center rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Request extension
                                                    </button>
                                                ) : (
                                                    <form onSubmit={handleExtensionRequest} className="space-y-3 rounded-xl border border-violet-100 bg-white p-3">
                                                        <div className="grid gap-3 sm:grid-cols-2">
                                                            <label className="text-xs font-semibold text-gray-600">
                                                                Requested new end time
                                                                <input
                                                                    type="time"
                                                                    step="900"
                                                                    value={extensionEndTime}
                                                                    onChange={(event) => setExtensionEndTime(event.target.value)}
                                                                    required
                                                                    className="mt-1 w-full rounded-lg border-gray-200 text-sm focus:border-violet-400 focus:ring-violet-300"
                                                                />
                                                            </label>
                                                            <label className="text-xs font-semibold text-gray-600">
                                                                Current booking end
                                                                <div className="mt-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                                                    {formatTime(selectedDetailBooking.end_time)}
                                                                </div>
                                                            </label>
                                                        </div>
                                                        <label className="block text-xs font-semibold text-gray-600">
                                                            Reason for extension
                                                            <textarea
                                                                rows={2}
                                                                maxLength={1000}
                                                                required
                                                                minLength={5}
                                                                value={extensionReason}
                                                                onChange={(event) => setExtensionReason(event.target.value)}
                                                                placeholder="Explain why additional time is needed."
                                                                className="mt-1 w-full rounded-lg border-gray-200 text-sm focus:border-violet-400 focus:ring-violet-300"
                                                            />
                                                        </label>
                                                        <div className="flex flex-wrap justify-end gap-2">
                                                            <button type="button" onClick={() => setShowExtensionForm(false)} disabled={isExtensionSubmitting} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600">Cancel</button>
                                                            <button type="submit" disabled={isExtensionSubmitting || !extensionEndTime || extensionReason.trim().length < 5} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                                                                {isExtensionSubmitting ? 'Submitting…' : 'Submit for approval'}
                                                            </button>
                                                        </div>
                                                    </form>
                                                )}
                                                {!suggestExtendedEndTime(selectedDetailBooking.end_time) && (
                                                    <p className="mt-2 text-xs text-gray-500">The booking already ends at midnight. An extension beyond the current day is not supported.</p>
                                                )}
                                            </div>
                                        ))}
                                    </section>
                                )}

                                <section>
                                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800"><Users className="h-4 w-4 text-[#6A535C]" /> Attendance and Manpower</h3>
                                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 p-3 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-600">Number of Attendees</label>
                                            {isEditing ? (
                                                <>
                                                    <input type="number" min="1" max={hasCapacityLimit ? capacity : undefined} step="1" value={data.attendees} onChange={(e) => setData('attendees', e.target.value)} required className={`w-full rounded-md text-sm shadow-sm focus:ring-[#846A75] ${exceedsCapacity || invalidAttendeeCount ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-[#846A75]'}`} />
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
                                                <div className="rounded-lg border border-[#EFE4E9] bg-[#F7F0F3]/60 p-3">
                                                    <label className={`flex items-start gap-2 ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}>
                                                        <input type="checkbox" checked={Boolean(data.needs_manpower)} disabled={!isEditing || processing} onChange={(e) => setData('needs_manpower', e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#6A535C] focus:ring-[#846A75] disabled:cursor-not-allowed disabled:opacity-70" />
                                                        <span className="min-w-0">
                                                            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800"><Wrench className="h-4 w-4 text-[#6A535C]" /> Request TDEVS manpower</span>
                                                            <span className="mt-1 block text-xs text-gray-600">{data.needs_manpower ? 'Manpower is requested for this booking.' : 'No manpower is currently requested.'}</span>
                                                            {isEditing && <span className="mt-1 block text-xs font-medium text-[#543F48]">Check to request, or uncheck to remove the request.</span>}
                                                        </span>
                                                    </label>
                                                </div>
                                            ) : <p className="text-sm text-gray-500">TDEVS manpower is not available for this facility.</p>}
                                            <FieldError message={errors.needs_manpower} />
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800"><FileText className="h-4 w-4 text-[#6A535C]" /> Booking Information</h3>
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
                                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800"><History className="h-4 w-4 text-[#6A535C]" /> Status History</h3>
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
                                        <button type="button" onClick={handleStartEditing} className="inline-flex items-center rounded-md border border-[#E8D8D1] bg-white px-3 py-2 text-xs font-semibold text-[#543F48] hover:bg-[#F7F0F3]"><Edit3 className="mr-1.5 h-4 w-4" /> Edit Details</button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {isEditing && (
                                        <button type="submit" disabled={processing || exceedsCapacity || invalidAttendeeCount || invalidTimeRange || invalidTimeInterval} className="inline-flex items-center rounded-md bg-[#6A535C] px-3 py-2 text-xs font-semibold text-white hover:bg-[#543F48] disabled:cursor-not-allowed disabled:opacity-50">
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
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F0F3]"><Save className="h-5 w-5 text-[#6A535C]" /></div>
                                    <h3 id="save-confirm-title" className="text-base font-bold text-gray-900">Save booking changes?</h3>
                                    <p className="mt-2 text-sm text-gray-600">Your updated reservation details, including the TDEVS manpower request, will be submitted.</p>
                                    <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                                        <p className="font-semibold text-gray-800">{formatDate(data.date)}{data.end_date && data.end_date !== data.date ? ' – ' + formatDate(data.end_date) : ''}</p>
                                        <p className="mt-1 text-gray-600">{formatTime(data.start_time)} – {formatTime(data.end_time)}</p>
                                        {hasCapacityLimit && <p className="mt-1 text-xs text-gray-500">Attendees: {data.attendees} / {capacity}</p>}
                                        <p className="mt-1 text-xs text-gray-500">TDEVS manpower: <strong>{canRequestManpower && data.needs_manpower ? 'Requested' : 'Not requested'}</strong></p>
                                    </div>
                                    <div className="mt-5 flex justify-end gap-2">
                                        <button type="button" onClick={() => setShowSaveConfirm(false)} disabled={processing} className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Go Back</button>
                                        <button type="button" onClick={handleConfirmSave} disabled={processing || exceedsCapacity || invalidAttendeeCount || invalidTimeRange || invalidTimeInterval} className="inline-flex items-center rounded-md bg-[#6A535C] px-3 py-2 text-xs font-semibold text-white hover:bg-[#543F48] disabled:cursor-not-allowed disabled:opacity-50"><Save className="mr-1.5 h-4 w-4" /> {processing ? 'Saving...' : 'Yes, Save'}</button>
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
