import { useState } from 'react';
import { Download, Eye, FileText, LoaderCircle } from 'lucide-react';
import { saveProtectedFile } from '../utils/saveProtectedFile';

export default function BookingConsentAttachment({ booking }) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState('');
    const [downloadMessage, setDownloadMessage] = useState('');

    if (!booking?.consent_file_uploaded || !booking?.id) {
        return null;
    }

    const consentUrl = route('bookings.consent', booking.id);
    const previewUrl = `${consentUrl}?viewer=1`;
    const fileName = booking.consent_file_name || 'Consent letter';
    const extension = fileName.includes('.')
        ? fileName.split('.').pop().toLowerCase()
        : '';
    const fileType = {
        pdf: 'PDF document',
        doc: 'Word document (.doc)',
        docx: 'Word document (.docx)',
    }[extension] || (extension ? `${extension.toUpperCase()} file` : 'Document');

    const handleDownload = () => {
        if (isDownloading) return;

        setDownloadError('');
        setDownloadMessage('');
        setIsDownloading(true);

        // saveProtectedFile opens the native picker immediately in this click
        // event, then retrieves the attachment through the protected route.
        saveProtectedFile({ url: consentUrl, fileName })
            .then((savedName) => {
                setDownloadMessage(`Saved "${savedName}" successfully.`);
            })
            .catch((error) => {
                if (error?.name !== 'AbortError') {
                    setDownloadError(error?.message || 'The consent letter could not be saved.');
                }
            })
            .finally(() => {
                setIsDownloading(false);
            });
    };

    return (
        <section className="rounded-xl border border-[#EFE4E9] bg-[#F7F0F3]/70 p-4 sm:col-span-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#6A535C] shadow-sm">
                        <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#543F48]">
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
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E8D8D1] bg-white px-4 py-2 text-sm font-semibold text-[#543F48] transition hover:bg-[#F7F0F3] focus:outline-none focus:ring-2 focus:ring-[#F7F0F3]0 focus:ring-offset-2"
                        aria-label={`View ${fileName} in a new tab`}
                    >
                        <Eye className="h-4 w-4" />
                        View
                    </a>

                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6A535C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#543F48] focus:outline-none focus:ring-2 focus:ring-[#F7F0F3]0 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
                        aria-label={`Save ${fileName}`}
                    >
                        {isDownloading
                            ? <LoaderCircle className="h-4 w-4 animate-spin" />
                            : <Download className="h-4 w-4" />}
                        {isDownloading ? 'Preparing…' : 'Download'}
                    </button>
                </div>
            </div>

            {downloadMessage && (
                <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                    {downloadMessage}
                </p>
            )}

            {downloadError && (
                <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    {downloadError}
                </p>
            )}
        </section>
    );
}
