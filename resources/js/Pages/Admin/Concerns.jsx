import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Search, MessageCircle, Filter, X } from 'lucide-react';

const CATEGORY_COLORS = {
    Facility: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    'UI Improvements': 'bg-purple-50 text-purple-700 ring-purple-600/20',
    Account: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Bug: 'bg-red-50 text-red-700 ring-red-600/20',
    Others: 'bg-gray-50 text-gray-700 ring-gray-600/20',
};

export default function Concerns({ concerns, filters = {} }) {
    const records = concerns?.data ?? [];
    const [search, setSearch] = useState(filters.search ?? '');
    const [categoryFilter, setCategoryFilter] = useState(filters.category ?? '');
    const [replyModal, setReplyModal] = useState(null); // concern object
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    const handleSearch = (value) => {
        setSearch(value);
        router.get(
            route('admin.concerns.index'),
            { search: value || null, category: categoryFilter || null },
            { preserveState: true, replace: true },
        );
    };

    const handleCategoryFilter = (value) => {
        setCategoryFilter(value);
        router.get(
            route('admin.concerns.index'),
            { search: search || null, category: value || null },
            { preserveState: true, replace: true },
        );
    };

    const clearFilters = () => {
        setSearch('');
        setCategoryFilter('');
        router.get(route('admin.concerns.index'), {}, { preserveState: true, replace: true });
    };

    const submitReply = (e) => {
        e.preventDefault();
        if (!replyModal || !replyText.trim()) return;

        setIsReplying(true);
        router.post(route('admin.concerns.reply', replyModal.id), {
            admin_reply: replyText.trim(),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Reply sent successfully.');
                setReplyModal(null);
                setReplyText('');
            },
            onError: () => toast.error('Something went wrong.'),
            onFinish: () => setIsReplying(false),
        });
    };

    const hasActiveFilters = search || categoryFilter;

    return (
        <AuthenticatedLayout header={<h1 className="text-2xl font-bold text-slate-900">User Concerns</h1>}>
            <Head title="User Concerns" />

            <div className="space-y-4 p-6">
                {/* Search & Filter Bar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search by description or user name…"
                            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => handleCategoryFilter(e.target.value)}
                            className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        >
                            <option value="">All Categories</option>
                            <option value="Facility">Facility</option>
                            <option value="UI Improvements">UI Improvements</option>
                            <option value="Account">Account</option>
                            <option value="Bug">Bug</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                        >
                            <X className="h-4 w-4" /> Clear
                        </button>
                    )}
                </div>

                {/* Concerns List */}
                <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    {records.length === 0 ? (
                        <p className="p-8 text-center text-sm text-slate-500">
                            {hasActiveFilters ? 'No concerns match your filters.' : 'No concerns have been submitted.'}
                        </p>
                    ) : (
                        <ul className="divide-y divide-stone-100">
                            {records.map((concern) => (
                                <li key={concern.id} className="flex min-w-0 flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            {concern.category && (
                                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CATEGORY_COLORS[concern.category] ?? CATEGORY_COLORS.Others}`}>
                                                    {concern.category}
                                                </span>
                                            )}
                                            {concern.appeal_date && (
                                                <span className="text-xs text-gray-400">Appeal: {concern.appeal_date}</span>
                                            )}
                                        </div>
                                        <p className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm text-slate-800">{concern.detailed_info ?? concern.message}</p>
                                        <p className="mt-2 min-w-0 break-words [overflow-wrap:anywhere] text-xs text-slate-500">
                                            {concern.user?.name ?? 'Guest'} {concern.user?.email ? `(${concern.user.email})` : ''} · {new Date(concern.created_at).toLocaleString()}
                                        </p>

                                        {/* Show admin reply if exists */}
                                        {concern.admin_reply && (
                                            <div className="mt-3 rounded-xl bg-emerald-50 p-3 border border-emerald-100">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1">Admin Reply</p>
                                                <p className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm text-emerald-800">{concern.admin_reply}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex shrink-0 flex-wrap gap-2">
                                        {concern.status === 'pending' ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => setReplyModal(concern)}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                                                >
                                                    <MessageCircle className="h-4 w-4" /> Reply
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => router.patch(route('admin.concerns.resolve', concern.id), {}, { preserveScroll: true })}
                                                    className="shrink-0 rounded-xl bg-[#6A535C] px-3 py-2 text-sm font-semibold text-white hover:bg-[#533e45]"
                                                >
                                                    Mark resolved
                                                </button>
                                            </>
                                        ) : (
                                            <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Resolved</span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Pagination */}
                {concerns?.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        {concerns.links?.map((link, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => router.get(link.url, {}, { preserveState: true, replace: true })}
                                disabled={!link.url || link.active}
                                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                                    link.active
                                        ? 'bg-[#6A535C] text-white'
                                        : link.url
                                            ? 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                            : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Reply Modal */}
            {replyModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
                        <div className="mb-4">
                            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">Reply to Concern</p>
                            <h3 className="mt-1 text-xl font-semibold text-gray-900">Send a reply to the user</h3>
                            <p className="mt-1 text-xs text-gray-500">
                                {replyModal.user?.name ?? 'Guest'} — {replyModal.category ?? 'No category'}
                            </p>
                        </div>

                        <div className="mb-4 min-w-0 rounded-xl bg-stone-50 p-3 text-sm text-gray-600">
                            <p className="font-medium text-gray-800 mb-1">Original message:</p>
                            <p className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{replyModal.detailed_info ?? replyModal.message}</p>
                        </div>

                        <form onSubmit={submitReply} className="space-y-4">
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={5}
                                className="block w-full min-w-0 resize-y rounded-2xl border border-gray-200 p-3 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                placeholder="Type your reply here…"
                                required
                            />

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setReplyModal(null); setReplyText(''); }}
                                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isReplying || replyText.trim().length === 0}
                                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isReplying ? 'Sending…' : 'Send Reply'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}