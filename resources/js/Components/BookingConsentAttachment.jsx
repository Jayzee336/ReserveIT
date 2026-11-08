import { Download, Eye, FileText } from 'lucide-react';

export default function BookingConsentAttachment({ booking }) {
    if (!booking?.consent_file_uploaded || !booking?.id) {
        return null;
    }

    const consentUrl = route('bookings.consent', booking.id);
    const previewUrl = `${consentUrl}?preview=1`;
    const fileName = booking.consent_file_name || 'Consent letter';
    const extension = fileName.includes('.')
        ? fileName.split('.').pop().toLowerCase()
        : '';
    const fileType = {
        pdf: 'PDF document',
        doc: 'Word document (.doc)',
        docx: 'Word document (.docx)',
    }[extension] || (extension ? `${extension.toUpperCase()} file` : 'Document');

    return (
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 sm:col-span-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                        <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                            Consent Letter
                        </p>
                        <p className="truncate text-sm font-semibold text-slate-900" title={fileName}>
                            {fileName}
                        </p>
                        <p className="text-xs text-slate-500">
                            {fileType} · Private attachment
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                    <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        aria-label={`View ${fileName} in a new tab`}
                    >
                        <Eye className="h-4 w-4" />
                        View
                    </a>

                    <a
                        href={consentUrl}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        aria-label={`Download ${fileName}`}
                    >
                        <Download className="h-4 w-4" />
                        Download
                    </a>
                </div>
            </div>
        </section>
    );
}
