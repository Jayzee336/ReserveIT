import { X, CalendarDays, Clock3, Building2, Mail } from 'lucide-react';

function displayText(value, fallback = '—') {
    if (value == null || value === '') return fallback;
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') return value.name ?? value.label ?? value.title ?? fallback;
    return fallback;
}

function formatDate(value) {
    if (!value) return 'Date unavailable';
    const date = new Date(String(value).slice(0, 10) + 'T12:00:00');
    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(value) {
    if (!value) return '—';
    const parts = String(value).slice(0, 5).split(':').map(Number);
    const hours = parts[0];
    const minutes = parts[1];
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return String(value);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function StatusPill({ status }) {
    const styles = {
        pending: 'bg-amber-50 text-amber-800',
        approved: 'bg-emerald-50 text-emerald-800',
        completed: 'bg-sky-50 text-sky-800',
        declined: 'bg-rose-50 text-rose-800',
        cancelled: 'bg-slate-100 text-slate-700',
    };
    return (
        <span className={'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ' + (styles[status] || styles.pending)}>
            {status || 'Unknown'}
        </span>
    );
}

export default function DashboardDrilldownModal({ title, description, items = [], mode = 'bookings', onClose }) {
    if (!title) return null;

    // Laravel props may be serialized as an array or a paginator-like object.
    // Normalize them before rendering so an unexpected shape cannot crash the dashboard.
    const records = Array.isArray(items)
        ? items
        : Array.isArray(items?.data)
            ? items.data
            : items && typeof items === 'object'
                ? Object.values(items)
                : [];

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" onClick={onClose}>
            <section
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4 sm:px-6">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#846A75]">Dashboard details</p>
                        <h2 className="mt-1 text-lg font-bold text-[#6A535C]">{title}</h2>
                        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close details" className="rounded-lg p-2 text-slate-500 transition hover:bg-stone-100 hover:text-slate-900">
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="overflow-y-auto p-4 sm:p-6">
                    {records.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-10 text-center text-sm text-slate-500">
                            No records are available for this metric.
                        </div>
                    ) : mode === 'clients' ? (
                        <div className="space-y-3">
                            {records.map((item, index) => (
                                <article key={String(item.email || item.name) + '-' + index} className="rounded-xl border border-stone-200 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-slate-900">{item.name || 'Client'}</p>
                                            {item.email && <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Mail className="h-3.5 w-3.5"/>{item.email}</p>}
                                        </div>
                                        <span className="rounded-lg bg-[#F4ECEF] px-3 py-1.5 text-xs font-semibold text-[#6A535C]">{item.bookings || 0} bookings</span>
                                    </div>
                                    {item.lastBooking && <p className="mt-2 text-xs text-slate-500">Last booking: {formatDate(item.lastBooking)}</p>}
                                </article>
                            ))}
                        </div>
                    ) : mode === 'facilities' ? (
                        <div className="space-y-3">
                            {records.map((item, index) => (
                                <article key={String(item.name) + '-' + index} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 p-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F4ECEF] text-[#6A535C]"><Building2 className="h-4 w-4"/></span>
                                        <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                                    </div>
                                    <span className="shrink-0 text-sm font-bold text-[#6A535C]">{item.bookings || 0} bookings</span>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {records.map((item, index) => (
                                <article key={String(item.id || item.facility) + '-' + index} className="rounded-xl border border-stone-200 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-900">{displayText(item.facility || item.facility_name, 'Facility')}</p>
                                            <p className="mt-1 text-xs text-slate-500">{displayText(item.client, item.user?.name || '')}</p>
                                        </div>
                                        <StatusPill status={item.display_status || item.status}/>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                                        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5"/>{formatDate(item.date || item.booking_date)}</span>
                                        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5"/>{formatTime(item.start_time)} – {formatTime(item.end_time)}</span>
                                    </div>
                                    {Number(item.overtime_minutes || 0) > 0 && (
                                        <p className="mt-2 text-xs font-medium text-amber-700">
                                            Overtime: {item.overtime_minutes} minutes · ₱{Number(item.overtime_fee_amount || 0).toFixed(2)}
                                        </p>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </div>
                <footer className="flex items-center justify-between border-t border-stone-200 px-5 py-3">
                    <span className="text-xs text-slate-500">{records.length} {records.length === 1 ? 'record' : 'records'}</span>
                    <button type="button" onClick={onClose} className="rounded-xl bg-[#6A535C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#533E45]">Close</button>
                </footer>
            </section>
        </div>
    );
}
