<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="referrer" content="no-referrer">
    <title>Consent Letter Preview | ReserveIT</title>
    <style>
        * { box-sizing: border-box; }
        html, body { min-height: 100%; margin: 0; }
        body {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background: #eef2f7;
            color: #172033;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            padding: 16px 24px;
            background: #fff;
            border-bottom: 1px solid #dbe2ea;
            box-shadow: 0 2px 8px rgba(15, 23, 42, .04);
        }
        .file-info { min-width: 0; }
        .eyebrow {
            margin: 0 0 4px;
            color: #5145a5;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: .12em;
            text-transform: uppercase;
        }
        .filename {
            overflow: hidden;
            margin: 0;
            color: #172033;
            font-size: 15px;
            font-weight: 700;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .filetype { margin: 4px 0 0; color: #64748b; font-size: 12px; }
        .download {
            display: inline-flex;
            flex: 0 0 auto;
            align-items: center;
            justify-content: center;
            min-height: 40px;
            padding: 0 16px;
            border-radius: 9px;
            background: #4f46a5;
            color: #fff;
            font-size: 13px;
            font-weight: 700;
            text-decoration: none;
        }
        .download:hover { background: #43398f; }
        main { display: flex; flex: 1; min-height: 0; padding: 18px; }
        .viewer {
            position: relative;
            display: flex;
            flex: 1;
            min-height: 70vh;
            overflow: hidden;
            align-items: center;
            justify-content: center;
            border: 1px solid #dbe2ea;
            border-radius: 12px;
            background: #fff;
            box-shadow: 0 4px 18px rgba(15, 23, 42, .06);
        }
        iframe { width: 100%; height: calc(100vh - 114px); min-height: 70vh; border: 0; background: #64748b; }
        .message { max-width: 560px; padding: 32px; color: #475569; text-align: center; }
        .message strong { display: block; margin-bottom: 8px; color: #172033; font-size: 16px; }
        .message p { margin: 0; font-size: 13px; line-height: 1.6; }
        [hidden] { display: none !important; }
        @media (max-width: 640px) {
            .topbar { align-items: flex-start; padding: 13px 15px; }
            .filename { max-width: 52vw; }
            .download { padding: 0 12px; }
            main { padding: 10px; }
            iframe { height: calc(100vh - 94px); }
        }
    </style>
</head>
<body>
    <header class="topbar">
        <div class="file-info">
            <p class="eyebrow">ReserveIT · Consent Letter</p>
            <h1 class="filename">{{ $fileName }}</h1>
            <p class="filetype">{{ $isPdf ? 'PDF document · Private attachment' : 'Word document · Private attachment' }}</p>
        </div>
        <a class="download" href="{{ $downloadUrl }}">Download</a>
    </header>

    <main>
        <section class="viewer" aria-label="Consent letter document preview">
            @if ($isPdf)
                <div id="loading" class="message">
                    <strong>Preparing secure preview…</strong>
                    <p>The document is being loaded from ReserveIT's private storage.</p>
                </div>
                <div id="error" class="message" role="alert" hidden>
                    <strong>Preview could not be loaded</strong>
                    <p id="error-text">Please use the Download button to retrieve the original file.</p>
                </div>
                <iframe id="pdf-frame" title="Consent letter PDF preview" hidden></iframe>
            @else
                <div class="message">
                    <strong>Preview is not supported for this file type</strong>
                    <p>Word documents may not display in your browser. Use the Download button to open the original document.</p>
                </div>
            @endif
        </section>
    </main>

    @if ($isPdf)
        <script>
            (() => {
                const previewUrl = @json($previewUrl);
                const frame = document.getElementById('pdf-frame');
                const loading = document.getElementById('loading');
                const errorBox = document.getElementById('error');
                const errorText = document.getElementById('error-text');
                let objectUrl = null;

                fetch(previewUrl, {
                    method: 'GET',
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: { 'Accept': 'application/pdf' }
                })
                    .then(async (response) => {
                        if (!response.ok) {
                            throw new Error(
                                response.status === 401 || response.status === 403
                                    ? 'Your session does not have permission to view this consent letter. Sign in again and retry.'
                                    : response.status === 404
                                        ? 'The consent letter could not be found in private storage.'
                                        : 'The server could not load the PDF (HTTP ' + response.status + ').'
                            );
                        }

                        const type = (response.headers.get('content-type') || '').toLowerCase();
                        if (!type.includes('application/pdf')) {
                            throw new Error('ReserveIT returned an unexpected response instead of a PDF document.');
                        }

                        const pdfBlob = await response.blob();
                        objectUrl = URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
                        frame.src = objectUrl;
                        frame.hidden = false;
                        loading.hidden = true;
                    })
                    .catch((error) => {
                        loading.hidden = true;
                        errorText.textContent = (error && error.message ? error.message : 'The preview could not be loaded.')
                            + ' You can still use the Download button to retrieve the original file.';
                        errorBox.hidden = false;
                    });

                window.addEventListener('beforeunload', () => {
                    if (objectUrl) URL.revokeObjectURL(objectUrl);
                });
            })();
        </script>
    @endif
</body>
</html>
