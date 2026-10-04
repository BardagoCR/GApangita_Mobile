function formatDetails(item) {
    return `
        Name: ${escapeHtml(item.name)}
        Status: ${escapeHtml(item.status || 'N/A')}
        Type: ${escapeHtml(item.item_type)}
        Category: ${escapeHtml(item.categoryName || 'N/A')} (${escapeHtml(item.categoryDescription || '')})
        Branch: ${escapeHtml(item.branchName || 'N/A')}
        Location: ${escapeHtml(item.locationName || 'N/A')} (${escapeHtml(item.locationDescription || '')})
        Description: ${escapeHtml(item.description || 'No description provided.')}
        Date Found: ${formatWithoutTimezone(item.date_found)}
        Date Reported: ${formatWithoutTimezone(item.date_reported)}
    `;
}

function buildItemDetails(item, options = {}) {
    const isUnarchiveHistory = window.location.pathname.includes('unarchiveHistory.html');

    if (window.location.pathname.includes('archive.html')) {
        options.isArchivePage = true;
    }
    
    if (isUnarchiveHistory) {
        options.isUnarchiveHistory = true;
    }

    if (options.hideArchiveActions) {
        options.isArchivePage = false;
    }

    console.log("DATABASE ROW OBJECT IS:", item);

    const container = document.createElement('div');
    container.className = 'item-modal';

    // IMAGE CONTAINER
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'item-modal__image-wrapper';

    const img = document.createElement('img');

    const itemImagePath = item.item_file_path || item.file_path || item.item_image;

    if (itemImagePath && itemImagePath.trim() !== '') {
        const cleanPath = itemImagePath.replace(/^\/+/, '');
        const imgBase = API_BASE_URL.replace(/\/api$/, '');
        img.src = `${imgBase}/uploads/${cleanPath}`;
    } else {
        img.src = 'placeholder/placeholder.png';
    }

    img.onerror = () => { img.onerror = null; img.src = 'placeholder/placeholder.png'; };
    img.alt = item.name || 'Item image';
    img.className = 'item-modal__image';
    imgWrapper.appendChild(img);

    // CONTENT WRAPPER
    const content = document.createElement('div');
    content.className = 'item-modal__content';

    let extraFields = '';

    if (options.isUnarchiveHistory) {
        extraFields += `
            <br><br>
            <p><strong>Claimer's Full Name:</strong><br>${escapeHtml(item.claimer_first_name)} ${escapeHtml(item.claimer_middle_name) || ''}  ${escapeHtml(item.claimer_last_name)}</p><hr>
            <p><strong>Claimer's Contact Number:</strong><br>${escapeHtml(item.contact_number || 'N/A')}</p><hr>
            <p><strong>Date Claimed:</strong><br>${formatWithoutTimezone(item.date_claimed || 'N/A')}</p><hr>
            <p><strong>Date Unarchived:</strong><br>${formatWithoutTimezone(item.date_unarchived)}</p><hr>
            <p><strong>Reason for Unarchiving:</strong><br>${escapeHtml(item.reason || 'N/A')}</p>
        `;
    }

    const detailsText = document.createElement('div');
    detailsText.innerHTML = `
        <p><strong>Name:</strong><br> ${escapeHtml(item.name)}</p><hr>
        <p><strong>Type:</strong><br> ${escapeHtml(item.item_type)}</p><hr>
        <p><strong>Category:</strong><br> ${escapeHtml(item.categoryName || 'N/A')}</p><hr>
        <p><strong>Branch:</strong><br> ${escapeHtml(item.branchName || 'N/A')}</p><hr>
        <p><strong>Location:</strong><br> ${escapeHtml(item.locationName || 'N/A')}</p><hr>
        <p><strong>Description:</strong><br>${escapeHtml(item.description || 'No description provided.')}</p><hr>
        <p><strong>Date Found:</strong><br>${formatWithoutTimezone(item.date_found)}</p><hr>
        <p><strong>Date Reported:</strong><br>${formatWithoutTimezone(item.date_reported)}</p>
        ${extraFields}
    `;
    content.appendChild(detailsText);

    container.appendChild(imgWrapper);
    container.appendChild(content);

    // ACTION FOOTER CONTAINER
    if (window.AppState?.isAuthenticated) {
        const actions = document.createElement('div');
        actions.className = 'item-modal__actions';
        actions.style.display = 'flex';
        actions.style.flexDirection = 'column';
        actions.style.gap = '10px';
        actions.style.marginTop = '15px';

        // Add standard action button if passed down (e.g., Restore Item)
        if (!isUnarchiveHistory) {
            if (options.actionButton) {
                const actionBtn = document.createElement('button');
                actionBtn.type = 'button';
                actionBtn.textContent = options.actionButton.text || 'Action';
                actionBtn.className = options.actionButton.className || 'btn btn-primary';
                actionBtn.style.width = '100%';
                actionBtn.addEventListener('click', () => {
                    if (options.actionButton.onClick) {
                        options.actionButton.onClick(item, options);
                    }
                });
                actions.appendChild(actionBtn);
            }
        }
        

        if (options.isArchivePage) {
            const claimantDetailsBtn = document.createElement('button');
            claimantDetailsBtn.type = 'button';
            claimantDetailsBtn.textContent = 'View Claimant Details';
            claimantDetailsBtn.className = 'btn btn-secondary item-modal__claimant-btn';
            claimantDetailsBtn.style.width = '100%';
            
            claimantDetailsBtn.addEventListener('click', () => {
                Modal.hide();
                setTimeout(() => {
                    openClaimantDetailsModal(item, options); 
                }, 50);
            });
            
            actions.appendChild(claimantDetailsBtn);
        }

        // Only append container if we actually added buttons into it
        if (actions.children.length > 0) {
            container.appendChild(actions);
        }
    }

    return container;
}

