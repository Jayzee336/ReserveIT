import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, FileText, LoaderCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

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
    const canvasRefs = useRef([]);
    const [pdfDocument, setPdfDocument] = useState(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const [isLoading, setIsLoading] = useState(Boolean(pdfDataBase64));
    const [isRendering, setIsRendering] = useState(false);
    const [error, setError] = useState('');

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

    // PDF bytes are supplied inside this authorized page response. No raw PDF
    // URL, iframe, blob URL, or secondary PDF request is used by the viewer.
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
                    const scale = Math.min(containerWidth / originalViewport.width, 1.5);
                    const viewport = page.getViewport({ scale });
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
    }, [pdfDocument, containerWidth]);

    const extensionLabel = {
        pdf: 'PDF document',
        doc: 'Word document (.doc)',
        docx: 'Word document (.docx)',
    }[fileExtension] || (fileExtension ? `${fileExtension.toUpperCase()} file` : 'Document');

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                            <FileText className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-700">ReserveIT · Consent Letter</p>
                            <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base" title={fileName}>{fileName}</h1>
                            <p className="mt-0.5 text-xs text-slate-500">{extensionLabel} · Secure private preview</p>
                        </div>
                    </div>
                    <a
                        href={downloadUrl}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Download original</span>
                        <span className="sm:hidden">Download</span>
                    </a>
                </div>
            </header>

            <main className="mx-auto max-w-6xl p-3 sm:p-6">
                <section
                    ref={previewContainerRef}
                    className="min-h-[calc(100vh-112px)] overflow-auto rounded-xl border border-slate-200 bg-slate-200/70 p-3 shadow-inner sm:p-6"
                >
                    {isLoading && (
                        <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm font-medium text-slate-600">
                            <LoaderCircle className="h-5 w-5 animate-spin text-indigo-700" />
                            Preparing secure PDF preview…
                        </div>
                    )}

                    {!isLoading && error && (
                        <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
                            <AlertCircle className="h-8 w-8 text-rose-600" />
                            <h2 className="text-base font-bold text-slate-900">PDF preview unavailable</h2>
                            <p className="max-w-xl text-sm leading-6 text-slate-600">{error}</p>
                            <p className="text-xs text-slate-500">Use the Download button to retrieve the original file.</p>
                        </div>
                    )}

                    {!isLoading && !error && !pdfDataBase64 && (
                        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
                            <FileText className="h-9 w-9 text-indigo-700" />
                            <h2 className="text-base font-bold text-slate-900">Preview is available for PDF files</h2>
                            <p className="max-w-xl text-sm leading-6 text-slate-600">
                                This {extensionLabel} file cannot be rendered directly in the browser. Download it to open it with a compatible application.
                            </p>
                        </div>
                    )}

                    {!isLoading && !error && pdfDocument && (
                        <>
                            <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between gap-3 text-xs text-slate-600">
                                <span className="font-semibold">{isRendering ? 'Rendering pages…' : 'Document preview'}</span>
                                <span>{pdfDocument.numPages} {pdfDocument.numPages === 1 ? 'page' : 'pages'}</span>
                            </div>
                            <div className="flex flex-col items-center gap-5">
                                {Array.from({ length: pdfDocument.numPages }, (_, index) => (
                                    <article key={index + 1} className="max-w-full overflow-hidden rounded-sm bg-white shadow-lg">
                                        <canvas
                                            ref={(canvas) => { canvasRefs.current[index] = canvas; }}
                                            className="block h-auto max-w-full"
                                            aria-label={`Consent letter page ${index + 1}`}
                                        />
                                        <p className="border-t border-slate-200 px-3 py-2 text-center text-[11px] text-slate-500">
                                            Page {index + 1} of {pdfDocument.numPages}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
