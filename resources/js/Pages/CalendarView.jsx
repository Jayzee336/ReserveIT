import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { X as XIcon } from 'lucide-react';
import BookingModal from '@/Components/BookingModal';


const formatTime = (value) => {
    if (!value) return '—';
    const [hourText, minuteText] = String(value).slice(0, 5).split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return String(value);
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
};
const statusLabel = (status) => status === 'pending'
    ? 'Pending approval · temporarily held'
    : status === 'approved'
      ? 'Approved · confirmed'
      : String(status || 'Unknown');
const toMinutes = (time) => { const [hour, minute] = String(time).split(':').map(Number); return hour * 60 + (minute || 0); };
const toEndMinutes = (time) => String(time).slice(0, 5) === '00:00' ? 1440 : toMinutes(time);
const statusClass = (status) => status === 'approved' ? 'from-emerald-500 to-emerald-600' : 'from-amber-400 to-amber-500';

// Find the earliest valid start time inside an hourly cell after applying the
// same cleanup buffer enforced by BookingController and BookingModal.
const findAvailableStartInHour = (slotStart, slotEnd, bookings, bufferMinutes) => {
    let candidate = slotStart;

    if (bufferMinutes <= 0) {
        return { availableStart: candidate, blockedUntil: null };
    }

    // A short loop handles overlapping cleanup buffers from adjacent bookings.
    for (let attempt = 0; attempt <= bookings.length; attempt += 1) {
        const blockingEnds = bookings
            .filter((booking) => ['pending', 'approved'].includes(String(booking.status ?? '').toLowerCase()))
            .map((booking) => ({
                start: toMinutes(booking.start_time) - bufferMinutes,
                end: toEndMinutes(booking.end_time) + bufferMinutes,
            }))
            .filter((interval) => candidate >= interval.start && candidate < interval.end)
            .map((interval) => interval.end);

        if (blockingEnds.length === 0) {
            break;
        }

        candidate = Math.max(...blockingEnds);
    }

    if (candidate >= slotEnd) {
        return { availableStart: null, blockedUntil: candidate };
    }

    return {
        availableStart: candidate,
        blockedUntil: candidate > slotStart ? candidate : null,
    };
};

