import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
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
                    header={
                        <h2 className="text-xl font-semibold leading-tight text-gray-800">
                            Facility Not Found
                        </h2>
                    }
                >
                    <div className="w-full px-4 py-8 sm:px-6">
                        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
                            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />

                            <h2 className="mb-2 text-2xl font-bold text-gray-900">
                                Facility not found
                            </h2>

                            <p className="text-sm text-gray-500">
                                The facility may no longer be available.
                            </p>
                        </div>
                    </div>
                </AuthenticatedLayout>
            </>
        );
    }

    const isAlwaysConsent =
        facility.requirement === 'CONSENT_REQUIRED';

    return (
        <>
            <Head title={`${facility.name} | ReserveIT`} />

            <AuthenticatedLayout
                user={auth?.user}
                header={
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        {facility.name} Details
                    </h2>
                }
            >
                {/* Expanded responsive page container */}
                <div className="w-full min-w-0 px-1 py-3 sm:px-2">
                    {/* Back navigation */}
                    <button
                        type="button"
                        onClick={() => {
                            window.location.href = '/facilities';
                        }}
                        className="group mb-4 inline-flex items-center text-sm font-medium text-gray-500 transition-colors hover:text-indigo-600"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Back to facilities
                    </button>

                    {/* Main facility card */}
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        {/* Facility image and title */}
                        <div className="relative h-56 w-full overflow-hidden sm:h-72 lg:h-80">
                            {facility.imageUrl ? (
                                <img
                                    src={facility.imageUrl}
                                    alt={facility.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gray-100">
                                    <AlertCircle className="h-12 w-12 text-gray-300" />
                                </div>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-900/10 to-transparent" />

                            <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-7 lg:p-8">
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-indigo-500/90 px-3 py-1 text-xs font-bold uppercase tracking-wide backdrop-blur-sm">
                                        {facility.type}
                                    </span>

                                    {isAlwaysConsent ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/95 px-3 py-1 text-xs font-semibold text-amber-800">
                                            <ShieldAlert className="h-3.5 w-3.5" />
                                            Consent required
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/95 px-3 py-1 text-xs font-semibold text-emerald-800">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Standard booking
                                        </span>
                                    )}
                                </div>

                                <h1 className="max-w-4xl break-words text-2xl font-bold sm:text-3xl lg:text-4xl">
                                    {facility.name}
                                </h1>
                            </div>
                        </div>

                        {/* Facility information */}
                        <div className="p-4 sm:p-6 lg:p-7">
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-8">
                                <div className="min-w-0">
                                    <h2 className="mb-2 text-lg font-bold text-gray-900">
                                        About this facility
                                    </h2>

                                    <p className="whitespace-pre-line break-words text-sm leading-7 text-gray-600 sm:text-base">
                                        {facility.description || 'No description is available for this facility.'}
                                    </p>

                                    {/* Location and capacity */}
                                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="flex min-w-0 items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                                            <div className="shrink-0 rounded-lg bg-white p-2 shadow-sm">
                                                <MapPin className="h-4 w-4 text-indigo-600" />
                                            </div>

                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-gray-400">
                                                    Location
                                                </p>

                                                <p className="mt-1 break-words text-sm font-semibold text-gray-800">
                                                    {facility.location || 'Not specified'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex min-w-0 items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                                            <div className="shrink-0 rounded-lg bg-white p-2 shadow-sm">
                                                <Users className="h-4 w-4 text-indigo-600" />
                                            </div>

                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-gray-400">
                                                    Capacity
                                                </p>

                                                <p className="mt-1 break-words text-sm font-semibold text-gray-800">
                                                    {facility.capacity
                                                        ? `${facility.capacity} people`
                                                        : 'Unspecified'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Booking action */}
                                <div className="flex flex-col gap-3 lg:w-64">
                                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
                                        <CalendarIcon className="mb-2 h-5 w-5 text-indigo-600" />

                                        <h3 className="text-sm font-bold text-gray-900">
                                            Reserve this facility
                                        </h3>

                                        <p className="mt-1 text-xs leading-relaxed text-gray-600">
                                            Choose your preferred date and time to request a booking.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() => setBookingOpen(true)}
                                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                        >
                                            <CalendarIcon className="h-4 w-4" />
                                            Book this facility
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Facility administrators */}
                            {facility.facility_admins?.length > 0 && (
                                <div className="mt-6 border-t border-gray-100 pt-5">
                                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700">
                                        <BadgeCheck className="h-4 w-4 text-indigo-500" />
                                        Facility Administrators
                                    </h3>

                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                        {facility.facility_admins.map((admin) => (
                                            <div
                                                key={admin.id}
                                                className="flex min-w-0 items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3.5 py-3"
                                            >
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                                                    {(admin.name || 'A')
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="break-words text-xs font-bold leading-5 text-indigo-950">
                                                        {admin.name}
                                                    </p>

                                                    <p className="break-all text-xs text-indigo-500">
                                                        {admin.email}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Booking modal */}
                {bookingOpen && (
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
                            <div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white px-4 py-4 sm:px-6">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                                        New reservation
                                    </p>

                                    <h2
                                        id="booking-modal-title"
                                        className="mt-1 break-words font-bold text-gray-900"
                                    >
                                        Book {facility.name}
                                    </h2>
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