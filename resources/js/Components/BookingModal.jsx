import { useState, useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    Upload,
    AlertCircle,
    CheckCircle2,
    UserIcon,
    Calendar as CalendarIcon,
    AlertTriangle,
} from 'lucide-react';

// Generate consistent 15-minute intervals from 8:00 AM through 7:45 PM.
const OPENING_TIME = '08:00';
const CLOSING_TIME = '20:00';
const SLOT_INTERVAL_MINUTES = 15;

const toMins = (time) => {
    if (!time) return 0;

    const [hour, minute] = String(time).split(':').map(Number);
    return hour * 60 + (minute || 0);
};

const formatTime = (time) => {
    const [hour, minute] = time.split(':').map(Number);

    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${
        hour >= 12 ? 'PM' : 'AM'
    }`;
};

const generateTimeSlots = () => {
    const slots = [];

    for (
        let minutes = toMins(OPENING_TIME);
        minutes < toMins(CLOSING_TIME);
        minutes += SLOT_INTERVAL_MINUTES
    ) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;

        slots.push(
            `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        );
    }

    // Closing time is an end-time option only.
    slots.push(CLOSING_TIME);

    return slots;
};

const TIME_SLOTS = generateTimeSlots();
const MAX_CONSENT_FILE_SIZE = 5 * 1024 * 1024;
const CONSENT_FILE_SIZE_ERROR = 'File size exceeds the maximum limit of 5MB.';

const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const addDaysToLocalDate = (days) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);

    return getLocalDateString(date);
};

const isWeekendDate = (value) => {
    if (!value) return false;

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const weekday = date.getDay();

    return weekday === 0 || weekday === 6;
};

/**
 * Unified Booking Modal — rendered identically whether triggered from
 * CalendarDashboard, FacilityDetails, or another page.
 */
