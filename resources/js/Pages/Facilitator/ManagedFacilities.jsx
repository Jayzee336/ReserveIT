import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, MapPin, Users, Calendar, Building2, Save, X } from 'lucide-react';

export default function ManagedFacilities({ facilities = [] }) {
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availabilityFacility, setAvailabilityFacility] = useState(null);
    const [unavailabilityReason, setUnavailabilityReason] = useState('');
    const [availabilitySubmitting, setAvailabilitySubmitting] = useState(false);

    const startEdit = (facility) => {
        setEditingId(facility.id);
        setForm({
            name: facility.name,
            type: facility.type,
            capacity: facility.capacity ?? '',
            description: facility.description,
            location: facility.location,
            requirement: facility.requirement,
            requiresWeekendConsent: facility.requiresWeekendConsent ?? true,
            allowTdevsManpower: facility.allowTdevsManpower ?? true,
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm({});
    };

    const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const restoreAvailability = (facility) => {
        router.patch(route('admin.facilities.availability', facility.id), { is_available: true }, {
            preserveScroll: true,
            onSuccess: () => toast.success('Facility marked available.'),
            onError: () => toast.error('Unable to restore facility availability.'),
        });
    };

    const submitMarkUnavailable = (event) => {
        event.preventDefault();
        if (!availabilityFacility || !unavailabilityReason.trim() || availabilitySubmitting) return;

        setAvailabilitySubmitting(true);
        router.patch(route('admin.facilities.availability', availabilityFacility.id), {
            is_available: false,
            reason: unavailabilityReason.trim(),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Facility marked unavailable. Affected booking owners have been notified.');
                setAvailabilityFacility(null);
                setUnavailabilityReason('');
            },
            onError: (errors) => toast.error(Object.values(errors)[0] || 'Unable to update facility availability.'),
            onFinish: () => setAvailabilitySubmitting(false),
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = new FormData();
        payload.append('name', form.name);
        payload.append('type', form.type);
        payload.append('capacity', form.capacity === '' ? '' : String(form.capacity));
        payload.append('description', form.description);
        payload.append('location', form.location);
        payload.append('requirement', form.requirement);
        payload.append('requiresWeekendConsent', form.requiresWeekendConsent ? '1' : '0');
        payload.append('allowTdevsManpower', form.allowTdevsManpower ? '1' : '0');
        payload.append('_method', 'patch');

        router.post(route('admin.facilities.update', editingId), payload, {
            onSuccess: () => {
                toast.success('Facility updated.');
                setEditingId(null);
                setForm({});
            },
            onError: (errors) => {
                toast.error(Object.values(errors)[0] || 'Something went wrong.');
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <AuthenticatedLayout header={<h1 className="text-2xl font-bold text-gray-900">Managed Facilities</h1>}>
            <Head title="Managed Facilities" />

            <div className="p-6 space-y-6">
                <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
                    <h1 className="font-semibold text-slate-900">Facilities You Oversee</h1>
                </div>

                {facilities.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl bg-white">
                        <Building2 className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                        <p className="text-sm text-gray-400">
                            You are not assigned to any facilities yet. Contact the Super Admin to get facility access.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {facilities.map((facility) => {
                            const isEditing = editingId === facility.id;

                            if (isEditing) {
                                return (
                                    <form key={facility.id} onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900">Edit Facility</h3>
                                            <button type="button" onClick={cancelEdit} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <input
                                            type="text" required value={form.name}
                                            onChange={(e) => updateField('name', e.target.value)}
                                            className="block w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#A98C97]"
                                        />

                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                value={form.type}
                                                onChange={(e) => updateField('type', e.target.value)}
                                                className="block w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-[#A98C97]"
                                            >
                                                <option value="Venue">Venue</option>
                                                <option value="Laboratory">Laboratory</option>
                                            </select>
                                            <input
                                                type="number" min={1} placeholder="Capacity"
                                                value={form.capacity}
                                                onChange={(e) => updateField('capacity', e.target.value)}
                                                className="block w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#A98C97]"
                                            />
                                        </div>

                                        <input
                                            type="text" required value={form.location}
                                            onChange={(e) => updateField('location', e.target.value)}
                                            className="block w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#A98C97]"
                                        />

                                        <textarea
                                            required rows={3} value={form.description}
                                            onChange={(e) => updateField('description', e.target.value)}
                                            className="block w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#A98C97] resize-none"
                                        />

                                        <select
                                            value={form.requirement}
                                            onChange={(e) => updateField('requirement', e.target.value)}
                                            className="block w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-[#A98C97]"
                                        >
                                            <option value="STANDARD">Standard (no consent unless weekend)</option>
                                            <option value="CONSENT_REQUIRED">Always requires consent</option>
                                        </select>

                                        <label className="flex items-center gap-2.5 text-sm text-gray-700">
                                            <input
                                                type="checkbox" checked={form.requiresWeekendConsent}
                                                onChange={(e) => updateField('requiresWeekendConsent', e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-[#6A535C] focus:ring-[#A98C97]"
                                            />
                                            Requires consent for weekends
                                        </label>

                                        <label className="flex items-center gap-2.5 text-sm text-gray-700">
                                            <input
                                                type="checkbox" checked={form.allowTdevsManpower}
                                                onChange={(e) => updateField('allowTdevsManpower', e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-[#6A535C] focus:ring-[#A98C97]"
                                            />
                                            Allow TDEVS manpower requests
                                        </label>

                                        <button
                                            type="submit" disabled={isSubmitting}
                                            className="w-full inline-flex justify-center items-center gap-1.5 py-2.5 bg-[#6A535C] hover:bg-[#543F48] text-white rounded-xl text-sm font-semibold disabled:bg-[#DCCBD2]"
                                        >
                                            <Save className="h-4 w-4" /> {isSubmitting ? 'Saving…' : 'Save Changes'}
                                        </button>
                                    </form>
                                );
                            }

                            return (
                                <div key={facility.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between">
                                    <div>
                                        <img src={facility.imageUrl} alt={facility.name} className="w-full h-32 object-cover" />
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-semibold text-gray-900">{facility.name}</h3>
                                                <span className="text-[10px] font-bold text-[#6A535C] bg-[#F7F0F3] px-2 py-0.5 rounded-full uppercase flex-shrink-0">
                                                    {facility.type}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                <MapPin className="h-3 w-3" /> {facility.location}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                                <Users className="h-3 w-3" /> {facility.capacity ? `${facility.capacity} people` : 'Capacity unspecified'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="px-4 pb-3">
                                        {facility.is_available === false ? (
                                            <div className="mb-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                                                <strong>Unavailable:</strong> {facility.unavailable_reason || 'No reason provided'}
                                            </div>
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={() => facility.is_available === false
                                                ? restoreAvailability(facility)
                                                : (setAvailabilityFacility(facility), setUnavailabilityReason(''))}
                                            className={`w-full rounded-lg px-3 py-2 text-xs font-semibold ${facility.is_available === false ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                                        >
                                            {facility.is_available === false ? 'Mark as Available' : 'Mark as Unavailable'}
                                        </button>
                                    </div>
                                    <div className="p-4 pt-0 flex gap-2">
                                        <button
                                            onClick={() => startEdit(facility)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg"
                                        >
                                            <Pencil className="h-3.5 w-3.5" /> Edit Details
                                        </button>
                                        <Link
                                            href={`/facility/${facility.id}`}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#F7F0F3] hover:bg-[#EFE4E9] text-[#543F48] text-xs font-semibold rounded-lg"
                                        >
                                            <Calendar className="h-3.5 w-3.5" /> View
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {availabilityFacility && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <button type="button" aria-label="Close unavailability dialog" className="absolute inset-0" onClick={() => setAvailabilityFacility(null)} />
                    <form onSubmit={submitMarkUnavailable} className="relative w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Mark facility unavailable</h3>
                            <p className="mt-1 text-sm text-slate-500">{availabilityFacility.name} will not accept new bookings until you mark it available again.</p>
                        </div>
                        <label className="block text-sm font-semibold text-slate-700">
                            Reason
                            <textarea
                                required
                                rows={3}
                                maxLength={2000}
                                value={unavailabilityReason}
                                onChange={(event) => setUnavailabilityReason(event.target.value)}
                                placeholder="Example: Maintenance or facility issue"
                                className="mt-1 block w-full rounded-xl border border-slate-200 p-3 text-sm font-normal focus:border-[#A98C97] focus:ring-2 focus:ring-[#EFE4E9]"
                            />
                        </label>
                        <p className="text-xs text-slate-500">Affected users with pending or approved bookings will be notified. Existing bookings will not be cancelled automatically.</p>
                        <div className="flex gap-2">
                            <button type="button" disabled={availabilitySubmitting} onClick={() => setAvailabilityFacility(null)} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Cancel</button>
                            <button type="submit" disabled={availabilitySubmitting || !unavailabilityReason.trim()} className="flex-1 rounded-xl bg-[#6A535C] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{availabilitySubmitting ? 'Saving…' : 'Confirm unavailable'}</button>
                        </div>
                    </form>
                </div>
            )}
        </AuthenticatedLayout>
    );
}