// Modal System Logic
const Modal = (() => {
    const modal = document.getElementById('customModal');
    const titleEl = document.getElementById('modalTitle');
    const messageEl = document.getElementById('modalMessage');
    const footerEl = document.getElementById('modalFooter');

    // Variable to hold active close callback loop
    let activeCloseCallback = null;

    if (!modal || !titleEl || !messageEl || !footerEl) {
        console.warn('Modal elements not found');
        return {};
    }

    function show({ 
        title = '', 
        message = '', 
        node = null, 
        type = 'alert', 
        onConfirm = null, 
        confirmText = 'Close', 
        onClose = null,
        hideFooter = false
    }) {

        activeCloseCallback = onClose;

        titleEl.textContent = title;
        footerEl.innerHTML = '';

        if (hideFooter) {
            footerEl.style.display = 'none';
        } else {
            footerEl.style.display = 'flex';
        }

        if (node) {
            messageEl.innerHTML = '';
            messageEl.appendChild(node);
        } else {
            messageEl.innerHTML = (message || '').replace(/\n/g, '<br>');
        }

        if (!hideFooter) {
            if (type === 'confirm') {
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'btn-cancel';
                cancelBtn.textContent = 'Cancel';
                cancelBtn.onclick = hide;

                const confirmBtn = document.createElement('button');
                confirmBtn.className = 'btn-confirm';
                confirmBtn.textContent = 'Yes, Proceed';
                confirmBtn.disabled = false;
                confirmBtn.onclick = () => {
                    hide();
                    if (onConfirm) onConfirm();
                };

                footerEl.append(cancelBtn, confirmBtn);
            } else {
                const okBtn = document.createElement('button');
                okBtn.className = 'btn-confirm';
                okBtn.textContent = confirmText;
                okBtn.onclick = () => {
                    hide();
                    if (onConfirm) onConfirm();
                };

                footerEl.appendChild(okBtn);
            }
        }

        modal.style.display = 'flex';
    }

    function hide() {
        modal.style.display = 'none';

        // execute the saved close lifecycle tracking hook if it exists
        if (activeCloseCallback) {
            activeCloseCallback();
            activeCloseCallback = null; // Reset to avoid double execution bugs
        }
    }

    return { show, hide };
})();

function showErrorModal(titleText, messageText, onCloseCallback = null) {
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-error-wrapper';

    const icon = document.createElement('div');
    icon.className = 'modal-error__icon';
    icon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';

    const title = document.createElement('h3');
    title.className = 'modal-error__title';
    title.textContent = titleText;

    const message = document.createElement('p');
    message.className = 'modal-error__message';
    message.textContent = messageText;

    wrapper.append(icon, title, message);

    Modal.show({
        title: '',                    
        node: wrapper,                 
        confirmText: 'Understood',     
        onClose: onCloseCallback       
    });
}