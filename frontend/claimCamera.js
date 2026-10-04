function stopClaimCamera(videoElement) {

    if (claimStream) {

        claimStream.getTracks().forEach(track => track.stop());

        claimStream = null;
    }

    if (videoElement) {
        videoElement.srcObject = null;
    }
}

async function openClaimCamera(videoElement) {

    try {

        stopClaimCamera(videoElement);

        claimStream =
            await navigator.mediaDevices.getUserMedia({
                video: true
            });

        videoElement.srcObject = claimStream;

        await videoElement.play();

    } catch (error) {

        alert('Camera access denied or unavailable.');

        console.error(error);
    }
}

function captureClaimImage(
    videoElement,
    canvasElement,
    previewElement,
    placeholderElement
) {

    const context =
        canvasElement.getContext('2d');

    canvasElement.width =
        videoElement.videoWidth;

    canvasElement.height =
        videoElement.videoHeight;

    context.drawImage(
        videoElement,
        0,
        0,
        canvasElement.width,
        canvasElement.height
    );

    const imageData =
        canvasElement.toDataURL('image/png');

    previewElement.src = imageData;

    previewElement.style.display = 'block';

    placeholderElement.style.display = 'none';
}

function removeClaimPreview(
    previewElement,
    placeholderElement
) {

    previewElement.src = '';

    previewElement.style.display = 'none';

    placeholderElement.style.display = 'block';
}