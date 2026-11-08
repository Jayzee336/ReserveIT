import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, FileText, LoaderCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Bundle the matching PDF.js worker with ReserveIT instead of loading it from a CDN.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function BookingConsentAttachment({ booking }) {
    const previewContainerRef = useRef(null);
    const canvasRefs = useRef([]);
    const [pdfDocument, setPdfDocument] = useState(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isRendering, setIsRendering] = useState(false);
    const [previewError, setPreviewError] = useState('');

    const canShowAttachment = Boolean(booking?.consent_file_uploaded && booking?.id);
    const consentUrl = booking?.id ? route('bookings.consent', booking.id) : '';
    const previewUrl = consentUrl ? `${consentUrl}?preview=1` : '';

    // Measure the available preview width so PDF pages remain readable on
    // smaller screens and resize correctly when a modal changes size.
    useEffect(() => {
        const container = previewContainerRef.current;

        if (!container) {
            return undefined;
        }

        const updateWidth = () => {
            setContainerWidth(Math.max(0, container.clientWidth - 32));
        };

        updateWidth();

        const observer = new ResizeObserver(updateWidth);
        observer.observe(container);

        return () => observer.disconnect();
    }, [canShowAttachment]);

    // Fetch the private PDF through Laravel's authenticated route. Fetching
    // it as data prevents the browser's native PDF viewer or download manager
    // from taking over the embedded preview.
    useEffect(() => {
        if (!canShowAttachment) {
            setPdfDocument(null);
            setIsLoading(false);
            setIsRendering(false);
            setPreviewError('');
            canvasRefs.current = [];
            return undefined;
        }

        let cancelled = false;
        let loadingTask = null;
        let loadedDocument = null;

        setPdfDocument(null);
        setIsLoading(true);
        setIsRendering(false);
        setPreviewError('');
        canvasRefs.current = [];

        const loadPdf = async () => {
            try {
                const response = await fetch(previewUrl, {
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/pdf',
                    },
                });

                if (!response.ok) {
                    if (response.status === 403 || response.status === 401) {
                        throw new Error('Your account is not authorized to view this consent letter.');
                    }

                    if (response.status === 404) {
                        throw new Error('The consent letter could not be found in private storage.');
                    }

                    throw new Error(`The server could not load the PDF (HTTP ${response.status}).`);
                }

                const contentType = response.headers.get('content-type') || '';

                if (!contentType.toLowerCase().includes('application/pdf')) {
                    throw new Error('The server response was not a PDF document.');
                }

                const fileData = new Uint8Array(await response.arrayBuffer());
                loadingTask = pdfjsLib.getDocument({ data: fileData });
                const document = await loadingTask.promise;
                loadedDocument = document;

                if (cancelled) {
                    await document.destroy();
                    return;
                }

                setPdfDocument(document);
                setIsLoading(false);
            } catch (error) {
                if (!cancelled) {
                    setPreviewError(error?.message || 'The consent letter could not be previewed.');
                    setIsLoading(false);
                }
            }
        };

        loadPdf();

        return () => {
            cancelled = true;

            const cleanup = loadedDocument
                ? loadedDocument.destroy()
                : loadingTask?.destroy();

            if (cleanup && typeof cleanup.catch === 'function') {
                cleanup.catch(() => {});
            }
        };
    }, [canShowAttachment, previewUrl]);

    // Render each PDF page onto its own canvas. No iframe or browser PDF
    // navigation is involved, so this preview stays entirely inside ReserveIT.
    useEffect(() => {
        if (!canShowAttachment || !pdfDocument || !containerWidth) {
            return undefined;
        }

        let cancelled = false;
        const renderTasks = [];

        const renderPages = async () => {
            setIsRendering(true);
            setPreviewError('');

            try {
                for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
                    if (cancelled) {
                        return;
                    }

                    const page = await pdfDocument.getPage(pageNumber);
                    const baseViewport = page.getViewport({ scale: 1 });
                    const scale = Math.min(containerWidth / baseViewport.width, 1.5);
                    const viewport = page.getViewport({ scale });
                    const canvas = canvasRefs.current[pageNumber - 1];

                    if (!canvas) {
                        continue;
                    }

                    const context = canvas.getContext('2d');

                    if (!context) {
                        throw new Error('Your browser could not create a PDF preview surface.');
                    }

                    const outputScale = Math.min(window.devicePixelRatio || 1, 2);
                    canvas.width = Math.floor(viewport.width * outputScale);
                    canvas.height = Math.floor(viewport.height * outputScale);
                    canvas.style.width = `${Math.floor(viewport.width)}px`;
                    canvas.style.height = `${Math.floor(viewport.height)}px`;

                    const renderTask = page.render({
                        canvasContext: context,
                        viewport,
                        transform: outputScale > 1
                            ? [outputScale, 0, 0, outputScale, 0, 0]
                            : null,
                    });

                    renderTasks.push(renderTask);
                    await renderTask.promise;
                }

                if (!cancelled) {
                    setIsRendering(false);
                }
            } catch (error) {
                if (cancelled || error?.name === 'RenderingCancelledException') {
                    return;
                }

                setPreviewError(error?.message || 'One or more PDF pages could not be rendered.');
                setIsRendering(false);
            }
        };

        renderPages();

        return () => {
            cancelled = true;
            renderTasks.forEach((task) => task.cancel());
        };
    }, [canShowAttachment, pdfDocument, containerWidth]);

    if (!canShowAttachment) {
        return null;
    }

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

            <div
                ref={previewContainerRef}
                className="mt-4 max-h-[560px] overflow-auto rounded-lg border border-indigo-100 bg-slate-100 p-4"
            >
                {isLoading && (
                    <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-600">
                        <LoaderCircle className="h-5 w-5 animate-spin text-indigo-600" />
                        Loading secure PDF preview…
                    </div>
                )}

                {!isLoading && previewError && (
                    <div role="alert" className="flex min-h-40 flex-col items-center justify-center gap-2 px-4 text-center">
                        <AlertCircle className="h-7 w-7 text-rose-500" />
                        <p className="text-sm font-semibold text-slate-800">PDF preview unavailable</p>
                        <p className="max-w-lg text-xs leading-5 text-slate-600">{previewError}</p>
                        <p className="text-xs text-slate-500">You can still use Download PDF to retrieve the original file.</p>
                    </div>
                )}

                {!isLoading && !previewError && pdfDocument && (
                    <>
                        <div className="mb-3 flex items-center justify-between gap-3 text-xs text-slate-600">
                            <span className="font-semibold text-slate-700">
                                {isRendering ? 'Rendering document pages…' : 'PDF preview'}
                            </span>
                            <span>{pdfDocument.numPages} {pdfDocument.numPages === 1 ? 'page' : 'pages'}</span>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            {Array.from({ length: pdfDocument.numPages }, (_, index) => (
                                <div
                                    key={index + 1}
                                    className="w-fit max-w-full overflow-hidden rounded-md bg-white shadow-sm"
                                >
                                    <canvas
                                        ref={(canvas) => {
                                            canvasRefs.current[index] = canvas;
                                        }}
                                        className="block h-auto max-w-full"
                                        aria-label={`Consent letter page ${index + 1}`}
                                    />
                                    <div className="border-t border-slate-200 px-3 py-1.5 text-center text-[11px] text-slate-500">
                                        Page {index + 1} of {pdfDocument.numPages}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <p className="mt-2 text-xs text-slate-500">
                Preview pages are rendered inside ReserveIT from the authorized private-file route. The original PDF is only downloaded when you select Download PDF.
            </p>
        </section>
    );
}
