import { useState, useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { X, Upload, AlertCircle, CheckCircle2, UserIcon, Calendar as CalendarIcon, AlertTriangle, Clock } from 'lucide-react';

const HOURS = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
];
const CLOSING_TIME = '20:00';
const MAX_CONSENT_FILE_SIZE = 5 * 1024 * 1024;
const CONSENT_FILE_SIZE_ERROR = 'File size exceeds the maximum limit of 5MB.';

const toMins = (t) => {
    if (!t) return 0;
    const [h, m] = String(t).split(':').map(Number);
    return h * 60 + (m || 0);
};

/**
 * Unified Booking Modal — rendered identically whether triggered from
 * CalendarDashboard, FacilityDetails, or any other page.
 */
export default function BookingModal({
    facility,
    selectedDate,           // pre-selected date string (YYYY-MM-DD)
    selectedStartTime,      // pre-selected start time string (HH:MM) — may be null
    existingBookings = [],  // existing bookings for this facility on this date
    blackoutDates = [],
    onClose,
    onSuccess,
}) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const isAuthenticated = !!user;

    // ── Form state ──────────────────────────────────────────────────────────
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

    // ── Consent & Lead-Time Rules ─────────────────────────────────────────
    const isWeekend = (d) => {
        if (!d) return false;
        const day = new Date(d).getDay();
        return day === 0 || day === 6;
    };
    const isWeekendBooking = isWeekend(date);
    const isAlwaysConsent = facility?.requirement === 'CONSENT_REQUIRED';
    const isConsentRequired = isAlwaysConsent || (facility?.requiresWeekendConsent && isWeekendBooking);

    const today = useMemo(() => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    }, []);

    const minDate = useMemo(() => {
        if (isAlwaysConsent) {
            const d = new Date();
            d.setDate(d.getDate() + 3);
            return d.toISOString().split('T')[0];
        }
        return today;
    }, [isAlwaysConsent, today]);

    const isDateTooSoon = isConsentRequired && date && date < (() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        return d.toISOString().split('T')[0];
    })();

    const isToday = date === today;
    const nowHour = new Date().getHours();
    const nowMin = new Date().getMinutes();
    const isTimePast = (h, m) => {
        if (!isToday) return false;
        return h < nowHour || (h === nowHour && m <= nowMin);
    };

    const capacity = facility?.capacity || 0;
    const isOverCapacity = !!(
        capacity && attendees !== '' && Number(attendees) > capacity
    );

    // ── Conflict check with 30-min buffer ──────────────────────────────────
    const checkConflict = () => {
        if (!startTime || !endTime) return false;
        return existingBookings.some((b) => {
            if (b.facility_id !== facility?.id || b.date !== date || b.status === 'declined' || b.status === 'cancelled') return false;
            const buf = 30;
            return (
                (toMins(startTime) >= toMins(b.start_time) - buf && toMins(startTime) < toMins(b.end_time) + buf) ||
                (toMins(endTime) > toMins(b.start_time) - buf && toMins(endTime) <= toMins(b.end_time) + buf) ||
                (toMins(startTime) <= toMins(b.start_time) - buf && toMins(endTime) >= toMins(b.end_time) + buf)
            );
        });
    };

    // ── End time options (dynamically computed from start time & hours) ────
    const endTimeOptions = useMemo(() => {
        if (!startTime) return [];
        const startMin = toMins(startTime);
        const all = [...HOURS, CLOSING_TIME];
        return all.filter((t) => toMins(t) > startMin);
    }, [startTime]);

    // ── Submit booking ─────────────────────────────────────────────────────
    const handleSubmit = (e) => {
        e.preventDefault();
        setConflictError('');

        const attendeeCount = Number(attendees);
        if (!Number.isInteger(attendeeCount) || attendeeCount < 1) {
            setConflictError('Attendees count must be a whole number of at least 1.');
            return;
        }
        if (capacity && attendeeCount > capacity) {
            setConflictError(`Capacity exceeded. Max ${capacity} people.`);
            return;
        }

        if (!isAuthenticated && (!guestEmail || !guestName)) {
            toast.error('Guest details are required.');
            return;
        }
        if (startTime >= endTime) {
            setConflictError('End time must be after start time.');
            return;
        }
        if (toMins(startTime) < toMins('08:00') || toMins(endTime) > toMins(CLOSING_TIME)) {
            setConflictError(`Bookings must be between 8:00 AM and ${CLOSING_TIME}.`);
            return;
        }
        if (isOverCapacity) {
            setConflictError(`Capacity exceeded. Max ${capacity} people.`);
            return;
        }
        if (blackoutDates?.some((bd) => bd.date === date)) {
            setConflictError('This date is blocked for maintenance.');
            return;
        }
        if (isDateTooSoon) {
            setConflictError('This facility requires a 3-day lead time for consent bookings.');
            return;
        }
        if (isConsentRequired && !file) {
            setConflictError('A consent letter upload is mandatory.');
            return;
        }
        if (file && file.size > MAX_CONSENT_FILE_SIZE) {
            setConflictError(CONSENT_FILE_SIZE_ERROR);
            toast.error(CONSENT_FILE_SIZE_ERROR);
            return;
        }
        if (checkConflict()) {
            setConflictError('Time slot overlaps with an existing booking (30-min buffer included).');
            return;
        }

        setIsSubmitting(true);

        let finalNotes = `Event: ${eventName} | Dept: ${department} | Desig: ${designation}\nPurpose: ${notes}`;
        if (facilitator.trim()) finalNotes += ` | Facilitator: ${facilitator.trim()}`;
        if (needsManpower) finalNotes += '\n[Requested TDEVS manpower]';

        router.post('/bookings', {
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
        }, {
            onSuccess: () => {
                setIsSubmitting(false);
                setSuccess(true);
                toast.success('Booking request submitted successfully!');
                if (onSuccess) {
                    setTimeout(() => { onSuccess(); onClose?.(); }, 1500);
                } else {
                    setTimeout(() => onClose?.(), 1800);
                }
            },
            onError: (errors) => {
                setIsSubmitting(false);
                const firstError = Object.values(errors)[0];
                const message = errors.consent_letter && /size|large|max/i.test(errors.consent_letter)
                    ? CONSENT_FILE_SIZE_ERROR
                    : firstError || 'An error occurred.';
                setConflictError(message);
                if (errors.consent_letter) toast.error(message);
            },
            onHttpException: (response) => {
                setIsSubmitting(false);
                if (response.status === 413) {
                    setConflictError(CONSENT_FILE_SIZE_ERROR);
                    toast.error(CONSENT_FILE_SIZE_ERROR);
                    return false;
                }
            },
        });
    };

    // ── Success view ───────────────────────────────────────────────────────
    if (success) {
        return (
            <div className="text-center py-10 px-4">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">Request Submitted</h3>
                <p className="text-sm text-gray-500">The facility admin has been notified.</p>
                <p className="text-xs text-gray-400 mt-2">Redirecting…</p>
            </div>
        );
    }

    // ── Main form ──────────────────────────────────────────────────────────
    return (
        <form onSubmit={handleSubmit} className="space-y-0">
            {/* ── Applicant Information ─────────────────────────── */}
            <div className="px-6 py-5 border-b border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Applicant Information</h4>
                {isAuthenticated ? (
                    <div className="bg-indigo-50 rounded-xl px-4 py-3 border border-indigo-100 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-indigo-800">
                                {user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-indigo-900">{user.name}</p>
                            <p className="text-xs text-indigo-500">{user.email}</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <UserIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <input type="text" required placeholder="Full Name" value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                className="pl-10 block w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-400" />
                        </div>
                        <input type="email" required placeholder="Email address" value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            className="block w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-400" />
                        <input type="tel" required placeholder="Phone number" value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            className="block w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-400" />
                    </div>
                )}
            </div>

            {/* ── Event Details ─────────────────────────────────── */}
            <div className="px-6 py-5 border-b border-gray-100 space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Event Details</h4>
                <input type="text" required placeholder="Event name / title" value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="block w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-400" />
                <div className="grid grid-cols-2 gap-3">
                    <input type="text" required placeholder="Department / Org" value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="block w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-400" />
                    <input type="text" required placeholder="Designation" value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        className="block w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-400" />
                </div>
                <input type="text" placeholder="Facilitator (optional)" value={facilitator}
                    onChange={(e) => setFacilitator(e.target.value)}
                    className="block w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-400" />
                <textarea required rows={2} placeholder="Purpose of the event…" value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="block w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-400 resize-none" />
            </div>

            {/* ── Schedule ──────────────────────────────────────── */}
            <div className="px-6 py-5 border-b border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Schedule</h4>
                    {isConsentRequired && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            3-day lead time required
                        </span>
                    )}
                </div>

                {/* Date */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="date"
                        required
                        value={date}
                        min={minDate}
                        disabled={!!selectedDate}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (blackoutDates?.some((bd) => bd.date === val)) {
                                setDate('');
                                setConflictError('This date is blocked for maintenance.');
                                return;
                            }
                            setDate(val);
                            setStartTime('');
                            setEndTime('');
                            setConflictError('');
                        }}
                        className={`pl-10 block w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-400 ${isDateTooSoon ? 'border-red-300 bg-red-50' : 'border-gray-200'} ${selectedDate ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                </div>

                {isDateTooSoon && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600">
                            Consent-required bookings need 3 days advance notice. Earliest: {minDate}
                        </p>
                    </div>
                )}

                {isWeekendBooking && !isAlwaysConsent && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">
                            <strong>Weekend booking.</strong> A signed consent letter is now required.
                        </p>
                    </div>
                )}

                {/* Time selects */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
                        <select
                            required
                            value={startTime}
                            disabled={!!selectedStartTime}
                            onChange={(e) => {
                                setStartTime(e.target.value);
                                setEndTime('');
                                setConflictError('');
                            }}
                            className={`block w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-400 ${selectedStartTime ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        >
                            <option value="">Select time</option>
                            {HOURS.map((time) => {
                                const [h, m] = time.split(':').map(Number);
                                const past = isTimePast(h, m);
                                return (
                                    <option key={time} value={time} disabled={past}>
                                        {`${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">End Time</label>
                        <select
                            required
                            value={endTime}
                            onChange={(e) => {
                                setEndTime(e.target.value);
                                setConflictError('');
                            }}
                            className="block w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-400"
                        >
                            <option value="">Select time</option>
                            {endTimeOptions.map((time) => (
                                <option key={time} value={time}>
                                    {(() => {
                                        const [h, m] = time.split(':').map(Number);
                                        return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                                    })()}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Attendees */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Attendees Count</label>
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
                        className={`block w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-400 ${isOverCapacity ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                    />
                    {isOverCapacity && (
                        <p className="mt-1 text-xs text-red-600">Exceeds limits of {capacity} seats.</p>
                    )}
                </div>

                {/* Manpower checkbox */}
                {facility?.allowTdevsManpower && (
                    <label className="flex items-start gap-3 bg-amber-50 rounded-xl px-4 py-3 border border-amber-200 cursor-pointer">
                        <input type="checkbox" checked={needsManpower}
                            onChange={(e) => setNeedsManpower(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800">Request TDEVS Manpower</p>
                            <p className="text-xs text-amber-700 mt-1">Opting for Manpower incurs a ₱100 service charge.</p>
                        </div>
                    </label>
                )}
            </div>

            {/* ── Consent Letter Upload ──────────────────────────── */}
            {isConsentRequired && (
                <div className="px-6 py-5 border-b border-gray-100 space-y-3">
                    <div className="relative border-2 border-dashed rounded-xl p-4 bg-gray-50 hover:bg-indigo-50/40 border-gray-200">
                        <div className="flex items-center gap-3">
                            <Upload className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-semibold text-gray-600">
                                    {file ? file.name : 'Click to attach Consent Form'}
                                </p>
                                <p className="text-xs text-gray-400">PDF, DOC up to 5MB</p>
                            </div>
                        </div>
                        <input type="file" accept=".pdf,.doc,.docx"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                                const selectedFile = e.target.files?.[0] || null;
                                if (selectedFile && selectedFile.size > MAX_CONSENT_FILE_SIZE) {
                                    setFile(null);
                                    e.target.value = '';
                                    setConflictError(CONSENT_FILE_SIZE_ERROR);
                                    toast.error(CONSENT_FILE_SIZE_ERROR);
                                    return;
                                }
                                setFile(selectedFile);
                                setConflictError('');
                            }} />
                    </div>
                </div>
            )}

            {/* ── Actions ────────────────────────────────────────── */}
            <div className="px-6 py-5 space-y-3">
                {conflictError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                        {conflictError}
                    </div>
                )}
                <div className="flex gap-2">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold">
                        Cancel
                    </button>
                    <button type="submit"
                        disabled={isSubmitting || isOverCapacity || !!isDateTooSoon}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:bg-indigo-300">
                        {isSubmitting ? 'Submitting…' : 'Submit Booking Request'}
                    </button>
                </div>
            </div>
        </form>
    );
}