document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('download-form');
    const urlInput = document.getElementById('url-input');
    const submitBtn = document.getElementById('submit-btn');
    const spinner = submitBtn.querySelector('.loader-spinner');
    const btnText = submitBtn.querySelector('span');

    const mainCard = document.querySelector('.main-card');
    const progressCard = document.getElementById('progress-card');
    const successCard = document.getElementById('success-card');
    const errorCard = document.getElementById('error-card');

    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    const logsContent = document.getElementById('logs-content');

    const downloadFileBtn = document.getElementById('download-file-btn');
    const resetBtn = document.getElementById('reset-btn');
    const errorResetBtn = document.getElementById('error-reset-btn');

    let eventSource = null;
    let currentDownloadedFilename = null;

    // Steps elements
    const steps = {
        opening: document.getElementById('step-opening'),
        processing: document.getElementById('step-processing'),
        rendering: document.getElementById('step-rendering'),
        merging: document.getElementById('step-merging')
    };

    // Helper to log text
    function addLog(message, type = 'system-log') {
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        line.textContent = `[${timestamp}] ${message}`;
        
        logsContent.appendChild(line);
        logsContent.scrollTop = logsContent.scrollHeight;
    }

    // Helper to update visual step items
    function updateStepVisuals(currentStatus) {
        // Reset all states
        Object.keys(steps).forEach(key => {
            steps[key].classList.remove('active', 'completed');
        });

        // Determine step order
        const order = ['opening', 'processing', 'rendering', 'merging'];
        const currentIndex = order.indexOf(currentStatus);

        if (currentIndex === -1) return;

        // Apply completed to all steps before current
        for (let i = 0; i < currentIndex; i++) {
            steps[order[i]].classList.add('completed');
        }

        // Apply active to current step
        steps[currentStatus].classList.add('active');
    }

    // Reset UI to initial state
    function resetUI() {
        mainCard.classList.remove('hidden');
        progressCard.classList.add('hidden');
        successCard.classList.add('hidden');
        errorCard.classList.add('hidden');
        
        // Reset button
        submitBtn.disabled = false;
        spinner.classList.add('hidden');
        btnText.textContent = 'Unduh Dokumen';
        
        urlInput.value = '';
        currentDownloadedFilename = null;
        logsContent.innerHTML = '<div class="log-line system-log">Menunggu input URL...</div>';

        // Reset all steps opacity/state
        Object.keys(steps).forEach(key => {
            steps[key].classList.remove('active', 'completed');
        });
    }

    // Handle Form Submit (Start Download)
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = urlInput.value.trim();

        if (!url) return;

        // UI transitions
        mainCard.classList.add('hidden');
        progressCard.classList.remove('hidden');
        submitBtn.disabled = true;
        spinner.classList.remove('hidden');
        btnText.textContent = 'Mengunduh...';

        logsContent.innerHTML = '';
        addLog('Menginisialisasi koneksi pengunduhan...');

        // SSE Connection
        const sseUrl = `/api/download?url=${encodeURIComponent(url)}`;
        eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[SSE] Received payload:', data);

                if (data.status === 'error') {
                    handleError(data.message);
                } else if (data.status === 'done') {
                    handleSuccess(data.filename, data.message);
                } else {
                    // Update step progress
                    updateStepVisuals(data.status);
                    addLog(data.message);
                }
            } catch (err) {
                console.error('[SSE] Failed to parse payload:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('[SSE] EventSource failed:', err);
            handleError('Koneksi terputus ke server lokal. Pastikan server masih berjalan.');
        };
    });

    // Handle Success State
    function handleSuccess(filename, message) {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }

        // Set all steps to completed
        Object.keys(steps).forEach(key => {
            steps[key].classList.remove('active');
            steps[key].classList.add('completed');
        });

        addLog(message, 'success-log');
        currentDownloadedFilename = filename;

        // Transition to success card after a short delay for visual satisfaction
        setTimeout(() => {
            progressCard.classList.add('hidden');
            successCard.classList.remove('hidden');
            successMessage.textContent = `Dokumen "${filename}" berhasil diunduh dan tersimpan secara lokal di server.`;
        }, 1000);
    }

    // Handle Error State
    function handleError(message) {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }

        addLog(`Kesalahan: ${message}`, 'error-log');

        setTimeout(() => {
            progressCard.classList.add('hidden');
            errorCard.classList.remove('hidden');
            errorMessage.textContent = message || 'Gagal memproses pengunduhan dokumen.';
        }, 1000);
    }

    // Button: Trigger download file directly to browser downloads folder
    downloadFileBtn.addEventListener('click', () => {
        if (!currentDownloadedFilename) return;
        
        // Redirect browser to trigger file download stream
        window.location.href = `/api/download-file?name=${encodeURIComponent(currentDownloadedFilename)}`;
    });

    // Button: Reset for next download
    resetBtn.addEventListener('click', resetUI);
    errorResetBtn.addEventListener('click', resetUI);
});
