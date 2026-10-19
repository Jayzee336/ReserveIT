import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    Plus, Pencil, Trash2, X, Users, MapPin, Search,
    Filter, Tag, SortAsc, Check, ShieldAlert, CheckCircle2,
    Building2, Eye,
} from 'lucide-react';

const FACILITY_PLACEHOLDER = '/images/facility-placeholder.svg';

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

const EMPTY_FORM = {
    name: '',
    type: 'Venue',
    capacity: '',
    description: '',
    imageUrl: '',
    imageFile: null,
    requirement: 'STANDARD',
    location: '',
    requiresWeekendConsent: true,
    allowTdevsManpower: true,
    assigned_admin_ids: [],
};

function FacilityImage({ src, alt, className }) {
    const [imageSrc, setImageSrc] = useState(
        src || FACILITY_PLACEHOLDER
    );

    return (
        <img
            src={imageSrc}
            alt={alt || 'Facility'}
            onError={() => {
                if (imageSrc !== FACILITY_PLACEHOLDER) {
                    setImageSrc(FACILITY_PLACEHOLDER);
                }
            }}
            className={className}
        />
    );
}

function FieldError({ message }) {
    if (!message) return null;

    return (
        <p className="mt-1 text-xs font-medium text-red-600" role="alert">
            {message}
        </p>
    );
}

