import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    Search,
    MessageCircle,
    Filter,
    X,
    Pencil,
    History,
    Clock,
    ChevronDown,
    ChevronUp,
    CalendarDays,
    UserRound,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';

const CATEGORY_COLORS = {
    Facility: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    'UI Improvements': 'bg-purple-50 text-purple-700 ring-purple-600/20',
    Account: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Bug: 'bg-red-50 text-red-700 ring-red-600/20',
    Others: 'bg-gray-50 text-gray-700 ring-gray-600/20',
};

const formatDate = (value) => {
    if (!value) return 'Unknown date';

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? 'Unknown date'
        : date.toLocaleString('en-PH');
};

// Format date-only values using the local calendar date.
// This avoids timezone conversion shifting YYYY-MM-DD values.
const formatAppealDate = (value) => {
    if (!value) return null;

    const stringValue = String(value);
    const dateOnly = stringValue.slice(0, 10);
    const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
        const date = new Date(stringValue);

        return Number.isNaN(date.getTime())
            ? stringValue
            : date.toLocaleDateString('en-PH', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
              });
    }

    const [, year, month, day] = match;
    const numericYear = Number(year);
    const numericMonth = Number(month);
    const numericDay = Number(day);

    const date = new Date(
        numericYear,
        numericMonth - 1,
        numericDay,
    );

    if (
        date.getFullYear() !== numericYear ||
        date.getMonth() !== numericMonth - 1 ||
        date.getDate() !== numericDay
    ) {
        return null;
    }

    return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

