// Authentication Logic
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth-status`, { credentials: 'include' });
        const data = await response.json();
        
        const isAuth = data.is_authenticated;

        // Global Authentication across the js files
        window.AppState.isAuthenticated = isAuth;
        window.AppState.user = data.user || null;

        if (!isAuth) {
            localStorage.removeItem('csrf_token');
        }

        // Cleanly isolate just the filename, stripping query strings or hashes
        const currentPage = window.location.pathname.split('/').pop().split('?')[0].split('#')[0];
        
        updateNavbar(isAuth, data.user);
        
        // Blacklist unauthenticated users from protected pages
        const protectedPages = ['report.html', 'archive.html'];
        if (!isAuth && protectedPages.includes(currentPage)) {
            window.location.href = 'login.html';
            return; // Halt further execution immediately during redirect routing
        }
        
        // Prevent authenticated users from visiting the login page
        if (isAuth && (currentPage === 'login.html')) {
            window.location.href = 'report.html';
            return;
        }

    } catch (error) {
            showErrorModal(
            'Security Sync Failure',
            'Failed to establish a secure validation handshake with the gateway server. You will be redirected to the main hub page.',
            () => { window.location.href = 'index.html'; }
        );
    }
}

function updateNavbar(isAuth, user) {
    const navLinks = document.querySelector('.navbar__links');
    if (!navLinks) return;

    if (isAuth) {
        navLinks.innerHTML = `
            <a href="index.html" class="navbar__link">Home</a>
            <a href="report.html" class="navbar__link">Report Item</a>
            <a href="archive.html" class="navbar__link">Archive</a>
            <div class="navbar__user">
                <span><i class="fa-solid fa-user-circle"></i> ${escapeHtml(user.username)}</span>
                <a href="#" id="logoutBtn" class="navbar__link" style="margin-left: 15px;">Logout</a>
            </div>
        `;
        document.getElementById('logoutBtn').addEventListener('click', logout);
    } else {
        navLinks.innerHTML = `
            <a href="index.html" class="navbar__link">Home</a>
            <a href="login.html" class="navbar__link">
                <i class="fa-solid fa-user-circle" style="margin-right: 8px;"></i> Login
            </a>
        `;
    }
}

function logout(e) {
    e.preventDefault();

    // HARDCODED CSS TO OVERRIDE THE DEFAULT MODAL STYLES FOR THIS PARTICULAR USE CASE
    const wrapper = document.createElement('div');
    wrapper.className = 'logout-confirm-modal';
    wrapper.style.textAlign = 'center';
    wrapper.style.padding = '10px';

    const message = document.createElement('p');
    message.textContent = 'Are you sure you want to sign out of your Gapangita account session?';
    message.style.marginBottom = '20px';

    const buttonRow = document.createElement('div');
    buttonRow.className = 'modal-button-row';
    buttonRow.style.display = 'flex';
    buttonRow.style.justifyContent = 'center';
    buttonRow.style.gap = '15px';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'No, Stay';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.style.minWidth = '100px';
    cancelBtn.addEventListener('click', () => {
        Modal.hide();
    });

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.textContent = 'Yes, Logout';
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.style.minWidth = '100px';
    confirmBtn.addEventListener('click', async () => {
        Modal.hide(); 
        await executeLogoutSequence();
    });

    // Assemble components cleanly
    buttonRow.append(cancelBtn, confirmBtn);
    wrapper.append(message, buttonRow);

    // Call the modal engine using your node-passing configuration strategy
    Modal.show({
        title: 'Confirm Logout',
        node: wrapper,
        hideFooter: true
    });
}

// Handles the actual structural backend session termination network traffic
async function executeLogoutSequence() {
    try {
        const csrfToken = localStorage.getItem('csrf_token');

        const response = await fetch(`${API_BASE_URL}/logout`, { 
            method: 'POST', 
            credentials: 'include',
            headers: {
                'X-CSRF-Token': csrfToken
            }
        });
        
        if (response.ok) {
            localStorage.removeItem('csrf_token');
            window.location.href = 'index.html';
        } else {
            Modal.show({
                title: 'Logout Failed',
                message: 'The secure ledger rejected the sign-out request. Please clear your cache or try again shortly.'
            });
        }

    } catch (error) {
        Modal.show({
            title: 'Connection Error',
            message: 'Failed to establish a connection with the authentication server. Please check your network connection.'
        });
    }
}

async function executeLogoutSequence() {
    try {
        const csrfToken = localStorage.getItem('csrf_token');

        const response = await fetch(`${API_BASE_URL}/logout`, { 
            method: 'POST', 
            credentials: 'include',
            headers: {
                'X-CSRF-Token': csrfToken
            }
        });
        if (response.ok) {
            localStorage.removeItem('csrf_token');
            window.location.href = 'index.html';
        } else {
            Modal.show({
                title: 'Logout Failed',
                message: 'The secure ledger rejected the sign-out request. Please clear your cache or try again shortly.'
            });
        }
    } catch (error) {
        Modal.show({
            title: 'Connection Error',
            message: 'Failed to establish a connection with the authentication server. Please check your network connection.'
        });
    }
}

function togglePassword() {
    const input = document.getElementById("password");
    const icon = document.querySelector(".toggle-password");

    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
    }
}

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById('loginError');
        errorEl.style.display = 'none';

        const payload = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            if (response.ok) {

                const data = await response.json();

                // SAVE CSRF TOKEN
                localStorage.setItem('csrf_token', data.csrf_token);

                window.location.href = 'index.html';

            } else {
                const err = await response.json();
                errorEl.textContent = err.error || 'Login failed. Please try again.';
                errorEl.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorEl.textContent = 'Failed to connect to the server.';
            errorEl.style.display = 'block';
        }
    });
}