function showItemDetails(item, options = {}) {
    Modal.show({
        title: 'Item Details',
        node: buildItemDetails(item, options)
    });
}

// Claim Item Modal
function openClaimModal(item) {

    const isUnarchiveHistory = window.location.pathname.includes('unarchiveHistory.html');
    const wrapper = document.createElement('div');
    wrapper.className = 'claim-modal';

    // Go Back Button
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.textContent = '← Go Back';
    backBtn.className = 'btn';
    backBtn.addEventListener('click', () => {
        stopClaimCamera(cameraFeed);
        Modal.hide();
        setTimeout(() => {
            showItemDetails(item, {
                actionButton: isUnarchiveHistory ? null : {
                    text: 'Claim Item',
                    className: 'btn btn-primary',
                    onClick: openClaimModal
                }
            });
        }, 50);
    });

    // Title
    const title = document.createElement('h3');
    title.textContent = 'Claim Item';

    // Form Section Container
    const formSection = document.createElement('div');
    formSection.className = 'claim-form-section';
    
    // Name Fields Row
    const nameRow = document.createElement('div');
    nameRow.className = 'claim-name-row';

    // Helper function to build standard input structures using CSS classes
    function buildInputField(labelText, placeholder, isRequired = true) {
        const group = document.createElement('div');
        group.className = 'claim-field-group';

        const label = document.createElement('label');
        label.textContent = labelText;

        if (isRequired) {
            const star = document.createElement('span');
            star.className = 'required-star';
            star.textContent = ' *';
            label.appendChild(star);
        }

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = placeholder;
        input.className = 'form-control';

        group.appendChild(label);
        group.appendChild(input);
        return { group, input };
    }

    // Build the fields
    const firstNameField = buildInputField('First Name', 'First Name');
    const middleNameField = buildInputField('Middle Name', 'Middle Name', false);
    const lastNameField = buildInputField('Last Name', 'Last Name');
    const contactField = buildInputField('Contact Number', 'e.g., +63 9XX XXX XXXX');

    // Add custom class identifier specifically for the standalone contact row
    contactField.group.classList.add('claim-contact-group');

    // Real-time data sanitization validation listener engine for contact field input
    contactField.input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Instantly scrub out non-numeric entries
        if (value.length > 11) value = value.substring(0, 11); // Hard limit length to 11 characters maximum
        e.target.value = value;
        checkFormValidity();
    });

    // Bind verification tracking checks across required input textboxes
    firstNameField.input.addEventListener('input', checkFormValidity);
    lastNameField.input.addEventListener('input', checkFormValidity);

    // Append items down into structural containers
    nameRow.appendChild(firstNameField.group);
    nameRow.appendChild(middleNameField.group);
    nameRow.appendChild(lastNameField.group);

    formSection.appendChild(nameRow);
    formSection.appendChild(contactField.group);

    // Button Container
    const buttonRow = document.createElement('div');
    buttonRow.className = 'claim-button-row';

    // Open Camera Button
    const openCameraBtn = document.createElement('button');
    openCameraBtn.type = 'button';
    openCameraBtn.textContent = 'Open Camera';
    openCameraBtn.className = 'btn btn-primary';

    // Capture Image Button
    const captureBtn = document.createElement('button');
    captureBtn.type = 'button';
    captureBtn.textContent = 'Capture Image';
    captureBtn.className = 'btn';
    buttonRow.appendChild(openCameraBtn);
    buttonRow.appendChild(captureBtn);

    // Live Camera Feed
    const cameraFeed = document.createElement('video');
    cameraFeed.autoplay = true;
    cameraFeed.playsInline = true;
    cameraFeed.className = 'claim-camera-feed';

    // Close Camera Button
    const closeCameraBtn = document.createElement('button');
    closeCameraBtn.style.display = 'none';
    closeCameraBtn.type = 'button';
    closeCameraBtn.textContent = 'Close Camera';
    closeCameraBtn.className = 'btn';
    closeCameraBtn.addEventListener('click', () => { stopClaimCamera(cameraFeed); });

    // Snapshot Canvas
    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.style.display = 'none';

    // Preview Title
    const previewTitle = document.createElement('h4');
    previewTitle.textContent = 'Preview Image';

    // Preview Container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'claim-preview-container';

    // Preview Placeholder
    const previewPlaceholder = document.createElement('div');
    previewPlaceholder.className = 'claim-preview-placeholder';
    previewPlaceholder.textContent = 'No image yet';

    // Image Preview
    const imagePreview = document.createElement('img');
    imagePreview.className = 'claim-preview-image';
    imagePreview.style.display = 'none';
    previewContainer.appendChild(previewPlaceholder);
    previewContainer.appendChild(imagePreview);

    // Remove Preview Button
    const removePreviewBtn = document.createElement('button');
    removePreviewBtn.type = 'button';
    removePreviewBtn.textContent = 'Remove Preview Image';
    removePreviewBtn.className = 'btn';

    // Confirm Button
    const claimConfirmBtn = document.createElement('button');
    claimConfirmBtn.type = 'button';
    claimConfirmBtn.textContent = 'Confirm Claim Item';
    claimConfirmBtn.className = 'btn btn-primary';
    claimConfirmBtn.disabled = true;

    let isSubmitting = false;