export default function Concerns({ concerns, filters = {} }) {
    const records = concerns?.data ?? [];

    const [search, setSearch] = useState(filters.search ?? '');
    const [categoryFilter, setCategoryFilter] = useState(
        filters.category ?? '',
    );

    const [replyModal, setReplyModal] = useState(null);
    const [editModal, setEditModal] = useState(null);
    const [historyModal, setHistoryModal] = useState(null);

    const [replyText, setReplyText] = useState('');
    const [editText, setEditText] = useState('');

    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const handleSearch = (value) => {
        setSearch(value);

        router.get(
            route('admin.concerns.index'),
            {
                search: value || null,
                category: categoryFilter || null,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const handleCategoryFilter = (value) => {
        setCategoryFilter(value);

        router.get(
            route('admin.concerns.index'),
            {
                search: search || null,
                category: value || null,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const clearFilters = () => {
        setSearch('');
        setCategoryFilter('');

        router.get(
            route('admin.concerns.index'),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const openReplyModal = (concern) => {
        setReplyText('');
        setReplyModal(concern);
    };

    const openEditModal = (concern) => {
        setEditText(concern.admin_reply ?? '');
        setEditModal(concern);
    };

    const closeReplyModal = () => {
        if (isReplying) return;

        setReplyModal(null);
        setReplyText('');
    };

    const closeEditModal = () => {
        if (isEditing) return;

        setEditModal(null);
        setEditText('');
    };

    const submitReply = (e) => {
        e.preventDefault();

        if (!replyModal || !replyText.trim()) {
            toast.error('Please enter a reply before submitting.');
            return;
        }

        setIsReplying(true);

        router.post(
            route('admin.concerns.reply', replyModal.id),
            {
                admin_reply: replyText.trim(),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Reply sent successfully.');
                    setReplyModal(null);
                    setReplyText('');
                },
                onError: () => {
                    toast.error(
                        'Unable to send the reply. Please check your input.',
                    );
                },
                onFinish: () => setIsReplying(false),
            },
        );
    };

    const submitEdit = (e) => {
        e.preventDefault();

        if (!editModal || !editText.trim()) {
            toast.error('Please enter a reply before saving.');
            return;
        }

        const updatedReply = editText.trim();
        const previousReply = editModal.admin_reply ?? '';

        if (updatedReply === previousReply) {
            toast.info('No changes were made to the reply.');
            return;
        }

        setIsEditing(true);

        router.patch(
            route('admin.concerns.updateReply', editModal.id),
            {
                admin_reply: updatedReply,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Reply updated successfully.');
                    setEditModal(null);
                    setEditText('');
                },
                onError: () => {
                    toast.error(
                        'Unable to update the reply. Please check your input.',
                    );
                },
                onFinish: () => setIsEditing(false),
            },
        );
    };

    const resolveConcern = (concern) => {
        const confirmed = window.confirm(
            `Are you sure you want to mark concern #${concern.id} as resolved?`,
        );

        if (!confirmed) return;

        router.patch(
            route('admin.concerns.resolve', concern.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Concern marked as resolved.');
                },
                onError: () => {
                    toast.error('Unable to resolve this concern.');
                },
            },
        );
    };

    const hasActiveFilters = Boolean(search || categoryFilter);

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        User Concerns
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Review user reports, track appeal dates, and manage
                        support replies.
                    </p>
                </div>
            }
        >
            <Head title="User Concerns" />

            <div className="space-y-6 p-4 sm:p-6">
                {/* Search and category filters */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative min-w-0 flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                        <input
                            type="text"
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search by description or user name..."
                            aria-label="Search concerns"
                            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    <div className="relative sm:w-56 sm:shrink-0">
                        <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                        <select
                            value={categoryFilter}
                            onChange={(e) =>
                                handleCategoryFilter(e.target.value)
                            }
                            aria-label="Filter concerns by category"
                            className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        >
                            <option value="">All Categories</option>
                            <option value="Facility">Facility</option>
                            <option value="UI Improvements">
                                UI Improvements
                            </option>
                            <option value="Account">Account</option>
                            <option value="Bug">Bug</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                        >
                            <X className="h-4 w-4" />
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Separate cards make individual reports easier to distinguish. */}
                {records.length === 0 ? (
                    <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <MessageCircle className="h-6 w-6" />
                        </div>

                        <h2 className="text-sm font-semibold text-slate-800">
                            {hasActiveFilters
                                ? 'No matching concerns'
                                : 'No concerns yet'}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            {hasActiveFilters
                                ? 'Try changing your search or category filter.'
                                : 'Submitted user concerns will appear here.'}
                        </p>
                    </section>
                ) : (
                    <ul className="space-y-5">
                        {records.map((concern) => {
                            const histories =
                                concern.reply_histories ?? [];
                            const latestEdit = histories[0] ?? null;
                            const hasReply = Boolean(concern.admin_reply);
                            const isExpanded =
                                historyModal?.id === concern.id;
                            const formattedAppealDate =
                                formatAppealDate(concern.appeal_date);

                            return (
                                <li
                                    key={concern.id}
                                    className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md sm:p-6"
                                >
                                    <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start">
                                        {/* Concern information */}
                                        <div className="min-w-0 flex-1">
                                            {/* Category, status, and ticket number */}
                                            <div className="mb-4 flex flex-wrap items-center gap-2">
                                                {concern.category && (
                                                    <span
                                                        className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                                                            CATEGORY_COLORS[
                                                                concern.category
                                                            ] ??
                                                            CATEGORY_COLORS.Others
                                                        }`}
                                                    >
                                                        {concern.category}
                                                    </span>
                                                )}

                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                                                        concern.status ===
                                                        'resolved'
                                                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                                            : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                                                    }`}
                                                >
                                                    {concern.status ===
                                                    'resolved' ? (
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <Clock className="h-3.5 w-3.5" />
                                                    )}

                                                    {concern.status ===
                                                    'resolved'
                                                        ? 'Resolved'
                                                        : 'Pending'}
                                                </span>

                                                <span className="text-xs text-slate-400">
                                                    Ticket #{concern.id}
                                                </span>
                                            </div>

                                            {/* Appeal date panel */}
                                            <div
                                                className={`mb-5 flex min-w-0 flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 ${
                                                    formattedAppealDate
                                                        ? 'border-blue-100 bg-blue-50/70'
                                                        : 'border-amber-200 bg-amber-50/70'
                                                }`}
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div
                                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                                            formattedAppealDate
                                                                ? 'bg-blue-100 text-blue-600'
                                                                : 'bg-amber-100 text-amber-700'
                                                        }`}
                                                    >
                                                        {formattedAppealDate ? (
                                                            <CalendarDays className="h-4 w-4" />
                                                        ) : (
                                                            <AlertCircle className="h-4 w-4" />
                                                        )}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p
                                                            className={`text-[10px] font-bold uppercase tracking-wider ${
                                                                formattedAppealDate
                                                                    ? 'text-blue-700'
                                                                    : 'text-amber-800'
                                                            }`}
                                                        >
                                                            Appeal Date
                                                        </p>

                                                        <p
                                                            className={`break-words text-sm font-semibold ${
                                                                formattedAppealDate
                                                                    ? 'text-blue-900'
                                                                    : 'text-amber-800'
                                                            }`}
                                                        >
                                                            {formattedAppealDate ??
                                                                'Not provided'}
                                                        </p>

                                                        <p
                                                            className={`mt-0.5 text-xs ${
                                                                formattedAppealDate
                                                                    ? 'text-blue-700'
                                                                    : 'text-amber-800'
                                                            }`}
                                                        >
                                                            {formattedAppealDate
                                                                ? 'The appeal date is recorded for this concern.'
                                                                : 'No appeal date has been recorded for this concern.'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span
                                                    className={`inline-flex shrink-0 items-center gap-1 self-start rounded-full px-2.5 py-1 text-[10px] font-semibold sm:self-center ${
                                                        formattedAppealDate
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-amber-100 text-amber-800'
                                                    }`}
                                                >
                                                    {formattedAppealDate ? (
                                                        <CalendarDays className="h-3 w-3" />
                                                    ) : (
                                                        <AlertCircle className="h-3 w-3" />
                                                    )}

                                                    {formattedAppealDate
                                                        ? 'Date recorded'
                                                        : 'Missing date'}
                                                </span>
                                            </div>

                                            {/* Concern message */}
                                            <div className="min-w-0">
                                                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    Concern Details
                                                </p>

                                                <p className="min-w-0 whitespace-pre-wrap text-sm leading-6 text-slate-800 [overflow-wrap:anywhere]">
                                                    {concern.detailed_info ??
                                                        concern.message ??
                                                        'No description provided.'}
                                                </p>
                                            </div>

                                            {/* Submitter information is visually separated from the report. */}
                                            <div className="mt-5 flex min-w-0 flex-col gap-3 border-t border-slate-200 pt-4">
                                                <div className="flex min-w-0 items-start gap-3">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                                        <UserRound className="h-4 w-4" />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                            Submitted By
                                                        </p>

                                                        <p className="mt-0.5 break-words text-sm font-semibold text-slate-700">
                                                            {concern.user
                                                                ?.name ??
                                                                'Guest'}
                                                        </p>

                                                        {concern.user
                                                            ?.email && (
                                                            <p className="mt-0.5 break-words text-xs text-slate-500">
                                                                {
                                                                    concern
                                                                        .user
                                                                        .email
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                                                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="font-medium">
                                                        Submitted:
                                                    </span>
                                                    {formatDate(
                                                        concern.created_at,
                                                    )}
                                                </p>
                                            </div>

                                            {/* Current admin reply */}
                                            {hasReply && (
                                                <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <MessageCircle className="h-4 w-4 text-emerald-700" />

                                                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                                                                Admin Reply
                                                            </p>
                                                        </div>

                                                        {histories.length > 0 && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                                                                <Pencil className="h-3 w-3" />
                                                                Edited
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="min-w-0 whitespace-pre-wrap text-sm leading-6 text-emerald-900 [overflow-wrap:anywhere]">
                                                        {concern.admin_reply}
                                                    </p>

                                                    {latestEdit && (
                                                        <p className="mt-3 flex flex-wrap items-center gap-1 text-xs text-emerald-700">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            Last edited{' '}
                                                            {formatDate(
                                                                latestEdit.created_at,
                                                            )}
                                                            {latestEdit.editor
                                                                ?.name
                                                                ? ` by ${latestEdit.editor.name}`
                                                                : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex shrink-0 flex-wrap gap-2 border-t border-slate-100 pt-4 lg:w-40 lg:flex-col lg:border-t-0 lg:pt-0">
                                            {!hasReply &&
                                                concern.status ===
                                                    'pending' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openReplyModal(
                                                                    concern,
                                                                )
                                                            }
                                                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                                        >
                                                            <MessageCircle className="h-4 w-4" />
                                                            Reply
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                resolveConcern(
                                                                    concern,
                                                                )
                                                            }
                                                            className="inline-flex items-center justify-center rounded-xl bg-[#6A535C] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#533e45] focus:outline-none focus:ring-2 focus:ring-[#6A535C]/30"
                                                        >
                                                            Mark resolved
                                                        </button>
                                                    </>
                                                )}

                                            {hasReply && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditModal(
                                                                concern,
                                                            )
                                                        }
                                                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                        Edit Reply
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setHistoryModal(
                                                                isExpanded
                                                                    ? null
                                                                    : concern,
                                                            )
                                                        }
                                                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-100"
                                                    >
                                                        <History className="h-4 w-4" />
                                                        History (
                                                        {histories.length})
                                                        {isExpanded ? (
                                                            <ChevronUp className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Reply edit history */}
                                    {hasReply && isExpanded && (
                                        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                                            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                                                <History className="h-4 w-4" />
                                                Reply Edit History
                                            </h3>

                                            {histories.length === 0 ? (
                                                <p className="text-sm text-slate-500">
                                                    No edits have been recorded
                                                    for this reply.
                                                </p>
                                            ) : (
                                                <ol className="space-y-4">
                                                    {histories.map((history) => (
                                                        <li
                                                            key={history.id}
                                                            className="rounded-xl border border-slate-200 bg-white p-4"
                                                        >
                                                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                                <span className="text-xs font-semibold text-slate-700">
                                                                    {history
                                                                        .editor
                                                                        ?.name ??
                                                                        'Administrator'}
                                                                </span>

                                                                <span className="text-xs text-slate-500">
                                                                    {formatDate(
                                                                        history.created_at,
                                                                    )}
                                                                </span>
                                                            </div>

                                                            <div className="grid gap-3 md:grid-cols-2">
                                                                <div className="min-w-0 rounded-lg bg-red-50/70 p-3">
                                                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-red-700">
                                                                        Previous Reply
                                                                    </p>

                                                                    <p className="whitespace-pre-wrap text-sm text-slate-700 [overflow-wrap:anywhere]">
                                                                        {history.previous_reply}
                                                                    </p>
                                                                </div>

                                                                <div className="min-w-0 rounded-lg bg-emerald-50/70 p-3">
                                                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                                                        Updated Reply
                                                                    </p>

                                                                    <p className="whitespace-pre-wrap text-sm text-slate-800 [overflow-wrap:anywhere]">
                                                                        {history.updated_reply}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ol>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* Pagination */}
                {concerns?.last_page > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        {concerns.links?.map((link, i) => (
                            <button
                                key={`${i}-${link.label}`}
                                type="button"
                                onClick={() => {
                                    if (link.url) {
                                        router.get(
                                            link.url,
                                            {},
                                            {
                                                preserveState: true,
                                                preserveScroll: true,
                                                replace: true,
                                            },
                                        );
                                    }
                                }}
                                disabled={!link.url || link.active}
                                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                                    link.active
                                        ? 'bg-[#6A535C] text-white'
                                        : link.url
                                          ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                                          : 'cursor-not-allowed bg-slate-50 text-slate-300'
                                }`}
                                dangerouslySetInnerHTML={{
                                    __html: link.label,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* New reply modal */}
            {replyModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="reply-modal-title"
                        className="my-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
                    >
                        <div className="mb-5">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
                                Support response
                            </p>

                            <h3
                                id="reply-modal-title"
                                className="mt-1 text-xl font-semibold text-slate-900"
                            >
                                Reply to concern
                            </h3>

                            <p className="mt-2 text-sm text-slate-500">
                                {replyModal.user?.name ?? 'Guest'} · Ticket #
                                {replyModal.id}
                            </p>
                        </div>

                        <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                Original concern
                            </p>

                            <p className="whitespace-pre-wrap leading-6 [overflow-wrap:anywhere]">
                                {replyModal.detailed_info ??
                                    replyModal.message}
                            </p>
                        </div>

                        <form onSubmit={submitReply} className="space-y-4">
                            <textarea
                                value={replyText}
                                onChange={(e) =>
                                    setReplyText(e.target.value)
                                }
                                rows={5}
                                maxLength={5000}
                                className="block w-full resize-y rounded-2xl border border-slate-200 p-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                placeholder="Write a clear and helpful response..."
                                required
                            />

                            <p className="text-right text-xs text-slate-400">
                                {replyText.length}/5000 characters
                            </p>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeReplyModal}
                                    disabled={isReplying}
                                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        isReplying || !replyText.trim()
                                    }
                                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isReplying ? 'Sending...' : 'Send Reply'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit reply modal */}
            {editModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-modal-title"
                        className="my-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
                    >
                        <div className="mb-5">
                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
                                <Pencil className="h-4 w-4" />
                                Reply management
                            </p>

                            <h3
                                id="edit-modal-title"
                                className="mt-1 text-xl font-semibold text-slate-900"
                            >
                                Edit admin reply
                            </h3>

                            <p className="mt-2 text-sm text-slate-500">
                                {editModal.user?.name ?? 'Guest'} · Ticket #
                                {editModal.id}
                            </p>
                        </div>

                        <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                Original concern
                            </p>

                            <p className="whitespace-pre-wrap leading-6 [overflow-wrap:anywhere]">
                                {editModal.detailed_info ??
                                    editModal.message}
                            </p>
                        </div>

                        <form onSubmit={submitEdit} className="space-y-4">
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={6}
                                maxLength={5000}
                                className="block w-full resize-y rounded-2xl border border-slate-200 p-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                placeholder="Update the admin reply..."
                                required
                            />

                            <p className="text-right text-xs text-slate-400">
                                {editText.length}/5000 characters
                            </p>

                            <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                                The previous reply will be retained in the
                                edit history. The ticket status will not change.
                            </p>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    disabled={isEditing}
                                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={isEditing || !editText.trim()}
                                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isEditing
                                        ? 'Saving...'
                                        : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}