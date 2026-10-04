// Unsaved Changes Tracker
function initUnsavedChangesTracker() {
    // Listen for changes on ALL inputs, textareas, and selects globally
    const trackableElements = document.querySelectorAll('input, textarea, select');
    trackableElements.forEach(el => {
        el.addEventListener('input', () => {
            AppState.isFormDirty = true;
        });
    });

    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', () => {
            setTimeout(() => { isFormDirty = false; }, 50);
        });
        form.addEventListener('reset', () => {
            AppState.isFormDirty = false;
        });
    });

    // LOGIC 1: DEFAULT BROWSER POPUP (only for browser exit/refresh)
    window.addEventListener('beforeunload', (e) => {
        // Skip if we're handling navigation via custom modal
        if (AppState.isHandlingModalNavigation) {
            AppState.isHandlingModalNavigation = false; // Reset for next time
            return;
        }
        
        if (AppState.isFormDirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
    
    // LOGIC 2: CUSTOM MODAL (only for internal link navigation)
    document.body.addEventListener('click', (e) => {

        // Ignore clicks inside modal
        if (e.target.closest('#customModal')) {
            return;
        }

        const link = e.target.closest('a');

        if (!link) return;

        // ignore special browser/system actions
        if (link.target === '_blank') return;

        const href = link.getAttribute('href');

        if (!href || href.startsWith('#')) return;

        if (AppState.isFormDirty) {

            e.preventDefault();

            Modal.show({
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Leave page?',
                type: 'confirm',
                onConfirm: () => {
                    AppState.isHandlingModalNavigation = true;
                    AppState.isFormDirty = false;
                    window.location.href = href;
                }
            });

        }
    });
}
