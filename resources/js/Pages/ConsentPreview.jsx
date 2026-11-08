import { useEffect, useRef, useState } from 'react';
import {
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Download,
    FileText,
    LoaderCircle,
    LockKeyhole,
    Maximize2,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { saveProtectedFile } from '../utils/saveProtectedFile';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function decodeBase64Pdf(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}

export default function ConsentPreview({ fileName, fileExtension, pdfDataBase64, downloadUrl }) {
    const previewContainerRef = useRef(null);
    const pageRefs = useRef([]);
    const canvasRefs = useRef([]);

    const [pdfDocument, setPdfDocument] = useState(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [isLoading, setIsLoading] = useState(Boolean(pdfDataBase64));
    const [isRendering, setIsRendering] = useState(false);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState('');
    const [downloadMessage, setDownloadMessage] = useState('');

    useEffect(() => {
        document.title = `${fileName || 'Consent Letter'} | ReserveIT`;
    }, [fileName]);

    useEffect(() => {
        const container = previewContainerRef.current;
        if (!container) return undefined;

        const updateWidth = () => setContainerWidth(Math.max(0, container.clientWidth - 48));
        updateWidth();

        const observer = new ResizeObserver(updateWidth);
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // The PDF bytes arrive inside the authorized page response. The viewer
    // does not navigate to or fetch a separate PDF URL.
    useEffect(() => {
        if (!pdfDataBase64) {
            setIsLoading(false);
            setPdfDocument(null);
            setError('');
            return undefined;
        }

        let cancelled = false;
        let loadingTask = null;
        let loadedDocument = null;

        setIsLoading(true);
        setError('');
        setPdfDocument(null);
        setCurrentPage(1);
        pageRefs.current = [];
        canvasRefs.current = [];

        try {
            loadingTask = pdfjsLib.getDocument({ data: decodeBase64Pdf(pdfDataBase64) });
            loadingTask.promise
                .then((document) => {
                    loadedDocument = document;
                    if (cancelled) {
                        document.destroy();
                        return;
                    }
                    setPdfDocument(document);
                    setIsLoading(false);
                })
                .catch((loadError) => {
                    if (!cancelled) {
                        setError(loadError?.message || 'The PDF could not be opened.');
                        setIsLoading(false);
                    }
                });
        } catch (loadError) {
            setError(loadError?.message || 'The PDF could not be opened.');
            setIsLoading(false);
        }

        return () => {
            cancelled = true;
            const cleanup = loadedDocument ? loadedDocument.destroy() : loadingTask?.destroy();
            if (cleanup && typeof cleanup.catch === 'function') cleanup.catch(() => {});
        };
    }, [pdfDataBase64]);

    useEffect(() => {
        if (!pdfDocument || !containerWidth) return undefined;

        let cancelled = false;
        const renderTasks = [];

        const renderPages = async () => {
            setIsRendering(true);
            setError('');

            try {
                for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
                    if (cancelled) return;

                    const page = await pdfDocument.getPage(pageNumber);
                    const originalViewport = page.getViewport({ scale: 1 });
                    const fitScale = Math.min(containerWidth / originalViewport.width, 1.35);
                    const viewport = page.getViewport({ scale: fitScale * zoom });
                    const canvas = canvasRefs.current[pageNumber - 1];
                    if (!canvas) continue;

                    const context = canvas.getContext('2d');
                    if (!context) throw new Error('Your browser could not create a PDF page preview.');

                    const outputScale = Math.min(window.devicePixelRatio || 1, 2);
                    canvas.width = Math.floor(viewport.width * outputScale);
                    canvas.height = Math.floor(viewport.height * outputScale);
                    canvas.style.width = `${Math.floor(viewport.width)}px`;
                    canvas.style.height = `${Math.floor(viewport.height)}px`;

                    const renderTask = page.render({
                        canvasContext: context,
                        viewport,
                        transform: outputScale > 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null,
                    });
                    renderTasks.push(renderTask);
                    await renderTask.promise;
                }

                if (!cancelled) setIsRendering(false);
            } catch (renderError) {
                if (cancelled || renderError?.name === 'RenderingCancelledException') return;
                setError(renderError?.message || 'A PDF page could not be rendered.');
                setIsRendering(false);
            }
        };

        renderPages();
        return () => {
            cancelled = true;
            renderTasks.forEach((task) => task.cancel());
        };
    }, [pdfDocument, containerWidth, zoom]);

    // Keep the page counter in sync with the document area as the admin scrolls.
    useEffect(() => {
        const container = previewContainerRef.current;
        if (!container || !pdfDocument) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                const visiblePages = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

                if (visiblePages[0]) {
                    setCurrentPage(Number(visiblePages[0].target.dataset.page));
                }
            },
            {
                root: container,
                threshold: [0.2, 0.4, 0.6, 0.8],
            },
        );

        pageRefs.current.forEach((page) => {
            if (page) observer.observe(page);
        });

        return () => observer.disconnect();
    }, [pdfDocument]);

    const extensionLabel = {
        pdf: 'PDF document',
        doc: 'Word document (.doc)',
        docx: 'Word document (.docx)',
    }[fileExtension] || (fileExtension ? `${fileExtension.toUpperCase()} file` : 'Document');

    const goToPage = (pageNumber) => {
        if (!pdfDocument) return;

        const nextPage = Math.max(1, Math.min(pdfDocument.numPages, pageNumber));
        setCurrentPage(nextPage);
        pageRefs.current[nextPage - 1]?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    const changeZoom = (amount) => {
        setZoom((current) => Math.max(0.7, Math.min(1.8, Number((current + amount).toFixed(2)))));
    };

    // Use the same Save As workflow as the booking details attachment row.
    const handleDownload = () => {
        if (isDownloading) return;

        setDownloadError('');
        setDownloadMessage('');
        setIsDownloading(true);

        saveProtectedFile({ url: downloadUrl, fileName })
            .then((savedName) => {
                setDownloadMessage(`Saved "${savedName}" successfully.`);
            })
            .catch((downloadFailure) => {
                if (downloadFailure?.name !== 'AbortError') {
                    setDownloadError(downloadFailure?.message || 'The file could not be saved. Please try again.');
                }
            })
            .finally(() => {
                setIsDownloading(false);
            });
    };

    return (
        <div className="min-h-screen bg-[#F3F5FA] text-slate-900">
            <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-900/15">
                            <FileText className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-indigo-700">
                                    ReserveIT
                                </span>
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                    <LockKeyhole className="mr-1 inline h-3 w-3" />
                                    Private document
                                </span>
                            </div>
                            <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg" title={fileName}>
                                {fileName}
                            </h1>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Consent letter <span className="mx-1 text-slate-300">/</span> {extensionLabel}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:justify-end">
                        <p className="hidden text-xs text-slate-500 xl:block">
                            Secure document preview
                        </p>
                        <button
                            type="button"
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-900/10 transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
                        >
                            {isDownloading
                                ? <LoaderCircle className="h-4 w-4 animate-spin" />
                                : <Download className="h-4 w-4" />}
                            {isDownloading ? 'Preparing…' : 'Download original'}
                        </button>
                    </div>
                </div>

                {pdfDocument && (
                    <div className="border-t border-slate-100 bg-slate-50/90">
                        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage <= 1}
                                    className="rounded-lg p-2 text-slate-600 transition hover:bg-white hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-35"
                                    aria-label="Previous page"
                                    title="Previous page"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="min-w-[92px] text-center text-xs font-semibold tabular-nums text-slate-700">
                                    Page {currentPage} of {pdfDocument.numPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage >= pdfDocument.numPages}
                                    className="rounded-lg p-2 text-slate-600 transition hover:bg-white hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-35"
                                    aria-label="Next page"
                                    title="Next page"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => changeZoom(-0.1)}
                                    disabled={zoom <= 0.7}
                                    className="rounded-lg p-2 text-slate-600 transition hover:bg-white hover:text-indigo-700 disabled:opacity-35"
                                    aria-label="Zoom out"
                                    title="Zoom out"
                                >
                                    <ZoomOut className="h-4 w-4" />
                                </button>
                                <span className="min-w-[52px] text-center text-xs font-semibold tabular-nums text-slate-700">
                                    {Math.round(zoom * 100)}%
                                </span>
                                <button
                                    type="button"
                                    onClick={() => changeZoom(0.1)}
                                    disabled={zoom >= 1.8}
                                    className="rounded-lg p-2 text-slate-600 transition hover:bg-white hover:text-indigo-700 disabled:opacity-35"
                                    aria-label="Zoom in"
                                    title="Zoom in"
                                >
                                    <ZoomIn className="h-4 w-4" />
                                </button>
                                <span className="mx-1 h-5 w-px bg-slate-200" />
                                <button
                                    type="button"
                                    onClick={() => setZoom(1)}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-indigo-700"
                                    title="Fit page to viewer width"
                                >
                                    <Maximize2 className="h-3.5 w-3.5" />
                                    Fit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-7">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700">
                            Document workspace
                        </p>
                        <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                            Consent letter preview
                        </h2>
                    </div>
                    {pdfDocument && (
                        <p className="text-xs text-slate-500">
                            {pdfDocument.numPages} {pdfDocument.numPages === 1 ? 'page' : 'pages'} · Scroll to read
                        </p>
                    )}
                </div>

                <section
                    ref={previewContainerRef}
                    className="max-h-[calc(100vh-210px)] min-h-[58vh] overflow-auto rounded-2xl border border-slate-200 bg-[#E5EAF2] p-3 shadow-inner sm:p-6"
                >
                    {isLoading && (
                        <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-700 shadow-sm">
                                <LoaderCircle className="h-6 w-6 animate-spin" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-slate-800">Preparing your secure preview</p>
                                <p className="mt-1 text-xs text-slate-500">Loading the consent letter from private storage…</p>
                            </div>
                        </div>
                    )}

                    {!isLoading && error && (
                        <div role="alert" className="flex min-h-[55vh] flex-col items-center justify-center gap-3 px-4 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                                <AlertCircle className="h-6 w-6" />
                            </span>
                            <h3 className="text-base font-bold text-slate-900">Preview unavailable</h3>
                            <p className="max-w-xl text-sm leading-6 text-slate-600">{error}</p>
                            <p className="text-xs text-slate-500">The original file is still available through Download original.</p>
                        </div>
                    )}

                    {!isLoading && !error && !pdfDataBase64 && (
                        <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 px-4 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-700 shadow-sm">
                                <FileText className="h-6 w-6" />
                            </span>
                            <h3 className="text-base font-bold text-slate-900">This file type cannot be previewed here</h3>
                            <p className="max-w-xl text-sm leading-6 text-slate-600">
                                {extensionLabel} files may need a desktop document application. Select Download original to open the submitted file.
                            </p>
                        </div>
                    )}

                    {!isLoading && !error && pdfDocument && (
                        <div className="flex flex-col items-center gap-6 py-1">
                            {Array.from({ length: pdfDocument.numPages }, (_, index) => (
                                <article
                                    key={index + 1}
                                    ref={(element) => { pageRefs.current[index] = element; }}
                                    data-page={index + 1}
                                    className="max-w-full scroll-mt-3 overflow-hidden rounded-md bg-white shadow-xl shadow-slate-500/15 ring-1 ring-slate-900/5"
                                >
                                    <canvas
                                        ref={(canvas) => { canvasRefs.current[index] = canvas; }}
                                        className="block h-auto max-w-full"
                                        aria-label={`Consent letter page ${index + 1}`}
                                    />
                                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
                                        <span>RESERVEIT · CONSENT LETTER</span>
                                        <span className="font-medium tabular-nums">Page {index + 1} / {pdfDocument.numPages}</span>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <LockKeyhole className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>This private document is delivered through your authorized ReserveIT session.</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Keep downloaded copies secure.</p>
                </div>

                {downloadMessage && (
                    <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
                        {downloadMessage}
                    </p>
                )}

                {downloadError && (
                    <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
                        {downloadError}
                    </p>
                )}
            </main>
        </div>
    );
}
