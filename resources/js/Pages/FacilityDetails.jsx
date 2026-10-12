import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import {
  Users, MapPin, AlertCircle, Calendar as CalendarIcon,
  ArrowLeft, BadgeCheck, X,
} from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BookingModal from '@/Components/BookingModal';

// ─────────────────────────────────────────────────────────────────────────────
// Primary Export View Component
// ─────────────────────────────────────────────────────────────────────────────
export default function FacilityDetails({ facility, blackoutDates, bookings, availablePersonnel }) {
  const [bookingOpen, setBookingOpen] = useState(false);

  if (!facility) {
    return (
      <>
        <Head title="Facility Not Found | ReserveIT" />
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Not Found</h2>}>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Facility not found</h2>
        </div>
        </AuthenticatedLayout>
      </>
    );
  }

  const isAlwaysConsent = facility.requirement === 'CONSENT_REQUIRED';

  return (
    <>
      <Head title={`${facility.name} | ReserveIT`} />
      <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">{facility.name} Details</h2>}>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <button onClick={() => window.history.back()} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-6 group">
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to facilities
        </button>

        {/* Hero Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="h-64 sm:h-80 w-full relative">
            <img src={facility.imageUrl} alt={facility.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <span className="inline-block px-3 py-1 mb-2 rounded-full text-xs font-bold bg-indigo-500/90 backdrop-blur-md uppercase">
                {facility.type}
              </span>
              <h1 className="text-3xl font-bold">{facility.name}</h1>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-2">About this facility</h2>
                <p className="text-gray-600 leading-relaxed">{facility.description}</p>

                <div className="grid grid-cols-2 gap-4 mt-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg"><MapPin className="h-4 w-4 text-gray-500" /></div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Location</p>
                      <p className="text-sm font-semibold text-gray-800">{facility.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg"><Users className="h-4 w-4 text-gray-500" /></div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Capacity</p>
                      <p className="text-sm font-semibold text-gray-800">{facility.capacity ? `${facility.capacity} people` : 'Unspecified'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button onClick={() => setBookingOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors w-full sm:w-auto">
                  <CalendarIcon className="h-4 w-4" /> Book this facility
                </button>

              </div>
            </div>

            {/* Facility Admins */}
            {facility.facility_admins?.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-indigo-400" /> Facility Admins</h3>
                <div className="flex flex-wrap gap-2">
                  {facility.facility_admins.map((admin) => (
                    <div key={admin.id} className="flex items-center gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-2.5">
                      <div>
                        <p className="text-xs font-bold text-indigo-900 leading-tight">{admin.name}</p>
                        <p className="text-[10px] text-indigo-400">{admin.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Dialog Modal Container */}
      {bookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setBookingOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
              <div>
                <h2 className="font-bold text-gray-900">Book {facility.name}</h2>
              </div>
              <button onClick={() => setBookingOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"><X className="h-5 w-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              <BookingModal facility={facility} blackoutDates={blackoutDates} existingBookings={bookings} onClose={() => setBookingOpen(false)} />
            </div>
          </div>
        </div>
      )}
      </AuthenticatedLayout>
    </>
  );
}