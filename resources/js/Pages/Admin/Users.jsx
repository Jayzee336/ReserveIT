import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Plus,
    X,
    Copy,
    Check,
    KeyRound,
    Pencil,
    Trash2,
    Power,
    ChevronDown,
    Building2,
    Search,
    Filter,
    AlertTriangle,
} from 'lucide-react';

const ROLE_LABELS = {
    super_admin: 'Super Admin',
    facility_admin: 'Facility Admin',
    user: 'User',
};

const ROLE_STYLES = {
    super_admin: 'bg-[#F8EDF2] text-[#A44773] ring-[#493344]/20',
    facility_admin: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    user: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

function RoleBadge({ role }) {
    return (
        <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                ROLE_STYLES[role] ?? ROLE_STYLES.user
            }`}
        >
            {ROLE_LABELS[role] ?? role}
        </span>
    );
}

function StatusBadge({ isActive }) {
    return isActive ? (
        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-600/20">
            Active
        </span>
    ) : (
        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-gray-100 text-gray-500 ring-gray-500/20">
            Disabled
        </span>
    );
}

/**
 * Custom confirmation modal for resetting a user's password.
 */
function ResetPasswordConfirmModal({
    user,
    isSubmitting,
    onConfirm,
    onClose,
}) {
    const handleKeyDown = useCallback(
        (event) => {
            if (event.key === 'Escape' && !isSubmitting) {
                onClose();
            }
        },
        [isSubmitting, onClose]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Close reset password confirmation"
                onClick={() => {
                    if (!isSubmitting) onClose();
                }}
                disabled={isSubmitting}
                className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm"
            />

            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="reset-password-title"
                aria-describedby="reset-password-description"
                className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
            >
                <div className="flex items-start justify-between border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                            <KeyRound className="h-5 w-5 text-amber-700" />
                        </div>

                        <div>
                            <h2
                                id="reset-password-title"
                                className="text-lg font-bold text-gray-900"
                            >
                                Reset Password?
                            </h2>
                            <p className="mt-0.5 text-xs text-gray-500">
                                Confirm this account action
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label="Close dialog"
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4 px-6 py-5">
                    <p
                        id="reset-password-description"
                        className="text-sm leading-6 text-gray-600"
                    >
                        Generate a new temporary password for{' '}
                        <strong className="font-semibold text-gray-900">
                            {user.name}
                        </strong>
                        ?
                    </p>

                    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                        <div>
                            <p className="text-sm font-semibold text-amber-900">
                                Their current password will stop working
                            </p>
                            <p className="mt-1 text-xs leading-5 text-amber-800">
                                A new temporary password will be generated.
                                Make sure it can be securely provided to the
                                user.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C65B8A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A44773] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <KeyRound className="h-4 w-4" />
                            {isSubmitting
                                ? 'Resetting…'
                                : 'Yes, Reset Password'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Custom confirmation modal for deleting a user account.
 */
function DeleteUserConfirmModal({
    user,
    isSubmitting,
    onConfirm,
    onClose,
}) {
    const handleKeyDown = useCallback(
        (event) => {
            if (event.key === 'Escape' && !isSubmitting) {
                onClose();
            }
        },
        [isSubmitting, onClose]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Close delete account confirmation"
                onClick={() => {
                    if (!isSubmitting) onClose();
                }}
                disabled={isSubmitting}
                className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm"
            />

            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-user-title"
                aria-describedby="delete-user-description"
                className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
            >
                <div className="flex items-start justify-between border-b border-red-100 bg-gradient-to-r from-red-50 to-white px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100">
                            <Trash2 className="h-5 w-5 text-red-700" />
                        </div>

                        <div>
                            <h2
                                id="delete-user-title"
                                className="text-lg font-bold text-gray-900"
                            >
                                Delete Account?
                            </h2>
                            <p className="mt-0.5 text-xs text-gray-500">
                                Confirm before proceeding
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label="Close dialog"
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4 px-6 py-5">
                    <p
                        id="delete-user-description"
                        className="text-sm leading-6 text-gray-600"
                    >
                        Delete{' '}
                        <strong className="font-semibold text-gray-900">
                            {user.name}
                        </strong>
                        's account?
                    </p>

                    <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                        <div>
                            <p className="text-sm font-semibold text-red-900">
                                This user may lose access immediately
                            </p>
                            <p className="mt-1 text-xs leading-5 text-red-800">
                                Verify that you selected the correct account.
                                This action may not be reversible.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3">
                        <p className="text-xs font-medium text-gray-500">
                            Account being deleted
                        </p>
                        <p className="mt-1 break-words text-sm font-semibold text-gray-900">
                            {user.name}
                        </p>
                        <p className="break-all text-xs text-gray-500">
                            {user.email}
                        </p>
                    </div>

                    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Trash2 className="h-4 w-4" />
                            {isSubmitting ? 'Deleting…' : 'Delete Account'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


function FacilityMultiSelect({ facilities = [], selectedIds = [], onChange, disabled = false }) {
    const [search, setSearch] = useState('');

    const normalizedSearch = search.trim().toLowerCase();
    const filteredFacilities = facilities.filter((facility) =>
        facility.name.toLowerCase().includes(normalizedSearch)
    );
    const allFilteredSelected =
        filteredFacilities.length > 0 &&
        filteredFacilities.every((facility) => selectedIds.includes(facility.id));

    const toggleFacility = (facilityId) => {
        onChange(
            selectedIds.includes(facilityId)
                ? selectedIds.filter((id) => id !== facilityId)
                : [...selectedIds, facilityId]
        );
    };

    const selectAllFiltered = () => {
        const next = new Set(selectedIds);
        filteredFacilities.forEach((facility) => next.add(facility.id));
        onChange(Array.from(next));
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-gray-800">
                        {selectedIds.length} {selectedIds.length === 1 ? 'facility' : 'facilities'} selected
                    </p>
                    <p className="text-xs text-gray-500">
                        Choose the facilities this admin can manage.
                    </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                    <button
                        type="button"
                        onClick={selectAllFiltered}
                        disabled={disabled || filteredFacilities.length === 0 || allFilteredSelected}
                        className="text-blue-700 transition hover:text-blue-900 disabled:cursor-not-allowed disabled:text-gray-400"
                    >
                        Select {normalizedSearch ? 'results' : 'all'}
                    </button>
                    <span className="h-3.5 w-px bg-gray-200" />
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        disabled={disabled || selectedIds.length === 0}
                        className="text-gray-500 transition hover:text-gray-800 disabled:cursor-not-allowed disabled:text-gray-300"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search facilities by name..."
                    aria-label="Search facilities"
                    disabled={disabled}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
                />
            </div>

            <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/70 p-2">
                {filteredFacilities.length === 0 ? (
                    <p className="px-3 py-8 text-center text-sm text-gray-500">
                        {facilities.length === 0
                            ? 'No facilities are available.'
                            : 'No facilities match your search.'}
                    </p>
                ) : (
                    filteredFacilities.map((facility) => {
                        const isSelected = selectedIds.includes(facility.id);

                        return (
                            <label
                                key={facility.id}
                                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${isSelected
                                    ? 'border-blue-200 bg-blue-50'
                                    : 'border-transparent bg-white hover:border-gray-200 hover:bg-gray-50'
                                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={disabled}
                                    onChange={() => toggleFacility(facility.id)}
                                    className="h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Building2 className={`h-4 w-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                                <span className={`min-w-0 flex-1 text-sm ${isSelected ? 'font-semibold text-blue-900' : 'font-medium text-gray-700'}`}>
                                    {facility.name}
                                </span>
                                {isSelected && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                            </label>
                        );
                    })
                )}
            </div>
            <p className="text-xs text-gray-500">
                You can select multiple facilities. Use the search field to narrow the list.
            </p>
        </div>
    );
}

