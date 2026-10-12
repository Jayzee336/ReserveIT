import React, { useState } from 'react';
import { Link, Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Calendar, Clock, MapPin, CheckCircle, Clock3, XCircle, AlertTriangle, ExternalLink, X, History, Eye, Edit3, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function MyBookings({ auth, bookings = [], activityLogs = [] }) {
    const [cancelModalId, setCancelModalId] = useState(null);
    const [detailModalId, setDetailModalId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

    const { data, setData, put, processing, errors, reset } = useForm({
        date: '',
        start_time: '',
        end_time: '',
        notes: '',
        attendees: 1,
        needs_manpower: false,
    });

    const userBookings = [...bookings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const selectedDetailBooking = userBookings.find(b => b.id === detailModalId);

    const handleOpenDetails = (booking) => {
        setDetailModalId(booking.id);
        setIsEditing(false); 
        setData({
            date: booking.date || '',
            start_time: booking.start_time?.slice(0, 5) || '',
            end_time: booking.end_time?.slice(0, 5) || '',
            notes: booking.notes || '',
            attendees: booking.attendees || 1,
            needs_manpower: Boolean(booking.needs_manpower),
        });
    };

    const handleCloseDetails = () => {
        setDetailModalId(null);
        setIsEditing(false);
        setShowSaveConfirm(false);
        reset();
    };

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved': return <CheckCircle className="h-5 w-5 text-green-500 mr-1.5" />;
            case 'pending': return <Clock3 className="h-5 w-5 text-amber-500 mr-1.5" />;
            case 'declined': return <XCircle className="h-5 w-5 text-red-500 mr-1.5" />;
            case 'cancelled': return <AlertTriangle className="h-5 w-5 text-gray-500 mr-1.5" />;
            default: return null;
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved': return 'bg-green-100 text-green-800 border-green-200';
            case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'declined': return 'bg-red-100 text-red-800 border-red-200';
            case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    
const handleUpdateBooking = (e) => {
    e.preventDefault();

    // Only pending bookings can be edited.
    if (selectedDetailBooking?.status?.toLowerCase() !== 'pending') {
        toast.error('Only pending bookings can be edited.');
        return;
    }

    // Show our custom confirmation popup.
    setShowSaveConfirm(true);
};

const handleConfirmSave = () => {
    if (processing) return;

    // Close the confirmation popup before submitting.
    setShowSaveConfirm(false);

    put(`/bookings/${detailModalId}`, {
        onSuccess: () => {
            setIsEditing(false);
            setDetailModalId(null);
            setShowSaveConfirm(false);
            toast.success('Booking modified successfully!');
        },
        onError: () => {
            toast.error('Failed to update booking. Please review your inputs.');
        },
    });
};


    const handleCancel = (id) => {
        router.put(`/bookings/${id}/cancel`, {}, {
            onSuccess: () => {
                setCancelModalId(null);
                toast.success('Booking Cancelled');
            },
            onError: () => {
                toast.error('Failed to cancel booking');
            }
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">My Reservations</h2>}
        >
            <Head title="My Bookings" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Bookings</h1>
                        <p className="mt-2 text-sm text-gray-500">Manage your upcoming facility reservations</p>
                    </div>

                    {userBookings.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No bookings found</h3>
                            <p className="mt-2 text-sm text-gray-500 mb-6">You haven't made any facility reservations yet.</p>
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Browse Facilities
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
                            {userBookings.map((booking) => {
                                const facility = booking.facility;
                                if (!facility) return null;
                                
                                const status = booking.status?.toLowerCase();
                                const isCancelable = status === 'pending' || status === 'approved';

                                return (
                                    <div key={booking.id} className="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-200 transition-all hover:shadow-md flex flex-col">
                                        <div className="p-6 border-b border-gray-100 flex-1">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 mb-2 uppercase tracking-wider">
                                                        {facility.type}
                                                    </span>
                                                    <h3 className="text-lg font-bold text-gray-900">{facility.name}</h3>
                                                    <p className="text-xs text-gray-500 mt-1 uppercase">Ref: BKG-2026-{String(booking.id).padStart(6, '0')}</p>
                                                </div>
                                                <div className={`inline-flex items-center px-3 py-1.5 rounded-full border text-sm font-semibold shadow-sm ${getStatusBadgeClass(booking.status)}`}>
                                                    {getStatusIcon(booking.status)}
                                                    <span className="capitalize">{booking.status}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                <div className="flex items-center text-sm">
                                                    <Calendar className="flex-shrink-0 mr-3 h-5 w-5 text-indigo-500" />
                                                    <span className="font-medium text-gray-900">
                                                        {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center text-sm">
                                                    <Clock className="flex-shrink-0 mr-3 h-5 w-5 text-indigo-500" />
                                                    <span className="text-gray-700 font-medium">{booking.start_time} - {booking.end_time}</span>
                                                </div>
                                                <div className="flex items-center text-sm">
                                                    <MapPin className="flex-shrink-0 mr-3 h-5 w-5 text-gray-400" />
                                                    <span className="text-gray-600">{facility.location}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200">
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <button
                                                    onClick={() => handleOpenDetails(booking)}
                                                    className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                                                >
                                                    <Eye className="mr-2 h-4 w-4" /> {status === 'pending' ? 'View / Edit Details' : 'View Details'}
                                                </button>

                                                {status === 'approved' && (
                                                    <Link
                                                        href={`/receipt/${booking.id}`}
                                                        className="flex-1 sm:flex-none inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors"
                                                    >
                                                        <ExternalLink className="mr-2 h-4 w-4" /> Receipt
                                                    </Link>
                                                )}
                                            </div>
                                            
                                            {isCancelable && (
                                                <button
                                                    onClick={() => setCancelModalId(booking.id)}
                                                    className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <X className="mr-2 h-4 w-4" /> Cancel Booking
                                                </button>
                                            )}
                                        </div>

                                        {/* Cancel Confirmation Modal */}
                                        {cancelModalId === booking.id && (
                                            <div className="fixed inset-0 z-50 overflow-y-auto">
                                                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setCancelModalId(null)}></div>
                                                    <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                                                    <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                                                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                                            <div className="sm:flex sm:items-start">
                                                                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                                                    <AlertTriangle className="h-6 w-6 text-red-600" />
                                                                </div>
                                                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                                                    <h3 className="text-lg font-medium text-gray-900">Cancel Booking</h3>
                                                                    <div className="mt-2">
                                                                        <p className="text-sm text-gray-500">
                                                                            Are you sure you want to cancel this booking for {facility.name} on {new Date(booking.date).toLocaleDateString()}?
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCancel(booking.id)}
                                                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm"
                                                            >
                                                                Confirm Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setCancelModalId(null)}
                                                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                                            >
                                                                Keep Booking
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Global Detail & Edit Modal */}
            {selectedDetailBooking && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseDetails}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                        <div className="inline-block align-middle bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                            
                            <form onSubmit={handleUpdateBooking}>
                                <div className="bg-white p-6 relative">
                                    <button 
                                        type="button"
                                        onClick={handleCloseDetails}
                                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="h-6 w-6" />
                                    </button>
                                    
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 mb-2 uppercase tracking-wider">
                                        {selectedDetailBooking.facility.type}
                                    </span>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedDetailBooking.facility.name}</h3>
                                    <p className="text-xs text-gray-500 uppercase mb-4">Ref: BKG-2026-{String(selectedDetailBooking.id).padStart(6, '0')}</p>
                                    
                                    <div className={`inline-flex items-center px-3 py-1 mb-4 rounded-full border text-xs font-semibold ${getStatusBadgeClass(selectedDetailBooking.status)}`}>
                                        {getStatusIcon(selectedDetailBooking.status)}
                                        <span className="capitalize">{selectedDetailBooking.status}</span>
                                    </div>

                                    {/* Submission Information Fields */}
                                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                                        <h4 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-1">Submission Information</h4>
                                        
                                        {/* Date Input/View */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Reservation Date</label>
                                            {isEditing ? (
                                                <>
                                                    <input 
                                                        type="date" 
                                                        value={data.date}
                                                        onChange={e => setData('date', e.target.value)}
                                                        className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                        required
                                                    />
                                                    {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
                                                </>
                                            ) : (
                                                <p className="text-sm font-medium text-gray-900">{new Date(selectedDetailBooking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                            )}
                                        </div>

                                        {/* Time Frame Input/View */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start Time</label>
                                                {isEditing ? (
                                                    <>
                                                        <input 
                                                            type="time" 
                                                            value={data.start_time}
                                                            onChange={e => setData('start_time', e.target.value)}
                                                            className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                            required
                                                        />
                                                        {errors.start_time && <p className="text-red-500 text-xs mt-1">{errors.start_time}</p>}
                                                    </>
                                                ) : (
                                                    <p className="text-sm font-medium text-gray-900">{selectedDetailBooking.start_time}</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">End Time</label>
                                                {isEditing ? (
                                                    <>
                                                        <input 
                                                            type="time" 
                                                            value={data.end_time}
                                                            onChange={e => setData('end_time', e.target.value)}
                                                            className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                            required
                                                        />
                                                        {errors.end_time && <p className="text-red-500 text-xs mt-1">{errors.end_time}</p>}
                                                    </>
                                                ) : (
                                                    <p className="text-sm font-medium text-gray-900">{selectedDetailBooking.end_time}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Special Notes Field */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Special Notes / Requests</label>
                                            {isEditing ? (
                                                <>
                                                    <textarea 
                                                        value={data.notes}
                                                        onChange={e => setData('notes', e.target.value)}
                                                        rows={3}
                                                        className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                        placeholder="Any extra requests..."
                                                    />
                                                    {errors.notes && <p className="text-red-500 text-xs mt-1">{errors.notes}</p>}
                                                </>
                                            ) : (
                                                <p className="text-sm text-gray-700 whitespace-pre-line">{selectedDetailBooking.notes || 'None'}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Attendees</label>
                                            {isEditing ? (
                                                <>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={data.attendees}
                                                        onChange={e => setData('attendees', e.target.value)}
                                                        className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                        required
                                                    />
                                                    {errors.attendees && <p className="text-red-500 text-xs mt-1">{errors.attendees}</p>}
                                                </>
                                            ) : (
                                                <p className="text-sm text-gray-700">{selectedDetailBooking.attendees ?? 'Not specified'}</p>
                                            )}
                                        </div>

                                        {selectedDetailBooking.facility.allowTdevsManpower && (
                                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                                <input
                                                    type="checkbox"
                                                    checked={data.needs_manpower}
                                                    disabled={!isEditing}
                                                    onChange={e => setData('needs_manpower', e.target.checked)}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                Request TDEVS manpower
                                                {errors.needs_manpower && <span className="text-red-500 text-xs">{errors.needs_manpower}</span>}
                                            </label>
                                        )}
                                    </div>

                                    {/* Full Status History */}
                                    <div>
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center mb-2">
                                            <History className="h-4 w-4 mr-1" /> Full Status History
                                        </h4>
                                        <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                            {activityLogs.filter(l => l.booking_id === selectedDetailBooking.id).map(log => (
                                                <li key={log.id} className="text-xs bg-white border border-gray-100 rounded p-3 shadow-sm flex flex-col gap-1">
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-gray-800">{log.action.replace('STATUS_', '')}</span>
                                                        <span className="text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-gray-500">Performed by: {log.performed_by}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Modal Actions Footer */}
                                <div className="bg-gray-50 px-6 py-4 flex justify-between gap-2 border-t border-gray-100">
                                    <div>
                                        {isEditing ? (
                                            <button
                                                type="button"
                                                onClick={() => setIsEditing(false)}
                                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                                disabled={processing}
                                            >
                                                Cancel Edit
                                            </button>
                                        ) : (
                                            /* 🔒 Strict enforcement: "Edit Details" only mounts if booking status is exactly 'pending' */
                                            selectedDetailBooking.status?.toLowerCase() === 'pending' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEditing(true)}
                                                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-indigo-700 bg-white hover:bg-indigo-50"
                                                >
                                                    <Edit3 className="mr-2 h-4 w-4" /> Edit Details
                                                </button>
                                            )
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        {isEditing && (
                                            <button
                                                type="submit"
                                                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 shadow-sm disabled:opacity-50"
                                                disabled={processing}
                                            >
                                                <Save className="mr-2 h-4 w-4" /> {processing ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleCloseDetails}
                                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300"
                                            disabled={processing}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </form>

                            
                            {/* Save Changes Confirmation Modal */}
                            {showSaveConfirm && (
                                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                                    <button
                                        type="button"
                                        aria-label="Close confirmation"
                                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                                        onClick={() => setShowSaveConfirm(false)}
                                        disabled={processing}
                                    />

                                    <div
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="save-confirm-title"
                                        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                                    >
                                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                                            <Save className="h-6 w-6 text-indigo-600" />
                                        </div>

                                        <h3
                                            id="save-confirm-title"
                                            className="text-xl font-bold text-gray-900"
                                        >
                                            Save booking changes?
                                        </h3>

                                        <p className="mt-2 text-sm leading-6 text-gray-600">
                                            Are you sure you want to save the changes
                                            you've made to this booking? Your updated
                                            details will be submitted for administrator review.
                                        </p>

                                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setShowSaveConfirm(false)}
                                                disabled={processing}
                                                className="inline-flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                Go Back
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleConfirmSave}
                                                disabled={processing}
                                                className="inline-flex justify-center items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Save className="mr-2 h-4 w-4" />
                                                {processing ? 'Saving...' : 'Yes, Save Changes'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}