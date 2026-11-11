import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Users,
    MapPin,
    AlertCircle,
    Calendar as CalendarIcon,
    ArrowLeft,
    BadgeCheck,
    X,
    ShieldAlert,
    CheckCircle2,
    Clock3,
    Building2,
    ArrowUpRight,
} from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BookingModal from '@/Components/BookingModal';

export default function FacilityDetails({
    auth,
    facility,
    blackoutDates,
    bookings,
    availablePersonnel,
}) {
    const [bookingOpen, setBookingOpen] = useState(false);

    if (!facility) {
        return (
            <>
                <Head title="Facility Not Found | ReserveIT" />
                <AuthenticatedLayout
                    user={auth?.user}
                    header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Facility Not Found</h2>}
                >
                    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
                        <div className="rounded-3xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
                            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[#B96B8D]" />
                            <h2 className="mb-2 text-2xl font-bold text-gray-900">Facility not found</h2>
                            <p className="text-sm text-gray-500">The facility may no longer be available.</p>
                            <Link href="/facilities" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#B96B8D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#96516F]">
                                <ArrowLeft className="h-4 w-4" /> Back to facilities
                            </Link>
                        </div>
                    </div>
                </AuthenticatedLayout>
            </>
        );
    }

    const isAlwaysConsent = facility.requirement === 'CONSENT_REQUIRED';
    const isFacilityAvailable = facility.is_available !== false;
    const scheduledClosures = facility.unavailability_periods ?? [];

    const formatScheduledDateTime = (value) => {
        if (!value) return '—';
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? String(value)
            : date.toLocaleString('en-PH', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            });
    };

    return (
        <>
            <Head title={`${facility.name} | ReserveIT`} />
            <AuthenticatedLayout
                user={auth?.user}
                header={<h2 className="text-xl font-semibold leading-tight text-gray-800">{facility.name} Details</h2>}
            >
                <div className="mx-auto w-full max-w-[1600px] min-w-0 px-3 py-5 sm:px-5 lg:px-7 lg:py-7">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <Link
                            href="/facilities"
                            className="group inline-flex items-center gap-2 rounded-lg py-2 pr-3 text-sm font-semibold text-[#493344] transition hover:text-[#302632]"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8E1E7] bg-white transition group-hover:-translate-x-0.5 group-hover:bg-[#F4E4EB]">
                                <ArrowLeft className="h-4 w-4" />
                            </span>
                            Back to facilities
                        </Link>
                        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm">
                            <Building2 className="h-3.5 w-3.5 text-[#B96B8D]" />
                            Facility overview
                        </span>
                    </div>

                    <div className="overflow-hidden rounded-[1.6rem] border border-[#E9E2E5] bg-white shadow-[0_12px_40px_rgba(49,35,42,0.07)]">
                        {/* Hero */}
                        <section className="relative isolate h-[280px] overflow-hidden bg-[#473840] sm:h-[340px] lg:h-[390px]">
                            {facility.imageUrl ? (
                                <img
                                    src={facility.imageUrl}
                                    alt={facility.name}
                                    className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-[1.015]"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#B96B8D] via-[#493344] to-[#302632]">
                                    <Building2 className="h-20 w-20 text-white/30" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#20171D]/85 via-[#20171D]/45 to-[#20171D]/10" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1B1419]/75 via-transparent to-black/10" />

                            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10">
                                <div className="mb-4 flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-white/20 bg-white/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-sm backdrop-blur-md">
                                        {facility.type || 'Facility'}
                                    </span>
                                    {isAlwaysConsent ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm">
                                            <ShieldAlert className="h-3.5 w-3.5" /> Consent required
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-semibold text-emerald-900 shadow-sm">
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Standard booking
                                        </span>
                                    )}
                                    <span className={`rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-sm ${isFacilityAvailable ? 'bg-white/15 text-white backdrop-blur-md' : 'bg-slate-100 text-slate-700'}`}>
                                        {isFacilityAvailable ? 'Currently available' : 'Temporarily unavailable'}
                                    </span>
                                </div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">ReserveIT facilities</p>
                                <h1 className="max-w-4xl break-words text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                                    {facility.name}
                                </h1>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
                                    View facility information, check availability, and submit a reservation request.
                                </p>
                            </div>
                        </section>

                        {!isFacilityAvailable && (
                            <div className="mx-4 mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:mx-6 lg:mx-8" role="status">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                                    <AlertCircle className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800">This facility is temporarily unavailable</p>
                                    <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                                        {facility.unavailable_reason || 'The facility is not accepting new bookings at this time.'}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">The facility administrator will mark it available again when it is ready.</p>
                                </div>
                            </div>
                        )}

                        {/* Main content */}
                        <div className="grid grid-cols-1 gap-7 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-9 lg:p-8">
                            <div className="min-w-0 space-y-8">
                                <section>
                                    <div className="mb-3 flex items-center gap-2">
                                        <span className="h-6 w-1 rounded-full bg-[#B96B8D]" />
                                        <h2 className="text-lg font-bold tracking-tight text-[#302632]">About this facility</h2>
                                    </div>
                                    <p className="whitespace-pre-line break-words text-sm leading-7 text-gray-600 sm:text-[15px]">
                                        {facility.description || 'No description is available for this facility.'}
                                    </p>
                                </section>

                                <section>
                                    <div className="mb-3 flex items-center gap-2">
                                        <span className="h-6 w-1 rounded-full bg-[#B96B8D]" />
                                        <h2 className="text-lg font-bold tracking-tight text-[#302632]">Facility information</h2>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-[#F4EDF1] bg-[#FCFAFB] p-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F4E4EB] text-[#493344]">
                                                <MapPin className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Location</p>
                                                <p className="mt-1 break-words text-sm font-bold text-[#302632]">{facility.location || 'Not specified'}</p>
                                            </div>
                                        </div>
                                        <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-[#F4EDF1] bg-[#FCFAFB] p-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F4E4EB] text-[#493344]">
                                                <Users className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Maximum capacity</p>
                                                <p className="mt-1 break-words text-sm font-bold text-[#302632]">
                                                    {facility.capacity ? `${facility.capacity} people` : 'Unspecified'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-[#F4EDF1] bg-[#FCFAFB] p-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F4E4EB] text-[#493344]">
                                                <CalendarIcon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Booking method</p>
                                                <p className="mt-1 break-words text-sm font-bold text-[#302632]">{isAlwaysConsent ? 'Consent required' : 'Standard booking'}</p>
                                            </div>
                                        </div>
                                        <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-[#F4EDF1] bg-[#FCFAFB] p-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F4E4EB] text-[#493344]">
                                                {isFacilityAvailable ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Booking status</p>
                                                <p className={`mt-1 break-words text-sm font-bold ${isFacilityAvailable ? 'text-emerald-700' : 'text-slate-600'}`}>
                                                    {isFacilityAvailable ? 'Accepting reservations' : 'Not accepting reservations'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {scheduledClosures.length > 0 && (
                                    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                                                    <Clock3 className="h-4.5 w-4.5" />
                                                </span>
                                                <div>
                                                    <h3 className="text-sm font-bold text-amber-950">Scheduled maintenance and closures</h3>
                                                    <p className="mt-0.5 text-xs text-amber-800">Dates when this facility cannot be booked</p>
                                                </div>
                                            </div>
                                            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-amber-900">{scheduledClosures.length} scheduled</span>
                                        </div>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            {scheduledClosures.map((period) => (
                                                <article key={period.id} className="min-w-0 rounded-xl border border-amber-200/80 bg-white/80 p-3.5">
                                                    <p className="break-words text-sm font-semibold text-amber-950">{period.reason}</p>
                                                    <p className="mt-2 text-xs leading-5 text-amber-800">
                                                        {formatScheduledDateTime(period.scheduled_start_at)}
                                                        <span className="mx-1.5 text-amber-500">→</span>
                                                        {formatScheduledDateTime(period.scheduled_end_at)}
                                                    </p>
                                                </article>
                                            ))}
                                        </div>
                                        <p className="mt-3 text-xs leading-5 text-amber-800">Bookings that overlap these windows are blocked. Other time slots remain available.</p>
                                    </section>
                                )}

                                {facility.facility_admins?.length > 0 && (
                                    <section className="border-t border-gray-100 pt-6">
                                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4E4EB] text-[#493344]">
                                                    <BadgeCheck className="h-5 w-5" />
                                                </span>
                                                <div>
                                                    <h3 className="text-base font-bold text-[#302632]">Facility administrators</h3>
                                                    <p className="text-xs text-gray-500">People responsible for managing this facility</p>
                                                </div>
                                            </div>
                                            <span className="rounded-full bg-[#F4E4EB] px-3 py-1 text-xs font-semibold text-[#493344]">
                                                {facility.facility_admins.length} assigned
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                            {facility.facility_admins.map((admin) => (
                                                <div key={admin.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#F4EDF1] bg-white p-3.5">
                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4E4EB] text-sm font-bold text-[#96516F]">
                                                        {(admin.name || 'A').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="break-words text-sm font-bold leading-5 text-[#302632]">{admin.name}</p>
                                                        <p className="mt-0.5 break-all text-xs text-gray-500">{admin.email}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>

                            {/* Booking panel */}
                            <aside className="min-w-0">
                                <div className="rounded-2xl border border-[#E8DDE2] bg-gradient-to-b from-[#FBF7F9] to-[#F6EEF2] p-5 shadow-sm lg:sticky lg:top-6">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#493344] shadow-sm">
                                        <CalendarIcon className="h-5 w-5" />
                                    </div>
                                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#B96B8D]">Make a reservation</p>
                                    <h2 className="mt-1 text-xl font-bold tracking-tight text-[#302632]">Reserve this facility</h2>
                                    <p className="mt-2 text-sm leading-6 text-gray-600">
                                        Choose your preferred date and time to request a booking for {facility.name}.
                                    </p>

                                    <div className="my-5 space-y-3 border-y border-[#E7DCE1] py-4">
                                        <div className="flex items-center justify-between gap-3 text-sm">
                                            <span className="text-gray-500">Capacity</span>
                                            <span className="font-semibold text-[#302632]">{facility.capacity ? `${facility.capacity} people` : 'Not specified'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 text-sm">
                                            <span className="text-gray-500">Booking type</span>
                                            <span className="font-semibold text-[#302632]">{isAlwaysConsent ? 'Consent required' : 'Standard'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 text-sm">
                                            <span className="text-gray-500">Availability</span>
                                            <span className={`font-semibold ${isFacilityAvailable ? 'text-emerald-700' : 'text-slate-600'}`}>
                                                {isFacilityAvailable ? 'Available' : 'Unavailable'}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setBookingOpen(true)}
                                        disabled={!isFacilityAvailable}
                                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B96B8D] px-4 py-3 text-sm font-bold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-[#96516F] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#B96B8D] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none disabled:hover:translate-y-0"
                                    >
                                        <CalendarIcon className="h-4 w-4" />
                                        {isFacilityAvailable ? 'Book this facility' : 'Temporarily unavailable'}
                                    </button>
                                    <Link
                                        href={route('activity-plans.index', { facility_id: facility.id, return_to: 'facility' })}
                                        aria-disabled={!isFacilityAvailable}
                                        onClick={(event) => {
                                            if (!isFacilityAvailable) event.preventDefault();
                                        }}
                                        className={`mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#D7C5CD] bg-white px-4 py-3 text-center text-sm font-semibold text-[#96516F] transition duration-200 hover:-translate-y-0.5 hover:border-[#B99FA9] hover:bg-[#FDFBFC] hover:shadow-sm ${!isFacilityAvailable ? 'pointer-events-none opacity-50' : ''}`}
                                    >
                                        <CalendarIcon className="h-4 w-4" />
                                        Create recurring activity plan
                                        <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                                    </Link>
                                    <p className="mt-4 text-center text-[11px] leading-5 text-gray-500">
                                        Booking requests are subject to facility availability and approval requirements.
                                    </p>
                                </div>
                            </aside>
                        </div>
                    </div>
                </div>

                {/* Booking modal */}
                {bookingOpen && isFacilityAvailable && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
                        <button
                            type="button"
                            aria-label="Close booking dialog"
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setBookingOpen(false)}
                        />
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="booking-modal-title"
                            className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
                        >
                            <div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-gradient-to-r from-[#F4E4EB] to-white px-4 py-4 sm:px-6">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[#B96B8D]">New reservation</p>
                                    <h2 id="booking-modal-title" className="mt-1 break-words font-bold text-gray-900">Book {facility.name}</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setBookingOpen(false)}
                                    aria-label="Close booking modal"
                                    className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <BookingModal
                                    facility={facility}
                                    blackoutDates={blackoutDates}
                                    existingBookings={bookings}
                                    availablePersonnel={availablePersonnel}
                                    onClose={() => setBookingOpen(false)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </AuthenticatedLayout>
        </>
    );
}
