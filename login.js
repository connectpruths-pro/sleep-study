(function () {
    'use strict';

    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const btnLogin = document.getElementById('btnLogin');
    const alertBox = document.getElementById('alertBox');
    const alertIcon = document.getElementById('alertIcon');
    const alertMessage = document.getElementById('alertMessage');

    const isProduction = window.location.hostname.includes('aurorasleepscreening.com') || window.location.hostname.includes('aurora-sleep-screening') || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

    async function apiFetch(path, options = {}) {
        const primaryUrl = API_BASE ? `${API_BASE}${path}` : path;
        try {
            const res = await fetch(primaryUrl, options);
            if (res.ok || (res.headers.get('content-type') || '').includes('application/json')) return res;
            return res;
        } catch (err) {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return await fetch(`http://localhost:5000${path}`, options);
            }
            throw err;
        }
    }

    /* ─── Theme Toggle (persists via localStorage) ─── */
    const html = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const savedTheme = localStorage.getItem('aurora-theme') || 'dark';

    function applyTheme(theme) {
        html.setAttribute('data-theme', theme);
        themeIcon.innerHTML = theme === 'dark' ? '<i class="bi bi-moon-fill"></i>' : '<i class="bi bi-sun-fill"></i>';
    }
    applyTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('aurora-theme', next);
    });

    /* ─── Alert Helpers ─── */
    function showAlert(msg, type = 'danger') {
        alertMessage.textContent = msg;
        alertBox.className = `alert alert-${type}`;
        alertBox.style.display = 'flex';

        if (type === 'danger') {
            alertIcon.className = 'bi bi-exclamation-triangle-fill';
        } else {
            alertIcon.className = 'bi bi-check-circle-fill';
        }
    }

    function hideAlert() {
        alertBox.style.display = 'none';
    }

    /* ─── Submit Form ─── */
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const username = usernameInput.value;
        const password = passwordInput.value;

        if (!username || !password) {
            showAlert('Please fill in all fields.');
            return;
        }

        btnLogin.disabled = true;
        btnLogin.textContent = 'Logging in...';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            let result = {};
            const rawText = await response.text();
            try {
                result = JSON.parse(rawText);
            } catch (jsonErr) {
                console.error('Failed to parse response as JSON. Raw response:', rawText);
                throw new Error(`Server error: ${rawText || 'Empty response (status ' + response.status + ')'}`);
            }

            if (!response.ok) {
                throw new Error(result.message || 'Authentication failed');
            }

            if (result.token) {
                localStorage.setItem('aurora_token', result.token);
            }

            showAlert('Authentication successful. Redirecting...', 'success');

            // Redirect to admin dashboard
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);

        } catch (err) {
            console.error('Login error:', err);
            showAlert(err.message || 'Network error occurred. Please try again.');
            btnLogin.disabled = false;
            btnLogin.textContent = 'Log In';
        }
    });

    /* ─── Forgot Password Modal Handlers ─── */
    const forgotPassModal = document.getElementById('forgotPassModal');
    const btnForgotPass = document.getElementById('btnForgotPass');
    const closeForgotModal = document.getElementById('closeForgotModal');
    const btnCancelForgot = document.getElementById('btnCancelForgot');
    const forgotForm = document.getElementById('forgotForm');
    const forgotIdentifier = document.getElementById('forgotIdentifier');
    const btnSendReset = document.getElementById('btnSendReset');
    const forgotAlertBox = document.getElementById('forgotAlertBox');
    const forgotAlertIcon = document.getElementById('forgotAlertIcon');
    const forgotAlertMsg = document.getElementById('forgotAlertMsg');

    function showForgotAlert(msg, type = 'danger') {
        forgotAlertMsg.textContent = msg;
        forgotAlertBox.className = `alert-box alert-${type}`;
        forgotAlertBox.style.display = 'flex';
        if (type === 'danger') {
            forgotAlertIcon.className = 'bi bi-exclamation-triangle-fill';
        } else {
            forgotAlertIcon.className = 'bi bi-check-circle-fill';
        }
    }

    function hideForgotAlert() {
        forgotAlertBox.style.display = 'none';
    }

    if (btnForgotPass) {
        btnForgotPass.addEventListener('click', () => {
            hideForgotAlert();
            forgotIdentifier.value = '';
            btnSendReset.disabled = false;
            btnSendReset.textContent = 'Send Reset Link';
            forgotPassModal.style.display = 'flex';
            setTimeout(() => forgotIdentifier.focus(), 100);
        });
    }

    function closeForgot() {
        forgotPassModal.style.display = 'none';
    }

    if (closeForgotModal) closeForgotModal.addEventListener('click', closeForgot);
    if (btnCancelForgot) btnCancelForgot.addEventListener('click', closeForgot);

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideForgotAlert();

            const identifier = forgotIdentifier.value.trim();
            if (!identifier) {
                showForgotAlert('Please enter your email or username.', 'danger');
                return;
            }

            btnSendReset.disabled = true;
            btnSendReset.textContent = 'Sending... ⏳';

            try {
                const response = await apiFetch(`/api/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier })
                });

                let data = {};
                const rawText = await response.text();
                try {
                    data = JSON.parse(rawText);
                } catch (jsonErr) {
                    if (!response.ok) {
                        throw new Error('Backend server is updating. Please try again in 30 seconds.');
                    }
                    throw new Error(`Server returned: ${rawText.slice(0, 100)}`);
                }

                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Failed to send reset link.');
                }

                showForgotAlert(data.message || 'Password reset email sent!', 'success');
                btnSendReset.textContent = 'Link Sent ✅';

            } catch (err) {
                showForgotAlert(err.message || 'Failed to request password reset.', 'danger');
                btnSendReset.disabled = false;
                btnSendReset.textContent = 'Send Reset Link';
            }
        });
    }

})();
