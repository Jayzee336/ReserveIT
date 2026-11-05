import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { ArrowLeft, Printer, CheckCircle } from 'lucide-react';

export default function Receipt({ auth, booking }) {
    const facility = booking?.facility ?? {};
    const bookingDate = booking?.date || booking?.booking_date;
    const formatDate = (value) => {
        if (!value) return 'Not provided';
        const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
        return Number.isNaN(date.getTime())
            ? String(value)
            : date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
    };
    const formatTime = (value) => {
        if (!value) return 'Not provided';
        const parts = String(value).split(':');
        if (parts.length < 2) return String(value);
        const date = new Date();
        date.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };
    const reference = `BKG-2026-${String(booking.id).padStart(6, '0')}`;

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Booking Receipt</h2>}
        >
            <Head title={`Receipt ${reference}`} />

            <div className="py-10 print:py-0">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
                        <Link
                            href="/my-bookings"
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back to My Bookings
                        </Link>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                            <Printer className="h-4 w-4" /> Print / Save PDF
                        </button>
                    </div>

                    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
                        <div className="border-b border-gray-200 bg-indigo-700 px-6 py-8 text-white sm:px-10">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">ReserveIT</p>
                                    <h1 className="mt-2 text-3xl font-bold">Booking Receipt</h1>
                                    <p className="mt-2 text-sm text-indigo-100">Facility reservation confirmation</p>
                                </div>
                                <CheckCircle className="h-10 w-10 flex-shrink-0 text-green-300" />
                            </div>
                        </div>

                        <div className="p-6 sm:p-10">
                            <div className="mb-8 flex flex-col justify-between gap-4 border-b border-dashed border-gray-300 pb-6 sm:flex-row">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Booking reference</p>
                                    <p className="mt-1 text-xl font-bold text-gray-900">{reference}</p>
                                </div>
                                <div className="sm:text-right">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Status</p>
                                    <span className="mt-1 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-semibold capitalize text-green-800">
                                        {booking.status}
                                    </span>
                                </div>
                            </div>

                            <section className="mb-8">
                                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Reservation details</h2>
                                <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                                    <div>
                                        <dt className="text-sm text-gray-500">Facility</dt>
                                        <dd className="mt-1 font-semibold text-gray-900">{facility.name || 'Facility details unavailable'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-gray-500">Facility type</dt>
                                        <dd className="mt-1 font-medium text-gray-900">{facility.type || '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-gray-500">Location</dt>
                                        <dd className="mt-1 font-medium text-gray-900">{facility.location || '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-gray-500">Reservation date</dt>
                                        <dd className="mt-1 font-medium text-gray-900">{formatDate(bookingDate)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-gray-500">Start time</dt>
                                        <dd className="mt-1 font-medium text-gray-900">{formatTime(booking.start_time)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-gray-500">End time</dt>
                                        <dd className="mt-1 font-medium text-gray-900">{formatTime(booking.end_time)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-gray-500">Number of attendees</dt>
                                        <dd className="mt-1 font-medium text-gray-900">{booking.attendees ?? 1}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-gray-500">Manpower assistance</dt>
                                        <dd className="mt-1 font-medium text-gray-900">{booking.needs_manpower ? 'Requested' : 'Not requested'}</dd>
                                    </div>
                                </dl>
                            </section>

                            <section className="mb-8 border-t border-gray-200 pt-6">
                                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">Booked by</h2>
                                <p className="font-semibold text-gray-900">{auth.user?.name || 'Account holder'}</p>
                                <p className="text-sm text-gray-600">{auth.user?.email || ''}</p>
                            </section>

                            {booking.notes && (
                                <section className="mb-8 border-t border-gray-200 pt-6">
                                    <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-gray-500">Booking notes</h2>
                                    <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{booking.notes}</p>
                                </section>
                            )}

                            <div className="border-t border-dashed border-gray-300 pt-6 text-center text-xs leading-5 text-gray-500">
                                This receipt confirms that the reservation shown above has been approved in ReserveIT.
                                <br />
                                Keep this receipt for your records.
                            </div>
                        </div>
                    </article>
                </div>
            </div>
            <style>{`
                @media print {
                    body { background: white !important; }
                    nav, aside, header { }
                    @page { margin: 12mm; }
                }
            `}</style>
        </AuthenticatedLayout>
    );
}