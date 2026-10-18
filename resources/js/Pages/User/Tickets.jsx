import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    Ticket,
    MessageCircle,
    Pencil,
    X,
    Save,
    CalendarDays,
    CalendarCheck,
    CalendarX,
    AlertTriangle,
    CheckCircle2,
    Clock,
} from 'lucide-react';

const CATEGORIES = [
    'Facility',
    'UI Improvements',
    'Account',
    'Bug',
    'Others',
];

const CATEGORY_COLORS = {
    Facility: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    'UI Improvements': 'bg-purple-50 text-purple-700 ring-purple-600/20',
    Account: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Bug: 'bg-red-50 text-red-700 ring-red-600/20',
    Others: 'bg-gray-50 text-gray-700 ring-gray-600/20',
};

const STATUS_STYLES = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
};

const WRAP_TEXT =
    'min-w-0 max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere]';

function formatDate(value) {
    if (!value) return null;

    const stringValue = String(value);
    let date;

    // Parse date-only values locally to avoid timezone shifts.
    if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
        const [year, month, day] = stringValue.split('-').map(Number);
        date = new Date(year, month - 1, day);

        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return stringValue;
        }
    } else {
        date = new Date(stringValue);
    }

    return Number.isNaN(date.getTime())
        ? stringValue
        : date.toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
          });
}

function formatSubmittedDate(value) {
    if (!value) return 'Date unavailable';

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? 'Date unavailable'
        : date.toLocaleString('en-PH');
}

function TicketEditForm({ ticket, onCancel }) {
    const { data, setData, patch, processing, errors, reset } = useForm({
        category: ticket.category ?? 'Others',
        detailed_info: ticket.detailed_info ?? ticket.message ?? '',
    });

    useEffect(() => {
        setData({
            category: ticket.category ?? 'Others',
            detailed_info: ticket.detailed_info ?? ticket.message ?? '',
        });
    }, [ticket.id]);

    const submit = (event) => {
        event.preventDefault();

        patch(route('concerns.my-tickets.update', ticket.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onCancel();
            },
        });
    };

    return (
        <form
            onSubmit={submit}
            className="mt-4 min-w-0 max-w-full space-y-4 overflow-hidden rounded-xl border border-blue-100 bg-blue-50/50 p-4"
        >
            <div className="min-w-0">
                <label
                    htmlFor={`category-${ticket.id}`}
                    className="mb-1 block text-sm font-medium text-gray-700"
                >
                    Category
                </label>

                <select
                    id={`category-${ticket.id}`}
                    value={data.category}
                    onChange={(event) =>
                        setData('category', event.target.value)
                    }
                    required
                    className="block w-full min-w-0 max-w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                    {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                            {category}
                        </option>
                    ))}
                </select>

                {errors.category && (
                    <p className={`mt-1 text-sm text-red-600 ${WRAP_TEXT}`}>
                        {errors.category}
                    </p>
                )}
            </div>

            <div className="min-w-0">
                <label
                    htmlFor={`details-${ticket.id}`}
                    className="mb-1 block text-sm font-medium text-gray-700"
                >
                    Detailed Information
                </label>

                <textarea
                    id={`details-${ticket.id}`}
                    value={data.detailed_info}
                    onChange={(event) =>
                        setData('detailed_info', event.target.value)
                    }
                    required
                    rows={5}
                    maxLength={5000}
                    className="block w-full min-w-0 max-w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Describe your concern in detail..."
                />

                <div className="mt-1 flex min-w-0 flex-wrap items-start justify-between gap-2">
                    {errors.detailed_info ? (
                        <p
                            className={`min-w-0 text-sm text-red-600 ${WRAP_TEXT}`}
                        >
                            {errors.detailed_info}
                        </p>
                    ) : (
                        <p className="min-w-0 text-xs text-gray-500">
                            Update the details of your concern.
                        </p>
                    )}

                    <span className="shrink-0 text-xs text-gray-400">
                        {data.detailed_info.length}/5000
                    </span>
                </div>
            </div>

            <div className="flex min-w-0 flex-wrap justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={processing}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                    <X className="h-4 w-4 shrink-0" />
                    Cancel
                </button>

                <button
                    type="submit"
                    disabled={processing}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Save className="h-4 w-4 shrink-0" />
                    {processing ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
}

