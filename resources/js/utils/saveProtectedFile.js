const FILE_TYPES = {
    pdf: {
        description: 'PDF document',
        accept: { 'application/pdf': ['.pdf'] },
    },
    doc: {
        description: 'Microsoft Word document',
        accept: { 'application/msword': ['.doc'] },
    },
    docx: {
        description: 'Microsoft Word document',
        accept: {
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        },
    },
};

function getDownloadError(status) {
    if (status === 401 || status === 403) {
        return 'Your session is not authorized to download this consent letter. Sign in again and retry.';
    }

    if (status === 404) {
        return 'The consent letter could not be found in private storage.';
    }

    return `ReserveIT could not prepare the download (HTTP ${status}).`;
}

/**
 * Opens the native Save As dialog synchronously from the user's click, then
 * fetches the protected file and writes it to the selected location.
 */
export function saveProtectedFile({ url, fileName }) {
    if (typeof window.showSaveFilePicker !== 'function' || !window.isSecureContext) {
        return Promise.reject(new Error(
            'The Save As dialog is not supported in this browser. Use an up-to-date Chrome or Edge browser over HTTPS (or localhost).',
        ));
    }

    const safeName = fileName || 'consent-letter';
    const extension = safeName.includes('.')
        ? safeName.split('.').pop().toLowerCase()
        : '';
    const selectedType = FILE_TYPES[extension] || {
        description: 'Consent letter',
        accept: { 'application/octet-stream': ['.bin'] },
    };

    let saveHandlePromise;

    try {
        // This must run immediately inside the click event, before any await.
        saveHandlePromise = window.showSaveFilePicker({
            suggestedName: safeName,
            startIn: 'downloads',
            types: [selectedType],
        });
    } catch (pickerError) {
        return Promise.reject(pickerError);
    }

    return saveHandlePromise.then(async (saveHandle) => {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
                Accept: 'application/octet-stream, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            },
        });

        if (!response.ok) {
            throw new Error(getDownloadError(response.status));
        }

        const fileBlob = await response.blob();
        const writable = await saveHandle.createWritable();

        try {
            await writable.write(fileBlob);
            await writable.close();
        } catch (writeError) {
            await writable.abort().catch(() => {});
            throw writeError;
        }

        return saveHandle.name;
    });
}
