import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    ShieldCheck,
    Clock3,
    Wallet,
    Trash2,
    CheckCircle2,
    AlertTriangle,
    Settings2,
} from 'lucide-react';

const inputClass =
    'mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#6A535C] focus:ring-2 focus:ring-[#6A535C]/15';

const labelClass = 'block text-sm font-semibold text-slate-800';

function SectionCard({ icon: Icon, title, description, children }) {
    return (
        <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6A535C]/10 text-[#6A535C]">
                    <Icon className="h-5 w-5" />
                </span>

                <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                        {title}
                    </h2>
                    {description && (
                        <p className="mt-1 text-sm leading-5 text-slate-500">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            {children}
        </section>
    );
}

export default function SystemSettings({ settings }) {
    const [approvalScope, setApprovalScope] = useState(
        settings.auto_approve_scope || 'disabled'
    );
    const [fee, setFee] = useState(settings.overtime_fee_per_hour ?? 0);
    const [cleanupBuffer, setCleanupBuffer] = useState(
        settings.cleanup_buffer_minutes ?? 45
    );
    const [maxAdvanceDays, setMaxAdvanceDays] = useState(
        settings.max_advance_days ?? 30
    );
    const [maxBookingDuration, setMaxBookingDuration] = useState(
        settings.max_booking_duration ?? 4
    );
    const [requireConsent, setRequireConsent] = useState(
        Boolean(settings.require_consent_letter)
    );
    const [autoPurgeDays, setAutoPurgeDays] = useState(
        Number(settings.auto_purge_unapproved_days ?? 0)
    );

    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const saveSettings = (updatedPayload = {}) => {
        if (saving) return;

        setSaving(true);
        setSaveMessage('');

        const payload = {
            auto_approve_scope: approvalScope,
            overtime_fee_per_hour: fee,
            cleanup_buffer_minutes: cleanupBuffer,
            max_advance_days: maxAdvanceDays,
            max_booking_duration: maxBookingDuration,
            require_consent_letter: requireConsent,
            auto_purge_unapproved_days: autoPurgeDays,
            ...updatedPayload,
        };

        router.patch(route('admin.settings.update'), payload, {
            preserveScroll: true,
            onSuccess: () => setSaveMessage('Settings saved successfully.'),
            onError: () => setSaveMessage('Could not save settings. Please check the values and try again.'),
            onFinish: () => setSaving(false),
        });
    };

    const purgeOptions = [
        {
            days: 0,
            title: 'Disabled',
            detail: 'Keep pending bookings until manually handled.',
        },
        {
            days: 7,
            title: 'After 7 days',
            detail: 'Remove eligible pending bookings after one week.',
        },
        {
            days: 14,
            title: 'After 14 days',
            detail: 'Keep eligible pending bookings for two weeks.',
        },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6A535C]/10 text-[#6A535C]">
                        <Settings2 className="h-5 w-5" />
                    </span>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                            Booking System Settings
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Manage booking rules, scheduling, fees, and data cleanup.
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Booking Settings" />

            <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">
                            System configuration
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Changes are saved when you select an option or finish editing a field.
                        </p>
                    </div>

                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${
                        saving
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                    }`}>
                        {saving ? (
                            <Clock3 className="h-4 w-4 animate-pulse" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4" />
                        )}
                        {saving ? 'Saving changes…' : 'Ready'}
                    </div>
                </div>

                {saveMessage && (
                    <div
                        role="status"
                        className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
                            saveMessage.startsWith('Could not')
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        }`}
                    >
                        {saveMessage.startsWith('Could not') ? (
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        {saveMessage}
                    </div>
                )}

                <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
                    <SectionCard
                        icon={ShieldCheck}
                        title="Workflow & Approval Rules"
                        description="Control automatic approvals and required supporting documents."
                    >
                        <div className="space-y-5">
                            <div>
                                <label className={labelClass} htmlFor="approval-scope">
                                    Auto-Approval Scope
                                </label>
                                <p className="mt-1 text-sm text-slate-500">
                                    Choose which booking requests can skip manual review.
                                </p>
                                <select
                                    id="approval-scope"
                                    value={approvalScope}
                                    disabled={saving}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setApprovalScope(value);
                                        saveSettings({ auto_approve_scope: value });
                                    }}
                                    className={inputClass}
                                >
                                    <option value="disabled">
                                        Disabled — manual review required
                                    </option>
                                    <option value="superadmin_only">
                                        Super Admin bookings only
                                    </option>
                                    <option value="everyone">
                                        All bookings
                                    </option>
                                </select>
                            </div>

                            <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-5">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-800">
                                        Mandate Consent Letters
                                    </h3>
                                    <p className="mt-1 max-w-lg text-sm leading-5 text-slate-500">
                                        Require a consent or clearance attachment when submitting a booking.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={requireConsent}
                                    aria-label="Mandate consent letters"
                                    disabled={saving}
                                    onClick={() => {
                                        const nextValue = !requireConsent;
                                        setRequireConsent(nextValue);
                                        saveSettings({
                                            require_consent_letter: nextValue,
                                        });
                                    }}
                                    className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${
                                        requireConsent ? 'bg-emerald-600' : 'bg-slate-300'
                                    } disabled:cursor-not-allowed disabled:opacity-60`}
                                >
                                    <span
                                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                                            requireConsent ? 'left-6' : 'left-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard
                        icon={Clock3}
                        title="Time Windows & Buffers"
                        description="Set scheduling limits and the time needed between facility bookings."
                    >
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                                <label className={labelClass} htmlFor="cleanup-buffer">
                                    Room Cleanup Buffer (Minutes)
                                </label>
                                <input
                                    id="cleanup-buffer"
                                    type="number"
                                    min="0"
                                    max="120"
                                    value={cleanupBuffer}
                                    disabled={saving}
                                    onChange={(e) => setCleanupBuffer(e.target.value)}
                                    onBlur={() => saveSettings({
                                        cleanup_buffer_minutes: cleanupBuffer,
                                    })}
                                    className={inputClass}
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Time reserved between bookings.
                                </p>
                            </div>

                            <div>
                                <label className={labelClass} htmlFor="max-duration">
                                    Max Booking Span (Hours)
                                </label>
                                <input
                                    id="max-duration"
                                    type="number"
                                    min="1"
                                    max="24"
                                    value={maxBookingDuration}
                                    disabled={saving}
                                    onChange={(e) => setMaxBookingDuration(e.target.value)}
                                    onBlur={() => saveSettings({
                                        max_booking_duration: maxBookingDuration,
                                    })}
                                    className={inputClass}
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Longest allowed booking duration.
                                </p>
                            </div>

                            <div className="sm:col-span-2">
                                <label className={labelClass} htmlFor="advance-window">
                                    Max Booking Advance Window (Days)
                                </label>
                                <input
                                    id="advance-window"
                                    type="number"
                                    min="1"
                                    value={maxAdvanceDays}
                                    disabled={saving}
                                    onChange={(e) => setMaxAdvanceDays(e.target.value)}
                                    onBlur={() => saveSettings({
                                        max_advance_days: maxAdvanceDays,
                                    })}
                                    className={inputClass}
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    How far ahead users can reserve a facility.
                                </p>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard
                        icon={Wallet}
                        title="Financial Policies"
                        description="Configure the hourly charge used when a booking exceeds its scheduled end time."
                    >
                        <label className={labelClass} htmlFor="overtime-fee">
                            Overtime Fee (Per Hour)
                        </label>
                        <div className="relative mt-2">
                            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold text-slate-500">
                                ₱
                            </span>
                            <input
                                id="overtime-fee"
                                type="number"
                                min="0"
                                step="0.01"
                                value={fee}
                                disabled={saving}
                                onChange={(e) => setFee(e.target.value)}
                                onBlur={() => saveSettings({
                                    overtime_fee_per_hour: fee,
                                })}
                                className={`${inputClass} pl-9`}
                            />
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                            Current rate: ₱{Number(fee || 0).toFixed(2)} per hour.
                        </p>
                    </SectionCard>

                    <SectionCard
                        icon={Trash2}
                        title="Unapproved Booking Cleanup"
                        description="Choose how long expired pending bookings are retained before automated cleanup."
                    >
                        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                            <div>
                                <p className="text-sm font-semibold text-amber-900">
                                    Permanent deletion
                                </p>
                                <p className="mt-1 text-sm leading-5 text-amber-800">
                                    Eligible pending bookings are permanently deleted by the scheduled cleanup command. Approved bookings are not targeted by this command.
                                </p>
                            </div>
                        </div>

                        <fieldset disabled={saving}>
                            <legend className="mb-3 text-sm font-semibold text-slate-800">
                                Automatic cleanup policy
                            </legend>

                            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                                {purgeOptions.map((option) => {
                                    const selected =
                                        Number(autoPurgeDays) === option.days;

                                    return (
                                        <button
                                            key={option.days}
                                            type="button"
                                            aria-pressed={selected}
                                            onClick={() => {
                                                setAutoPurgeDays(option.days);
                                                saveSettings({
                                                    auto_purge_unapproved_days: option.days,
                                                });
                                            }}
                                            className={`rounded-xl border-2 p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#6A535C]/30 ${
                                                selected
                                                    ? 'border-[#6A535C] bg-[#6A535C]/5'
                                                    : 'border-slate-200 bg-white hover:border-[#6A535C]/40 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span className="flex items-center justify-between gap-2">
                                                <span className={`text-sm font-bold ${
                                                    selected
                                                        ? 'text-[#6A535C]'
                                                        : 'text-slate-800'
                                                }`}>
                                                    {option.title}
                                                </span>
                                                {selected && (
                                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#6A535C]" />
                                                )}
                                            </span>
                                            <span className="mt-2 block text-xs leading-5 text-slate-500">
                                                {option.detail}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>

                        {Number(autoPurgeDays) > 0 ? (
                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                <p className="text-sm font-semibold text-amber-900">
                                    Cleanup is enabled
                                </p>
                                <p className="mt-1 text-sm leading-5 text-amber-800">
                                    The scheduled command runs daily at midnight. It will target pending bookings that meet the configured retention rule of {autoPurgeDays} day(s). Verify the cutoff behavior before using this on real data.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-sm font-medium text-slate-700">
                                    Cleanup is currently disabled.
                                </p>
                                <p className="mt-1 text-sm leading-5 text-slate-500">
                                    Pending bookings will not be automatically deleted by this command.
                                </p>
                            </div>
                        )}
                    </SectionCard>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}