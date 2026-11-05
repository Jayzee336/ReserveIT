import { useEffect, useRef, useState } from 'react';
import { X as XIcon } from 'lucide-react';
import BookingModal from '@/Components/BookingModal';

const HOURS = Array.from({ length: 14 }, (_, index) => `${String(index + 8).padStart(2, '0')}:00`);
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
const statusClass = (status) => status === 'approved' ? 'from-emerald-500 to-emerald-600' : 'from-amber-400 to-amber-500';

export function CalendarView({ serverFacilities = [], serverBookings = [], selectedDate, availabilityOnly = false }) {
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
                {availabilityOnly && <span className="font-medium text-indigo-700">All-facilities view is read-only; switch to My Assigned Facilities to manage or create bookings.</span>}
                <span className="text-slate-500">Schedule shown from 8:00 AM to 10:00 PM</span>
            </div>
            <div className="w-full overflow-x-auto whitespace-nowrap rounded-2xl border border-[var(--ri-border)]">
                <table className="min-w-[1580px] w-full table-fixed border-collapse">
                    <thead className="bg-[var(--ri-surface-subtle)]">
                        <tr>
                            <th className="sticky left-0 z-20 w-64 border-b border-r bg-[#fbf5ef] p-3 text-left text-sm font-semibold text-slate-700">Facility</th>
                            {HOURS.map((hour) => (
                                <th key={hour} className="w-[94px] border-b border-r p-3 text-center text-xs font-semibold text-slate-600">
                                    {formatTime(hour)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {serverFacilities.map((facility) => {
                            const bookings = serverBookings
                                .filter((booking) => booking.facility_id === facility.id)
                                .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
                            const cells = [];

                            HOURS.forEach((slot) => {
                                const slotStart = toMinutes(slot);
                                const slotEnd = slotStart + 60;
                                const overlappingBookings = bookings.filter((booking) => (
                                    toMinutes(booking.start_time) < slotEnd &&
                                    toMinutes(booking.end_time) > slotStart
                                ));
                                const startingBookings = overlappingBookings.filter((booking) => (
                                    toMinutes(booking.start_time) >= slotStart &&
                                    toMinutes(booking.start_time) < slotEnd
                                ));
                                const continuingBookings = overlappingBookings.filter((booking) => (
                                    toMinutes(booking.start_time) < slotStart
                                ));

                                if (overlappingBookings.length) {
                                    cells.push(
                                        <td key={slot} className="border-b border-r p-1.5 align-top">
                                            <div className="space-y-1.5">
                                                {startingBookings.map((booking) => (
                                                    <button
                                                        key={booking.id}
                                                        type="button"
                                                        onClick={() => setDetails({ facility, bookings: [booking] })}
                                                        className={`min-h-[64px] w-full rounded-xl bg-gradient-to-r ${statusClass(booking.status)} px-2 py-2 text-left text-white shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
                                                    >
                                                        <span className="block text-[10px] font-bold uppercase leading-4">{booking.status === 'approved' ? 'Confirmed' : 'Pending hold'}</span>
                                                        <span className="mt-1 block whitespace-normal text-[10px] font-semibold leading-4">{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</span>
                                                    </button>
                                                ))}
                                                {continuingBookings.map((booking) => (
                                                    <button
                                                        key={`continuation-${booking.id}`}
                                                        type="button"
                                                        onClick={() => setDetails({ facility, bookings: [booking] })}
                                                        className={`w-full rounded-lg border border-dashed px-2.5 py-2 text-left text-[10px] font-semibold leading-4 ${booking.status === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}
                                                    >
                                                        Booked
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                    );
                                } else {
                                    cells.push(
                                        <td key={slot} className="border-b border-r p-1.5">
                                            {availabilityOnly ? (
                                                <div
                                                    aria-label={`Available at ${formatTime(slot)}; booking is managed from assigned facilities view`}
                                                    title="Available · switch to My Assigned Facilities to create a booking"
                                                    className="flex min-h-[64px] w-full items-center justify-center rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 text-xs font-medium text-emerald-700"
                                                >
                                                    Available
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    aria-label={`Create a booking for ${facility.name} at ${formatTime(slot)}`}
                                                    title={`Book ${facility.name} at ${formatTime(slot)}`}
                                                    onClick={() => setCreate({ facility, startTime: slot })}
                                                    className="flex min-h-[64px] w-full items-center justify-center rounded-xl border border-dashed border-[var(--ri-border-strong)] text-lg text-slate-400 transition hover:border-[var(--ri-brand)] hover:bg-[var(--ri-brand-soft)] hover:text-[var(--ri-brand)]"
                                                >
                                                    +
                                                </button>
                                            )}
                                        </td>
                                    );
                                }
                            });
                            return (
                                <tr key={facility.id}>
                                    <th className="sticky left-0 z-10 border-b border-r bg-white p-3 text-left align-top whitespace-normal">
                                        <p className="text-sm font-semibold text-slate-800">{facility.name}</p>
                                        <p className="mt-1 text-xs font-normal text-slate-500">{facility.location}</p>
                                    </th>
                                    {cells}
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