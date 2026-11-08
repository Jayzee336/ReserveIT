import { Download, FileText } from 'lucide-react';

export default function BookingConsentAttachment({ booking }) {
    if (!booking?.consent_file_uploaded || !booking?.id) {
        return null;
    }

    const consentUrl = route('bookings.consent', booking.id);
    const previewUrl = `${consentUrl}?preview=1`;

    return (
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 sm:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                        <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                            Consent Letter
                        </p>
                        <p className="truncate text-sm font-semibold text-slate-900">
                            {booking.consent_file_name || 'Consent letter.pdf'}
                        </p>
                        <p className="text-xs text-slate-500">
                            PDF document · Private attachment
                        </p>
                    </div>
                </div>

                <a
                    href={consentUrl}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                    <Download className="h-4 w-4" />
                    Download PDF
                </a>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-indigo-100 bg-white">
                <iframe
                    src={previewUrl}
                    title={`Consent letter preview for booking ${booking.id}`}
                    className="h-[420px] w-full"
                    loading="lazy"
                />
            </div>
            <p className="mt-2 text-xs text-slate-500">
                This document is served through ReserveIT's authorized private-file route.
            </p>
        </section>
    );
}