function checkFormValidity() {
        if (isSubmitting) return;

        const fnameVal = firstNameField.input.value.trim();
        const lnameVal = lastNameField.input.value.trim();
        const contactVal = contactField.input.value.trim();

        const textFieldsValid = fnameVal.length > 0 && lnameVal.length > 0;
        const phoneFieldValid = contactVal.length === 11;
        
        const hasPhoto = imagePreview.src && 
                        imagePreview.style.display !== 'none' &&
                        !imagePreview.src.endsWith('placeholder.png');

        claimConfirmBtn.disabled = !(textFieldsValid && phoneFieldValid && hasPhoto);
    }

    // Camera Events
    openCameraBtn.addEventListener('click', async () => {
        await openClaimCamera(cameraFeed);
        closeCameraBtn.style.display = 'block';
    });

    captureBtn.addEventListener('click', () => {
        captureClaimImage(
            cameraFeed,
            snapshotCanvas,
            imagePreview,
            previewPlaceholder
        );
        checkFormValidity();
    });

    closeCameraBtn.addEventListener('click', () => {
        stopClaimCamera(cameraFeed);
        closeCameraBtn.style.display = 'none';
    });

    removePreviewBtn.addEventListener('click', () => {
        removeClaimPreview(
            imagePreview,
            previewPlaceholder
        );
        checkFormValidity();
    });

    claimConfirmBtn.addEventListener('click', () => {
        if (!imagePreview.src || imagePreview.style.display === 'none') { return; }

            // Gather values from the input fields
            const firstName = firstNameField.input.value.trim();
            const middleName = middleNameField.input.value.trim();
            const lastName = lastNameField.input.value.trim();
            const contactNum = contactField.input.value.trim();

            // Validation check for required inputs
            if (!firstName || !lastName || !contactNum) {
                showErrorModal(
                'Missing Required Fields', 
                'Please ensure all fields marked with a red asterisk (*) are completely filled out before submitting your claim.'
            );
                return;
            }

            // Disable button to prevent double submissions
            claimConfirmBtn.disabled = true;
            claimConfirmBtn.textContent = 'Processing Claim...';

            // Extract the raw image snapshot blob from the canvas
            snapshotCanvas.toBlob(async (blob) => {
                if (!blob) {
                    showErrorModal(
                        'Image Processing Error',
                        'Failed to process the captured image. Please try again.'
                    );
                    claimConfirmBtn.disabled = false;
                    claimConfirmBtn.textContent = 'Confirm Claim Item';
                    return;
                }

                // Prepare the payload using Multipart FormData
                const formData = new FormData();
                formData.append('item_code', item.item_code);
                formData.append('claimer_first_name', firstName);

                 // Fallback to empty string if optional middle name is omitted
                formData.append('claimer_middle_name', middleName || '');

                formData.append('claimer_last_name', lastName);
                formData.append('contact_number', contactNum);

                // Append the image blob with a dynamic filename based on the item code
                formData.append('claimProof', blob, `claim_${item.item_code}.jpg`);

                try {
                // Send payload to your endpoint
                const response = await fetch(`${API_BASE_URL}/claims`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
                        'X-CSRF-Token': localStorage.getItem('csrf_token') || '' 
                    },
                    body: formData
                });

                const result = await response.json();

                if (!response.ok) { throw new Error(result.message || 'Database transaction error.');}

                stopClaimCamera(cameraFeed);
                Modal.hide();

                firstNameField.input.value = '';
                middleNameField.input.value = '';
                lastNameField.input.value = '';
                contactField.input.value = '';

                if (window.AppState) { window.AppState.isFormDirty = false; }

                Modal.show({
                    title: 'Claim Submitted Successfully',
                    message: 'Your claim has been submitted and recorded. The item status will be updated accordingly.',
                    onConfirm: () => {
                        Modal.hide(); 
                        if (typeof refreshItemList === 'function') { refreshItemList(); }
                            else if (window.AppState && typeof window.AppState.runSearch === 'function') { window.AppState.runSearch(); }
                    }
                });

            } catch (error) {
                console.error('Submission tracking failure:', error);
                showErrorModal(
                    'Claim Submission Failed',
                    `Failed to save claim: ${error.message}`
                );
                
                // Re-enable button on error so they can try again
                claimConfirmBtn.disabled = false;
                claimConfirmBtn.textContent = 'Confirm Claim Item';
            }
        }, 'image/jpeg', 0.9);
    });

    // Assemble everything
    wrapper.appendChild(backBtn);
    wrapper.appendChild(title);
    wrapper.appendChild(formSection);
    wrapper.appendChild(buttonRow);
    wrapper.appendChild(cameraFeed);
    wrapper.appendChild(closeCameraBtn);
    wrapper.appendChild(snapshotCanvas);
    wrapper.appendChild(previewTitle);
    wrapper.appendChild(previewContainer);
    wrapper.appendChild(removePreviewBtn);
    wrapper.appendChild(claimConfirmBtn);

    // Ensure camera stream is stopped if modal is closed by other means
    wrapper.addEventListener('DOMNodeRemovedFromDocument', () => {
        if (cameraFeed) {
            stopClaimCamera(cameraFeed);
        }
    });

    Modal.show({
        title: '',
        node: wrapper,
        // Close Camera Upon Modal Close
        onClose: () => {
            if (cameraFeed) {
                stopClaimCamera(cameraFeed);
            }
        }
    });

}

