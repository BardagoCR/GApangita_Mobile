function checkFormValidity() {
    const reportForm = document.getElementById('reportForm');
    const submitBtn = document.getElementById('submitReportBtn');
    
    // Exit if we aren't currently on the report page layout
    if (!reportForm || !submitBtn) return;

    const nameVal = document.getElementById('itemName').value.trim();
    const typeVal = document.getElementById('itemType').value;
    const categoryVal = document.getElementById('categoryId').value;
    const branchVal = document.getElementById('branchId').value;
    const locationVal = document.getElementById('locationId').value;
    const descVal = document.getElementById('itemDescription').value.trim();
    const dateVal = document.getElementById('dateFound').value;

    // Verify all required textual inputs are filled out completely
    const allFieldsFilled = nameVal.length > 0 &&
                            typeVal !== "" &&
                            categoryVal !== "" &&
                            branchVal !== "" &&
                            locationVal !== "" &&
                            descVal.length > 0 &&
                            dateVal !== "";
                            
    // Check if the camera global variable contains a valid file object package
    const hasPhoto = typeof itemImageFile !== 'undefined' && itemImageFile !== null;

    // Toggle disabled constraint mapping parameters instantly
    if (typeVal == 'lost')
        submitBtn.disabled = !(allFieldsFilled);
    else
        submitBtn.disabled = !(allFieldsFilled && hasPhoto);
}

const reportForm = document.getElementById('reportForm');

if (reportForm) {
    // Bind real-time change events across all field inputs sequentially
    const inputsToWatch = [
        'itemName', 'itemType', 'categoryId', 
        'branchId', 'locationId', 'itemDescription', 'dateFound'
    ];

    inputsToWatch.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', checkFormValidity);
            el.addEventListener('change', checkFormValidity);
        }
    });

    // Main Submit Action Listener Event Flow
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('name', document.getElementById('itemName').value);
        formData.append('item_type', document.getElementById('itemType').value);
        formData.append('category_code', document.getElementById('categoryId').value);
        formData.append('branch_code', document.getElementById('branchId').value);
        formData.append('location_code', document.getElementById('locationId').value);
        formData.append('description', document.getElementById('itemDescription').value);

        const rawDateTime = document.getElementById('dateFound').value; 
        const standardSqlDateTime = rawDateTime.replace('T', ' ');
        formData.append('date_found', standardSqlDateTime);

        if (itemImageFile) { 
            formData.append('item_image', itemImageFile); 
        }

        try {
            const csrfToken = localStorage.getItem('csrf_token');
            const response = await fetch(`${API_BASE_URL}/items`, {
                method: 'POST',
                headers: { 'X-CSRF-Token': csrfToken },
                body: formData,
                credentials: 'include'
            });

            if (response.ok) {
                Modal.show({
                    title: 'Success!',
                    message: 'Report submitted successfully!',
                    onConfirm: () => { window.location.href = 'index.html'; }
                });

                reportForm.reset();
                AppState.isFormDirty = false;

                if (typeof itemImagePreview !== 'undefined' && itemImagePreview) {
                    itemImagePreview.src = '';
                    itemImagePreview.style.display = 'none';
                }
                if (typeof itemPreviewPlaceholder !== 'undefined' && itemPreviewPlaceholder) {
                    itemPreviewPlaceholder.style.display = 'block';
                }
                
                // Reset file track parameter container and lock submit button back down
                itemImageFile = null;
                checkFormValidity();

            } else if (response.status === 401) {
                Modal.show({
                    title: 'Unauthorized',
                    message: 'You must log in to submit a report. Redirecting...',
                    onConfirm: () => window.location.href = 'login.html'
                });
            } else {
                const err = await response.json();
                Modal.show({
                    title: 'Error',
                    message: `Failed to submit: ${err.error || 'Failed to submit'}`
                });
            }
        } catch (error) {
            console.error('Submit error:', error);
            Modal.show({
                title: 'Connection Error',
                message: 'Failed to connect to the server.'
            });
        }
    });
}