export function CalendarView({ serverFacilities = [], serverBookings = [], selectedDate, availabilityOnly = false }) {
    const { systemSettings = {} } = usePage().props;
    const openingTime = String(systemSettings.opening_time ?? '08:00').slice(0, 5);
    const closingTime = String(systemSettings.closing_time ?? '00:00').slice(0, 5);
    const configuredCleanupBuffer = Number(systemSettings.cleanup_buffer_minutes ?? 30);
    const cleanupBufferMinutes = Number.isFinite(configuredCleanupBuffer)
        ? Math.max(0, configuredCleanupBuffer)
        : 30;
    const openingMinutes = toMinutes(openingTime);
    const closingMinutes = closingTime === '00:00' ? 1440 : toMinutes(closingTime);
    const SLOT_INTERVAL_MINUTES = 15;
    const timeSlots = [];

    for (
        let minutes = openingMinutes;
        minutes < closingMinutes;
        minutes += SLOT_INTERVAL_MINUTES
    ) {
        timeSlots.push({
            key: String(minutes),
            start: minutes,
            end: Math.min(minutes + SLOT_INTERVAL_MINUTES, closingMinutes),
        });
    }

    // Group the quarter-hour columns beneath readable hourly headings.
    const hourGroups = [];
    timeSlots.forEach((slot) => {
        const hourStart = Math.floor(slot.start / 60) * 60;
        const lastGroup = hourGroups[hourGroups.length - 1];

        if (lastGroup && lastGroup.hourStart === hourStart) {
            lastGroup.colSpan += 1;
        } else {
            hourGroups.push({ hourStart, colSpan: 1 });
        }
    });

    const formatMinutes = (minutes) => {
        const normalized = ((minutes % 1440) + 1440) % 1440;
        const hour = Math.floor(normalized / 60);
        const minute = normalized % 60;
        return formatTime(
            `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        );
    };

    // The closing boundary is an end-time marker, not a selectable slot.
    const closingBoundaryLabel = formatMinutes(closingMinutes);
    const [details, setDetails] = useState(null);
    const [create, setCreate] = useState(null);
    const detailsDialogRef = useRef(null);
    const createDialogRef = useRef(null);

    useEffect(() => {
        const activeDialog = details
            ? detailsDialogRef.current
            : create
              ? createDialogRef.current
              : null;

        if (!activeDialog) return undefined;

        const previousFocus = document.activeElement;
        const firstFocusable = activeDialog.querySelector(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        firstFocusable?.focus();

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setDetails(null);
                setCreate(null);
                return;
            }

            if (event.key !== 'Tab') return;

            const focusable = Array.from(
                activeDialog.querySelectorAll(
                    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            );

            if (focusable.length === 0) {
                event.preventDefault();
                activeDialog.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);

            if (previousFocus instanceof HTMLElement) {
                previousFocus.focus();
            }
        };
    }, [details, create]);

    return (
        <>
            <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
                <span><strong className="text-amber-700">Pending:</strong> temporarily held slot</span>
                <span><strong className="text-emerald-700">Booked:</strong> confirmed reservation</span>
                {availabilityOnly && <span className="font-medium text-indigo-700">You can check availability and request bookings for any facility here. Existing reservation details remain private.</span>}
                <span className="text-slate-500">Schedule shown from {formatTime(openingTime)} to {closingTime === '00:00' ? '12:00 AM (midnight)' : formatTime(closingTime)}</span>
            </div>
            <div className="w-full overflow-x-auto overflow-y-hidden rounded-2xl border border-[var(--ri-border)]">
                <table className="min-w-[2820px] w-full table-fixed border-collapse">
                    <colgroup>
                        <col style={{ width: '190px' }} />
                        {timeSlots.map((slot) => (
                            <col key={slot.key} style={{ width: '40px' }} />
                        ))}
                        <col style={{ width: '64px' }} />
                    </colgroup>
                    <thead className="bg-[var(--ri-surface-subtle)]">
                        <tr>
                            <th
                                rowSpan={2}
                                className="sticky left-0 z-30 w-[190px] min-w-[190px] border-b border-r bg-[#fbf5ef] px-2 py-2 text-left text-xs font-semibold text-slate-700"
                            >
                                Facility
                            </th>
                            {hourGroups.map((group) => (
                                <th
                                    key={group.hourStart}
                                    colSpan={group.colSpan}
                                    className="border-b border-r border-slate-200 bg-slate-100 px-1 py-2 text-center text-[10px] font-bold text-slate-700"
                                >
                                    {formatMinutes(group.hourStart).replace(':00', '')}
                                </th>
                            ))}
                            <th
                                rowSpan={2}
                                title={`Closing boundary: ${closingBoundaryLabel} — end time only`}
                                className="w-[64px] min-w-[64px] border-b border-l-2 border-l-indigo-200 bg-indigo-50/70 px-1 py-2 text-center text-[9px] font-bold leading-tight text-indigo-700"
                            >
                                <span className="block">End</span>
                                <span className="mt-1 block text-[8px] font-medium">{closingBoundaryLabel}</span>
                            </th>
                        </tr>
                        <tr>
                            {timeSlots.map((slot) => (
                                <th
                                    key={slot.key}
                                    title={formatMinutes(slot.start)}
                                    className="h-7 w-[40px] min-w-[40px] border-b border-r border-slate-200 bg-white px-0 py-1 text-center text-[8px] font-semibold tabular-nums text-slate-500"
                                >
                                    {String(slot.start % 60).padStart(2, '0')}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {serverFacilities.map((facility) => {
                            const bookings = serverBookings
                                .filter((booking) => (
                                    String(booking.facility_id) === String(facility.id) &&
                                    ['pending', 'approved'].includes(String(booking.status ?? '').toLowerCase())
                                ))
                                .map((booking) => ({
                                    booking,
                                    start: Math.max(openingMinutes, toMinutes(booking.start_time)),
                                    end: Math.min(closingMinutes, toEndMinutes(booking.end_time)),
                                }))
                                .filter((range) => range.end > range.start)
                                .sort((a, b) => a.start - b.start);

                            const activeBookingsAt = (slot) => bookings.filter((range) => (
                                range.start < slot.end && range.end > slot.start
                            ));

                            // The server blocks a new start until the previous booking's
                            // cleanup buffer expires. Mirror that rule in the visible grid.
                            const cleanupBookingsAt = (slot) => cleanupBufferMinutes > 0
                                ? bookings.filter((range) => (
                                    range.end <= slot.start &&
                                    slot.start < range.end + cleanupBufferMinutes
                                ))
                                : [];

                            const rangeSignature = (ranges) => ranges
                                .map((range) => String(range.booking.id))
                                .sort()
                                .join('|');

                            const cells = [];
                            let slotIndex = 0;

                            while (slotIndex < timeSlots.length) {
                                const slot = timeSlots[slotIndex];
                                const activeBookings = activeBookingsAt(slot);

                                if (activeBookings.length > 0) {
                                    const signature = rangeSignature(activeBookings);
                                    let span = 1;

                                    while (slotIndex + span < timeSlots.length) {
                                        const nextActive = activeBookingsAt(timeSlots[slotIndex + span]);
                                        if (rangeSignature(nextActive) !== signature) break;
                                        span += 1;
                                    }

                                    const spanEnd = timeSlots[slotIndex + span - 1].end;

                                    cells.push(
                                        <td
                                            key={`booking-${slot.key}`}
                                            colSpan={span}
                                            className="border-b border-r border-slate-200 p-0.5 align-middle"
                                        >
                                            <div className="flex min-h-[52px] flex-col justify-center gap-1">
                                                {activeBookings.map((range) => {
                                                    const booking = range.booking;
                                                    const visibleStart = Math.max(range.start, slot.start);
                                                    const visibleEnd = Math.min(range.end, spanEnd);
                                                    const visibleIntervals = Math.max(
                                                        1,
                                                        Math.ceil((visibleEnd - visibleStart) / SLOT_INTERVAL_MINUTES)
                                                    );
                                                    const isApproved = booking.status === 'approved';
                                                    const shortLabel = isApproved ? 'APP' : 'PEND';
                                                    const fullLabel = isApproved ? 'CONFIRMED' : 'PENDING';

                                                    return (
                                                        <button
                                                            key={booking.id}
                                                            type="button"
                                                            aria-label={`${fullLabel} booking for ${facility.name}, ${formatTime(booking.start_time)} to ${formatTime(booking.end_time)}`}
                                                            title={`${fullLabel} · ${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`}
                                                            onClick={() => setDetails({ facility, bookings: [booking] })}
                                                            className={`flex min-h-[46px] w-full flex-col justify-center overflow-hidden rounded-lg bg-gradient-to-r ${statusClass(booking.status)} px-2 py-1 text-left text-white shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
                                                        >
                                                            <span className="block truncate text-[9px] font-extrabold uppercase leading-3 tracking-wide">
                                                                {visibleIntervals === 1 ? shortLabel : fullLabel}
                                                            </span>
                                                            {visibleIntervals >= 3 && (
                                                                <span className="mt-0.5 block truncate text-[9px] font-semibold leading-3 tabular-nums">
                                                                    {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    );

                                    slotIndex += span;
                                    continue;
                                }

                                const cleanupBookings = cleanupBookingsAt(slot);

                                if (cleanupBookings.length > 0) {
                                    const signature = rangeSignature(cleanupBookings);
                                    let span = 1;

                                    while (slotIndex + span < timeSlots.length) {
                                        const nextCleanup = cleanupBookingsAt(timeSlots[slotIndex + span]);
                                        if (rangeSignature(nextCleanup) !== signature) break;
                                        span += 1;
                                    }

                                    const blockedUntil = Math.max(
                                        ...cleanupBookings.map((range) => range.end + cleanupBufferMinutes)
                                    );

                                    cells.push(
                                        <td
                                            key={`buffer-${slot.key}`}
                                            colSpan={span}
                                            className="border-b border-r border-slate-200 p-0.5 align-middle"
                                        >
                                            <div
                                                title={`Cleanup buffer after reservation until ${formatMinutes(blockedUntil)}`}
                                                aria-label={`Cleanup buffer until ${formatMinutes(blockedUntil)}`}
                                                className="flex min-h-[46px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-100 px-1 py-1 text-center text-slate-600"
                                            >
                                                <span className="truncate text-[8px] font-bold uppercase tracking-wide">
                                                    {span >= 3 ? 'Cleanup buffer' : 'Buffer'}
                                                </span>
                                                {span >= 2 && (
                                                    <span className="truncate text-[8px] tabular-nums">
                                                        Until {formatMinutes(blockedUntil)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    );

                                    slotIndex += span;
                                    continue;
                                }

                                const startTime = `${String(Math.floor(slot.start / 60) % 24).padStart(2, '0')}:${String(slot.start % 60).padStart(2, '0')}`;

                                cells.push(
                                    <td
                                        key={`available-${slot.key}`}
                                        className="border-b border-r border-slate-100 p-0.5"
                                    >
                                        <button
                                            type="button"
                                            aria-label={`Create a booking for ${facility.name} at ${formatMinutes(slot.start)}`}
                                            title={`Book ${facility.name} at ${formatMinutes(slot.start)}`}
                                            onClick={() => setCreate({ facility, startTime })}
                                            className="flex min-h-[46px] w-full items-center justify-center rounded-md border border-dashed border-[var(--ri-border-strong)] text-[11px] font-medium text-slate-400 transition hover:border-[var(--ri-brand)] hover:bg-[var(--ri-brand-soft)] hover:text-[var(--ri-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                        >
                                            +
                                        </button>
                                    </td>
                                );

                                slotIndex += 1;
                            }

                            return (
                                <tr key={facility.id}>
                                    <th className="sticky left-0 z-20 border-b border-r border-slate-200 bg-white px-2 py-2 text-left align-top whitespace-normal">
                                        <p className="text-xs font-semibold leading-tight text-slate-800">{facility.name}</p>
                                        <p className="mt-1 text-[10px] font-normal leading-tight text-slate-500">{facility.location}</p>
                                    </th>
                                    {cells}
                                    <td
                                        aria-label={`Closing boundary at ${closingBoundaryLabel}`}
                                        className="border-b border-l-2 border-l-indigo-100 bg-indigo-50/30 p-0.5"
                                    />
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {details && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
                    <div
                        ref={detailsDialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="booking-details-title"
                        tabIndex={-1}
                        className="w-full max-w-xl rounded-3xl border border-[var(--ri-border)] bg-white p-6 shadow-[var(--ri-shadow-lg)]"
                    >
                        <div className="flex justify-between">
                            <div>
                                <p className="ri-page-eyebrow">Reservation information</p>
                                <h3 id="booking-details-title" className="mt-1 text-xl font-bold tracking-tight text-slate-900">{details.facility.name}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetails(null)}
                                aria-label="Close booking details"
                                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-[var(--ri-brand-soft)] hover:text-[var(--ri-brand-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ri-brand)]"
                            >
                                Close
                            </button>
                        </div>
                        <div className="mt-5 space-y-3">
                            {details.bookings.map((booking) => (
                                <article key={booking.id} className="rounded-xl border border-[var(--ri-border)] p-4">
                                    {availabilityOnly ? (
                                        <>
                                            <p className="font-bold text-slate-900">
                                                {booking.status === 'pending' ? 'Temporarily held' : 'Unavailable · confirmed booking'}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-600">
                                                {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                                            </p>
                                            <p className="mt-2 text-xs text-slate-500">
                                                Reservation details are hidden in All Facilities view. Switch to My Assigned Facilities to manage reservations for facilities assigned to you.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                    <p className="font-bold">{booking.user?.name ?? booking.guest_name ?? 'Guest'}</p>
                                    <p className="text-sm text-slate-600">{statusLabel(booking.status)} · {formatTime(booking.start_time)}–{formatTime(booking.end_time)}</p>
                                    {booking.approved_by && (
                                        <p className="mt-1 text-xs text-emerald-700">
                                            Approved by {booking.approved_by}{booking.approved_at ? ` · ${new Date(booking.approved_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                                        </p>
                                    )}
                                    {booking.status === 'pending' && (
                                        <p className="mt-1 text-xs text-amber-700">This time slot is temporarily held and is not yet a confirmed reservation.</p>
                                    )}
                                    <p className="mt-1 text-sm">Contact: {booking.user?.email ?? booking.guest_email ?? 'Not supplied'}</p>
                                    <p className="mt-1 text-sm">Purpose: {booking.notes || 'Not supplied'}</p>
                                        </>
                                    )}
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {create && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        aria-label="Close booking form"
                        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm"
                        onClick={() => setCreate(null)}
                    />
                    <div
                        ref={createDialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="booking-create-title"
                        tabIndex={-1}
                        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--ri-border)] bg-white shadow-[var(--ri-shadow-lg)]"
                    >
                        <div className="flex items-center justify-between border-b border-[var(--ri-border)] bg-[var(--ri-surface-subtle)] px-6 py-4">
                            <div>
                                <p className="ri-page-eyebrow">New reservation</p>
                                <h2 id="booking-create-title" className="mt-1 font-bold text-slate-900">Book {create.facility.name}</h2>
                            </div>
                            <button type="button" aria-label="Close booking form" onClick={() => setCreate(null)} className="rounded-lg p-2 text-slate-400 transition hover:bg-[var(--ri-brand-soft)] hover:text-[var(--ri-brand-strong)]">
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            <BookingModal facility={create.facility} selectedDate={selectedDate} selectedStartTime={create.startTime} existingBookings={serverBookings.filter(b => b.facility_id === create.facility.id)} onClose={() => setCreate(null)} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}