function AddUserModal({ facilities = [], onClose }) {
    const [form, setForm] = useState({
        name: '',
        username: '',
        email: '',
        uic_member_type: '',
        role: 'facility_admin',
        password_mode: 'generated',
        password: '',
        password_confirmation: '',
        assigned_facility_ids: [],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateField = (key, value) =>
        setForm((f) => ({ ...f, [key]: value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post(route('admin.users.store'), form, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onError: (errors) =>
                toast.error(
                    Object.values(errors)[0] || 'Failed to create user.'
                ),
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-3 sm:p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative flex max-h-[calc(100dvh-1.5rem)] min-h-0 w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gradient-to-r from-[#F8EDF2] to-white px-6 py-4">
                    <h2 className="font-bold text-gray-900">Add User</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
                    <input
                        type="text"
                        required
                        placeholder="Full name"
                        value={form.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-[#C65B8A]"
                    />

                    <input
                        type="text"
                        required
                        maxLength={30}
                        placeholder="Username"
                        value={form.username}
                        onChange={(e) => updateField('username', e.target.value.toLowerCase())}
                        className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-[#C65B8A]"
                    />

                    <input
                        type="email"
                        required
                        placeholder="Email address"
                        value={form.email}
                        onChange={(e) => {
                            const email = e.target.value;
                            setForm((current) => ({
                                ...current,
                                email,
                                uic_member_type: email.trim().toLowerCase().endsWith('@uic.edu.ph')
                                    ? current.uic_member_type
                                    : '',
                            }));
                        }}
                        className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-[#C65B8A]"
                    />

                    {form.email.trim().toLowerCase().endsWith('@uic.edu.ph') && (
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">UIC Account Classification</label>
                            <select
                                required
                                value={form.uic_member_type}
                                onChange={(e) => updateField('uic_member_type', e.target.value)}
                                className="block w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-[#C65B8A]"
                            >
                                <option value="">Select classification</option>
                                <option value="student">UIC Student</option>
                                <option value="teacher">UIC Teacher</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Password Setup</label>
                        <select
                            value={form.password_mode}
                            onChange={(e) => {
                                const mode = e.target.value;
                                setForm((current) => ({
                                    ...current,
                                    password_mode: mode,
                                    password: '',
                                    password_confirmation: '',
                                }));
                            }}
                            className="block w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-[#C65B8A]"
                        >
                            <option value="generated">Generate temporary password</option>
                            <option value="manual">Set password manually</option>
                        </select>
                    </div>

                    {form.password_mode === 'manual' ? (
                        <>
                            <input type="password" required autoComplete="new-password" placeholder="Password" value={form.password} onChange={(e) => updateField('password', e.target.value)} className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-[#C65B8A]" />
                            <input type="password" required autoComplete="new-password" placeholder="Confirm password" value={form.password_confirmation} onChange={(e) => updateField('password_confirmation', e.target.value)} className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-[#C65B8A]" />
                        </>
                    ) : (
                        <p className="text-xs text-gray-400">
                            A temporary password will be generated and shown once after creation. The user must change it on first login.
                        </p>
                    )}

                    <select
                        value={form.role}
                        onChange={(e) => updateField('role', e.target.value)}
                        className="block w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-[#C65B8A]"
                    >
                        <option value="facility_admin">Facility Admin</option>
                        <option value="user">User</option>
                        <option value="super_admin">Super Admin</option>
                    </select>

                    {form.role === 'facility_admin' && (
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-400">
                                Assigned Facilities
                            </label>
<FacilityMultiSelect
                                facilities={facilities}
                                selectedIds={form.assigned_facility_ids}
                                onChange={(ids) => updateField('assigned_facility_ids', ids)}
                            />
                        </div>
                    )}

                    </div>
                    <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 sm:px-6">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-xl bg-[#C65B8A] py-3 text-sm font-semibold text-white hover:bg-[#A44773] disabled:bg-[#D9C8D4]"
                    >
                        {isSubmitting ? 'Creating…' : 'Create Account'}
                    </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function EditUserModal({ user, facilities = [], onClose }) {
    const [form, setForm] = useState({
        name: user.name,
        username: user.username ?? '',
        email: user.email,
        uic_member_type: user.uic_member_type ?? '',
        assigned_facility_ids: user.assigned_facility_ids ?? [],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateField = (key, value) =>
        setForm((f) => ({ ...f, [key]: value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.patch(route('admin.users.update', user.id), form, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('User details updated.');
                onClose();
            },
            onError: (errors) =>
                toast.error(
                    Object.values(errors)[0] || 'Failed to update user.'
                ),
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-[#F8EDF2] to-white px-6 py-4">
                    <h2 className="font-bold text-gray-900">Edit User</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">
                            Full Name
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Full name"
                            value={form.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-[#C65B8A]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">
                            Username
                        </label>
                        <input type="text" required maxLength={30} placeholder="Username" value={form.username} onChange={(e) => updateField('username', e.target.value.toLowerCase())} className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-[#C65B8A]" />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            placeholder="Email address"
                            value={form.email}
                            onChange={(e) => {
                                const email = e.target.value;
                                setForm((current) => ({
                                    ...current,
                                    email,
                                    uic_member_type: email.trim().toLowerCase().endsWith('@uic.edu.ph')
                                        ? current.uic_member_type
                                        : '',
                                }));
                            }}
                            className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-[#C65B8A]"
                        />
                    </div>

                    {form.email.trim().toLowerCase().endsWith('@uic.edu.ph') && (
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">UIC Account Classification</label>
                            <select
                                required
                                value={form.uic_member_type}
                                onChange={(e) => updateField('uic_member_type', e.target.value)}
                                className="block w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-[#C65B8A]"
                            >
                                <option value="">Select classification</option>
                                <option value="student">UIC Student</option>
                                <option value="teacher">UIC Teacher</option>
                            </select>
                        </div>
                    )}

                    {user.role === 'facility_admin' && (
                        <div>
                            <label className="mb-2 block text-xs font-medium text-gray-500">
                                Assigned Facilities
                            </label>

<FacilityMultiSelect
                                facilities={facilities}
                                selectedIds={form.assigned_facility_ids}
                                onChange={(ids) => updateField('assigned_facility_ids', ids)}
                            />

                            <p className="mt-1.5 text-xs text-gray-400">
                                Use search and checkboxes to manage this user's facility access.
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-xl bg-[#C65B8A] py-3 text-sm font-semibold text-white hover:bg-[#A44773] disabled:bg-[#D9C8D4]"
                    >
                        {isSubmitting ? 'Saving…' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
}

function FacilityAssignmentModal({ user, facilities = [], onClose }) {
    const [selectedIds, setSelectedIds] = useState(
        user.assigned_facility_ids ?? []
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);

        const isRolePromotion = user.pendingRoleChange === true;
        const endpoint = isRolePromotion
            ? route('admin.users.updateRole', user.id)
            : route('admin.users.update', user.id);
        const payload = isRolePromotion
            ? {
                  role: 'facility_admin',
                  assigned_facility_ids: selectedIds,
              }
            : {
                  name: user.name,
                  username: user.username,
                  email: user.email,
                  assigned_facility_ids: selectedIds,
              };

        router.patch(endpoint, payload, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(
                    isRolePromotion
                        ? `${user.name} is now a Facility Admin with ${selectedIds.length} assigned ${selectedIds.length === 1 ? 'facility' : 'facilities'}.`
                        : `${user.name}'s facility assignments updated.`
                );
                onClose();
            },
            onError: (errors) =>
                toast.error(
                    Object.values(errors)[0] ||
                        'Failed to save facility assignments.'
                ),
            onFinish: () => setIsSaving(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
                    <div>
                        <h2 className="font-bold text-gray-900">
                            {user.pendingRoleChange
                                ? 'Assign Facilities to Facility Admin'
                                : 'Manage Facility Assignments'}
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500">
                            {user.name} · {ROLE_LABELS[user.role] ?? user.role}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-6 py-5">
                    <p className="mb-3 text-sm text-gray-600">
                        Select the facilities this user should manage.
                        {user.pendingRoleChange
                            ? ' Their role will change to Facility Admin when you save.'
                            : ' Unchecking a facility removes their access immediately.'}
                    </p>

<FacilityMultiSelect
                        facilities={facilities}
                        selectedIds={selectedIds}
                        onChange={setSelectedIds}
                        disabled={isSaving}
                    />

                    <div className="mt-5 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? 'Saving…' : 'Save Assignments'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TempPasswordModal({ account, onClose }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(account.tempPassword);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = account.tempPassword;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';

                document.body.appendChild(textarea);
                textarea.select();

                const successful = document.execCommand('copy');
                document.body.removeChild(textarea);

                if (!successful) {
                    throw new Error('Copy command failed');
                }
            }

            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Unable to copy the password. Please copy it manually.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
                <div className="border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white px-6 py-4">
                    <h2 className="font-bold text-gray-900">{account.passwordIsTemporary ? 'Temporary Password Ready' : 'Account Password Set'}</h2>
                </div>

                <div className="space-y-4 px-6 py-5">
                    <p className="text-sm text-gray-600">
                        <strong>{account.name}</strong>'s account has been created. Share the password securely — it will not be shown again.
                    </p>

                    <div className="space-y-2">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-400">
                                Username
                            </label>
                            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm">
                                {account.username}
                            </p>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-400">
                                Email
                            </label>
                            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm">
                                {account.email}
                            </p>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-400">
                                {account.passwordIsTemporary ? 'Temporary Password' : 'Password'}
                            </label>
                            <div className="flex items-center gap-2">
                                <p className="flex-1 break-all rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm">
                                    {account.tempPassword}
                                </p>
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="rounded-lg bg-gray-100 p-2.5 text-gray-600 hover:bg-gray-200"
                                    title="Copy password"
                                    aria-label="Copy temporary password"
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-emerald-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {account.passwordIsTemporary && (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-600">
                            The user will be required to change this password when they next log in.
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Users({
    users = [],
    facilities = [],
    newAccount = null,
}) {
    const currentUserId = usePage().props.auth.user.id;

    const [updatingId, setUpdatingId] = useState(null);
    const [resettingId, setResettingId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [facilityAssignUser, setFacilityAssignUser] = useState(null);
    const [accountToShow, setAccountToShow] = useState(null);
    const [userToResetPassword, setUserToResetPassword] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        if (newAccount) {
            setAccountToShow(newAccount);
        }
    }, [newAccount]);

    const handleRoleChange = (user, newRole) => {
        if (newRole === user.role) return;

        if (newRole === 'facility_admin') {
            setFacilityAssignUser({
                ...user,
                pendingRoleChange: true,
                assigned_facility_ids: [],
            });
            return;
        }

        setUpdatingId(user.id);

        router.patch(
            route('admin.users.updateRole', user.id),
            { role: newRole },
            {
                preserveScroll: true,
                onSuccess: () =>
                    toast.success(
                        `${user.name}'s role updated to ${ROLE_LABELS[newRole]}.`
                    ),
                onError: (errors) =>
                    toast.error(errors.role || 'Failed to update role.'),
                onFinish: () => setUpdatingId(null),
            }
        );
    };

    const handleResetPassword = (user) => {
        setUserToResetPassword(user);
    };

    const confirmResetPassword = () => {
        if (!userToResetPassword || resettingId !== null) return;

        const user = userToResetPassword;
        setResettingId(user.id);

        router.post(
            route('admin.users.regeneratePassword', user.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setUserToResetPassword(null);
                },
                onError: (errors) => {
                    toast.error(
                        Object.values(errors)[0] || 'Failed to reset password.'
                    );
                },
                onFinish: () => setResettingId(null),
            }
        );
    };

    const handleToggleActive = (user) => {
        if (user.id === currentUserId) {
            toast.error('You cannot disable your own account.');
            return;
        }

        const action = user.is_active ? 'disable' : 'activate';

        setTogglingId(user.id);

        router.patch(
            route('admin.users.toggleActive', user.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () =>
                    toast.success(
                        `${user.name}'s account has been ${action === 'disable' ? 'disabled' : 'activated'}.`
                    ),
                onError: (errors) =>
                    toast.error(
                        Object.values(errors)[0] ||
                            'Failed to update account status.'
                    ),
                onFinish: () => setTogglingId(null),
            }
        );
    };

    const handleDelete = (user) => {
        if (user.id === currentUserId) {
            toast.error("You can't delete your own account here.");
            return;
        }

        setUserToDelete(user);
    };

    const confirmDelete = () => {
        if (!userToDelete || deletingId !== null) return;

        const user = userToDelete;
        setDeletingId(user.id);

        router.delete(route('admin.users.destroy', user.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`${user.name}'s account has been deleted.`);
                setUserToDelete(null);
            },
            onError: (errors) => {
                toast.error(
                    Object.values(errors)[0] || 'Failed to delete user.'
                );
            },
            onFinish: () => setDeletingId(null),
        });
    };

    const filteredUsers = users.filter((user) => {
        const query = searchTerm.toLowerCase();

        const matchesSearch =
            (user.name?.toLowerCase().includes(query) ?? false) ||
            (user.username?.toLowerCase().includes(query) ?? false) ||
            (user.email?.toLowerCase().includes(query) ?? false);

        const matchesRole =
            roleFilter === 'all' || user.role === roleFilter;

        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && user.is_active) ||
            (statusFilter === 'disabled' && !user.is_active);

        return matchesSearch && matchesRole && matchesStatus;
    });

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">
                        User Management
                    </h1>

                    <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#C65B8A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A44773]"
                    >
                        <Plus className="h-4 w-4" />
                        Add User
                    </button>
                </div>
            }
        >
            <Head title="User Management" />

            <div className="p-6">
                <div className="mb-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                        <input
                            type="text"
                            placeholder="Search name, username, or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm focus:border-[#C65B8A] focus:ring-2 focus:ring-[#C65B8A]"
                        />

                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                aria-label="Clear search"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="flex w-full items-center gap-3 sm:w-auto">
                        <div className="flex w-full items-center gap-1.5 sm:w-auto">
                            <Filter className="hidden h-4 w-4 text-gray-400 sm:block" />

                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-[#C65B8A] sm:w-auto"
                            >
                                <option value="all">All Roles</option>
                                <option value="super_admin">Super Admin</option>
                                <option value="facility_admin">Facility Admin</option>
                                <option value="user">User</option>
                            </select>
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 focus:ring-2 focus:ring-[#C65B8A] sm:w-auto"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="disabled">Disabled</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Username
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Assigned Facilities
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-6 py-8 text-center text-sm text-gray-400"
                                        >
                                            No matching users found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => {
                                        const isSelf =
                                            user.id === currentUserId;

                                        return (
                                            <tr key={user.id}>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {user.name}
                                                    {isSelf && (
                                                        <span className="font-normal text-gray-400">
                                                            {' '}
                                                            (you)
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4 text-sm font-medium text-gray-700">
                                                    {user.username || '—'}
                                                </td>

                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {user.email}
                                                    <p className="mt-1 text-xs font-medium text-slate-500">
                                                        {user.account_type_label || 'Account type not classified'}
                                                    </p>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="relative w-48">
                                                        <select
                                                            value={user.role}
                                                            disabled={updatingId === user.id}
                                                            onChange={(e) =>
                                                                handleRoleChange(
                                                                    user,
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full appearance-none truncate rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-10 text-sm focus:ring-2 focus:ring-[#C65B8A] disabled:opacity-50"
                                                        >
                                                            <option value="user">
                                                                User
                                                            </option>
                                                            <option value="facility_admin">
                                                                Facility Admin
                                                            </option>
                                                            <option value="super_admin">
                                                                Super Admin
                                                            </option>
                                                        </select>

                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {user.role === 'facility_admin' ? (
                                                            <>
                                                                <span className="max-w-[180px] truncate text-xs text-gray-600">
                                                                    {user.assigned_facility_ids?.length
                                                                        ? `${user.assigned_facility_ids.length} ${
                                                                              user.assigned_facility_ids.length === 1
                                                                                  ? 'facility'
                                                                                  : 'facilities'
                                                                          } assigned`
                                                                        : 'No facilities assigned'}
                                                                </span>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setFacilityAssignUser(user)
                                                                    }
                                                                    className="rounded-lg bg-blue-50 p-1.5 text-blue-600 hover:bg-blue-100"
                                                                    title="Manage facility assignments"
                                                                >
                                                                    <Building2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">
                                                                —
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <StatusBadge isActive={user.is_active} />
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingUser(user)}
                                                            className="rounded-lg bg-gray-50 p-2 text-gray-600 hover:bg-gray-100"
                                                            title="Edit details"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleResetPassword(user)}
                                                            disabled={resettingId === user.id}
                                                            className="rounded-lg bg-gray-50 p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                                                            title="Reset password"
                                                        >
                                                            <KeyRound className="h-3.5 w-3.5" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleActive(user)}
                                                            disabled={togglingId === user.id || isSelf}
                                                            className="rounded-lg bg-gray-50 p-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                                                            title={
                                                                isSelf
                                                                    ? "Can't disable your own account"
                                                                    : user.is_active
                                                                      ? 'Disable account'
                                                                      : 'Activate account'
                                                            }
                                                        >
                                                            <Power className="h-3.5 w-3.5" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(user)}
                                                            disabled={deletingId === user.id || isSelf}
                                                            className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-30"
                                                            title={
                                                                isSelf
                                                                    ? "Can't delete your own account here"
                                                                    : 'Delete account'
                                                            }
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showAddModal && (
                <AddUserModal
                    facilities={facilities}
                    onClose={() => setShowAddModal(false)}
                />
            )}

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    facilities={facilities}
                    onClose={() => setEditingUser(null)}
                />
            )}

            {facilityAssignUser && (
                <FacilityAssignmentModal
                    user={facilityAssignUser}
                    facilities={facilities}
                    onClose={() => setFacilityAssignUser(null)}
                />
            )}

            {accountToShow && (
                <TempPasswordModal
                    account={accountToShow}
                    onClose={() => setAccountToShow(null)}
                />
            )}

            {userToResetPassword && (
                <ResetPasswordConfirmModal
                    user={userToResetPassword}
                    isSubmitting={resettingId === userToResetPassword.id}
                    onConfirm={confirmResetPassword}
                    onClose={() => {
                        if (resettingId === null) {
                            setUserToResetPassword(null);
                        }
                    }}
                />
            )}

            {userToDelete && (
                <DeleteUserConfirmModal
                    user={userToDelete}
                    isSubmitting={deletingId === userToDelete.id}
                    onConfirm={confirmDelete}
                    onClose={() => {
                        if (deletingId === null) {
                            setUserToDelete(null);
                        }
                    }}
                />
            )}
        </AuthenticatedLayout>
    );
}