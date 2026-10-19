import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { CalendarDays, Clock3, RefreshCw } from 'lucide-react';
import { CalendarView } from './CalendarView';

export default function CalendarDashboard({
    serverFacilities = [],
    serverBookings = [],
    selectedDate = '',
}) {
    const handleDateChange = (event) => {
        const date = event.target.value;

        if (!date) return;

        router.get(
            route('schedule.index'),
            { date },
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
                    <CalendarDays className="h-5 w-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold text-gray-800">
                        Schedule Grid
                    </h2>
                </div>
            }
        >
            <Head title="Schedule Grid | ReserveIT" />

            <div className="min-w-0 w-full py-5 sm:py-7">
                <div className="mx-auto w-full max-w-[1600px] min-w-0 px-3 sm:px-5 lg:px-8">
                    {/* Page heading and date controls */}
                    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <div className="mb-1 flex items-center gap-2">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                                    <CalendarDays className="h-5 w-5 text-indigo-600" />
                                </div>

                                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                    Facility Schedule
                                </h1>
                            </div>

                            <p className="ml-12 text-sm text-slate-500">
                                Review facility availability and booking
                                conflicts by day.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:min-w-[270px]">
                            <label
                                htmlFor="schedule-date"
                                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                            >
                                <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
                                Schedule date
                            </label>

                            <input
                                id="schedule-date"
                                type="date"
                                value={selectedDate}
                                onChange={handleDateChange}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                            />

                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                                <span>{formattedDate}</span>
                            </div>
                        </div>
                    </div>

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

                            <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
                                <CalendarDays className="h-4 w-4" />
                                {serverFacilities.length}{' '}
                                {serverFacilities.length === 1
                                    ? 'facility'
                                    : 'facilities'}
                            </div>
                        </div>

                        <div className="min-w-0 p-3 sm:p-5">
                            <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-100 bg-white">
                                <div className="min-w-0">
                                    <CalendarView
                                        serverFacilities={serverFacilities}
                                        serverBookings={serverBookings}
                                        selectedDate={selectedDate}
                                    />
                                </div>
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
                                            { date: selectedDate },
                                            {
                                                preserveState: false,
                                                preserveScroll: true,
                                            }
                                        );
                                    }
                                }}
                                disabled={!selectedDate}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
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