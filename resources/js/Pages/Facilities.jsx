import React, { useState } from 'react';
import { Link, Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Users,
    MapPin,
    ShieldAlert,
    CheckCircle2,
    Building2,
    Filter,
    X,
    SortAsc,
    Tag,
    Check,
    Search,
} from 'lucide-react';

const SORT_LABELS = {
    alphabetical: 'Alphabetical (A–Z)',
    capacity: 'By Capacity (High–Low)',
    floor: 'By Floor',
};

const TYPE_LABELS = {
    All: 'All Types',
    Venue: 'Venue',
    Laboratory: 'Laboratory',
};

export default function Dashboard({ auth, facilities }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [sortBy, setSortBy] = useState('alphabetical');

    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [pendingType, setPendingType] = useState(filterType);
    const [pendingSort, setPendingSort] = useState(sortBy);

    const activeFilterCount =
        (filterType !== 'All' ? 1 : 0) +
        (sortBy !== 'alphabetical' ? 1 : 0);

    const openModal = () => {
        setPendingType(filterType);
        setPendingSort(sortBy);
        setFilterModalOpen(true);
    };

    const applyFilters = () => {
        setFilterType(pendingType);
        setSortBy(pendingSort);
        setFilterModalOpen(false);
    };

    const resetFilters = () => {
        setPendingType('All');
        setPendingSort('alphabetical');
    };

    const filteredFacilities = (facilities || [])
        .filter((facility) => {
            const name = (facility.name || '').toLowerCase();
            const search = searchTerm.toLowerCase();

            const matchesSearch = name.includes(search);
            const matchesType =
                filterType === 'All' || facility.type === filterType;

            return matchesSearch && matchesType;
        })
        .sort((a, b) => {
            if (sortBy === 'alphabetical') {
                return (a.name || '').localeCompare(b.name || '');
            }

            if (sortBy === 'capacity') {
                return (b.capacity ?? 0) - (a.capacity ?? 0);
            }

            if (sortBy === 'floor') {
                const getFloorNum = (location) => {
                    if (!location) return 99;

                    const normalized = location.toLowerCase();

                    if (normalized.includes('ground')) return 0;

                    const match = location.match(/(\d+)/);
                    return match ? parseInt(match[0], 10) : 99;
                };

                return getFloorNum(a.location) - getFloorNum(b.location);
            }

            return 0;
        });

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Facility Dashboard
                </h2>
            }
        >
            <Head title="Facilities" />

            {/* Expanded page container with reduced outer whitespace */}
            <div className="w-full min-w-0 py-3">
                <div className="w-full min-w-0 px-1 sm:px-2">

                    {/* Search, active filters, and filter button */}
                    <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
                        <div className="mr-auto flex flex-wrap items-center gap-2">
                            {filterType !== 'All' && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                    {filterType}
                                    <button
                                        type="button"
                                        aria-label="Clear category filter"
                                        onClick={() => setFilterType('All')}
                                        className="ml-0.5 hover:text-indigo-900"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            )}

                            {sortBy !== 'alphabetical' && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                                    {SORT_LABELS[sortBy]}
                                    <button
                                        type="button"
                                        aria-label="Clear sorting filter"
                                        onClick={() => setSortBy('alphabetical')}
                                        className="ml-0.5 hover:text-gray-900"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            )}
                        </div>

                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search facilities..."
                                aria-label="Search facilities"
                                className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400"
                                value={searchTerm}
                                onChange={(event) =>
                                    setSearchTerm(event.target.value)
                                }
                            />
                        </div>

                        <button
                            type="button"
                            onClick={openModal}
                            className={`relative flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                                activeFilterCount > 0
                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                    : 'border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50'
                            }`}
                        >
                            <Filter className="h-4 w-4" />
                            <span>Filters</span>

                            {activeFilterCount > 0 && (
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Responsive facility grid */}
                    <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {filteredFacilities.map((facility) => (
                            <Link
                                key={facility.id}
                                href={`/facility/${facility.id}`}
                                className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <div className="relative h-40 w-full shrink-0 overflow-hidden">
                                    <img
                                        src={facility.imageUrl}
                                        alt={facility.name}
                                        loading="lazy"
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                                        <span className="inline-flex items-center rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-gray-800 shadow-sm backdrop-blur-sm">
                                            {facility.type}
                                        </span>

                                        {facility.requirement === 'CONSENT_REQUIRED' ? (
                                            <span className="inline-flex items-center rounded-full bg-amber-50/95 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-sm backdrop-blur-sm">
                                                <ShieldAlert className="mr-1 h-3 w-3 text-amber-600" />
                                                Consent
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full bg-emerald-50/95 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-sm backdrop-blur-sm">
                                                <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />
                                                Standard
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-grow flex-col p-4">
                                    <h3 className="mb-0.5 line-clamp-1 text-base font-bold text-gray-900 transition-colors group-hover:text-indigo-600">
                                        {facility.name}
                                    </h3>

                                    <div className="mb-2 flex items-center text-xs text-gray-500">
                                        <MapPin className="mr-1 h-3.5 w-3.5 shrink-0 text-gray-400" />
                                        <span className="line-clamp-1">
                                            {facility.location}
                                        </span>
                                    </div>

                                    <p className="mb-3.5 line-clamp-2 flex-grow text-xs leading-relaxed text-gray-500">
                                        {facility.description}
                                    </p>

                                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-2.5 text-xs text-gray-500">
                                        <div className="flex min-w-0 items-center text-gray-600">
                                            <Users className="mr-1 h-3.5 w-3.5 shrink-0 text-gray-400" />
                                            <span className="truncate">
                                                Cap: {facility.capacity || 'Unspecified'}
                                            </span>
                                        </div>

                                        <span className="shrink-0 font-semibold text-indigo-600 transition-transform group-hover:translate-x-0.5">
                                            Book →
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {filteredFacilities.length === 0 && (
                        <div className="py-12 text-center">
                            <Building2 className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                            <h3 className="text-lg font-medium text-gray-900">
                                No facilities found
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Adjust your search or filter settings.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Filter and sort modal */}
            {filterModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        aria-label="Close filters"
                        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm"
                        onClick={() => setFilterModalOpen(false)}
                    />

                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="facility-filter-title"
                        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-indigo-600" />
                                <h3
                                    id="facility-filter-title"
                                    className="font-bold text-gray-900"
                                >
                                    Filter &amp; Sort
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={() => setFilterModalOpen(false)}
                                aria-label="Close filter dialog"
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-6 px-6 py-5">
                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <Tag className="h-3.5 w-3.5 text-gray-500" />
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        Category
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {['All', 'Venue', 'Laboratory'].map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setPendingType(type)}
                                            className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                                                pendingType === type
                                                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                                                    : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                                            }`}
                                        >
                                            {pendingType === type && (
                                                <Check className="h-3.5 w-3.5" />
                                            )}
                                            {TYPE_LABELS[type]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <SortAsc className="h-3.5 w-3.5 text-gray-500" />
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        Sort By
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {Object.entries(SORT_LABELS).map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setPendingSort(value)}
                                            className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition-all ${
                                                pendingSort === value
                                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                            }`}
                                        >
                                            <span>{label}</span>

                                            {pendingSort === value && (
                                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600">
                                                    <Check className="h-2.5 w-2.5 text-white" />
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                            >
                                Reset
                            </button>

                            <button
                                type="button"
                                onClick={applyFilters}
                                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}