export default function BookingModal({
    facility,
    selectedDate,
    selectedStartTime,
    existingBookings = [],
    blackoutDates = [],
    onClose,
    onSuccess,
}) {
    const page = usePage();
    const { auth } = page.props;
    const user = auth?.user;
    const isAuthenticated = !!user;

    // Read the cleanup buffer shared by HandleInertiaRequests.php.
    const configuredBuffer = Number(
        page.props.systemSettings?.cleanup_buffer_minutes ?? 30
    );

    const cleanupBuffer = Number.isFinite(configuredBuffer)
        ? Math.max(0, configuredBuffer)
        : 30;

    const globalConsentSetting =
        page.props.systemSettings?.require_consent_letter ??
        page.props.require_consent_letter ??
        false;

    const requireConsentGlobally =
        globalConsentSetting === true ||
        globalConsentSetting === 1 ||
        globalConsentSetting === '1';

    // Form state
    const [date, setDate] = useState(selectedDate || '');
    const [startTime, setStartTime] = useState(selectedStartTime || '');
    const [endTime, setEndTime] = useState('');
    const [notes, setNotes] = useState('');
    const [attendees, setAttendees] = useState('1');
    const [eventName, setEventName] = useState('');
    const [department, setDepartment] = useState('');
    const [designation, setDesignation] = useState('');
    const [facilitator, setFacilitator] = useState('');
    const [file, setFile] = useState(null);
    const [needsManpower, setNeedsManpower] = useState(false);
    const [guestEmail, setGuestEmail] = useState('');
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [conflictError, setConflictError] = useState('');

    // Consent and lead-time rules
    const isWeekendBooking = isWeekendDate(date);
    const isAlwaysConsent = facility?.requirement === 'CONSENT_REQUIRED';

    const facilityConsentRequired =
        isAlwaysConsent ||
        (Boolean(facility?.requiresWeekendConsent) && isWeekendBooking);

    const isConsentRequired =
        requireConsentGlobally || facilityConsentRequired;

    const today = useMemo(() => getLocalDateString(new Date()), []);

    const minDate = useMemo(
        () => (isConsentRequired ? addDaysToLocalDate(3) : today),
        [isConsentRequired, today]
    );

    const earliestConsentDate = useMemo(
        () => addDaysToLocalDate(3),
        []
    );

    const isDateTooSoon =
        isConsentRequired &&
        Boolean(date) &&
        date < earliestConsentDate;

    const isToday = date === today;

    const isTimePast = (time) => {
        if (!isToday) return false;

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        return toMins(time) <= currentMinutes;
    };

    const capacity = facility?.capacity || 0;

    const isOverCapacity = Boolean(
        capacity && attendees !== '' && Number(attendees) > capacity
    );

    // Check whether the requested interval conflicts with an existing booking.
    // The cleanup buffer extends the existing booking on both sides.
    const checkConflict = () => {
        if (!startTime || !endTime || !date || !facility?.id) {
            return false;
        }

        const requestedStart = toMins(startTime);
        const requestedEnd = toMins(endTime);

        return existingBookings.some((booking) => {
            const bookingStatus = String(booking.status ?? '').toLowerCase();

            if (
                String(booking.facility_id) !== String(facility.id) ||
                String(booking.date ?? '').slice(0, 10) !== date ||
                !['pending', 'approved'].includes(bookingStatus)
            ) {
                return false;
            }

            const bookingStart = toMins(booking.start_time);
            const bookingEnd = toMins(booking.end_time);

            const blockedStart = bookingStart - cleanupBuffer;
            const blockedEnd = bookingEnd + cleanupBuffer;

            // Starting exactly at blockedEnd is allowed by this check.
            return (
                requestedStart < blockedEnd &&
                requestedEnd > blockedStart
            );
        });
    };

    // End times use the same 15-minute interval and must follow the start time.
    const endTimeOptions = useMemo(() => {
        if (!startTime) return [];

        const startMinutes = toMins(startTime);

        return TIME_SLOTS.filter(
            (time) => toMins(time) > startMinutes
        );
    }, [startTime]);

    // Submit booking
    const handleSubmit = (e) => {
        e.preventDefault();
        setConflictError('');

        const attendeeCount = Number(attendees);

        if (!Number.isInteger(attendeeCount) || attendeeCount < 1) {
            setConflictError(
                'Attendees count must be a whole number of at least 1.'
            );
            return;
        }

        if (capacity && attendeeCount > capacity) {
            setConflictError(`Capacity exceeded. Max ${capacity} people.`);
            return;
        }

        if (!isAuthenticated && (!guestEmail || !guestName || !guestPhone)) {
            toast.error('Please provide your name, email, and phone number.');
            return;
        }

        if (!date) {
            setConflictError('Please select a booking date.');
            return;
        }

        if (!startTime || !endTime || toMins(startTime) >= toMins(endTime)) {
            setConflictError('End time must be after start time.');
            return;
        }

        if (
            toMins(startTime) < toMins(OPENING_TIME) ||
            toMins(endTime) > toMins(CLOSING_TIME)
        ) {
            setConflictError(
                `Bookings must be between ${formatTime(OPENING_TIME)} and ${formatTime(CLOSING_TIME)}.`
            );
            return;
        }

        if (
            !TIME_SLOTS.includes(startTime) ||
            !TIME_SLOTS.includes(endTime) ||
            toMins(startTime) % SLOT_INTERVAL_MINUTES !== 0 ||
            toMins(endTime) % SLOT_INTERVAL_MINUTES !== 0
        ) {
            setConflictError('Please select a valid 15-minute time interval.');
            return;
        }

        if (isOverCapacity) {
            setConflictError(`Capacity exceeded. Max ${capacity} people.`);
            return;
        }

        if (
            blackoutDates?.some(
                (blackout) => String(blackout.date).slice(0, 10) === date
            )
        ) {
            setConflictError('This date is blocked for maintenance.');
            return;
        }

        if (isDateTooSoon) {
            setConflictError(
                'Consent-required bookings need 3 days advance notice.'
            );
            return;
        }

        if (isConsentRequired && !file) {
            setConflictError(
                'A consent letter upload is mandatory for this booking.'
            );
            return;
        }

        if (file && file.size > MAX_CONSENT_FILE_SIZE) {
            setFile(null);
            setConflictError(CONSENT_FILE_SIZE_ERROR);
            toast.error(CONSENT_FILE_SIZE_ERROR);
            return;
        }

        if (checkConflict()) {
            setConflictError(
                cleanupBuffer > 0
                    ? `Time slot overlaps with an existing booking (${cleanupBuffer}-minute buffer included).`
                    : 'Time slot overlaps with an existing booking.'
            );
            return;
        }

        setIsSubmitting(true);

        let finalNotes =
            `Event: ${eventName} | Dept: ${department} | Desig: ${designation}\n` +
            `Purpose: ${notes}`;

        if (facilitator.trim()) {
            finalNotes += ` | Facilitator: ${facilitator.trim()}`;
        }

        if (needsManpower) {
            finalNotes += '\n[Requested TDEVS manpower]';
        }

        router.post(
            '/bookings',
            {
                facility_id: facility.id,
                date,
                start_time: startTime,
                end_time: endTime,
                notes: finalNotes,
                attendees: attendeeCount,
                guest_name: isAuthenticated ? null : guestName,
                guest_email: isAuthenticated ? null : guestEmail,
                guest_phone: isAuthenticated ? null : guestPhone,
                needs_manpower: needsManpower,
                consent_letter: file,
            },
            {
                forceFormData: true,

                onSuccess: () => {
                    setIsSubmitting(false);
                    setSuccess(true);
                    toast.success('Booking request submitted successfully!');

                    if (onSuccess) {
                        setTimeout(() => {
                            onSuccess();
                            onClose?.();
                        }, 1500);
                    } else {
                        setTimeout(() => onClose?.(), 1800);
                    }
                },

                onError: (errors) => {
                    setIsSubmitting(false);

                    const firstError = Object.values(errors)[0];

                    const message =
                        errors.consent_letter &&
                        /size|large|max/i.test(errors.consent_letter)
                            ? CONSENT_FILE_SIZE_ERROR
                            : firstError || 'An error occurred.';

                    setConflictError(message);

                    if (errors.consent_letter) {
                        toast.error(message);
                    }
                },

                onHttpException: (response) => {
                    setIsSubmitting(false);

                    if (response.status === 413) {
                        setConflictError(CONSENT_FILE_SIZE_ERROR);
                        toast.error(CONSENT_FILE_SIZE_ERROR);
                        return false;
                    }
                },
            }
        );
    };

    // Success view
    if (success) {
        return (
            <div className="px-4 py-10 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
                <h3 className="mb-1 text-lg font-bold text-gray-900">
                    Request Submitted
                </h3>
                <p className="text-sm text-gray-500">
                    The facility admin has been notified.
                </p>
                <p className="mt-2 text-xs text-gray-400">Redirecting…</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-0">
            {/* Applicant Information */}
            <div className="border-b border-gray-100 px-6 py-5">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                    Applicant Information
                </h4>

                {isAuthenticated ? (
                    <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-200">
                            <span className="text-xs font-bold text-indigo-800">
                                {(user?.name || 'U')
                                    .split(' ')
                                    .map((word) => word[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-indigo-900">
                                {user?.name}
                            </p>
                            <p className="text-xs text-indigo-500">
                                {user?.email}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <UserIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                required
                                placeholder="Full Name"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                className="block w-full rounded-xl border border-gray-200 p-2.5 pl-10 text-sm focus:ring-2 focus:ring-indigo-400"
                            />
                        </div>

                        <input
                            type="email"
                            required
                            placeholder="Email address"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-400"
                        />

                        <input
                            type="tel"
                            required
                            placeholder="Phone number"
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>
                )}
            </div>

            {/* Event Details */}
            <div className="space-y-3 border-b border-gray-100 px-6 py-5">
                <h4 className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-400">
                    Event Details
                </h4>

                <input
                    type="text"
                    required
                    placeholder="Event name / title"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-400"
                />

                <div className="grid grid-cols-2 gap-3">
                    <input
                        type="text"
                        required
                        placeholder="Department / Org"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-400"
                    />

                    <input
                        type="text"
                        required
                        placeholder="Designation"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-400"
                    />
                </div>

                <input
                    type="text"
                    placeholder="Facilitator (optional)"
                    value={facilitator}
                    onChange={(e) => setFacilitator(e.target.value)}
                    className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-400"
                />

                <textarea
                    required
                    rows={2}
                    placeholder="Purpose of the event…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="block w-full resize-none rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-400"
                />
            </div>

            {/* Schedule */}
            <div className="space-y-3 border-b border-gray-100 px-6 py-5">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        Schedule
                    </h4>

                    {isConsentRequired && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                            3-day lead time required
                        </span>
                    )}
                </div>

                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                    </div>

                    <input
                        type="date"
                        required
                        value={date}
                        min={minDate}
                        disabled={!!selectedDate}
                        onChange={(e) => {
                            const value = e.target.value;

                            if (
                                blackoutDates?.some(
                                    (blackout) =>
                                        String(blackout.date).slice(0, 10) === value
                                )
                            ) {
                                setDate('');
                                setConflictError(
                                    'This date is blocked for maintenance.'
                                );
                                return;
                            }

                            setDate(value);
                            setStartTime('');
                            setEndTime('');
                            setConflictError('');
                        }}
                        className={`block w-full rounded-xl border p-2.5 pl-10 text-sm focus:ring-2 focus:ring-indigo-400 ${
                            isDateTooSoon
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-200'
                        } ${selectedDate ? 'cursor-not-allowed bg-gray-100' : ''}`}
                    />
                </div>

                {isDateTooSoon && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                        <p className="text-xs text-red-600">
                            Consent-required bookings need 3 days advance notice.
                            Earliest: {earliestConsentDate}
                        </p>
                    </div>
                )}

                {isWeekendBooking &&
                    !requireConsentGlobally &&
                    !isAlwaysConsent && (
                        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                            <p className="text-xs text-amber-700">
                                <strong>Weekend booking.</strong>{' '}
                                {facility?.requiresWeekendConsent
                                    ? 'A signed consent letter is required for this facility.'
                                    : 'This facility does not require consent for weekend bookings.'}
                            </p>
                        </div>
                    )}

                {requireConsentGlobally && (
                    <div className="flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" />
                        <p className="text-xs text-indigo-700">
                            A consent letter is required for every booking under the current system settings.
                        </p>
                    </div>
                )}

                {/* Time selects */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">
                            Start Time
                        </label>

                        <select
                            required
                            value={startTime}
                            disabled={!!selectedStartTime}
                            onChange={(e) => {
                                setStartTime(e.target.value);
                                setEndTime('');
                                setConflictError('');
                            }}
                            className={`block w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-indigo-400 ${
                                selectedStartTime
                                    ? 'cursor-not-allowed bg-gray-100'
                                    : ''
                            }`}
                        >
                            <option value="">Select time</option>

                            {TIME_SLOTS.filter(
                                (time) => time !== CLOSING_TIME
                            ).map((time) => (
                                <option
                                    key={time}
                                    value={time}
                                    disabled={isTimePast(time)}
                                >
                                    {formatTime(time)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">
                            End Time
                        </label>

                        <select
                            required
                            value={endTime}
                            onChange={(e) => {
                                setEndTime(e.target.value);
                                setConflictError('');
                            }}
                            className="block w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-indigo-400"
                        >
                            <option value="">Select time</option>

                            {endTimeOptions.map((time) => (
                                <option key={time} value={time}>
                                    {formatTime(time)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <p className="text-xs text-gray-400">
                    Time slots are available every 15 minutes, from 8:00 AM
                    until the 8:00 PM closing time.
                </p>

                {/* Attendees */}
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                        Attendees Count
                    </label>

                    <input
                        type="number"
                        min={1}
                        step={1}
                        required
                        value={attendees}
                        onChange={(e) => {
                            setAttendees(e.target.value);
                            setConflictError('');
                        }}
                        onBlur={() => {
                            if (attendees === '' || Number(attendees) < 1) {
                                setAttendees('1');
                            }
                        }}
                        className={`block w-full rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-indigo-400 ${
                            isOverCapacity
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-200'
                        }`}
                    />

                    {isOverCapacity && (
                        <p className="mt-1 text-xs text-red-600">
                            Exceeds limits of {capacity} seats.
                        </p>
                    )}
                </div>

                {/* Manpower checkbox */}
                {facility?.allowTdevsManpower && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <input
                            type="checkbox"
                            checked={needsManpower}
                            onChange={(e) => setNeedsManpower(e.target.checked)}
                            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                        />

                        <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800">
                                Request TDEVS Manpower
                            </p>
                            <p className="mt-1 text-xs text-amber-700">
                                Opting for Manpower incurs a ₱100 service charge.
                            </p>
                        </div>
                    </label>
                )}
            </div>

            {/* Consent Letter Upload */}
            {isConsentRequired && (
                <div className="space-y-3 border-b border-gray-100 px-6 py-5">
                    <div className="relative rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 hover:bg-indigo-50/40">
                        <div className="flex items-center gap-3">
                            <Upload className="h-5 w-5 text-gray-400" />

                            <div>
                                <p className="text-sm font-semibold text-gray-600">
                                    {file
                                        ? file.name
                                        : 'Click to attach Consent Form'}
                                </p>
                                <p className="text-xs text-gray-400">
                                    PDF, DOC, or DOCX up to 5MB
                                </p>
                            </div>
                        </div>

                        <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            aria-label="Upload consent letter"
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            onChange={(e) => {
                                const selectedFile =
                                    e.target.files?.[0] || null;

                                if (
                                    selectedFile &&
                                    selectedFile.size > MAX_CONSENT_FILE_SIZE
                                ) {
                                    setFile(null);
                                    e.target.value = '';
                                    setConflictError(CONSENT_FILE_SIZE_ERROR);
                                    toast.error(CONSENT_FILE_SIZE_ERROR);
                                    return;
                                }

                                setFile(selectedFile);
                                setConflictError('');
                            }}
                        />

                        {file && (
                            <p className="mt-2 text-xs text-emerald-700">
                                Consent file selected.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="space-y-3 px-6 py-5">
                {conflictError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">
                        {conflictError}
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={
                            isSubmitting ||
                            isOverCapacity ||
                            !!isDateTooSoon
                        }
                        className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300"
                    >
                        {isSubmitting
                            ? 'Submitting…'
                            : 'Submit Booking Request'}
                    </button>
                </div>
            </div>
        </form>
    );
}