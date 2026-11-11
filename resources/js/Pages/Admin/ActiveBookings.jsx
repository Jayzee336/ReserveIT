import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useState, useEffect, useCallback } from 'react';
import {
    Clock,
    AlertTriangle,
    User,
    MapPin,
    DollarSign,
    RefreshCw,
    CheckCircle,
    CreditCard,
    LogOut,
    ArrowLeft,
} from 'lucide-react';
import axios from 'axios';

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

const formatCurrency = (amount) =>
    `₱${Number(amount ?? 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

export default function ActiveBookings() {
    const [bookings, setBookings] = useState([]);
    const [billingRecords, setBillingRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [success, setSuccess] = useState('');
    const [processingId, setProcessingId] = useState(null);
    const [paymentBooking, setPaymentBooking] = useState(null);

    const fetchBookings = useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true);

        try {
            const [activeResponse, billingResponse] = await Promise.all([
                axios.get(route('admin.active-bookings')),
                axios.get(route('admin.overtime-billing')),
            ]);

            setBookings(activeResponse.data.activeBookings ?? []);
            setBillingRecords(billingResponse.data.billingRecords ?? []);
            setError('');
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to load booking and overtime billing information. Check the backend routes.'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookings(true);

        const interval = setInterval(() => {
            fetchBookings(false);
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchBookings]);

    const handleCheckout = async (booking) => {
        const confirmed = window.confirm(
            `Check out ${booking.user_name} from ${booking.facility_name}?\n\n` +
            'The system will save the final overtime minutes and fee.'
        );

        if (!confirmed) return;

        setProcessingId(booking.id);
        setActionError('');
        setSuccess('');

        try {
            const response = await axios.post(
                route('bookings.check-out', { booking: booking.id })
            );

            setSuccess(
                response.data?.message ||
                'Checkout completed. Refreshing the final overtime charge.'
            );

            await fetchBookings(false);
        } catch (err) {
            setActionError(
                err.response?.data?.message ||
                Object.values(err.response?.data?.errors ?? {}).flat().join(' ') ||
                'Checkout failed. Please refresh and try again.'
            );
        } finally {
            setProcessingId(null);
        }
    };

    const handleRecordPayment = async (booking) => {
        const amount = Number(booking.overtime_fee_amount ?? 0);

        if (amount <= 0) {
            setActionError('There is no overtime fee to record for this booking.');
            return;
        }

        setProcessingId(booking.id);
        setActionError('');
        setSuccess('');

        try {
            const response = await axios.post(
                route('bookings.overtime-payment', { booking: booking.id })
            );

            setSuccess(
                response.data?.message || 'Overtime payment recorded successfully.'
            );

            setPaymentBooking(null);
            await fetchBookings(false);
        } catch (err) {
            setActionError(
                err.response?.data?.message ||
                Object.values(err.response?.data?.errors ?? {}).flat().join(' ') ||
                'Unable to record payment. Please refresh and try again.'
            );
        } finally {
            setProcessingId(null);
        }
    };

    const overtimeCount = bookings.filter((booking) => booking.is_overtime).length;

    const unpaidRecords = billingRecords.filter(
        (booking) =>
            Number(booking.overtime_fee_amount ?? 0) > 0 &&
            booking.overtime_payment_status === 'unpaid'
    );

    const unpaidTotal = unpaidRecords.reduce(
        (total, booking) => total + Number(booking.overtime_fee_amount ?? 0),
        0
    );

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <Link
                            href={route('dashboard')}
                            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#493344] transition hover:text-[#A44773]"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Active Bookings Monitor
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Monitor checkouts, final overtime charges, and payment status.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => fetchBookings(true)}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            }
        >
            <Head title="Active Bookings Monitor" />

            <div className="space-y-6 p-4 sm:p-6">
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {actionError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {actionError}
                    </div>
                )}

                {success && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                        {success}
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-500">Active bookings</p>
                            <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="mt-3 text-3xl font-bold text-gray-900">
                            {bookings.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-red-700">In overtime</p>
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <p className="mt-3 text-3xl font-bold text-red-700">
                            {overtimeCount}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-amber-800">Unpaid overtime</p>
                            <DollarSign className="h-5 w-5 text-amber-700" />
                        </div>
                        <p className="mt-3 text-2xl font-bold text-amber-800">
                            {formatCurrency(unpaidTotal)}
                        </p>
                        <p className="mt-1 text-xs text-amber-700">
                            {unpaidRecords.length} unpaid record(s)
                        </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-500">Finalized records</p>
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="mt-3 text-3xl font-bold text-gray-900">
                            {billingRecords.length}
                        </p>
                    </div>
                </div>

                <section>
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-gray-900">
                            Currently Active
                        </h2>
                        <p className="text-sm text-gray-500">
                            Live overtime estimates refresh every 30 seconds. The final fee is saved at checkout.
                        </p>
                    </div>

                    {loading ? (
                        <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center text-gray-400">
                            Loading active bookings…
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center text-gray-500">
                            No active bookings at this time.
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {bookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    className={`rounded-2xl border p-5 shadow-sm ${
                                        booking.is_overtime
                                            ? 'border-red-200 bg-red-50'
                                            : 'border-gray-200 bg-white'
                                    }`}
                                >
                                    <div className="mb-4 flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="font-bold text-gray-900">
                                                {booking.facility_name}
                                            </h3>
                                            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                                                <User className="h-4 w-4 shrink-0" />
                                                {booking.user_name}
                                            </p>
                                            {booking.user_email && (
                                                <p className="mt-1 break-all text-xs text-gray-500">
                                                    {booking.user_email}
                                                </p>
                                            )}
                                        </div>

                                        {booking.is_overtime && (
                                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                Overtime
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2 text-sm text-gray-600">
                                        <p className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-gray-400" />
                                            {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                            {booking.date}
                                        </p>

                                        {booking.is_overtime && (
                                            <p className="flex items-center gap-2 font-semibold text-red-700">
                                                <AlertTriangle className="h-4 w-4" />
                                                {booking.overtime_minutes} minutes overtime
                                            </p>
                                        )}

                                        <div className="rounded-xl border border-gray-200 bg-white p-3">
                                            <p className="text-xs text-gray-500">
                                                Current estimated overtime fee
                                            </p>
                                            <p className="mt-1 text-xl font-bold text-gray-900">
                                                {formatCurrency(booking.overtime_fee)}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                Rate: {formatCurrency(booking.overtime_fee_per_hour)} per hour
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleCheckout(booking)}
                                        disabled={processingId === booking.id}
                                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        {processingId === booking.id
                                            ? 'Processing…'
                                            : 'Check Out & Finalize Fee'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-gray-900">
                            Finalized Overtime Charges
                        </h2>
                        <p className="text-sm text-gray-500">
                            These charges should reflect the amounts saved at checkout, not live estimates.
                        </p>
                    </div>

                    {billingRecords.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 bg-white py-10 text-center text-sm text-gray-500">
                            No finalized overtime records available.
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Facility / User
                                            </th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Final overtime
                                            </th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Final fee
                                            </th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Payment status
                                            </th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-100">
                                        {billingRecords.map((booking) => {
                                            const amount = Number(booking.overtime_fee_amount ?? 0);
                                            const paid = booking.overtime_payment_status === 'paid';

                                            return (
                                                <tr key={booking.id}>
                                                    <td className="px-5 py-4">
                                                        <p className="font-semibold text-gray-900">
                                                            {booking.facility_name}
                                                        </p>
                                                        <p className="mt-1 text-sm text-gray-500">
                                                            {booking.user_name}
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-400">
                                                            Checkout: {booking.checked_out_at || '—'}
                                                        </p>
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                                                        {Number(booking.overtime_minutes ?? 0)} minutes
                                                        <p className="mt-1 text-xs text-gray-400">
                                                            {formatCurrency(booking.overtime_fee_rate)} / hour
                                                        </p>
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-gray-900">
                                                        {formatCurrency(amount)}
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4">
                                                        {paid ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                                                                <CheckCircle className="h-3.5 w-3.5" />
                                                                Paid
                                                            </span>
                                                        ) : amount > 0 ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                                                <CreditCard className="h-3.5 w-3.5" />
                                                                Unpaid
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                                                                No fee due
                                                            </span>
                                                        )}

                                                        {paid && booking.overtime_paid_at && (
                                                            <p className="mt-1 text-xs text-gray-400">
                                                                Recorded: {booking.overtime_paid_at}
                                                            </p>
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-4 text-right">
                                                        {amount > 0 && !paid ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => { setActionError(""); setPaymentBooking(booking); }}
                                                                disabled={processingId === booking.id}
                                                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                                {processingId === booking.id
                                                                    ? 'Saving…'
                                                                    : 'Record Payment'}
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">
                                                                {paid ? 'Completed' : 'No action needed'}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </section>
            </div>
                {paymentBooking && (
                    <div
                        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"
                        onClick={() => processingId !== paymentBooking.id && setPaymentBooking(null)}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="record-payment-title"
                            className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="border-b border-stone-100 bg-[#FCFAFB] px-6 py-5">
                                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8EDF2] text-[#493344]">
                                    <CreditCard className="h-5 w-5" />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C65B8A]">Overtime billing</p>
                                <h2 id="record-payment-title" className="mt-1 text-xl font-bold text-slate-900">Record payment received</h2>
                                <p className="mt-1 text-sm text-slate-500">Confirm that the outstanding overtime fee has already been collected.</p>
                            </div>
                            <div className="space-y-4 px-6 py-5">
                                <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                                    <div className="flex justify-between gap-4 text-sm">
                                        <span className="text-slate-500">Facility</span>
                                        <span className="text-right font-semibold text-slate-800">{paymentBooking.facility_name}</span>
                                    </div>
                                    <div className="mt-3 flex justify-between gap-4 text-sm">
                                        <span className="text-slate-500">Client</span>
                                        <span className="text-right font-semibold text-slate-800">{paymentBooking.user_name}</span>
                                    </div>
                                    <div className="mt-3 flex justify-between gap-4 border-t border-stone-200 pt-3 text-sm">
                                        <span className="font-semibold text-slate-600">Amount received</span>
                                        <span className="text-lg font-bold text-[#493344]">{formatCurrency(paymentBooking.overtime_fee_amount)}</span>
                                    </div>
                                </div>
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800">
                                    This action records a manual payment confirmation only. It does not process or transfer money.
                                </div>
                                {actionError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>}
                                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={() => { setPaymentBooking(null); setActionError(""); }}
                                        disabled={processingId === paymentBooking.id}
                                        className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-stone-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRecordPayment(paymentBooking)}
                                        disabled={processingId === paymentBooking.id}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C65B8A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A44773] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        {processingId === paymentBooking.id ? 'Recording…' : 'Confirm payment received'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
        </AuthenticatedLayout>
    );
}