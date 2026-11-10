import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
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
    const [requireConsent, setRequireConsent] = useState(
        Boolean(settings.require_consent_letter)
    );
    const [autoPurgeDays, setAutoPurgeDays] = useState(
        Number(settings.auto_purge_unapproved_days ?? 0)
    );
    const [openingTime, setOpeningTime] = useState(settings.opening_time?.slice(0, 5) ?? '08:00');
    const [closingTime, setClosingTime] = useState(settings.closing_time?.slice(0, 5) ?? '00:00');
    const [earlyCheckIn, setEarlyCheckIn] = useState(settings.early_check_in_minutes ?? 15);
    const [overtimeGrace, setOvertimeGrace] = useState(settings.overtime_grace_minutes ?? 0);

    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [saveMessageType, setSaveMessageType] = useState('');

    const markChanged = () => {
        setHasChanges(true);
        setSaveMessage('');
        setSaveMessageType('');
    };

    useEffect(() => {
        const warnBeforeLeave = (event) => {
            if (!hasChanges || saving) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warnBeforeLeave);
        return () => window.removeEventListener('beforeunload', warnBeforeLeave);
    }, [hasChanges, saving]);

    const saveSettings = () => {
        if (saving) return;

        setSaving(true);
        setSaveMessage('');
        setSaveMessageType('');

        const payload = {
            auto_approve_scope: approvalScope,
            overtime_fee_per_hour: fee,
            cleanup_buffer_minutes: cleanupBuffer,
            max_advance_days: maxAdvanceDays,
            require_consent_letter: requireConsent,
            auto_purge_unapproved_days: autoPurgeDays,
            opening_time: openingTime,
            closing_time: closingTime,
            early_check_in_minutes: earlyCheckIn,
            overtime_grace_minutes: overtimeGrace,
        };

        router.patch(route('admin.settings.update'), payload, {
            preserveScroll: true,
            onSuccess: () => {
                setSaveMessageType('success');
                setSaveMessage('Settings saved successfully.');
                setHasChanges(false);
            },
            onError: (errors) => {
                const firstError = Object.values(errors)[0];
                setSaveMessageType('error');
                setSaveMessage(firstError || 'Could not save settings. Please check the values and try again.');
            },
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
                            Edit the settings below, then select Save Changes to apply them together.
                        </p>
                    </div>

                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${
                        saving || hasChanges
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                    }`}>
                        {saving ? (
                            <Clock3 className="h-4 w-4 animate-pulse" />
                        ) : hasChanges ? (
                            <AlertTriangle className="h-4 w-4" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4" />
                        )}
                        {saving ? 'Saving changes…' : hasChanges ? 'Unsaved changes' : 'All changes saved'}
                    </div>
                </div>

                {saveMessage && (
                    <div
                        role="status"
                        className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
                            saveMessageType === 'error'
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        }`}
                    >
                        {saveMessageType === 'error' ? (
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        {saveMessage}
                    </div>
                )}

                <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
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
                                        markChanged();
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
                                        markChanged();
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
                                    onChange={(e) => { setCleanupBuffer(e.target.value); markChanged(); }}
                                    
                                    className={inputClass}
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Time reserved between bookings.
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
                                    onChange={(e) => { setMaxAdvanceDays(e.target.value); markChanged(); }}
                                    
                                    className={inputClass}
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    How far ahead users can reserve a facility.
                                </p>
                            </div>
                        </div>
                    </SectionCard>


                    <SectionCard
                        icon={Clock3}
                        title="Operating Hours & Check-in Policies"
                        description="Configure the school's daily booking window and attendance timing rules."
                    >
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                                <label className={labelClass} htmlFor="opening-time">Opening Time</label>
                                <input id="opening-time" type="time" value={openingTime} disabled={saving}
                                    onChange={(e) => { setOpeningTime(e.target.value); markChanged(); }}
                                    
                                    className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass} htmlFor="closing-time">Closing Time</label>
                                <input id="closing-time" type="time" value={closingTime} disabled={saving}
                                    onChange={(e) => { setClosingTime(e.target.value); markChanged(); }}
                                    
                                    className={inputClass} />
                                <p className="mt-1 text-xs text-slate-500">12:00 AM means the end of the booking day (midnight).</p>
                            </div>
                            <div>
                                <label className={labelClass} htmlFor="early-check-in">Early Check-in Allowance (Minutes)</label>
                                <input id="early-check-in" type="number" min="0" max="180" value={earlyCheckIn} disabled={saving}
                                    onChange={(e) => { setEarlyCheckIn(e.target.value); markChanged(); }}
                                    
                                    className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass} htmlFor="overtime-grace">Overtime Grace Period (Minutes)</label>
                                <input id="overtime-grace" type="number" min="0" max="180" value={overtimeGrace} disabled={saving}
                                    onChange={(e) => { setOvertimeGrace(e.target.value); markChanged(); }}
                                    
                                    className={inputClass} />
                                <p className="mt-1 text-xs text-slate-500">Grace time is excluded before overtime fees begin.</p>
                            </div>
                        </div>
                    </SectionCard>
                    <SectionCard
                        icon={Wallet}
                        title="Financial Policies"
                        description="Set the overtime rate and preview how the hourly fee translates into shorter overtime periods."
                    >
                        <div className="space-y-5">
                            <div>
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
                                        onChange={(e) => { setFee(e.target.value); markChanged(); }}
                                        className={`${inputClass} pl-9`}
                                    />
                                </div>
                                <p className="mt-2 text-sm text-slate-500">
                                    Current rate: ₱{Number(fee || 0).toFixed(2)} per hour.
                                </p>
                            </div>

                            <div className="rounded-xl border border-[#6A535C]/15 bg-[#6A535C]/5 p-4">
                                <div className="mb-3">
                                    <p className="text-sm font-semibold text-slate-800">Rate breakdown</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        Illustrative prorated amounts based on the hourly rate, before any configured grace period.
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[{ label: '15 minutes', minutes: 15 }, { label: '30 minutes', minutes: 30 }, { label: '1 hour', minutes: 60 }].map((period) => (
                                        <div key={period.minutes} className="rounded-lg border border-white bg-white px-3 py-3">
                                            <p className="text-xs text-slate-500">{period.label}</p>
                                            <p className="mt-1 text-base font-bold text-[#6A535C]">
                                                ₱{((Number(fee) || 0) * period.minutes / 60).toFixed(2)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    <div className="xl:col-span-2">
                    <SectionCard
                        icon={Trash2}
                        title="Unapproved Booking Cleanup"
                        description="Choose how long expired pending bookings are retained before automated cleanup."
                    >
                        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
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

                            <div className="grid gap-3 sm:grid-cols-3">
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
                                                markChanged();
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
                        </div>

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
            <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 shadow-lg backdrop-blur">
                <p className="text-sm text-slate-500">
                    {hasChanges ? 'You have unsaved changes. Save to apply them.' : 'Your booking settings are up to date.'}
                </p>
                <button type="button" onClick={saveSettings} disabled={!hasChanges || saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6A535C] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#58434B] focus:outline-none focus:ring-2 focus:ring-[#6A535C]/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    {saving ? <Clock3 className="h-4 w-4 animate-pulse" /> : <CheckCircle2 className="h-4 w-4" />}
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
            </div>
        </AuthenticatedLayout>
    );
}