function AppealDatePanel({ appealDate }) {
    const formattedDate = formatDate(appealDate);
    const hasDate = Boolean(formattedDate);

    return (
        <div
            className={`flex min-w-0 max-w-full flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 ${
                hasDate
                    ? 'border-blue-100 bg-blue-50/70'
                    : 'border-amber-200 bg-amber-50/70'
            }`}
        >
            <div className="flex min-w-0 items-start gap-3">
                <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        hasDate
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                    }`}
                >
                    {hasDate ? (
                        <CalendarCheck className="h-4 w-4" />
                    ) : (
                        <CalendarX className="h-4 w-4" />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                            hasDate ? 'text-blue-700' : 'text-amber-800'
                        }`}
                    >
                        Appeal Date
                    </p>

                    <p
                        className={`mt-0.5 text-sm font-semibold ${WRAP_TEXT} ${
                            hasDate ? 'text-blue-900' : 'text-amber-900'
                        }`}
                    >
                        {formattedDate ?? 'Not provided'}
                    </p>

                    <p
                        className={`mt-0.5 text-xs leading-5 ${WRAP_TEXT} ${
                            hasDate ? 'text-blue-700' : 'text-amber-800'
                        }`}
                    >
                        {hasDate
                            ? 'The appeal date is recorded for this ticket.'
                            : 'No appeal date has been recorded for this ticket.'}
                    </p>
                </div>
            </div>

            <span
                className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    hasDate
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                }`}
            >
                {hasDate ? (
                    <CalendarCheck className="h-3 w-3" />
                ) : (
                    <AlertTriangle className="h-3 w-3" />
                )}

                {hasDate ? 'Date recorded' : 'Missing date'}
            </span>
        </div>
    );
}

export default function Tickets({ tickets = [] }) {
    const [editingTicketId, setEditingTicketId] = useState(null);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex min-w-0 flex-col gap-1">
                    <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900">
                        My Tickets
                    </h1>

                    <p className="text-sm text-slate-500">
                        Track your submitted support tickets and view admin
                        replies.
                    </p>
                </div>
            }
        >
            <Head title="My Tickets" />

            <div className="w-full min-w-0 max-w-full space-y-5 p-3 sm:p-6">
                {tickets.length === 0 ? (
                    <div className="min-w-0 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <Ticket className="h-6 w-6" />
                        </div>

                        <p className="mt-4 text-sm font-semibold text-slate-800">
                            No tickets submitted yet.
                        </p>

                        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                            Click the chat bubble button in the bottom-right
                            corner to submit a ticket.
                        </p>
                    </div>
                ) : (
                    tickets.map((ticket) => {
                        const status = String(
                            ticket.status ?? 'pending',
                        ).toLowerCase();

                        const isResolved = status === 'resolved';

                        const description =
                            ticket.detailed_info ??
                            ticket.message ??
                            'No description provided.';

                        return (
                            <article
                                key={ticket.id}
                                className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
                            >
                                <div className="flex min-w-0 max-w-full flex-col gap-4">
                                    {/* Ticket heading and submission date */}
                                    <div className="flex min-w-0 max-w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                <span
                                                    className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                                                        CATEGORY_COLORS[
                                                            ticket.category
                                                        ] ?? CATEGORY_COLORS.Others
                                                    }`}
                                                >
                                                    {ticket.category ?? 'Others'}
                                                </span>

                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                                                        STATUS_STYLES[status] ??
                                                        STATUS_STYLES.pending
                                                    }`}
                                                >
                                                    {isResolved ? (
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <Clock className="h-3.5 w-3.5" />
                                                    )}

                                                    {isResolved
                                                        ? 'Resolved'
                                                        : 'Pending'}
                                                </span>

                                                <span className="text-xs text-slate-400">
                                                    Ticket #{ticket.id}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 sm:shrink-0 sm:justify-end">
                                            <CalendarDays className="h-3.5 w-3.5 shrink-0" />

                                            <span className={WRAP_TEXT}>
                                                <span className="font-semibold">
                                                    Submitted:
                                                </span>{' '}
                                                {formatSubmittedDate(
                                                    ticket.created_at,
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Concern details */}
                                    <div className="min-w-0 border-t border-slate-100 pt-3">
                                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Ticket Details
                                        </p>

                                        <p
                                            className={`${WRAP_TEXT} text-sm leading-6 text-slate-800`}
                                        >
                                            {description}
                                        </p>
                                    </div>

                                    {/* Appeal date */}
                                    <AppealDatePanel
                                        appealDate={ticket.appeal_date}
                                    />

                                    {/* Edit report */}
                                    {!isResolved && (
                                        <div className="min-w-0 border-t border-slate-100 pt-3">
                                            {editingTicketId === ticket.id ? (
                                                <TicketEditForm
                                                    ticket={ticket}
                                                    onCancel={() =>
                                                        setEditingTicketId(null)
                                                    }
                                                />
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setEditingTicketId(
                                                            ticket.id,
                                                        )
                                                    }
                                                    className="inline-flex max-w-full items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                >
                                                    <Pencil className="h-4 w-4 shrink-0" />
                                                    Edit Report
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Admin reply */}
                                    {ticket.admin_reply && (
                                        <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                                            <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                                                <MessageCircle className="h-4 w-4 shrink-0 text-emerald-700" />

                                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                                                    Admin Reply
                                                </p>
                                            </div>

                                            <p
                                                className={`${WRAP_TEXT} text-sm leading-6 text-emerald-900`}
                                            >
                                                {ticket.admin_reply}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </article>
                        );
                    })
                )}
            </div>
        </AuthenticatedLayout>
    );
}