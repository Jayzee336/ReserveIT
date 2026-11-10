import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Plus,
    RefreshCw,
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

    const bookingsByDate = useMemo(() => {
        const grouped = new Map();

        serverBookings.forEach((booking) => {
            const bookingDate = String(booking.date || booking.booking_date || '').slice(0, 10);
            if (!bookingDate || !['pending', 'approved'].includes(String(booking.status || '').toLowerCase())) {
                return;
            }

            if (!grouped.has(bookingDate)) grouped.set(bookingDate, []);
            grouped.get(bookingDate).push(booking);
        });

        grouped.forEach((items) => items.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))));
        return grouped;
    }, [serverBookings]);

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
                isToday: key === dateKey(new Date()),
                isSelected: key === selectedDate,
            };
        });
    }, [bookingsByDate, monthEnd, monthStart, selected, selectedDate]);

    const dailyBookings = bookingsByDate.get(selectedDate) || [];

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
                            <CalendarDays className="h-5 w-5 shrink-0 text-[#6A535C]" />
                            <h2 className="truncate text-base font-bold text-slate-800">{monthLabel}</h2>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => changeMonth(-1)}
                                aria-label="Previous month"
                                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#846A75]"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => selectDate(dateKey(new Date()))}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#846A75]"
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => changeMonth(1)}
                                aria-label="Next month"
                                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#846A75]"
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
                                <button
                                    key={day.key}
                                    type="button"
                                    onClick={() => selectDate(day.key)}
                                    aria-pressed={day.isSelected}
                                    aria-label={`${formatLongDate(day.key)}, ${day.bookings.length} active bookings`}
                                    className={`group min-w-0 min-h-[70px] border-b border-r border-slate-100 p-1 text-left transition hover:bg-[#F7F0F3]/70 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#846A75] sm:min-h-[112px] sm:p-2 ${day.isSelected ? 'bg-[#F7F0F3]' : 'bg-white'}`}
                                >
                                    <span className="flex items-center justify-between gap-1">
                                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold sm:h-7 sm:w-7 sm:text-xs ${day.isSelected ? 'bg-[#6A535C] text-white' : day.isToday ? 'border border-[#846A75] text-[#6A535C]' : 'text-slate-700'}`}>
                                            {day.dayNumber}
                                        </span>
                                        {day.bookings.length > 0 && (
                                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 sm:text-[10px]">
                                                {day.bookings.length}
                                            </span>
                                        )}
                                    </span>

                                    <div className="mt-1 space-y-1">
                                        {day.bookings.slice(0, 2).map((booking) => {
                                            const facility = facilityById.get(String(booking.facility_id));
                                            const approved = booking.status === 'approved';

                                            return (
                                                <span
                                                    key={booking.id}
                                                    title={`${facility?.name || 'Facility'} · ${formatTime(booking.start_time)}–${formatTime(booking.end_time)} · ${booking.status}`}
                                                    className={`block truncate rounded px-1 py-0.5 text-[8px] font-semibold leading-3 sm:px-1.5 sm:text-[10px] sm:leading-4 ${approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
                                                >
                                                    <span className="hidden sm:inline">{facility?.name || 'Facility'} · </span>
                                                    {formatTime(booking.start_time)}
                                                </span>
                                            );
                                        })}
                                        {day.bookings.length > 2 && (
                                            <span className="block truncate px-1 text-[8px] font-semibold text-slate-500 sm:text-[10px]">
                                                +{day.bookings.length - 2} more
                                            </span>
                                        )}
                                    </div>
                                </button>
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
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#846A75]">Daily schedule</p>
                            <h3 className="mt-1 break-words text-base font-bold text-slate-900">{formatLongDate(selectedDate)}</h3>
                            <p className="mt-1 text-xs text-slate-500">{dailyBookings.length} active {dailyBookings.length === 1 ? 'booking' : 'bookings'}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.reload({ only: ['serverFacilities', 'serverBookings'] })}
                            title="Refresh calendar"
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#846A75]"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="max-h-[520px] space-y-3 overflow-y-auto p-3 sm:p-4">
                        {visibleDailyBookings.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                                <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
                                <p className="mt-2 text-sm font-semibold text-slate-700">No bookings for this date</p>
                                <p className="mt-1 text-xs text-slate-500">Choose a facility below to start a reservation.</p>
                            </div>
                        ) : (
                            visibleDailyBookings.map((booking) => (
                                <article key={booking.id} className="rounded-xl border border-slate-200 p-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h4 className="break-words text-sm font-bold text-slate-800">{booking.facility?.name || 'Facility'}</h4>
                                            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                                                {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                                            </p>
                                        </div>
                                        <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusStyles[booking.status] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                            {booking.status}
                                        </span>
                                    </div>
                                    {!availabilityOnly && (
                                        <div className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
                                            <p>{booking.user?.name || booking.guest_name || 'Reservation'}</p>
                                            {booking.notes && <p className="mt-1 line-clamp-2 text-slate-500">{booking.notes}</p>}
                                        </div>
                                    )}
                                </article>
                            ))
                        )}

                        <div className="pt-1">
                            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Book a facility</h4>
                            <div className="space-y-2">
                                {serverFacilities.map((facility) => (
                                    <div key={facility.id} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-semibold text-slate-800">{facility.name}</p>
                                            <p className="truncate text-[10px] text-slate-500">{facility.location}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCreate({ facility })}
                                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#6A535C] px-2.5 py-2 text-[11px] font-semibold text-white transition hover:bg-[#543F48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#846A75] focus-visible:ring-offset-2"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Book
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

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
