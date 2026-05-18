document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const form = document.getElementById('download-form');
    const urlInput = document.getElementById('url-input');
    const submitBtn = document.getElementById('submit-btn');
    const spinner = submitBtn.querySelector('.loader-spinner');
    const btnText = submitBtn.querySelector('span');

    const progressCard = document.getElementById('progress-card');
    const successCard = document.getElementById('success-card');
    const errorCard = document.getElementById('error-card');

    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    const logsContent = document.getElementById('logs-content');
    
    // Progress fill & percentage
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercent = document.getElementById('progress-percent');

    const downloadFileBtn = document.getElementById('download-file-btn');
    const resetBtn = document.getElementById('reset-btn');
    const errorResetBtn = document.getElementById('error-reset-btn');

    // Tab Triggers & Contents
    const tabDownloadBtn = document.getElementById('tab-download-btn');
    const tabHistoryBtn = document.getElementById('tab-history-btn');
    const tabGuideBtn = document.getElementById('tab-guide-btn');

    const tabDownloadContent = document.getElementById('tab-download-content');
    const tabHistoryContent = document.getElementById('tab-history-content');
    const tabGuideContent = document.getElementById('tab-guide-content');

    const historyList = document.getElementById('history-list');
    const historyEmpty = document.getElementById('history-empty');

    const toastContainer = document.getElementById('toast-container');

    let eventSource = null;
    let currentDownloadedFilename = null;

    // Steps mapping
    const steps = {
        opening: document.getElementById('step-opening'),
        processing: document.getElementById('step-processing'),
        rendering: document.getElementById('step-rendering'),
        merging: document.getElementById('step-merging')
    };

    // Progress values matching stages
    const progressValues = {
        opening: 15,
        processing: 45,
        rendering: 75,
        merging: 92,
        done: 100
    };

    // --- Tab Switcher Logic ---
    function switchTab(activeBtn, activeContent) {
        // Deactivate all triggers & contents
        [tabDownloadBtn, tabHistoryBtn, tabGuideBtn].forEach(btn => btn.classList.remove('active'));
        [tabDownloadContent, tabHistoryContent, tabGuideContent].forEach(content => content.classList.add('hidden'));

        // Activate selected
        activeBtn.classList.add('active');
        activeContent.classList.remove('hidden');

        // Re-render history if switching to history tab
        if (activeBtn === tabHistoryBtn) {
            renderHistory();
        }
    }

    tabDownloadBtn.addEventListener('click', () => switchTab(tabDownloadBtn, tabDownloadContent));
    tabHistoryBtn.addEventListener('click', () => switchTab(tabHistoryBtn, tabHistoryContent));
    tabGuideBtn.addEventListener('click', () => switchTab(tabGuideBtn, tabGuideContent));

    // --- Toast Notification System ---
    function showToast(title, description, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-slide-in flex w-full max-w-sm overflow-hidden rounded-lg bg-card border shadow-lg p-4 gap-3 items-start transition-all duration-300 ${
            type === 'success' ? 'border-success/30' : 'border-destructive/30'
        }`;

        const iconColor = type === 'success' ? 'text-success' : 'text-destructive';
        const iconName = type === 'success' ? 'check-circle' : 'alert-circle';

        toast.innerHTML = `
            <div class="${iconColor} mt-0.5">
                <i data-lucide="${iconName}" class="w-5 h-5"></i>
            </div>
            <div class="flex-1 space-y-1">
                <h4 class="text-sm font-semibold text-foreground">${title}</h4>
                <p class="text-xs text-muted-foreground">${description}</p>
            </div>
            <button class="toast-close-btn text-muted-foreground hover:text-foreground">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        `;

        toastContainer.appendChild(toast);
        lucide.createIcons({ attrs: { class: 'lucide' } });

        // Auto dismiss after 3.5s
        const autoDismiss = setTimeout(() => {
            dismissToast(toast);
        }, 3500);

        // Click to close handler
        toast.querySelector('.toast-close-btn').addEventListener('click', () => {
            clearTimeout(autoDismiss);
            dismissToast(toast);
        });
    }

    function dismissToast(toast) {
        toast.classList.remove('toast-slide-in');
        toast.classList.add('toast-slide-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }

    // --- Logs helper ---
    function addLog(message, type = 'system-log') {
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        line.innerHTML = `<span class="text-muted-foreground/60">[${timestamp}]</span> ${message}`;
        
        logsContent.appendChild(line);
        logsContent.scrollTop = logsContent.scrollHeight;
    }

    // --- History Management (Local Storage) ---
    function getHistory() {
        const raw = localStorage.getItem('scribd_dl_history');
        return raw ? JSON.parse(raw) : [];
    }

    // Save generated file to browser local storage history
    function saveToHistory(filename, url) {
        const history = getHistory();
        const existing = history.findIndex(item => item.filename === filename);
        if (existing !== -1) return; // Avoid duplicates
        
        history.unshift({
            filename,
            url,
            date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
        });
        localStorage.setItem('scribd_dl_history', JSON.stringify(history));
    }

    function deleteHistoryItem(index) {
        const history = getHistory();
        history.splice(index, 1);
        localStorage.setItem('scribd_dl_history', JSON.stringify(history));
        renderHistory();
        showToast('History Deleted', 'The document has been removed from your local history list.', 'success');
    }

    function renderHistory() {
        // Clear all list items except placeholder
        const items = historyList.querySelectorAll('.history-item');
        items.forEach(el => el.remove());

        const history = getHistory();

        if (history.length === 0) {
            historyEmpty.classList.remove('hidden');
            return;
        }

        historyEmpty.classList.add('hidden');

        history.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'history-item py-3 flex items-center justify-between gap-4 transition-all duration-200';
            li.innerHTML = `
                <div class="flex items-start gap-3 min-w-0 flex-1">
                    <div class="p-2 rounded-lg bg-muted text-primary mt-0.5">
                        <i data-lucide="file-text" class="w-4 h-4"></i>
                    </div>
                    <div class="min-w-0">
                        <h4 class="text-sm font-medium text-foreground truncate" title="${item.filename}">${item.filename}</h4>
                        <p class="text-xs text-muted-foreground mt-0.5">${item.date}</p>
                    </div>
                </div>
                <div class="flex gap-2 shrink-0">
                    <button class="history-download-btn inline-flex items-center justify-center rounded-md bg-secondary text-secondary-foreground hover:bg-muted text-xs font-semibold h-8 w-8" title="Save File">
                        <i data-lucide="download" class="w-4 h-4"></i>
                    </button>
                    <button class="history-delete-btn inline-flex items-center justify-center rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold h-8 w-8" title="Delete History">
                        <i data-lucide="trash" class="w-4 h-4"></i>
                    </button>
                </div>
            `;

            // Event download
            li.querySelector('.history-download-btn').addEventListener('click', () => {
                window.location.href = `/api/download-file?name=${encodeURIComponent(item.filename)}`;
            });

            // Event delete
            li.querySelector('.history-delete-btn').addEventListener('click', () => {
                deleteHistoryItem(index);
            });

            historyList.appendChild(li);
        });

        // Initialize icons
        lucide.createIcons();
    }

    // --- Step State updates ---
    function updateStepVisuals(currentStatus) {
        Object.keys(steps).forEach(key => {
            steps[key].classList.remove('active', 'completed');
            const iconBadge = steps[key].querySelector('.step-badge');
            
            // Re-render numbering inside badges
            const orders = ['opening', 'processing', 'rendering', 'merging'];
            iconBadge.innerHTML = `<i data-lucide="${orders.indexOf(key) === 0 ? 'chrome' : orders.indexOf(key) === 1 ? 'scan-search' : orders.indexOf(key) === 2 ? 'printer' : 'combine'}" class="w-3.5 h-3.5"></i>`;
        });

        const order = ['opening', 'processing', 'rendering', 'merging'];
        const currentIndex = order.indexOf(currentStatus);

        if (currentIndex === -1) return;

        // Completed steps
        for (let i = 0; i < currentIndex; i++) {
            steps[order[i]].classList.add('completed');
            const iconBadge = steps[order[i]].querySelector('.step-badge');
            iconBadge.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i>`;
        }

        // Active step
        steps[currentStatus].classList.add('active');
        const iconBadge = steps[currentStatus].querySelector('.step-badge');
        iconBadge.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i>`;

        // Update linear progress bar & text percent
        const targetPercent = progressValues[currentStatus] || 0;
        progressBarFill.style.width = `${targetPercent}%`;
        progressPercent.textContent = `${targetPercent}%`;

        lucide.createIcons();
    }

    // --- Reset System ---
    function resetUI() {
        progressCard.classList.add('hidden');
        successCard.classList.add('hidden');
        errorCard.classList.add('hidden');
        
        // Reset button
        submitBtn.disabled = false;
        spinner.classList.add('hidden');
        btnText.textContent = 'Download Premium PDF';
        
        urlInput.value = '';
        currentDownloadedFilename = null;
        logsContent.innerHTML = '<div class="log-line system-log">Waiting for URL input...</div>';

        // Reset progress bar
        progressBarFill.style.width = '0%';
        progressPercent.textContent = '0%';

        Object.keys(steps).forEach(key => {
            steps[key].classList.remove('active', 'completed');
        });
    }

    // --- Form Submit (Start Download) ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = urlInput.value.trim();

        if (!url) return;

        // UI Transition
        progressCard.classList.remove('hidden');
        successCard.classList.add('hidden');
        errorCard.classList.add('hidden');

        submitBtn.disabled = true;
        spinner.classList.remove('hidden');
        btnText.textContent = 'Processing...';

        logsContent.innerHTML = '';
        addLog('Initializing connection with downloader engine...');
        showToast('Starting Download', 'Connecting to the document server. Please wait...', 'success');

        // SSE Connection
        const sseUrl = `/api/download?url=${encodeURIComponent(url)}`;
        eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[SSE] Payload data:', data);

                if (data.status === 'error') {
                    handleError(data.message);
                } else if (data.status === 'done') {
                    handleSuccess(data.filename, data.message, url);
                } else {
                    updateStepVisuals(data.status);
                    addLog(data.message);
                }
            } catch (err) {
                console.error('[SSE] JSON parse error:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('[SSE] Connection lost:', err);
            handleError('Connection lost. Please make sure the server is running on the host.');
        };
    });

    // --- Success Handler ---
    function handleSuccess(filename, message, originalUrl) {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }

        // Complete progress bars
        progressBarFill.style.width = '100%';
        progressPercent.textContent = '100%';

        Object.keys(steps).forEach(key => {
            steps[key].classList.remove('active');
            steps[key].classList.add('completed');
            const iconBadge = steps[key].querySelector('.step-badge');
            iconBadge.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i>`;
        });
        lucide.createIcons();

        addLog(message, 'success-log');
        currentDownloadedFilename = filename;
        
        // Save to browser history tab
        saveToHistory(filename, originalUrl);

        showToast('Success!', `Document "${filename}" has been generated successfully.`, 'success');

        setTimeout(() => {
            progressCard.classList.add('hidden');
            successCard.classList.remove('hidden');
            successMessage.textContent = `Document "${filename}" has been successfully processed and converted to a complete PDF.`;
        }, 1100);
    }

    // --- Error Handler ---
    function handleError(message) {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }

        addLog(`Error: ${message}`, 'error-log');
        showToast('System Error', message || 'Failed to process the document download.', 'error');

        setTimeout(() => {
            progressCard.classList.add('hidden');
            errorCard.classList.remove('hidden');
            errorMessage.textContent = message || 'Invalid link format or server failed to render pages.';
        }, 1100);
    }

    // Download action
    downloadFileBtn.addEventListener('click', () => {
        if (!currentDownloadedFilename) return;
        window.location.href = `/api/download-file?name=${encodeURIComponent(currentDownloadedFilename)}`;
    });

    // Reset buttons
    resetBtn.addEventListener('click', resetUI);
    errorResetBtn.addEventListener('click', resetUI);
});
