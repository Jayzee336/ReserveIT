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
} from 'lucide-react';
import { toast } from 'sonner';

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

    const parsed = new Date(`${String(date).slice(0, 10)}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) return date;

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

    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return time;

    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
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

    switch (status?.toLowerCase()) {
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

export default function MyBookings({
    auth,
    bookings = [],
    activityLogs = [],
}) {
    const [cancelModalId, setCancelModalId] = useState(null);
    const [detailModalId, setDetailModalId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

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

    const userBookings = [...bookings].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const selectedDetailBooking = userBookings.find(
        (booking) => booking.id === detailModalId
    );

    const selectedFacility = selectedDetailBooking?.facility;
    const capacity = selectedFacility?.capacity;

    const hasCapacityLimit =
        capacity !== null &&
        capacity !== undefined &&
        capacity !== '';

    const attendeeCount = Number(data.attendees);

    const exceedsCapacity =
        hasCapacityLimit &&
        data.attendees !== '' &&
        attendeeCount > Number(capacity);

    const isPending =
        selectedDetailBooking?.status?.toLowerCase() === 'pending';

    const canRequestManpower =
        Boolean(selectedFacility?.allowTdevsManpower);

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
        if (selectedDetailBooking) {
            handleOpenDetails(selectedDetailBooking);
        }
    };

    const handleUpdateBooking = (e) => {
        e.preventDefault();

        if (!isPending) {
            toast.error('Only pending bookings can be edited.');
            return;
        }

        if (
            !Number.isInteger(Number(data.attendees)) ||
            Number(data.attendees) < 1
        ) {
            toast.error('Attendees must be a whole number of at least 1.');
            return;
        }

        if (exceedsCapacity) {
            toast.error(
                `This facility allows a maximum of ${capacity} attendees.`
            );
            return;
        }

        if (!data.date || !data.start_time || !data.end_time) {
            toast.error('Please complete the reservation date and times.');
            return;
        }

        if (data.start_time >= data.end_time) {
            toast.error('End time must be after start time.');
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

        if (exceedsCapacity) {
            setShowSaveConfirm(false);
            toast.error(
                `This facility allows a maximum of ${capacity} attendees.`
            );
            return;
        }

        setShowSaveConfirm(false);

        // The existing schema stores the event details in the notes column.
        // needs_manpower is sent separately so Laravel can update its column.
        transform((formData) => ({
            date: formData.date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            attendees: Number(formData.attendees),
            needs_manpower: canRequestManpower
                ? Boolean(formData.needs_manpower)
                : false,
            notes: buildBookingNotes(formData),
        }));

        put(`/bookings/${detailModalId}`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditing(false);
                setDetailModalId(null);
                setShowSaveConfirm(false);
                toast.success('Booking modified successfully!');
            },
            onError: () => {
                toast.error(
                    'Could not update booking. Check the highlighted fields.'
                );
            },
            onFinish: () => {
                transform((formData) => formData);
            },
        });
    };

    const handleCancel = (id) => {
        router.put(
            `/bookings/${id}/cancel`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCancelModalId(null);
                    toast.success('Booking cancelled.');
                },
                onError: () => {
                    toast.error('Failed to cancel booking.');
                },
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

            <div className="py-5 sm:py-7">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
                        <div>
                            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                                My Bookings
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Manage your facility reservations.
                            </p>
                        </div>

                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                            {userBookings.length}{' '}
                            {userBookings.length === 1 ? 'booking' : 'bookings'}
                        </span>
                    </div>

                    {userBookings.length === 0 ? (
                        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                            <Calendar className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                            <h3 className="text-base font-semibold text-gray-900">
                                No bookings found
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                You have not made any facility reservations yet.
                            </p>

                            <Link
                                href="/dashboard"
                                className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                                Browse Facilities
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            {userBookings.map((booking) => {
                                const facility = booking.facility;

                                if (!facility) return null;

                                const status = booking.status?.toLowerCase();
                                const isCancelable = [
                                    'pending',
                                    'approved',
                                ].includes(status);

                                return (
                                    <article
                                        key={booking.id}
                                        className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                                    >
                                        <div className="flex-1 p-4">
                                            <div className="mb-3 flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <span className="mb-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                                                        {facility.type || 'Facility'}
                                                    </span>

                                                    <h3 className="break-words text-base font-bold text-gray-900">
                                                        {facility.name}
                                                    </h3>

                                                    <p className="mt-1 break-all text-[10px] text-gray-400">
                                                        Booking ID: {booking.id}
                                                    </p>
                                                </div>

                                                <span
                                                    className={`inline-flex flex-shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(status)}`}
                                                >
                                                    <StatusIcon status={status} />
                                                    <span className="capitalize">
                                                        {status}
                                                    </span>
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:grid-cols-2">
                                                <div className="flex min-w-0 items-start gap-2">
                                                    <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" />
                                                    <span className="text-sm text-gray-800">
                                                        {formatDate(booking.date)}
                                                    </span>
                                                </div>

                                                <div className="flex items-start gap-2">
                                                    <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" />
                                                    <span className="text-sm text-gray-800">
                                                        {formatTime(booking.start_time)}{' '}
                                                        – {formatTime(booking.end_time)}
                                                    </span>
                                                </div>

                                                <div className="flex min-w-0 items-start gap-2 sm:col-span-2">
                                                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                                                    <span className="break-words text-sm text-gray-600">
                                                        {facility.location || 'Location not specified'}
                                                    </span>
                                                </div>

                                                {booking.needs_manpower && (
                                                    <div className="flex items-center gap-2 sm:col-span-2">
                                                        <Wrench className="h-4 w-4 text-indigo-600" />
                                                        <span className="text-xs font-medium text-indigo-700">
                                                            TDEVS manpower requested
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3">
                                            <div className="flex flex-1 flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDetails(booking)}
                                                    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                                                >
                                                    <Eye className="mr-1.5 h-4 w-4" />
                                                    {status === 'pending'
                                                        ? 'View / Edit'
                                                        : 'View Details'}
                                                </button>

                                                {status === 'approved' && (
                                                    <Link
                                                        href={`/receipt/${booking.id}`}
                                                        className="inline-flex items-center justify-center rounded-md bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                                    >
                                                        <ExternalLink className="mr-1.5 h-4 w-4" />
                                                        Receipt
                                                    </Link>
                                                )}
                                            </div>

                                            {isCancelable && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCancelModalId(booking.id)}
                                                    className="inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                                                >
                                                    <X className="mr-1.5 h-4 w-4" />
                                                    Cancel
                                                </button>
                                            )}
                                        </div>

                                        {cancelModalId === booking.id && (
                                            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
                                                <button
                                                    type="button"
                                                    aria-label="Close cancellation confirmation"
                                                    className="absolute inset-0 bg-gray-900/50"
                                                    onClick={() => setCancelModalId(null)}
                                                />

                                                <div
                                                    role="dialog"
                                                    aria-modal="true"
                                                    className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="rounded-full bg-red-50 p-2">
                                                            <AlertTriangle className="h-5 w-5 text-red-600" />
                                                        </div>

                                                        <div>
                                                            <h3 className="font-bold text-gray-900">
                                                                Cancel booking?
                                                            </h3>
                                                            <p className="mt-1 text-sm text-gray-600">
                                                                Cancel your reservation for{' '}
                                                                <strong>{facility.name}</strong>{' '}
                                                                on {formatDate(booking.date)}?
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-5 flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setCancelModalId(null)}
                                                            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                                        >
                                                            Keep Booking
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleCancel(booking.id)}
                                                            className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                                                        >
                                                            Confirm Cancel
                                                        </button>
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

            {/* Booking details and editing modal */}
            {selectedDetailBooking && selectedFacility && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-5">
                    <button
                        type="button"
                        aria-label="Close booking details"
                        className="absolute inset-0 bg-gray-900/50 backdrop-blur-[1px]"
                        onClick={handleCloseDetails}
                    />

                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="booking-detail-title"
                        className="relative my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl"
                    >
                        <form onSubmit={handleUpdateBooking}>
                            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3 sm:px-5">
                                <div className="min-w-0">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                                            {selectedFacility.type || 'Facility'}
                                        </span>

                                        <span
                                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusBadgeClass(selectedDetailBooking.status)}`}
                                        >
                                            <StatusIcon status={selectedDetailBooking.status} />
                                            <span className="capitalize">
                                                {selectedDetailBooking.status}
                                            </span>
                                        </span>
                                    </div>

                                    <h2
                                        id="booking-detail-title"
                                        className="break-words text-lg font-bold text-gray-900"
                                    >
                                        {selectedFacility.name}
                                    </h2>

                                    <p className="mt-0.5 break-all text-[10px] text-gray-400">
                                        Booking ID: {selectedDetailBooking.id}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleCloseDetails}
                                    aria-label="Close"
                                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4 p-4 sm:p-5">
                                {/* Reservation schedule */}
                                <section>
                                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800">
                                        <Calendar className="h-4 w-4 text-indigo-600" />
                                        Reservation Schedule
                                    </h3>

                                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-600">
                                                Date
                                            </label>

                                            {isEditing ? (
                                                <>
                                                    <input
                                                        type="date"
                                                        value={data.date}
                                                        min={new Date().toLocaleDateString('en-CA')}
                                                        onChange={(e) => setData('date', e.target.value)}
                                                        required
                                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                    />
                                                    <FieldError message={errors.date} />
                                                </>
                                            ) : (
                                                <p className="text-sm font-medium text-gray-900">
                                                    {formatDate(selectedDetailBooking.date)}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-600">
                                                Start Time
                                            </label>

                                            {isEditing ? (
                                                <>
                                                    <input
                                                        type="time"
                                                        value={data.start_time}
                                                        onChange={(e) => setData('start_time', e.target.value)}
                                                        required
                                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                    />
                                                    <FieldError message={errors.start_time} />
                                                </>
                                            ) : (
                                                <p className="text-sm font-medium text-gray-900">
                                                    {formatTime(selectedDetailBooking.start_time)}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-600">
                                                End Time
                                            </label>

                                            {isEditing ? (
                                                <>
                                                    <input
                                                        type="time"
                                                        value={data.end_time}
                                                        min={data.start_time || undefined}
                                                        onChange={(e) => setData('end_time', e.target.value)}
                                                        required
                                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                    />
                                                    <FieldError message={errors.end_time} />
                                                </>
                                            ) : (
                                                <p className="text-sm font-medium text-gray-900">
                                                    {formatTime(selectedDetailBooking.end_time)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                {/* Attendee details and editable manpower request */}
                                <section>
                                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800">
                                        <Users className="h-4 w-4 text-indigo-600" />
                                        Attendance and Manpower
                                    </h3>

                                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 p-3 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-gray-600">
                                                Number of Attendees
                                            </label>

                                            {isEditing ? (
                                                <>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={hasCapacityLimit ? capacity : undefined}
                                                        step="1"
                                                        value={data.attendees}
                                                        onChange={(e) => setData('attendees', e.target.value)}
                                                        required
                                                        className={`w-full rounded-md text-sm shadow-sm focus:ring-indigo-500 ${
                                                            exceedsCapacity
                                                                ? 'border-red-400 focus:border-red-500'
                                                                : 'border-gray-300 focus:border-indigo-500'
                                                        }`}
                                                    />

                                                    {hasCapacityLimit && (
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Facility maximum: {capacity} attendees
                                                        </p>
                                                    )}

                                                    {exceedsCapacity && (
                                                        <p className="mt-1 text-xs font-medium text-red-600">
                                                            Attendee count exceeds this facility's capacity.
                                                        </p>
                                                    )}

                                                    <FieldError message={errors.attendees} />
                                                </>
                                            ) : (
                                                <p className="text-sm text-gray-900">
                                                    {selectedDetailBooking.attendees ?? 'Not specified'}
                                                    {hasCapacityLimit && (
                                                        <span className="ml-1 text-xs text-gray-500">
                                                            / {capacity} max
                                                        </span>
                                                    )}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <p className="mb-1 text-xs font-semibold text-gray-600">
                                                TDEVS Manpower Request
                                            </p>

                                            {canRequestManpower ? (
                                                <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
                                                    <label className={`flex items-start gap-2 ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(data.needs_manpower)}
                                                            disabled={!isEditing || processing}
                                                            onChange={(e) =>
                                                                setData('needs_manpower', e.target.checked)
                                                            }
                                                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                                                        />

                                                        <span className="min-w-0">
                                                            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                                                                <Wrench className="h-4 w-4 text-indigo-600" />
                                                                Request TDEVS manpower
                                                            </span>

                                                            <span className="mt-1 block text-xs text-gray-600">
                                                                {data.needs_manpower
                                                                    ? 'Manpower is requested for this booking.'
                                                                    : 'No manpower is currently requested.'}
                                                            </span>

                                                            {isEditing && (
                                                                <span className="mt-1 block text-xs font-medium text-indigo-700">
                                                                    Check to request, or uncheck to remove the request.
                                                                </span>
                                                            )}
                                                        </span>
                                                    </label>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500">
                                                    TDEVS manpower is not available for this facility.
                                                </p>
                                            )}

                                            <FieldError message={errors.needs_manpower} />
                                        </div>
                                    </div>
                                </section>

                                {/* Structured booking information */}
                                <section>
                                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800">
                                        <FileText className="h-4 w-4 text-indigo-600" />
                                        Booking Information
                                    </h3>

                                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 p-3 sm:grid-cols-2">
                                        {isEditing ? (
                                            <>
                                                <TextField
                                                    label="Event"
                                                    value={data.event_name}
                                                    onChange={(value) => setData('event_name', value)}
                                                    placeholder="Event name"
                                                />

                                                <TextField
                                                    label="Department"
                                                    value={data.department}
                                                    onChange={(value) => setData('department', value)}
                                                    placeholder="Department or office"
                                                />

                                                <TextField
                                                    label="Designation"
                                                    value={data.designation}
                                                    onChange={(value) => setData('designation', value)}
                                                    placeholder="Your designation"
                                                />

                                                <TextField
                                                    label="Facilitator"
                                                    value={data.facilitator}
                                                    onChange={(value) => setData('facilitator', value)}
                                                    placeholder="Facilitator name"
                                                />

                                                <div className="sm:col-span-2">
                                                    <TextField
                                                        label="Purpose"
                                                        value={data.purpose}
                                                        onChange={(value) => setData('purpose', value)}
                                                        placeholder="Purpose of the reservation"
                                                        multiline
                                                    />
                                                    <FieldError message={errors.notes} />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <DetailField
                                                    label="Event"
                                                    value={data.event_name}
                                                    icon={Calendar}
                                                />

                                                <DetailField
                                                    label="Department"
                                                    value={data.department}
                                                    icon={Building2}
                                                />

                                                <DetailField
                                                    label="Designation"
                                                    value={data.designation}
                                                    icon={UserRound}
                                                />

                                                <DetailField
                                                    label="Facilitator"
                                                    value={data.facilitator}
                                                    icon={UserRound}
                                                />

                                                <div className="sm:col-span-2">
                                                    <DetailField
                                                        label="Purpose"
                                                        value={data.purpose}
                                                        icon={FileText}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </section>

                                {/* Status history */}
                                <section>
                                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800">
                                        <History className="h-4 w-4 text-indigo-600" />
                                        Status History
                                    </h3>

                                    <div className="rounded-lg border border-gray-100">
                                        {activityLogs.filter(
                                            (log) => log.booking_id === selectedDetailBooking.id
                                        ).length === 0 ? (
                                            <p className="p-3 text-xs text-gray-500">
                                                No status history available.
                                            </p>
                                        ) : (
                                            <ul className="max-h-32 divide-y divide-gray-100 overflow-y-auto">
                                                {activityLogs
                                                    .filter((log) => log.booking_id === selectedDetailBooking.id)
                                                    .map((log) => (
                                                        <li key={log.id} className="p-3">
                                                            <div className="flex flex-wrap items-center justify-between gap-1">
                                                                <span className="text-xs font-semibold capitalize text-gray-800">
                                                                    {(log.action || 'Update')
                                                                        .replace('STATUS_', '')
                                                                        .replaceAll('_', ' ')}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400">
                                                                    {log.created_at
                                                                        ? new Date(log.created_at).toLocaleString()
                                                                        : ''}
                                                                </span>
                                                            </div>
                                                            {log.notes && (
                                                                <p className="mt-1 text-xs text-gray-600">
                                                                    {log.notes}
                                                                </p>
                                                            )}
                                                            {log.performed_by && (
                                                                <p className="mt-1 text-[10px] text-gray-400">
                                                                    Performed by: {log.performed_by}
                                                                </p>
                                                            )}
                                                        </li>
                                                    ))}
                                            </ul>
                                        )}
                                    </div>
                                </section>
                            </div>

                            {/* Modal footer */}
                            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 sm:px-5">
                                <div className="flex gap-2">
                                    {isEditing ? (
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            disabled={processing}
                                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                        >
                                            Discard Changes
                                        </button>
                                    ) : (
                                        isPending && (
                                            <button
                                                type="button"
                                                onClick={handleStartEditing}
                                                className="inline-flex items-center rounded-md border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                                            >
                                                <Edit3 className="mr-1.5 h-4 w-4" />
                                                Edit Details
                                            </button>
                                        )
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    {isEditing && (
                                        <button
                                            type="submit"
                                            disabled={processing || exceedsCapacity}
                                            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Save className="mr-1.5 h-4 w-4" />
                                            {processing ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleCloseDetails}
                                        disabled={processing}
                                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Save confirmation */}
                        {showSaveConfirm && (
                            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                                <button
                                    type="button"
                                    aria-label="Close save confirmation"
                                    className="absolute inset-0 bg-gray-900/60"
                                    onClick={() => setShowSaveConfirm(false)}
                                    disabled={processing}
                                />

                                <div
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby="save-confirm-title"
                                    className="relative z-10 w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
                                >
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                                        <Save className="h-5 w-5 text-indigo-600" />
                                    </div>

                                    <h3
                                        id="save-confirm-title"
                                        className="text-base font-bold text-gray-900"
                                    >
                                        Save booking changes?
                                    </h3>

                                    <p className="mt-2 text-sm text-gray-600">
                                        Your updated reservation details, including the TDEVS manpower request, will be submitted.
                                    </p>

                                    {hasCapacityLimit && (
                                        <p className="mt-2 text-xs text-gray-500">
                                            Attendees: {data.attendees} / {capacity}
                                        </p>
                                    )}

                                    <p className="mt-2 text-xs text-gray-500">
                                        TDEVS manpower:{' '}
                                        <strong>
                                            {canRequestManpower && data.needs_manpower
                                                ? 'Requested'
                                                : 'Not requested'}
                                        </strong>
                                    </p>

                                    <div className="mt-5 flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowSaveConfirm(false)}
                                            disabled={processing}
                                            className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Go Back
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleConfirmSave}
                                            disabled={processing || exceedsCapacity}
                                            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            <Save className="mr-1.5 h-4 w-4" />
                                            {processing ? 'Saving...' : 'Yes, Save'}
                                        </button>
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