import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { CalendarDays, Clock3, RefreshCw } from 'lucide-react';
import { CalendarView } from './CalendarView';

export default function CalendarDashboard({
    serverFacilities = [],
    serverBookings = [],
    selectedDate = '',
    scheduleView = 'all',
    canToggleScheduleView = false,
    availabilityOnly = false,
}) {
    const handleDateChange = (valueOrEvent) => {
        const date = typeof valueOrEvent === 'string'
            ? valueOrEvent
            : valueOrEvent?.target?.value;

        if (!date) return;

        router.get(
            route('schedule.index'),
            { date, ...(canToggleScheduleView ? { view: scheduleView } : {}) },
            {
                preserveState: false,
                preserveScroll: true,
            }
        );
    };

    const handleScheduleViewChange = (view) => {
        router.get(
            route('schedule.index'),
            { date: selectedDate, view },
            {
                preserveState: false,
                preserveScroll: true,
            }
        );
    };

    const formattedDate = selectedDate
        ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
              'en-US',
              {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
              }
          )
        : 'Select a date';

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-[#6A535C]" />
                    <h2 className="text-lg font-semibold text-gray-800">
                        Facility Calendar
                    </h2>
                </div>
            }
        >
            <Head title="Facility Calendar | ReserveIT" />

            <div className="min-w-0 w-full py-5 sm:py-7">
                <div className="mx-auto w-full max-w-[1600px] min-w-0 px-3 sm:px-5 lg:px-8">
                    {/* Page heading and date controls */}
                    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <div className="mb-1 flex items-center gap-2">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7F0F3]">
                                    <CalendarDays className="h-5 w-5 text-[#6A535C]" />
                                </div>

                                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                    Facility Schedule
                                </h1>
                            </div>

                            <p className="ml-12 text-sm text-slate-500">
                                {availabilityOnly
                                    ? 'Compare availability across every facility to avoid booking conflicts.'
                                    : 'Review reservations and availability for facilities assigned to you.'}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:min-w-[270px]">
                            <label
                                htmlFor="schedule-date"
                                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                            >
                                <CalendarDays className="h-3.5 w-3.5 text-[#846A75]" />
                                Schedule date
                            </label>

                            <input
                                id="schedule-date"
                                type="date"
                                value={selectedDate}
                                onChange={handleDateChange}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-[#A98C97] focus:bg-white focus:ring-2 focus:ring-[#EFE4E9]"
                            />

                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                                <span>{formattedDate}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mb-5 flex justify-end">
                        <Link
                            href={route('activity-plans.index')}
                            className="inline-flex items-center gap-2 rounded-xl border border-[#D9C8CF] bg-white px-4 py-2.5 text-sm font-semibold text-[#543F48] shadow-sm transition hover:bg-[#F7F0F3]"
                        >
                            <CalendarDays className="h-4 w-4" />
                            Recurring activity plans
                        </Link>
                    </div>

                    {canToggleScheduleView && (
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">Schedule visibility</p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    All Facilities lets you check availability and request bookings anywhere. Existing reservation details and management remain limited to your assigned facilities.
                                </p>
                            </div>
                            <div className="inline-flex rounded-lg bg-slate-100 p-1" role="group" aria-label="Schedule visibility">
                                <button
                                    type="button"
                                    onClick={() => handleScheduleViewChange('assigned')}
                                    aria-pressed={scheduleView === 'assigned'}
                                    className={`rounded-md px-3 py-2 text-xs font-semibold transition ${scheduleView === 'assigned' ? 'bg-white text-[#543F48] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    My Assigned Facilities
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleScheduleViewChange('all')}
                                    aria-pressed={scheduleView === 'all'}
                                    className={`rounded-md px-3 py-2 text-xs font-semibold transition ${scheduleView === 'all' ? 'bg-white text-[#543F48] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    All Facilities
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Schedule calendar */}
                    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-5">
                            <div>
                                <h2 className="text-base font-bold text-slate-800">
                                    Daily Availability
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    View scheduled bookings across available
                                    facilities.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 rounded-lg bg-[#F7F0F3] px-3 py-2 text-xs font-medium text-[#543F48]">
                                <CalendarDays className="h-4 w-4" />
                                {serverFacilities.length}{' '}
                                {serverFacilities.length === 1
                                    ? 'facility'
                                    : 'facilities'}
                            </div>
                        </div>

                        <div className="min-w-0 p-3 sm:p-5">
                            <div className="min-w-0">
                                    <CalendarView
                                        serverFacilities={serverFacilities}
                                        serverBookings={serverBookings}
                                        selectedDate={selectedDate}
                                        availabilityOnly={availabilityOnly}
                                        onDateChange={handleDateChange}
                                        scheduleView={scheduleView}
                                    />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
                            <p className="text-xs text-slate-500">
                                Schedule information is based on the selected
                                date.
                            </p>

                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedDate) {
                                        router.get(
                                            route('schedule.index'),
                                            { date: selectedDate, ...(canToggleScheduleView ? { view: scheduleView } : {}) },
                                            {
                                                preserveState: false,
                                                preserveScroll: true,
                                            }
                                        );
                                    }
                                }}
                                disabled={!selectedDate}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#E8D8D1] hover:bg-[#F7F0F3] hover:text-[#543F48] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Refresh schedule
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}