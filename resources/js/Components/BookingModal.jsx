import { useState, useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    Upload,
    AlertCircle,
    CheckCircle2,
    UserIcon,
    AlertTriangle,
} from 'lucide-react';

// Generate consistent 15-minute intervals from 8:00 AM through 9:45 PM; 10:00 PM is the closing-time end option.
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
    const [date, setDate] = useState(selectedDate || '');
    const [endDate, setEndDate] = useState(selectedDate || '');
    const dateRangeWeekdays = useMemo(() => {
        if (!date || !endDate || endDate < date) return [];
        const days = new Set();
        const cursor = new Date(date + 'T12:00:00');
        const lastDate = new Date(endDate + 'T12:00:00');
        let scanned = 0;
        while (cursor <= lastDate && scanned <= 366) {
            days.add(cursor.getDay());
            cursor.setDate(cursor.getDate() + 1);
            scanned += 1;
        }
        return [...days];
    }, [date, endDate]);
    const selectedFacilityHours = facility?.operating_hours ?? [];
    const globalOpening = String(page.props.systemSettings?.opening_time ?? '08:00').slice(0, 5);
    const globalClosing = String(page.props.systemSettings?.closing_time ?? '00:00').slice(0, 5);
    const rangeSchedules = dateRangeWeekdays.map((weekday) =>
        selectedFacilityHours.find((item) => Number(item.day_of_week) === weekday)
    );
    const isFacilityClosed = rangeSchedules.some((schedule) => schedule?.is_closed);
    const openingCandidates = rangeSchedules.map((schedule) =>
        schedule && !schedule.is_closed
            ? toMins(String(schedule.opens_at ?? globalOpening).slice(0, 5))
            : toMins(globalOpening)
    );
    const closingCandidates = rangeSchedules.map((schedule) => {
        const closing = String(schedule?.closes_at ?? globalClosing).slice(0, 5);
        return closing === '00:00' ? 1440 : toMins(closing);
    });
    const openingMinutes = openingCandidates.length ? Math.max(...openingCandidates) : toMins(globalOpening);
    const closingMinutes = closingCandidates.length
        ? Math.min(...closingCandidates)
        : (globalClosing === '00:00' ? 1440 : toMins(globalClosing));
    const OPENING_TIME = String(Math.floor(openingMinutes / 60)).padStart(2, '0') + ':' + String(openingMinutes % 60).padStart(2, '0');
    const CLOSING_TIME = closingMinutes === 1440 ? '00:00' : String(Math.floor(closingMinutes / 60)).padStart(2, '0') + ':' + String(closingMinutes % 60).padStart(2, '0');
    const TIME_SLOTS = useMemo(() => {
        if (isFacilityClosed) return [];

        const slots = [];
        for (let minutes = toMins(OPENING_TIME); minutes < closingMinutes; minutes += SLOT_INTERVAL_MINUTES) {
            slots.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
        }
        slots.push(CLOSING_TIME);
        return slots;
    }, [OPENING_TIME, CLOSING_TIME, closingMinutes, isFacilityClosed]);

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
    const [startTime, setStartTime] = useState(selectedStartTime || '');
    const [endTime, setEndTime] = useState('');
    const [notes, setNotes] = useState('');
    const [attendees, setAttendees] = useState('1');
    const [eventName, setEventName] = useState('');
    const [department, setDepartment] = useState('');
    const [designation, setDesignation] = useState('');
    const [facilitator, setFacilitator] = useState('');
    const [file, setFile] = useState(null);
    const [activityPlanFile, setActivityPlanFile] = useState(null);
    const [signatureFile, setSignatureFile] = useState(null);
    const [needsManpower, setNeedsManpower] = useState(false);
    const [guestEmail, setGuestEmail] = useState('');
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [conflictError, setConflictError] = useState('');

    // Consent and lead-time rules
    const isWeekendBooking = dateRangeWeekdays.some((weekday) => weekday === 0 || weekday === 6);
    const isAlwaysConsent = facility?.requirement === 'CONSENT_REQUIRED';
    const normalizedFacilityName = String(facility?.name ?? '').trim().toLowerCase();
    const requiresActivityPlan = [
        'lobby',
        'main auditorium',
        'quadrangle or field',
        'field',
        'sky gym',
        'view deck',
    ].includes(normalizedFacilityName);
    const requiresSirReneSignature = [
        'quadrangle or field',
        'field',
        'sky gym',
    ].includes(normalizedFacilityName);

    const facilityConsentRequired =
        isAlwaysConsent ||
        (Boolean(facility?.requiresWeekendConsent) && isWeekendBooking);

    const isConsentRequired =
        requireConsentGlobally || facilityConsentRequired;

    const today = useMemo(() => getLocalDateString(new Date()), []);
    const bookingLeadTimeDays = Math.max(0, Number(facility?.booking_lead_time_days ?? 0));
    const earliestBookingDate = useMemo(
        () => addDaysToLocalDate(bookingLeadTimeDays),
        [bookingLeadTimeDays]
    );
    const minDate = earliestBookingDate;

    const isDateTooSoon =
        Boolean(date) &&
        date < earliestBookingDate;

    const isToday = date === today;

    const isTimePast = (time) => {
        if (!isToday) return false;

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        return toMins(time) <= currentMinutes;
    };

    const toEndMins = (time) => time === '00:00' ? 1440 : toMins(time);

    const capacity = facility?.capacity || 0;

    const isOverCapacity = Boolean(
        capacity && attendees !== '' && Number(attendees) > capacity
    );

    // Pending and approved bookings both reserve their interval. Match either
    // persisted date field because older records may expose booking_date only.
    const blockedBookingRanges = useMemo(() => existingBookings
        .filter((booking) => {
            const bookingStatus = String(booking.status ?? '').toLowerCase();
            const bookingStartDate = String(booking.date || booking.booking_date || '').slice(0, 10);
            const bookingEndDate = String(booking.end_date || bookingStartDate).slice(0, 10);

            return (
                String(booking.facility_id) === String(facility?.id) &&
                bookingStartDate <= endDate &&
                bookingEndDate >= date &&
                ['pending', 'approved'].includes(bookingStatus)
            );
        })
        .map((booking) => ({
            start: toMins(booking.start_time) - cleanupBuffer,
            end: toEndMins(String(booking.end_time).slice(0, 5)) + cleanupBuffer,
        })), [existingBookings, facility?.id, date, endDate, cleanupBuffer]);

    const minutesToTime = (minutes) => {
        if (minutes >= 1440) return '00:00';
        return String(Math.floor(minutes / 60)).padStart(2, '0')
            + ':' + String(minutes % 60).padStart(2, '0');
    };

    const findScheduledClosureConflict = (requestedStartTime, requestedEndTime) => {
        const periods = facility?.unavailability_periods ?? [];
        if (!date || !endDate || endDate < date || !periods.length) return null;

        const cursor = new Date(date + 'T12:00:00');
        const lastDate = new Date(endDate + 'T12:00:00');

        while (cursor <= lastDate) {
            const day = getLocalDateString(cursor);
            const requestedStart = new Date(day + 'T' + requestedStartTime + ':00');
            const requestedEnd = new Date(day + 'T' + requestedEndTime + ':00');

            if (requestedEndTime === '00:00') {
                requestedEnd.setDate(requestedEnd.getDate() + 1);
            }

            const closure = periods.find((period) => {
                if (period.ended_at || !period.scheduled_start_at || !period.scheduled_end_at) {
                    return false;
                }

                const closureStart = new Date(period.scheduled_start_at);
                const closureEnd = new Date(period.scheduled_end_at);

                return (
                    !Number.isNaN(closureStart.getTime())
                    && !Number.isNaN(closureEnd.getTime())
                    && requestedStart < closureEnd
                    && requestedEnd > closureStart
                );
            });

            if (closure) return closure;
            cursor.setDate(cursor.getDate() + 1);
        }

        return null;
    };

    const isTimeRangeUnavailable = (requestedStart, requestedEnd) =>
        blockedBookingRanges.some((range) =>
            requestedStart < range.end && requestedEnd > range.start
        ) || Boolean(findScheduledClosureConflict(
            minutesToTime(requestedStart),
            minutesToTime(requestedEnd)
        ));

    // A start option is unavailable when its starting point falls inside a
    // reserved interval or scheduled closure. End options validate the full range.
    const isStartTimeUnavailable = (time) => {
        const start = toMins(time);
        const nextSlot = Math.min(start + SLOT_INTERVAL_MINUTES, 1440);

        return blockedBookingRanges.some((range) =>
            start >= range.start && start < range.end
        ) || Boolean(findScheduledClosureConflict(time, minutesToTime(nextSlot)));
    };

    const isEndTimeUnavailable = (time) => {
        if (!startTime) return false;
        return isTimeRangeUnavailable(toMins(startTime), toEndMins(time));
    };

    const checkConflict = () => {
        if (!startTime || !endTime || !date || !endDate || endDate < date || !facility?.id) {
            return false;
        }

        return isTimeRangeUnavailable(toMins(startTime), toEndMins(endTime));
    };

    // End times use the same 15-minute interval and must follow the start time.
    const endTimeOptions = useMemo(() => {
        if (!startTime) return [];

        const startMinutes = toMins(startTime);

        return TIME_SLOTS.filter(
            (time) => toEndMins(time) > startMinutes
        );
    }, [startTime, TIME_SLOTS]);

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

        if (!date || !endDate || endDate < date) {
            setConflictError('Please select a valid start and end date.');
            return;
        }

        if (isFacilityClosed) {
            setConflictError('This facility is closed on at least one date in the selected reservation range.');
            return;
        }

        if (!startTime || !endTime || toMins(startTime) >= toEndMins(endTime)) {
            setConflictError('End time must be after start time.');
            return;
        }

        if (
            toMins(startTime) < toMins(OPENING_TIME) ||
            toMins(endTime) > closingMinutes && endTime !== '00:00'
        ) {
            setConflictError(
                `Bookings must be between ${formatTime(OPENING_TIME)} and ${CLOSING_TIME === '00:00' ? '12:00 AM (midnight)' : formatTime(CLOSING_TIME)}.`
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
            blackoutDates?.some((blackout) => {
                const blackoutDate = String(blackout.date).slice(0, 10);
                return blackoutDate >= date && blackoutDate <= endDate;
            })
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

        if (requiresActivityPlan && !activityPlanFile) {
            setConflictError('An Activity Plan document is required for this facility.');
            return;
        }

        if (requiresSirReneSignature && !signatureFile) {
            setConflictError("Sir Rene's signature file is required for this facility.");
            return;
        }

        if (activityPlanFile && activityPlanFile.size > 10 * 1024 * 1024) {
            setConflictError('The Activity Plan file must not exceed 10MB.');
            return;
        }

        if (signatureFile && signatureFile.size > 5 * 1024 * 1024) {
            setConflictError("Sir Rene's signature file must not exceed 5MB.");
            return;
        }

        const scheduledClosureConflict = findScheduledClosureConflict(startTime, endTime);
        if (scheduledClosureConflict) {
            setConflictError(
                `This time overlaps a scheduled facility closure: ${scheduledClosureConflict.reason}`
            );
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
                end_date: endDate,
                start_time: startTime,
                end_time: endTime,
                notes: finalNotes,
                attendees: attendeeCount,
                guest_name: isAuthenticated ? null : guestName,
                guest_email: isAuthenticated ? null : guestEmail,
                guest_phone: isAuthenticated ? null : guestPhone,
                needs_manpower: needsManpower,
                consent_letter: file,
                activity_plan_file: activityPlanFile,
                sir_rene_signature: signatureFile,
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

                    const fileError =
                        errors.consent_letter ||
                        errors.activity_plan_file ||
                        errors.sir_rene_signature;
                    const message =
                        errors.consent_letter && /size|large|max/i.test(errors.consent_letter)
                            ? CONSENT_FILE_SIZE_ERROR
                            : firstError || 'An error occurred.';

                    setConflictError(message);

                    if (fileError) {
                        toast.error(message);
                    }
                },

                onHttpException: (response) => {
                    setIsSubmitting(false);

                    if (response.status === 413) {
                        const message = 'One or more uploaded files exceed the server request-size limit. Reduce the file sizes and try again.';
                        setConflictError(message);
                        toast.error(message);
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
                    <div className="flex items-center gap-3 rounded-xl border border-[#EEDFE6] bg-[#F8EAF0] px-4 py-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#EEDFE6]">
                            <span className="text-xs font-bold text-[#4E3A43]">
                                {(user?.name || 'U')
                                    .split(' ')
                                    .map((word) => word[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[#3F3037]">
                                {user?.name}
                            </p>
                            <p className="text-xs text-[#F8EAF0]0">
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
                                className="block w-full rounded-xl border border-gray-200 p-2.5 pl-10 text-sm focus:ring-2 focus:ring-[#B96D91]"
                            />
                        </div>

                        <input
                            type="email"
                            required
                            placeholder="Email address"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-[#B96D91]"
                        />

                        <input
                            type="tel"
                            required
                            placeholder="Phone number"
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-[#B96D91]"
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
                    className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-[#B96D91]"
                />

                <div className="grid grid-cols-2 gap-3">
                    <input
                        type="text"
                        required
                        placeholder="Department / Org"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-[#B96D91]"
                    />

                    <input
                        type="text"
                        required
                        placeholder="Designation"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-[#B96D91]"
                    />
                </div>

                <input
                    type="text"
                    placeholder="Facilitator (optional)"
                    value={facilitator}
                    onChange={(e) => setFacilitator(e.target.value)}
                    className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-[#B96D91]"
                />

                <textarea
                    required
                    rows={2}
                    placeholder="Purpose of the event…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="block w-full resize-none rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-[#B96D91]"
                />
            </div>

            {/* Schedule */}
            <div className="space-y-3 border-b border-gray-100 px-6 py-5">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        Schedule
                    </h4>

                    {bookingLeadTimeDays > 0 && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            {bookingLeadTimeDays}-day advance notice
                        </span>
                    )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-gray-600">Start date</span>
                        <input
                            type="date"
                            required
                            value={date}
                            min={minDate}
                            max={addDaysToLocalDate(Math.max(0, Number(page.props.systemSettings?.max_advance_days ?? 30)))}
                            disabled={!!selectedDate}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (blackoutDates?.some((blackout) => String(blackout.date).slice(0, 10) === value)) {
                                    setDate('');
                                    setConflictError('This date is blocked for maintenance.');
                                    return;
                                }
                                setDate(value);
                                if (!endDate || endDate < value) setEndDate(value);
                                setStartTime('');
                                setEndTime('');
                                setConflictError('');
                            }}
                            className={'block w-full rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-[#B96D91] ' + (isDateTooSoon ? 'border-red-300 bg-red-50' : 'border-gray-200') + (selectedDate ? ' cursor-not-allowed bg-gray-100' : '')}
                        />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-gray-600">End date</span>
                        <input
                            type="date"
                            required
                            value={endDate}
                            min={date || minDate}
                            max={date ? addDaysToLocalDate(Math.max(0, Number(page.props.systemSettings?.max_advance_days ?? 30))) : undefined}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setStartTime('');
                                setEndTime('');
                                setConflictError('');
                            }}
                            className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-[#B96D91]"
                        />
                    </label>
                </div>

                {isFacilityClosed && (
                    <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                        <p className="text-xs text-slate-700">
                            This facility is closed on at least one day in the selected range. Choose a different date range.
                        </p>
                    </div>
                )}

                {isDateTooSoon && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                        <p className="text-xs text-red-600">
                            This facility requires at least {bookingLeadTimeDays} days advance notice for all bookings.
                            Earliest available date: {earliestBookingDate}
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
                    <div className="flex items-start gap-2 rounded-xl border border-[#EEDFE6] bg-[#F8EAF0] px-3 py-2.5">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#F8EAF0]0" />
                        <p className="text-xs text-[#A94B75]">
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
                            className={`block w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-[#B96D91] ${
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
                                    disabled={isTimePast(time) || isStartTimeUnavailable(time)}
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
                            className="block w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-[#B96D91]"
                        >
                            <option value="">Select time</option>

                            {endTimeOptions.map((time) => (
                                <option
                                    key={time}
                                    value={time}
                                    disabled={isEndTimeUnavailable(time)}
                                >
                                    {formatTime(time)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <p className="text-xs text-gray-400">
                    {isFacilityClosed
                        ? 'No booking times are available for this facility on the selected day.'
                        : `Time slots are available every 15 minutes, from ${formatTime(OPENING_TIME)} until ${CLOSING_TIME === '00:00' ? '12:00 AM (midnight)' : formatTime(CLOSING_TIME)}. The closing time is an end-time option, not a new start slot.`}
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
                        className={`block w-full rounded-xl border p-2.5 text-sm focus:ring-2 focus:ring-[#B96D91] ${
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
                            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-[#263348] focus:ring-[#B96D91]"
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

            {(requiresActivityPlan || requiresSirReneSignature) && (
                <div className="space-y-3 border-b border-gray-100 px-6 py-5">
                    {requiresActivityPlan && (
                        <div className="relative rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 hover:bg-[#F8EAF0]/40">
                            <div className="flex items-center gap-3">
                                <Upload className="h-5 w-5 flex-shrink-0 text-gray-400" />
                                <div className="min-w-0">
                                    <p className="break-words text-sm font-semibold text-gray-700">
                                        {activityPlanFile?.name || 'Upload Activity Plan'}
                                        <span className="ml-1 text-red-600">*</span>
                                    </p>
                                    <p className="text-xs text-gray-400">Required for single bookings at this facility · PDF, DOC, or DOCX · up to 10MB</p>
                                </div>
                            </div>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                required
                                aria-label="Upload Activity Plan"
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                onChange={(e) => {
                                    const selected = e.target.files?.[0] || null;
                                    if (selected && selected.size > 10 * 1024 * 1024) {
                                        setActivityPlanFile(null);
                                        e.target.value = '';
                                        setConflictError('The Activity Plan file must not exceed 10MB.');
                                        toast.error('The Activity Plan file must not exceed 10MB.');
                                        return;
                                    }
                                    setActivityPlanFile(selected);
                                    setConflictError('');
                                }}
                            />
                        </div>
                    )}

                    {requiresSirReneSignature && (
                        <div className="relative rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 hover:bg-[#F8EAF0]/40">
                            <div className="flex items-center gap-3">
                                <Upload className="h-5 w-5 flex-shrink-0 text-gray-400" />
                                <div className="min-w-0">
                                    <p className="break-words text-sm font-semibold text-gray-700">
                                        {signatureFile?.name || "Upload Sir Rene's Signature File"}
                                        <span className="ml-1 text-red-600">*</span>
                                    </p>
                                    <p className="text-xs text-gray-400">Required for Sky Gym and Quadrangle or Field · PDF, DOC, DOCX, JPG, or PNG · up to 5MB</p>
                                </div>
                            </div>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                required
                                aria-label="Upload Sir Rene's signature file"
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                onChange={(e) => {
                                    const selected = e.target.files?.[0] || null;
                                    if (selected && selected.size > 5 * 1024 * 1024) {
                                        setSignatureFile(null);
                                        e.target.value = '';
                                        setConflictError("Sir Rene's signed document must not exceed 5MB.");
                                        toast.error("Sir Rene's signed document must not exceed 5MB.");
                                        return;
                                    }
                                    setSignatureFile(selected);
                                    setConflictError('');
                                }}
                            />
                        </div>
                    )}
                    <p className="text-xs text-gray-500">These documents are stored privately and can only be opened by you and authorized booking administrators.</p>
                </div>
            )}

            {/* Consent Letter Upload. Keep this available for weekend bookings as a safeguard
                when shared settings and server-side consent rules are temporarily out of sync. */}
            {(isConsentRequired || isWeekendBooking) && (
                <div className="space-y-3 border-b border-gray-100 px-6 py-5">
                    <div className="relative rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 hover:bg-[#F8EAF0]/40">
                        <div className="flex items-center gap-3">
                            <Upload className="h-5 w-5 text-gray-400" />

                            <div>
                                <p className="text-sm font-semibold text-gray-600">
                                    {file
                                        ? file.name
                                        : 'Click to attach Consent Form'}
                                    {isConsentRequired && <span className="ml-1 text-red-600">*</span>}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {isConsentRequired
                                        ? 'Required for this booking · PDF, DOC, or DOCX up to 5MB'
                                        : 'Optional for this booking · PDF, DOC, or DOCX up to 5MB'}
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
                        className="flex-1 rounded-xl bg-[#C65B8A] py-3 text-sm font-semibold text-white hover:bg-[#A94B75] disabled:bg-[#DFC5D1]"
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