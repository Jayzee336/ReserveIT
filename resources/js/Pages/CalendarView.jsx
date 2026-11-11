import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Plus,
} from 'lucide-react';
import BookingModal from '@/Components/BookingModal';

const parseLocalDate = (value) => {
    const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return new Date();
    return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const dateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatTime = (value) => {
    if (!value) return '—';
    const [hourText, minuteText] = String(value).slice(0, 5).split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
        return String(value);
    }

    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const formatLongDate = (value) => parseLocalDate(value).toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
});

const statusStyles = {
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
};

export function CalendarView({
    serverFacilities = [],
    serverBookings = [],
    selectedDate,
    availabilityOnly = false,
    onDateChange,
    scheduleView = 'all',
}) {
    const [create, setCreate] = useState(null);
    const [facilityPickerOpen, setFacilityPickerOpen] = useState(false);
    const [viewingBooking, setViewingBooking] = useState(null);
    const selected = parseLocalDate(selectedDate);
    const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1, 12);
    const monthEnd = new Date(selected.getFullYear(), selected.getMonth() + 1, 0, 12);
    const monthLabel = monthStart.toLocaleDateString('en-PH', {
        month: 'long',
        year: 'numeric',
    });

    const facilityById = useMemo(
        () => new Map(serverFacilities.map((facility) => [String(facility.id), facility])),
        [serverFacilities]
    );

    const closuresByDate = useMemo(() => {
        const grouped = new Map();

        serverFacilities.forEach((facility) => {
            (facility.unavailability_periods ?? []).forEach((period) => {
                if (
                    period.ended_at
                    || !period.scheduled_start_at
                    || !period.scheduled_end_at
                ) {
                    return;
                }

                const start = new Date(period.scheduled_start_at);
                const end = new Date(period.scheduled_end_at);
                if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
                    return;
                }

                const lastOccupiedInstant = new Date(end.getTime() - 1);
                const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12);
                const lastDate = new Date(
                    lastOccupiedInstant.getFullYear(),
                    lastOccupiedInstant.getMonth(),
                    lastOccupiedInstant.getDate(),
                    12
                );
                let scanned = 0;

                while (cursor <= lastDate && scanned <= 370) {
                    if (cursor >= monthStart && cursor <= monthEnd) {
                        const key = dateKey(cursor);
                        if (!grouped.has(key)) grouped.set(key, []);
                        grouped.get(key).push({
                            ...period,
                            facility_name: facility.name,
                        });
                    }

                    cursor.setDate(cursor.getDate() + 1);
                    scanned += 1;
                }
            });
        });

        return grouped;
    }, [serverFacilities, monthStart, monthEnd]);

    const bookingsByDate = useMemo(() => {
        const grouped = new Map();

        serverBookings.forEach((booking) => {
            const bookingStartDate = String(booking.date || booking.booking_date || '').slice(0, 10);
            const bookingEndDate = String(booking.end_date || bookingStartDate).slice(0, 10);

            if (
                !bookingStartDate
                || !bookingEndDate
                || !['pending', 'approved'].includes(String(booking.status || '').toLowerCase())
            ) {
                return;
            }

            const cursor = parseLocalDate(bookingStartDate);
            const lastDate = parseLocalDate(bookingEndDate);

            // Render a multi-day reservation on every affected day in the
            // currently selected month, including ranges that began earlier.
            while (cursor <= lastDate) {
                const key = dateKey(cursor);

                if (cursor >= monthStart && cursor <= monthEnd) {
                    if (!grouped.has(key)) grouped.set(key, []);
                    grouped.get(key).push(booking);
                }

                cursor.setDate(cursor.getDate() + 1);
            }
        });

        grouped.forEach((items) => items.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))));
        return grouped;
    }, [serverBookings, monthStart, monthEnd]);

    const calendarDays = useMemo(() => {
        const firstWeekday = monthStart.getDay();
        const totalDays = monthEnd.getDate();
        const cellCount = Math.ceil((firstWeekday + totalDays) / 7) * 7;

        return Array.from({ length: cellCount }, (_, index) => {
            const dayNumber = index - firstWeekday + 1;

            if (dayNumber < 1 || dayNumber > totalDays) return null;

            const date = new Date(selected.getFullYear(), selected.getMonth(), dayNumber, 12);
            const key = dateKey(date);

            return {
                key,
                dayNumber,
                bookings: bookingsByDate.get(key) || [],
                closures: closuresByDate.get(key) || [],
                isToday: key === dateKey(new Date()),
                isSelected: key === selectedDate,
            };
        });
    }, [bookingsByDate, closuresByDate, monthEnd, monthStart, selected, selectedDate]);

    const dailyBookings = bookingsByDate.get(selectedDate) || [];
    const dailyClosures = closuresByDate.get(selectedDate) || [];
    const formatClosureTime = (value) => {
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? '—'
            : date.toLocaleString('en-PH', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            });
    };

    const changeMonth = (offset) => {
        const nextMonth = new Date(selected.getFullYear(), selected.getMonth() + offset, 1, 12);
        onDateChange?.(dateKey(nextMonth));
    };

    const selectDate = (value) => onDateChange?.(value);

    const visibleDailyBookings = dailyBookings.map((booking) => ({
        ...booking,
        facility: facilityById.get(String(booking.facility_id)),
    }));

    return (
        <>
            <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)]">
                <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 sm:px-5">
                        <div className="flex min-w-0 items-center gap-2">
                            <CalendarDays className="h-5 w-5 shrink-0 text-[#493344]" />
                            <h2 className="truncate text-base font-bold text-slate-800">{monthLabel}</h2>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => changeMonth(-1)}
                                aria-label="Previous month"
                                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C65B8A]"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <label className="sr-only" htmlFor="calendar-panel-date">Choose schedule date</label>
                            <input
                                id="calendar-panel-date"
                                type="date"
                                value={selectedDate}
                                onChange={(event) => selectDate(event.target.value)}
                                className="w-[145px] rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-700 focus:border-[#647D91] focus:outline-none focus:ring-2 focus:ring-[#E8E1E7]"
                            />
                            <button
                                type="button"
                                onClick={() => changeMonth(1)}
                                aria-label="Next month"
                                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C65B8A]"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:py-3 sm:text-xs">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7">
                        {calendarDays.map((day, index) => {
                            if (!day) {
                                return <div key={`empty-${index}`} aria-hidden="true" className="min-h-[70px] border-b border-r border-slate-100 bg-slate-50/60 sm:min-h-[112px]" />;
                            }

                            return (
                                <div key={day.key} className={`ri-calendar-cell group relative min-w-0 min-h-[70px] border-b border-r border-slate-100 p-1 sm:min-h-[112px] sm:p-2 ${day.isSelected ? 'bg-[#F8EDF2]' : 'bg-white'}`}>
                                    <button type="button" onClick={() => selectDate(day.key)} aria-pressed={day.isSelected} aria-label={`Select ${formatLongDate(day.key)}`} className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C65B8A]" />
                                    <div className="pointer-events-none relative z-10 flex items-center justify-between gap-1">
                                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold sm:h-7 sm:w-7 sm:text-xs ${day.isSelected ? 'bg-[#493344] text-white' : day.isToday ? 'border border-[#C65B8A] text-[#493344]' : 'text-slate-700'}`}>{day.dayNumber}</span>
                                        {(day.bookings.length > 0 || day.closures.length > 0) && <span className="flex items-center gap-1">{day.bookings.length > 0 && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 sm:text-[10px]">{day.bookings.length}</span>}{day.closures.length > 0 && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-800 sm:text-[9px]">C</span>}</span>}
                                    </div>
                                    <div className="relative z-10 mt-1 space-y-1">
                                        {day.closures.length > 0 && <span className="pointer-events-none block truncate rounded bg-amber-100 px-1 py-0.5 text-[8px] font-semibold leading-3 text-amber-800 sm:px-1.5 sm:text-[10px] sm:leading-4">Closure</span>}
                                        {day.bookings.slice(0, 2).map((booking) => {
                                            const facility = booking.can_view_details ? facilityById.get(String(booking.facility_id)) : null;
                                            const approved = booking.status === 'approved';
                                            const label = booking.can_view_details ? (facility?.name || booking.facility_name || 'Facility') : 'Reserved';
                                            const timeLabel = `${formatTime(booking.start_time)}–${formatTime(booking.end_time)}`;
                                            return <button key={booking.id} type="button" title={booking.can_view_details ? `${label} · ${timeLabel} · ${booking.status}` : `Reserved · ${timeLabel} · ${booking.status}`} aria-label={booking.can_view_details ? `View ${label} booking, ${timeLabel}, ${booking.status}` : `View reserved time, ${timeLabel}, status ${booking.status}`} onClick={(event) => { event.stopPropagation(); setViewingBooking({ ...booking, facility }); }} className={`relative z-20 block w-full rounded px-1 py-1 text-left text-[8px] font-semibold leading-3 transition hover:ring-2 hover:ring-[#C65B8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C65B8A] sm:px-1.5 sm:text-[10px] sm:leading-4 ${approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}><span className="block whitespace-normal break-words">{label}</span><span className="mt-0.5 block whitespace-nowrap font-medium opacity-80">{timeLabel}</span></button>;
                                        })}
                                        {day.bookings.length > 2 && <span className="pointer-events-none relative z-10 block truncate px-1 text-[8px] font-semibold text-slate-500 sm:text-[10px]">+{day.bookings.length - 2} more</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 bg-slate-50/70 px-3 py-3 text-[11px] text-slate-600 sm:px-5">
                        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Approved</span>
                        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Pending</span>
                        <span className="text-slate-500">Select a date to inspect its schedule.</span>
                    </div>
                </section>

                <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#C65B8A]">Daily schedule</p>
                            <h3 className="mt-1 break-words text-base font-bold text-slate-900">{formatLongDate(selectedDate)}</h3>
                            <p className="mt-1 text-xs text-slate-500">{dailyBookings.length} active {dailyBookings.length === 1 ? 'booking' : 'bookings'}</p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => setFacilityPickerOpen(true)}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#C65B8A] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#A94B75]"
                            >
                                <Plus className="h-3.5 w-3.5" /> Book a Facility
                            </button>
                            <Link
                                href={route('activity-plans.index', { date: selectedDate, return_to: 'schedule' })}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D9C8CF] bg-white px-3 py-2 text-xs font-semibold text-[#A94B75] transition hover:bg-[#F8EDF2]"
                            >
                                <CalendarDays className="h-3.5 w-3.5" /> Recurring Activity Plans
                            </Link>
                        </div>
                    </div>

                    <div className="max-h-[520px] space-y-3 overflow-y-auto p-3 sm:p-4">
                        {dailyClosures.length > 0 && (
                            <div className="space-y-2">
                                {dailyClosures.map((closure) => (
                                    <div key={closure.id} className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-xs font-bold text-amber-900">
                                                Scheduled closure · {closure.facility_name}
                                            </p>
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-800">
                                                {formatClosureTime(closure.scheduled_start_at)} – {formatClosureTime(closure.scheduled_end_at)}
                                            </span>
                                        </div>
                                        <p className="mt-1 break-words text-xs text-amber-800">{closure.reason}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {visibleDailyBookings.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                                <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
                                <p className="mt-2 text-sm font-semibold text-slate-700">No bookings for this date</p>
                                <p className="mt-1 text-xs text-slate-500">Use the booking actions below to reserve a facility.</p>
                            </div>
                        ) : (
                            visibleDailyBookings.map((booking) => (
                                <button key={booking.id} type="button" onClick={() => setViewingBooking(booking)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-[#647D91] hover:bg-[#F8EDF2]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C65B8A]">
                                    <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0">
                                        <h4 className="break-words text-sm font-bold text-slate-800">{booking.can_view_details ? (booking.facility?.name || booking.facility_name || 'Facility') : 'Reserved'}</h4>
                                        {booking.end_date && String(booking.end_date).slice(0, 10) !== String(booking.date || booking.booking_date).slice(0, 10) && <p className="mt-1 break-words text-[10px] text-slate-500">{formatLongDate(booking.date || booking.booking_date)} – {formatLongDate(booking.end_date)}</p>}
                                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5 shrink-0" />{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</p>
                                    </div><span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusStyles[booking.status] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>{booking.status}</span></div>
                                    {booking.can_view_details ? <div className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600"><p>{booking.user?.name || booking.guest_name || 'Reservation'}</p>{booking.notes && <p className="mt-1 line-clamp-2 text-slate-500">{booking.notes}</p>}</div> : <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">Details not disclosed for privacy. Select to view reservation time and status.</p>}
                                </button>
                            ))
                        )}


                    </div>
                </aside>
            </div>

            {viewingBooking && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-3 sm:p-5">
                    <button type="button" aria-label="Close booking details" className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={() => setViewingBooking(null)} />
                    <section role="dialog" aria-modal="true" aria-labelledby="calendar-booking-details-title" className="relative my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
                        {(() => {
                            const canView = Boolean(viewingBooking.can_view_details);
                            const startDate = viewingBooking.date || viewingBooking.booking_date;
                            const endDate = viewingBooking.end_date || startDate;
                            const status = String(viewingBooking.status || 'reserved').toLowerCase();
                            const notes = String(viewingBooking.notes || '').replace(/\r/g, '');
                            const event = notes.match(/^Event:\s*(.*?)\s*\|\s*Dept:\s*(.*?)\s*\|\s*Desig:\s*(.*?)(?:\n|$)/i);
                            const purpose = notes.match(/Purpose:\s*(.*?)(?:\s*\|\s*Facilitator:|$)/i);
                            const facilitator = notes.match(/Facilitator:\s*(.*)$/im);
                            const info = event ? { event: event[1].trim(), department: event[2].trim(), designation: event[3].trim(), purpose: purpose?.[1]?.trim(), facilitator: facilitator?.[1]?.trim() } : { event: '', department: '', designation: '', purpose: notes.trim(), facilitator: '' };
                            const Field = ({ label, value, wide = false }) => <div className={`rounded-xl border border-slate-100 bg-slate-50/80 p-3 ${wide ? 'sm:col-span-2' : ''}`}><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-medium text-slate-800">{value || 'Not provided'}</p></div>;
                            return <>
                                <header className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-4 sm:px-6"><div className="flex items-start justify-between gap-3"><div className="min-w-0">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">{canView && viewingBooking.facility?.type && <span className="rounded-full bg-[#F8EDF2] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#A94B75]">{viewingBooking.facility.type}</span>}<span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusStyles[status] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>{status}</span></div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C65B8A]">{canView ? 'Booking details' : 'Reservation details'}</p>
                                    <h2 id="calendar-booking-details-title" className="mt-1 break-words text-lg font-bold text-slate-900">{canView ? (viewingBooking.facility?.name || viewingBooking.facility_name || 'Facility booking') : 'Reserved time slot'}</h2>
                                    {canView && <p className="mt-1 break-all text-[10px] text-slate-400">Booking ID: {viewingBooking.id}</p>}<p className="mt-1 text-xs text-slate-500">{formatLongDate(startDate)}</p>
                                </div><button type="button" aria-label="Close" onClick={() => setViewingBooking(null)} className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">×</button></div>
                                {canView && status === 'pending' && <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">Pending approval: this time slot is temporarily held for the request. It is not a confirmed reservation until an administrator approves it.</p>}
                                {canView && status === 'approved' && <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">Approved: this reservation is confirmed.</p>}</header>
                                {canView ? <div className="space-y-5 p-4 sm:p-6">
                                    <section><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">Reservation schedule</h3><div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-4">
                                        <div><p className="text-[10px] font-semibold text-slate-500">Start date</p><p className="mt-1 text-sm font-medium text-slate-800">{formatLongDate(startDate)}</p></div><div><p className="text-[10px] font-semibold text-slate-500">End date</p><p className="mt-1 text-sm font-medium text-slate-800">{formatLongDate(endDate)}</p></div><div><p className="text-[10px] font-semibold text-slate-500">Start time</p><p className="mt-1 text-sm font-medium text-slate-800">{formatTime(viewingBooking.start_time)}</p></div><div><p className="text-[10px] font-semibold text-slate-500">End time</p><p className="mt-1 text-sm font-medium text-slate-800">{formatTime(viewingBooking.end_time)}</p></div>
                                    </div></section>
                                    <section><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">Attendance and requester</h3><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        <Field label="Number of attendees" value={viewingBooking.attendees ? `${viewingBooking.attendees}${viewingBooking.facility?.capacity ? ` / ${viewingBooking.facility.capacity} max` : ' people'}` : 'Not specified'} /><Field label="Booked by" value={viewingBooking.user?.name || viewingBooking.guest_name || 'Reservation owner'} />{(viewingBooking.user?.email || viewingBooking.guest_email) && <Field label="Email" value={viewingBooking.user?.email || viewingBooking.guest_email} />}{viewingBooking.guest_phone && <Field label="Contact number" value={viewingBooking.guest_phone} />}<Field label="TDEVS manpower" value={viewingBooking.needs_manpower ? 'Requested' : 'Not requested'} />
                                    </div></section>
                                    <section><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">Booking information</h3><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        <Field label="Event" value={info.event} /><Field label="Department" value={info.department} /><Field label="Designation" value={info.designation} /><Field label="Facilitator" value={info.facilitator} /><Field label="Purpose / notes" value={info.purpose} wide />
                                    </div></section>
                                </div> : <div className="space-y-4 p-4 sm:p-6">
                                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Reservation schedule</p><div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <div><p className="text-xs text-slate-500">Date</p><p className="mt-1 text-sm font-semibold text-slate-800">{formatLongDate(startDate)}{endDate !== startDate ? ` – ${formatLongDate(endDate)}` : ''}</p></div><div><p className="text-xs text-slate-500">Start time</p><p className="mt-1 text-sm font-semibold text-slate-800">{formatTime(viewingBooking.start_time)}</p></div><div><p className="text-xs text-slate-500">End time</p><p className="mt-1 text-sm font-semibold text-slate-800">{formatTime(viewingBooking.end_time)}</p></div>
                                    </div></div>
                                    <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Booking status</p><p className="mt-2 text-sm font-semibold capitalize text-slate-800">{status}</p></div>
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600"><p className="font-semibold text-slate-800">Details not disclosed for privacy</p><p className="mt-1 text-xs leading-5">The reservation time and status are visible, but the facility and requester information, purpose, and other booking details are restricted.</p></div>
                                </div>}
                                <footer className="sticky bottom-0 border-t border-slate-100 bg-white px-4 py-3 text-right sm:px-6"><button type="button" onClick={() => setViewingBooking(null)} className="rounded-lg bg-[#C65B8A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A94B75]">Close</button></footer>
                            </>;
                        })()}
                    </section>
                </div>
            )}

            {facilityPickerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button type="button" aria-label="Close facility selection" className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setFacilityPickerOpen(false)} />
                    <div role="dialog" aria-modal="true" aria-labelledby="calendar-facility-picker-title" className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#C65B8A]">New reservation</p>
                                <h2 id="calendar-facility-picker-title" className="mt-1 text-lg font-bold text-slate-900">Choose a facility</h2>
                                <p className="mt-1 text-xs text-slate-500">Booking date: {formatLongDate(selectedDate)}</p>
                            </div>
                            <button type="button" aria-label="Close" onClick={() => setFacilityPickerOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">×</button>
                        </div>
                        <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
                            {serverFacilities.map((facility) => (
                                <button key={facility.id} type="button" disabled={facility.is_available === false} onClick={() => { setCreate({ facility }); setFacilityPickerOpen(false); }} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-[#647D91] hover:bg-[#F8EDF2] disabled:cursor-not-allowed disabled:opacity-50">
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-semibold text-slate-800">{facility.name}</span>
                                        <span className="block truncate text-xs text-slate-500">{facility.location || 'Location not specified'}</span>
                                        {facility.is_available === false && <span className="mt-1 block text-xs text-rose-600">{facility.unavailable_reason || 'Temporarily unavailable'}</span>}
                                    </span>
                                    <span className="shrink-0 text-xs font-semibold text-[#493344]">{facility.is_available === false ? 'Unavailable' : 'Select'}</span>
                                </button>
                            ))}
                            {serverFacilities.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No facilities are available to book.</p>}
                        </div>
                    </div>
                </div>
            )}

            {create && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
                    <button
                        type="button"
                        aria-label="Close booking form"
                        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm"
                        onClick={() => setCreate(null)}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="booking-create-title"
                        className="relative flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--ri-border)] bg-white shadow-[var(--ri-shadow-lg)]"
                    >
                        <div className="flex items-center justify-between border-b border-[var(--ri-border)] bg-[var(--ri-surface-subtle)] px-4 py-3 sm:px-6 sm:py-4">
                            <div className="min-w-0">
                                <p className="ri-page-eyebrow">New reservation</p>
                                <h2 id="booking-create-title" className="mt-1 truncate font-bold text-slate-900">Book {create.facility.name}</h2>
                            </div>
                            <button type="button" aria-label="Close booking form" onClick={() => setCreate(null)} className="rounded-lg p-2 text-slate-400 transition hover:bg-[var(--ri-brand-soft)] hover:text-[var(--ri-brand-strong)]">
                                <span aria-hidden="true">×</span>
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            <BookingModal
                                facility={create.facility}
                                selectedDate={selectedDate}
                                existingBookings={serverBookings.filter((booking) => String(booking.facility_id) === String(create.facility.id))}
                                onClose={() => setCreate(null)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
