let itemImageFile = null;

document.addEventListener('DOMContentLoaded', () => {

    const openItemCameraBtn = document.getElementById('openItemCameraBtn');
    const captureItemBtn = document.getElementById('captureItemBtn');
    const cancelItemImageBtn = document.getElementById('cancelItemImageBtn');
    const itemCameraFeed = document.getElementById('itemCameraFeed');
    const itemSnapshotCanvas = document.getElementById('itemSnapshotCanvas');
    const itemImagePreview = document.getElementById('itemImagePreview');
    const itemPreviewPlaceholder = document.getElementById('itemPreviewPlaceholder');

    openItemCameraBtn.addEventListener('click', async () => {
        try {
            if (typeof userStream !== 'undefined' && userStream) {
                userStream.getTracks().forEach(track => track.stop());
                
                if (typeof userCameraFeed !== 'undefined' && userCameraFeed) {
                    userCameraFeed.srcObject = null;
                }
            }

            // Stop old ITEM stream
            if (typeof itemStream !== 'undefined' && itemStream) {
                itemStream.getTracks().forEach(track => track.stop());
            }

            // Open ITEM camera
            itemStream = await navigator.mediaDevices.getUserMedia({ video: true });

            itemCameraFeed.srcObject = itemStream;
            await itemCameraFeed.play();

        } catch (error) {
            showErrorModal('Unknown Error','Item camera access denied or unavailable.');
            console.error(error);
        }
    });

    captureItemBtn.addEventListener('click', () => {
        const context = itemSnapshotCanvas.getContext('2d');

        itemSnapshotCanvas.width = itemCameraFeed.videoWidth;
        itemSnapshotCanvas.height = itemCameraFeed.videoHeight;

        context.drawImage(itemCameraFeed, 0, 0, itemSnapshotCanvas.width, itemSnapshotCanvas.height);

        itemSnapshotCanvas.toBlob((blob) => {
            // Create actual file object
            itemImageFile = new File(
                [blob],
                `item_${Date.now()}.png`,
                {
                    type: 'image/png'
                }
            );

            // Preview image
            const imageUrl = URL.createObjectURL(itemImageFile);
            itemImagePreview.src = imageUrl;
            itemImagePreview.style.display = 'block';
            itemPreviewPlaceholder.style.display = 'none';

            // turn off webcam after capture
            if (typeof itemStream !== 'undefined' && itemStream) {
                itemStream.getTracks().forEach(track => track.stop());
                itemCameraFeed.srcObject = null;
            }

            // NEW CHANGE: Force real-time form validation state re-evaluation
            if (typeof checkFormValidity === 'function') {
                checkFormValidity();
            }

        }, 'image/png');
    });

    cancelItemImageBtn.addEventListener('click', () => {
        // Remove stored file
        itemImageFile = null;

        // Remove preview
        itemImagePreview.src = '';
        itemImagePreview.style.display = 'none';
        itemPreviewPlaceholder.style.display = 'block';

        // Stop webcam
        if (typeof itemStream !== 'undefined' && itemStream) {
            itemStream.getTracks().forEach(track => track.stop());
            itemCameraFeed.srcObject = null;
        }

        // NEW CHANGE: Instantly lock the form back down since the image file is now null
        if (typeof checkFormValidity === 'function') {
            checkFormValidity();
        }
    });
});