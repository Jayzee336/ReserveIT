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
    super_admin: 'bg-purple-50 text-purple-700 ring-purple-600/20',
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
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
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

function AddUserModal({ facilities = [], onClose }) {
    const [form, setForm] = useState({
        name: '',
        email: '',
        role: 'facility_admin',
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white px-6 py-4">
                    <h2 className="font-bold text-gray-900">Add User</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 px-6 py-5">
                    <input
                        type="text"
                        required
                        placeholder="Full name"
                        value={form.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-400"
                    />

                    <input
                        type="email"
                        required
                        placeholder="Email address"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-400"
                    />

                    <select
                        value={form.role}
                        onChange={(e) => updateField('role', e.target.value)}
                        className="block w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-indigo-400"
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
                            <select
                                multiple
                                value={form.assigned_facility_ids}
                                onChange={(e) =>
                                    updateField(
                                        'assigned_facility_ids',
                                        Array.from(
                                            e.target.selectedOptions,
                                            (option) => Number(option.value)
                                        )
                                    )
                                }
                                className="block min-h-28 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-indigo-400"
                            >
                                {facilities.map((facility) => (
                                    <option key={facility.id} value={facility.id}>
                                        {facility.name}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-400">
                                Select the facilities this admin should manage.
                            </p>
                        </div>
                    )}

                    <p className="text-xs text-gray-400">
                        A temporary password will be generated automatically
                        and shown once after creation.
                    </p>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300"
                    >
                        {isSubmitting ? 'Creating…' : 'Create Account'}
                    </button>
                </form>
            </div>
        </div>
    );
}

function EditUserModal({ user, facilities = [], onClose }) {
    const [form, setForm] = useState({
        name: user.name,
        email: user.email,
        assigned_facility_ids: user.assigned_facility_ids ?? [],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateField = (key, value) =>
        setForm((f) => ({ ...f, [key]: value }));

    const toggleFacility = (facilityId) => {
        setForm((f) => {
            const current = f.assigned_facility_ids;
            const exists = current.includes(facilityId);

            return {
                ...f,
                assigned_facility_ids: exists
                    ? current.filter((id) => id !== facilityId)
                    : [...current, facilityId],
            };
        });
    };

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
                <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white px-6 py-4">
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
                            className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-400"
                        />
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
                            onChange={(e) => updateField('email', e.target.value)}
                            className="block w-full rounded-xl border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>

                    {user.role === 'facility_admin' && (
                        <div>
                            <label className="mb-2 block text-xs font-medium text-gray-500">
                                Assigned Facilities
                            </label>

                            {facilities.length === 0 ? (
                                <p className="text-xs italic text-gray-400">
                                    No facilities available.
                                </p>
                            ) : (
                                <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-xl border border-gray-100 p-1">
                                    {facilities.map((facility) => {
                                        const isSelected =
                                            form.assigned_facility_ids.includes(
                                                facility.id
                                            );

                                        return (
                                            <button
                                                key={facility.id}
                                                type="button"
                                                onClick={() =>
                                                    toggleFacility(facility.id)
                                                }
                                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                                    isSelected
                                                        ? 'bg-indigo-50 font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/30'
                                                        : 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-100'
                                                }`}
                                            >
                                                <Building2
                                                    className={`h-3.5 w-3.5 ${
                                                        isSelected
                                                            ? 'text-indigo-600'
                                                            : 'text-gray-400'
                                                    }`}
                                                />
                                                {facility.name}
                                                {isSelected && (
                                                    <Check className="ml-0.5 h-3 w-3 text-indigo-600" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <p className="mt-1.5 text-xs text-gray-400">
                                Click to toggle facility permissions.
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300"
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

    const toggleFacility = (facilityId) => {
        setSelectedIds((prev) =>
            prev.includes(facilityId)
                ? prev.filter((id) => id !== facilityId)
                : [...prev, facilityId]
        );
    };

    const handleSave = () => {
        setIsSaving(true);

        router.patch(
            route('admin.users.update', user.id),
            {
                name: user.name,
                email: user.email,
                assigned_facility_ids: selectedIds,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        `${user.name}'s facility assignments updated.`
                    );
                    onClose();
                },
                onError: (errors) =>
                    toast.error(
                        Object.values(errors)[0] ||
                            'Failed to update facility assignments.'
                    ),
                onFinish: () => setIsSaving(false),
            }
        );
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
                            Manage Facility Assignments
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
                        Unchecking a facility removes their access immediately.
                    </p>

                    <div className="max-h-72 space-y-2 overflow-y-auto">
                        {facilities.length === 0 ? (
                            <p className="py-6 text-center text-sm text-gray-400">
                                No facilities available.
                            </p>
                        ) : (
                            facilities.map((facility) => {
                                const isChecked = selectedIds.includes(
                                    facility.id
                                );

                                return (
                                    <label
                                        key={facility.id}
                                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                                            isChecked
                                                ? 'border-blue-300 bg-blue-50'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() =>
                                                toggleFacility(facility.id)
                                            }
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <Building2
                                            className={`h-4 w-4 ${
                                                isChecked
                                                    ? 'text-blue-600'
                                                    : 'text-gray-400'
                                            }`}
                                        />
                                        <span
                                            className={`text-sm font-medium ${
                                                isChecked
                                                    ? 'text-blue-900'
                                                    : 'text-gray-700'
                                            }`}
                                        >
                                            {facility.name}
                                        </span>
                                    </label>
                                );
                            })
                        )}
                    </div>

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
                    <h2 className="font-bold text-gray-900">Password Ready</h2>
                </div>

                <div className="space-y-4 px-6 py-5">
                    <p className="text-sm text-gray-600">
                        <strong>{account.name}</strong>'s temporary password
                        is ready. Share it securely — it will not be shown again.
                    </p>

                    <div className="space-y-2">
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
                                Temporary Password
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

                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-600">
                        The user will be required to change this password when
                        they next log in.
                    </p>

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
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
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
                            placeholder="Search name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400"
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
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-400 sm:w-auto"
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
                            className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-400 sm:w-auto"
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
                                            colSpan={6}
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

                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {user.email}
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
                                                            className="w-full appearance-none truncate rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-10 text-sm focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
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