// --- DELETE CONFIRMATION MODAL ---
function DeleteConfirmationModal({
    facility,
    isDeleting,
    onConfirm,
    onClose,
}) {
    if (!facility) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                    <Trash2 className="h-6 w-6" />
                </div>

                <h3 className="text-lg font-bold text-gray-900">
                    Delete Facility
                </h3>

                <p className="text-sm text-gray-500 mt-2">
                    Are you sure you want to delete{' '}
                    <strong className="text-gray-900">
                        "{facility.name}"
                    </strong>
                    ? This action removes it permanently from the database
                    and updates all user dashboards.
                </p>

                <div className="mt-6 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition shadow-sm disabled:opacity-50"
                    >
                        {isDeleting ? 'Deleting…' : 'Yes, Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- FACILITY DETAILS MODAL ---
function FacilityDetailsModal({
    facility,
    isSuperAdmin,
    isFacilityAdmin,
    onEdit,
    onDelete,
    onClose,
}) {
    if (!facility) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="relative h-48 w-full bg-gray-100 flex-shrink-0">
                    <FacilityImage
                        src={facility.imageUrl}
                        alt={facility.name}
                        className="w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close facility details"
                        className="absolute top-3 right-3 p-2 bg-black/40 text-white hover:bg-black/60 rounded-full backdrop-blur-sm transition"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="absolute bottom-4 left-6 right-6 text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md">
                                {facility.type}
                            </span>

                            {facility.requirement === 'CONSENT_REQUIRED' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/80 backdrop-blur-md">
                                    <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                                    Consent Required
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/80 backdrop-blur-md">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                    Standard
                                </span>
                            )}
                        </div>

                        <h2 className="text-2xl font-bold">
                            {facility.name}
                        </h2>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto space-y-5">
                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-indigo-600" />
                            <span className="font-medium text-gray-900">
                                {facility.location}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-indigo-600" />
                            <span>
                                Capacity:{' '}
                                <strong className="text-gray-900">
                                    {facility.capacity || 'Unspecified'}
                                </strong>
                            </span>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Description
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            {facility.description}
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Booking Policies
                        </h4>

                        <div className="text-xs text-gray-600 flex items-center gap-2">
                            <Check className={`h-4 w-4 ${
                                facility.requiresWeekendConsent
                                    ? 'text-indigo-600'
                                    : 'text-gray-300'
                            }`} />
                            Weekend Consent Letter Required:{' '}
                            <strong>
                                {facility.requiresWeekendConsent ? 'Yes' : 'No'}
                            </strong>
                        </div>

                        <div className="text-xs text-gray-600 flex items-center gap-2">
                            <Check className={`h-4 w-4 ${
                                facility.allowTdevsManpower
                                    ? 'text-indigo-600'
                                    : 'text-gray-300'
                            }`} />
                            TDEVS Manpower Support Allowed:{' '}
                            <strong>
                                {facility.allowTdevsManpower ? 'Yes' : 'No'}
                            </strong>
                        </div>
                    </div>

                    {facility.facility_admins?.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Assigned Facility Admins
                            </h4>

                            <div className="flex flex-wrap gap-2">
                                {facility.facility_admins.map((admin) => (
                                    <span
                                        key={admin.id}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold"
                                    >
                                        <Users className="h-3.5 w-3.5" />
                                        {admin.name} ({admin.email})
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {(isSuperAdmin || isFacilityAdmin) && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => onDelete(facility)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold transition"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete Facility
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 text-sm font-semibold transition"
                            >
                                Close
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onEdit(facility);
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
                            >
                                <Pencil className="h-4 w-4" />
                                Edit Settings
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- CREATE / EDIT FACILITY MODAL ---
function FacilityFormModal({
    facility,
    facilityAdmins = [],
    isSuperAdmin,
    onClose,
}) {
    const isEditing = !!facility;

    const [form, setForm] = useState(() => {
        if (!facility) return { ...EMPTY_FORM };

        return {
            ...EMPTY_FORM,
            ...facility,
            capacity: facility.capacity ?? '',
            imageUrl: facility.imageUrl ?? '',
            imageFile: null,
            requiresWeekendConsent:
                Boolean(facility.requiresWeekendConsent),
            allowTdevsManpower: Boolean(facility.allowTdevsManpower),
            assigned_admin_ids:
                facility.facility_admins?.map((admin) => admin.id) ?? [],
        };
    });

    const [errors, setErrors] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateField = (key, value) => {
        setForm((current) => ({ ...current, [key]: value }));

        setErrors((current) => {
            const next = { ...current };
            delete next[key];
            return next;
        });
    };

    const toggleAssignedAdmin = (adminId) => {
        setForm((current) => {
            const assigned = new Set(current.assigned_admin_ids ?? []);

            if (assigned.has(adminId)) {
                assigned.delete(adminId);
            } else {
                assigned.add(adminId);
            }

            return {
                ...current,
                assigned_admin_ids: Array.from(assigned),
            };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        const requiredFields = [
            ['name', 'Facility name'],
            ['type', 'Facility type'],
            ['capacity', 'Capacity'],
            ['location', 'Location'],
            ['description', 'Description'],
            ['requirement', 'Consent requirement'],
        ];

        const clientErrors = {};

        requiredFields.forEach(([key, label]) => {
            const value = form[key];

            if (value === null || value === undefined || String(value).trim() === '') {
                clientErrors[key] = `${label} is required.`;
            }
        });

        if (
            form.capacity !== '' &&
            (!Number.isInteger(Number(form.capacity)) ||
                Number(form.capacity) < 1)
        ) {
            clientErrors.capacity = 'Capacity must be a whole number of at least 1.';
        }

        if (!['Venue', 'Laboratory'].includes(form.type)) {
            clientErrors.type = 'Please select a valid facility type.';
        }

        if (!['STANDARD', 'CONSENT_REQUIRED'].includes(form.requirement)) {
            clientErrors.requirement = 'Please select a valid consent requirement.';
        }

        if (Object.keys(clientErrors).length > 0) {
            setErrors(clientErrors);
            toast.error('Please complete all required fields.');
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        const payload = new FormData();

        payload.append('name', form.name.trim());
        payload.append('type', form.type);
        payload.append('capacity', String(form.capacity).trim());
        payload.append('description', form.description.trim());
        payload.append('location', form.location.trim());
        payload.append('requirement', form.requirement);

        // Always submit both booleans, including when unchecked.
        payload.append(
            'requiresWeekendConsent',
            form.requiresWeekendConsent ? '1' : '0'
        );
        payload.append(
            'allowTdevsManpower',
            form.allowTdevsManpower ? '1' : '0'
        );

        if (isSuperAdmin) {
            (form.assigned_admin_ids ?? []).forEach((id) => {
                payload.append('assigned_admin_ids[]', String(id));
            });
        }

        if (form.imageFile) {
            payload.append('image', form.imageFile);
        } else if (form.imageUrl?.trim()) {
            payload.append('imageUrl', form.imageUrl.trim());
        } else if (isEditing && facility.imageUrl) {
            payload.append('imageUrl', facility.imageUrl);
        }

        const options = {
            onSuccess: () => {
                toast.success(
                    isEditing ? 'Facility updated.' : 'Facility created.'
                );
                onClose();
            },
            onError: (serverErrors) => {
                setErrors(serverErrors);

                const firstError = Object.values(serverErrors)[0];
                toast.error(
                    typeof firstError === 'string'
                        ? firstError
                        : 'Please review the form and correct the errors.'
                );
            },
            onFinish: () => setIsSubmitting(false),
        };

        if (isEditing) {
            payload.append('_method', 'patch');

            router.post(
                route('admin.facilities.update', facility.id),
                payload,
                options
            );
        } else {
            router.post(
                route('admin.facilities.store'),
                payload,
                options
            );
        }
    };

    const inputClass = (field) =>
        `block w-full rounded-xl p-2.5 text-sm focus:ring-2 ${
            errors[field]
                ? 'border-red-400 focus:ring-red-300'
                : 'border-gray-200 focus:ring-indigo-400'
        }`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => {
                    if (!isSubmitting) onClose();
                }}
            />

            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
                    <h2 className="font-bold text-gray-900">
                        {isEditing ? 'Edit Facility' : 'Add Facility'}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label="Close facility form"
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="overflow-y-auto flex-1"
                >
                    <div className="px-6 py-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Facility Name <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                maxLength={255}
                                value={form.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                className={inputClass('name')}
                                placeholder="Enter facility name"
                            />
                            <FieldError message={errors.name} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Facility Type <span className="text-red-600">*</span>
                                </label>
                                <select
                                    required
                                    value={form.type}
                                    onChange={(e) => updateField('type', e.target.value)}
                                    className={inputClass('type')}
                                >
                                    <option value="Venue">Venue</option>
                                    <option value="Laboratory">Laboratory</option>
                                </select>
                                <FieldError message={errors.type} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Capacity <span className="text-red-600">*</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    step="1"
                                    value={form.capacity}
                                    onChange={(e) => updateField('capacity', e.target.value)}
                                    className={inputClass('capacity')}
                                    placeholder="Enter capacity"
                                />
                                <FieldError message={errors.capacity} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Location <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                maxLength={255}
                                value={form.location ?? ''}
                                onChange={(e) => updateField('location', e.target.value)}
                                className={inputClass('location')}
                                placeholder="Building, room, or campus location"
                            />
                            <FieldError message={errors.location} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description <span className="text-red-600">*</span>
                            </label>
                            <textarea
                                required
                                rows={3}
                                value={form.description ?? ''}
                                onChange={(e) => updateField('description', e.target.value)}
                                className={`${inputClass('description')} resize-none`}
                                placeholder="Describe the facility"
                            />
                            <FieldError message={errors.description} />
                        </div>

                        <div className="space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-3">
                            <label className="block text-sm font-semibold text-gray-700">
                                Facility Image <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>

                            <p className="text-xs text-gray-500">
                                Upload an image or enter a local image path or URL.
                                If neither is provided, the placeholder will be used.
                            </p>

                            {isEditing && facility.imageUrl && (
                                <div className="flex items-center gap-3">
                                    <div className="h-16 w-24 overflow-hidden rounded-lg bg-gray-100">
                                        <FacilityImage
                                            src={facility.imageUrl}
                                            alt={`${facility.name} current image`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        Current facility image
                                    </span>
                                </div>
                            )}

                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    updateField('imageFile', file);

                                    if (file) {
                                        updateField('imageUrl', '');
                                    }
                                }}
                                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-indigo-700"
                            />

                            <input
                                type="text"
                                value={form.imageUrl ?? ''}
                                onChange={(e) => {
                                    updateField('imageUrl', e.target.value);

                                    if (e.target.value.trim()) {
                                        updateField('imageFile', null);
                                    }
                                }}
                                className="block w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-400"
                                placeholder="/storage/facilities/example.jpg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Consent Requirement <span className="text-red-600">*</span>
                            </label>
                            <select
                                required
                                value={form.requirement}
                                onChange={(e) => updateField('requirement', e.target.value)}
                                className={inputClass('requirement')}
                            >
                                <option value="STANDARD">
                                    Standard (no consent unless weekend)
                                </option>
                                <option value="CONSENT_REQUIRED">
                                    Always requires consent
                                </option>
                            </select>
                            <FieldError message={errors.requirement} />
                        </div>

                        <div className="rounded-xl border border-gray-200 p-3 space-y-3">
                            <p className="text-sm font-semibold text-gray-700">
                                Facility Settings
                            </p>

                            <label className="flex items-start gap-2.5 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={Boolean(form.requiresWeekendConsent)}
                                    onChange={(e) =>
                                        updateField('requiresWeekendConsent', e.target.checked)
                                    }
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                                />
                                <span>
                                    Requires consent letter for weekend bookings
                                    <span className="block text-xs text-gray-500 mt-0.5">
                                        Choose whether weekend bookings need a consent letter.
                                    </span>
                                </span>
                            </label>

                            <label className="flex items-start gap-2.5 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={Boolean(form.allowTdevsManpower)}
                                    onChange={(e) =>
                                        updateField('allowTdevsManpower', e.target.checked)
                                    }
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                                />
                                <span>
                                    Allow requesting TDEVS manpower
                                    <span className="block text-xs text-gray-500 mt-0.5">
                                        Choose whether TDEVS manpower can be requested.
                                    </span>
                                </span>
                            </label>
                        </div>

                        {isSuperAdmin && (
                            <div className="pt-2 border-t border-gray-100">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    Facility Admins (Optional)
                                </label>

                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search admins by name or email"
                                    className="block w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-400"
                                />

                                <div className="mt-3 max-h-48 overflow-y-auto border border-gray-200 rounded-2xl bg-white">
                                    {facilityAdmins
                                        .filter((admin) => {
                                            const query = searchQuery.toLowerCase();

                                            return (
                                                admin.name?.toLowerCase().includes(query) ||
                                                admin.email?.toLowerCase().includes(query)
                                            );
                                        })
                                        .map((admin) => {
                                            const selected = (
                                                form.assigned_admin_ids ?? []
                                            ).some((id) => String(id) === String(admin.id));

                                            return (
                                                <button
                                                    type="button"
                                                    key={admin.id}
                                                    onClick={() => toggleAssignedAdmin(admin.id)}
                                                    className={`w-full text-left px-4 py-3 transition ${
                                                        selected
                                                            ? 'bg-indigo-50 text-indigo-900'
                                                            : 'hover:bg-gray-50 text-gray-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold">
                                                                {admin.name}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {admin.email}
                                                            </p>
                                                        </div>

                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                                                selected
                                                                    ? 'bg-indigo-600 text-white'
                                                                    : 'bg-gray-100 text-gray-600'
                                                            }`}
                                                        >
                                                            {selected ? 'Selected' : 'Select'}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}

                                    {facilityAdmins.length === 0 && (
                                        <p className="px-4 py-3 text-sm text-gray-500">
                                            No facility admins available.
                                        </p>
                                    )}
                                </div>

                                {Object.keys(form.assigned_admin_ids ?? {}).length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {facilityAdmins
                                            .filter((admin) =>
                                                (form.assigned_admin_ids ?? []).some(
                                                    (id) => String(id) === String(admin.id)
                                                )
                                            )
                                            .map((admin) => (
                                                <span
                                                    key={admin.id}
                                                    className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
                                                >
                                                    {admin.name}
                                                </span>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-5 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-3">
                            Fields marked <span className="text-red-600">*</span> are required.
                        </p>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:bg-indigo-300"
                        >
                            {isSubmitting
                                ? 'Saving…'
                                : isEditing
                                  ? 'Save Changes'
                                  : 'Create Facility'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- MAIN FACILITIES PAGE ---
export default function Facilities({
    facilities = [],
    facilityAdmins = [],
    auth,
}) {
    const pageAuth = usePage().props.auth;
    const currentUser = auth?.user ?? pageAuth?.user ?? {};

    const [formModalState, setFormModalState] = useState(null);
    const [viewingFacility, setViewingFacility] = useState(null);
    const [facilityToDelete, setFacilityToDelete] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [sortBy, setSortBy] = useState('alphabetical');
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [pendingType, setPendingType] = useState(filterType);
    const [pendingSort, setPendingSort] = useState(sortBy);

    const userRole = currentUser.role ?? 'user';
    const isSuperAdmin = userRole === 'super_admin';
    const isFacilityAdmin = userRole === 'facility_admin';

    const activeFilterCount =
        (filterType !== 'All' ? 1 : 0) +
        (sortBy !== 'alphabetical' ? 1 : 0);

    const openFilterModal = () => {
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
            const query = searchTerm.toLowerCase();

            const matchesSearch =
                facility.name?.toLowerCase().includes(query) ||
                facility.location?.toLowerCase().includes(query) ||
                facility.type?.toLowerCase().includes(query) ||
                facility.description?.toLowerCase().includes(query);

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
                    if (location.toLowerCase().includes('ground')) return 0;

                    const match = location.match(/(\d+)/);
                    return match ? parseInt(match[0], 10) : 99;
                };

                return getFloorNum(a.location) - getFloorNum(b.location);
            }

            return 0;
        });

    const handleConfirmDelete = () => {
        if (!facilityToDelete || deletingId !== null) return;

        setDeletingId(facilityToDelete.id);

        router.delete(
            route('admin.facilities.destroy', facilityToDelete.id),
            {
                onFinish: () => {
                    setDeletingId(null);
                    setFacilityToDelete(null);
                    setViewingFacility(null);
                },
                onSuccess: () =>
                    toast.success('Facility deleted from database.'),
                onError: () => toast.error('Failed to delete facility.'),
            }
        );
    };

    return (
        <AuthenticatedLayout
            user={currentUser}
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Facility Configuration &amp; Management
                </h2>
            }
        >
            <Head title="Facility Management" />

            <div className="py-6">
                <div className="mx-auto w-full max-w-none px-4 sm:px-6 lg:px-8 2xl:px-10">
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Facility Settings
                            </h1>
                            <p className="text-sm text-gray-500">
                                Configure, assign, or delete campus facilities
                                across all user endpoints.
                            </p>
                        </div>

                        {(isSuperAdmin || isFacilityAdmin) && (
                            <button
                                type="button"
                                onClick={() => setFormModalState('create')}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors self-start sm:self-auto"
                            >
                                <Plus className="h-4 w-4" />
                                Add Facility
                            </button>
                        )}
                    </div>

                    <div className="mb-6 flex flex-wrap items-center gap-3">
                        <div className="relative w-full sm:w-80 md:w-96 mr-auto">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search facilities..."
                                className="w-full pl-10 pr-6 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 text-sm bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {filterType !== 'All' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    {filterType}
                                    <button
                                        type="button"
                                        onClick={() => setFilterType('All')}
                                        className="ml-0.5 hover:text-indigo-900"
                                        aria-label="Remove type filter"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            )}

                            {sortBy !== 'alphabetical' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                                    {SORT_LABELS[sortBy]}
                                    <button
                                        type="button"
                                        onClick={() => setSortBy('alphabetical')}
                                        className="ml-0.5 hover:text-gray-900"
                                        aria-label="Remove sort option"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={openFilterModal}
                            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                                activeFilterCount > 0
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm'
                            }`}
                        >
                            <Filter className="h-4 w-4" />
                            <span>Filters</span>
                            {activeFilterCount > 0 && (
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                        {filteredFacilities.map((facility) => (
                            <div
                                key={facility.id}
                                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col group relative"
                            >
                                <div
                                    className="relative h-40 w-full overflow-hidden bg-gray-100 cursor-pointer"
                                    onClick={() => setViewingFacility(facility)}
                                >
                                    <FacilityImage
                                        src={facility.imageUrl}
                                        alt={facility.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                                    <div className="absolute top-3 left-3 flex space-x-1.5">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/95 text-gray-800 backdrop-blur-sm shadow-sm">
                                            {facility.type}
                                        </span>

                                        {facility.requirement === 'CONSENT_REQUIRED' ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50/95 text-amber-800 backdrop-blur-sm shadow-sm">
                                                <ShieldAlert className="w-3 h-3 mr-1 text-amber-600" />
                                                Consent
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50/95 text-emerald-800 backdrop-blur-sm shadow-sm">
                                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                                Standard
                                            </span>
                                        )}
                                    </div>

                                    {(isSuperAdmin || isFacilityAdmin) && (
                                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFormModalState(facility);
                                                }}
                                                className="p-1.5 rounded-full bg-white/90 text-gray-700 hover:text-indigo-600 hover:bg-white backdrop-blur-sm shadow-sm transition-colors"
                                                title="Edit Facility"
                                                aria-label={`Edit ${facility.name}`}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFacilityToDelete(facility);
                                                }}
                                                disabled={deletingId === facility.id}
                                                className="p-1.5 rounded-full bg-white/90 text-gray-700 hover:text-red-600 hover:bg-white backdrop-blur-sm shadow-sm transition-colors disabled:opacity-50"
                                                title="Delete Facility"
                                                aria-label={`Delete ${facility.name}`}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 flex flex-col flex-grow">
                                    <h3
                                        onClick={() => setViewingFacility(facility)}
                                        className="text-base font-bold text-gray-900 mb-0.5 group-hover:text-indigo-600 transition-colors line-clamp-1 cursor-pointer"
                                    >
                                        {facility.name}
                                    </h3>

                                    <div className="flex items-center text-xs text-gray-500 mb-2">
                                        <MapPin className="flex-shrink-0 mr-1 h-3.5 w-3.5 text-gray-400" />
                                        {facility.location}
                                    </div>

                                    <p className="text-xs text-gray-500 line-clamp-2 mb-3.5 flex-grow leading-relaxed">
                                        {facility.description}
                                    </p>

                                    <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-2.5 mt-auto">
                                        <div className="flex items-center text-gray-600">
                                            <Users className="flex-shrink-0 mr-1 h-3.5 w-3.5 text-gray-400" />
                                            <span>
                                                Cap: {facility.capacity || 'Unspecified'}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setViewingFacility(facility)}
                                            className="text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-800 transition-colors"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            Manage &amp; Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredFacilities.length === 0 && (
                        <div className="text-center py-12">
                            <Building2 className="mx-auto h-12 w-12 text-gray-300 mb-3" />
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

            {filterModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setFilterModalOpen(false)}
                    />

                    <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-indigo-600" />
                                <h3 className="font-bold text-gray-900">
                                    Filter &amp; Sort
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={() => setFilterModalOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                                aria-label="Close filters"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-6">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Tag className="h-3.5 w-3.5 text-gray-500" />
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Category
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {['All', 'Venue', 'Laboratory'].map((type) => (
                                        <button
                                            type="button"
                                            key={type}
                                            onClick={() => setPendingType(type)}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                                                pendingType === type
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
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
                                <div className="flex items-center gap-2 mb-3">
                                    <SortAsc className="h-3.5 w-3.5 text-gray-500" />
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Sort By
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {Object.entries(SORT_LABELS).map(([value, label]) => (
                                        <button
                                            type="button"
                                            key={value}
                                            onClick={() => setPendingSort(value)}
                                            className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                                                pendingSort === value
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <span>{label}</span>
                                            {pendingSort === value && (
                                                <span className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                                                    <Check className="h-2.5 w-2.5 text-white" />
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Reset
                            </button>

                            <button
                                type="button"
                                onClick={applyFilters}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewingFacility && (
                <FacilityDetailsModal
                    facility={viewingFacility}
                    isSuperAdmin={isSuperAdmin}
                    isFacilityAdmin={isFacilityAdmin}
                    onEdit={(facility) => setFormModalState(facility)}
                    onDelete={(facility) => setFacilityToDelete(facility)}
                    onClose={() => setViewingFacility(null)}
                />
            )}

            {formModalState && (
                <FacilityFormModal
                    key={formModalState === 'create' ? 'create' : formModalState.id}
                    facility={formModalState === 'create' ? null : formModalState}
                    facilityAdmins={facilityAdmins}
                    isSuperAdmin={isSuperAdmin}
                    onClose={() => setFormModalState(null)}
                />
            )}

            {facilityToDelete && (
                <DeleteConfirmationModal
                    facility={facilityToDelete}
                    isDeleting={deletingId === facilityToDelete.id}
                    onConfirm={handleConfirmDelete}
                    onClose={() => {
                        if (deletingId === null) {
                            setFacilityToDelete(null);
                        }
                    }}
                />
            )}
        </AuthenticatedLayout>
    );
}