function openClaimantDetailsModal(item, options = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'claimant-details-modal';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.textContent = '← Back to Item';
    backBtn.className = 'btn';
    backBtn.addEventListener('click', () => {
        Modal.hide();
        setTimeout(() => { showItemDetails(item, options); }, 50); 
    });

    const title = document.createElement('h3');
    title.className = 'claimant-details__title';
    title.textContent = 'Claimant Verification Record';

    const loadingText = document.createElement('p');
    loadingText.className = 'claimant-details__loading';
    loadingText.textContent = 'Fetching transaction logs from secure ledger...';
    
    wrapper.append(backBtn, title, loadingText);
    Modal.show({ title: '', node: wrapper });

    fetch(`${API_BASE_URL}/claims/${item.item_code}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            'X-CSRF-Token': localStorage.getItem('csrf_token') || ''
        }
    })
    .then(res => {
        if (!res.ok) throw new Error('Claim tracking records for this item index could not be located.');
        return res.json();
    })
    .then(claimData => {
            loadingText.remove();

            const infoCard = document.createElement('div');
            infoCard.className = 'claimant-info-card';

            const middleInitial = claimData.claimer_middle_name ? ` ${escapeHtml(claimData.claimer_middle_name)}` : '';
            const fullName = `${escapeHtml(claimData.claimer_first_name)}${middleInitial} ${escapeHtml(claimData.claimer_last_name)}`;

            let rawImagePath = claimData.claimProof_file_path || claimData.claimProof || claimData.file_path;
            if (!rawImagePath) {
                const matchingKey = Object.keys(claimData).find(k => k.toLowerCase().includes('proof') || k.toLowerCase().includes('path'));
                if (matchingKey) rawImagePath = claimData[matchingKey];
            }

            let proofImgHtml = `<p class="claimant-details__no-image"><em>No verification snapshot recorded on file logs.</em></p>`;
            
            if (rawImagePath && rawImagePath.trim() !== '') {
                const cleanPath = rawImagePath.replace(/^\/+/, '');
                const imgBase = API_BASE_URL.replace(/\/api$/, '');
                proofImgHtml = `
                    <div class="claimant-details__image-container">
                        <p><strong>Identity Verification Snapshot:</strong></p>
                        <img src="${imgBase}/uploads/${cleanPath}" alt="Claim Verification Image" class="claimant-details__proof-img" />
                    </div>`;
            }

            infoCard.innerHTML = `
                <p><strong>Full Name of Claimant:</strong> ${fullName}</p>
                <p><strong>Contact Number:</strong> ${escapeHtml(claimData.contact_number)}</p>
                <p><strong>Transaction Time:</strong> ${formatWithoutTimezone(claimData.date_claimed)}</p>
                <hr class="claimant-details__divider" />
                ${proofImgHtml}
            `;
            
            wrapper.appendChild(infoCard);
        })
    .catch(err => {
        wrapper.innerHTML = ''; 
        wrapper.appendChild(backBtn);
        showErrorModal(
            'Retrieval Error',
            `Could not read archive logs: ${err.message}`
        );
    });
}

function openRestoreItemModal(item) {

    const wrapper = document.createElement('div');
    wrapper.className = 'restore-modal';
    const title = document.createElement('h3');
    title.textContent = 'Restore Archived Item';
    const itemDetailsNode = buildItemDetails(item, { hideArchiveActions: true });
    const description = document.createElement('p');

    // Reason Label
    const reasonLabel = document.createElement('label');
    reasonLabel.textContent = 'Reason for restoring item';

    // Reason Textarea
    const reasonInput = document.createElement('textarea');
    reasonInput.className = 'restore-reason-input';
    reasonInput.placeholder = 'Enter at least 8 characters...';
    reasonInput.rows = 4;
    reasonInput.style.setProperty('resize', 'none', 'important');

    // Validation Text
    const validationText = document.createElement('small');
    validationText.textContent = 'Minimum 8 characters required.';
    validationText.style.display = 'block';

    description.textContent = 'Please review the item details before restoring.';

    const buttonRow = document.createElement('div');
    buttonRow.className = 'restore-button-row';
    const cancelBtn = document.createElement('button');

    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn';
    cancelBtn.addEventListener('click', () => {
        Modal.hide();
    });

    const restoreBtn = document.createElement('button');
    restoreBtn.type = 'button';
    restoreBtn.textContent = 'Restore Item';
    restoreBtn.className = 'btn btn-primary';
    restoreBtn.disabled = true;

restoreBtn.addEventListener('click', async () => {
        const textReason = reasonInput.value.trim();

        if (textReason.length < 8) return;

        restoreBtn.disabled = true;
        restoreBtn.textContent = 'Processing Restore...';

        try {
            const response = await fetch(`${API_BASE_URL}/items/unarchive`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': localStorage.getItem('csrf_token') || ''
                },
                body: JSON.stringify({
                    item_code: item.item_code,
                    reason: textReason
                }),
                credentials: 'include'
            });

            const result = await response.json();

            if (!response.ok) {
                showErrorModal(
                    'Process Failed', 
                    `Could not unarchive item: ${result.error || 'Failed to update item record status.'}`
                );
                
                restoreBtn.disabled = false;
                restoreBtn.textContent = 'Restore Item';
                
                return;
            }

            Modal.hide();
            showErrorModal(
                'Success!',
                'The item has been restored to the active list successfully!'
            );

            if (typeof refreshItemList === 'function') {
                refreshItemList();
            } else if (window.AppState && typeof window.AppState.runSearch === 'function') {
                window.AppState.runSearch();
            }

        } catch (error) {
            console.error('Restore endpoint logic crash:', error);
            showErrorModal('Process Failed', `Could not unarchive item: ${error.message}`);
            
            // Unlock button state layout back on failure
            restoreBtn.disabled = false;
            restoreBtn.textContent = 'Restore Item';
        }
    });

    reasonInput.addEventListener('input', () => {
        const value = reasonInput.value.trim();
        restoreBtn.disabled = value.length < 8;
    });

    // Go Back Button
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.textContent = '← Go Back';
    backBtn.className = 'btn';
    backBtn.addEventListener('click', () => {
        Modal.hide();
        setTimeout(() => {
            showItemDetails(item, {
                isArchivePage: true,
                actionButton: {
                    text: 'Restore Item',
                    className: 'btn btn-primary',
                    onClick: openRestoreItemModal
                }
            });
        }, 50);
    });

    buttonRow.append(cancelBtn, restoreBtn);
    wrapper.append(backBtn, title, description, itemDetailsNode, reasonLabel, reasonInput, validationText, buttonRow);
    Modal.show({
        title: '',
        node: wrapper
    });
}