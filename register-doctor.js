/* ═══════════════════════════════════════════════
   REGISTER-DOCTOR.JS — Doctor Account Activation Logic
   ═══════════════════════════════════════════════ */

(function () {
    'use strict';

    const isProduction = window.location.hostname.includes('aurorasleepscreening.com') || window.location.hostname.includes('aurora-sleep-screening') || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

    /* ─── Theme Toggle ─── */
    const html = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const savedTheme = localStorage.getItem('aurora-theme') || 'dark';

    function applyTheme(theme) {
        html.setAttribute('data-theme', theme);
        if (themeIcon) {
            themeIcon.innerHTML = theme === 'dark' ? '<i class="bi bi-moon-fill"></i>' : '<i class="bi bi-sun-fill"></i>';
        }
    }
    applyTheme(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = html.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            localStorage.setItem('aurora-theme', next);
        });
    }

    /* ─── Get token from URL ─── */
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    const stateLoading = document.getElementById('stateLoading');
    const stateError = document.getElementById('stateError');
    const stateForm = document.getElementById('stateForm');
    const errorMessage = document.getElementById('errorMessage');

    const alertBox = document.getElementById('alertBox');
    const alertIcon = document.getElementById('alertIcon');
    const alertMsg = document.getElementById('alertMsg');

    function showAlert(msg, type = 'danger') {
        alertBox.style.display = 'flex';
        alertBox.className = `alert-box alert-${type}`;
        alertMsg.textContent = msg;
        if (type === 'danger') {
            alertIcon.className = 'bi bi-exclamation-triangle-fill';
        } else {
            alertIcon.className = 'bi bi-check-circle-fill';
        }
    }

    function hideAlert() {
        alertBox.style.display = 'none';
    }

    if (!token) {
        stateLoading.style.display = 'none';
        errorMessage.textContent = 'No invitation token was provided in the URL. Please use the exact link sent to you by the administrator.';
        stateError.style.display = 'block';
        return;
    }

    /* ─── Validate Invitation Token ─── */
    async function validateToken() {
        try {
            const res = await fetch(`${API_BASE}/api/auth/invite/${encodeURIComponent(token)}`, {
                headers: { 'Bypass-Tunnel-Remainder': 'true' }
            });
            const data = await res.json();

            stateLoading.style.display = 'none';

            if (!res.ok || !data.success) {
                errorMessage.textContent = data.message || 'This invitation link is invalid or has expired. Please contact the administrator for a new link.';
                stateError.style.display = 'block';
                return;
            }

            // Populate doctor information
            const doc = data.doctor;
            document.getElementById('welcomeDoctorName').textContent = doc.full_name ? `Welcome, ${doc.full_name}` : 'Welcome Doctor';
            document.getElementById('metaEmail').textContent = doc.email || '—';
            document.getElementById('metaSpec').textContent = doc.specialization || 'General / Sleep Medicine';

            stateForm.style.display = 'block';

        } catch (err) {
            console.error('Validation error:', err);
            stateLoading.style.display = 'none';
            errorMessage.textContent = 'Unable to connect to activation server. Please verify your internet connection or server status.';
            stateError.style.display = 'block';
        }
    }

    /* ─── Activation Form Submission ─── */
    const activationForm = document.getElementById('activationForm');
    const btnActivate = document.getElementById('btnActivate');

    activationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        if (!username || username.length < 3) {
            showAlert('Username must be at least 3 characters long.');
            return;
        }

        if (password.length < 6) {
            showAlert('Password must be at least 6 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Passwords do not match. Please re-enter your password.');
            return;
        }

        btnActivate.disabled = true;
        btnActivate.innerHTML = '<i class="bi bi-arrow-repeat spin" style="animation: spin 1s linear infinite;"></i> Activating Account...';

        try {
            const res = await fetch(`${API_BASE}/api/auth/register-doctor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Remainder': 'true' },
                credentials: 'include',
                body: JSON.stringify({ token, username, password })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                showAlert(data.message || 'Failed to activate account. Please try again.');
                btnActivate.disabled = false;
                btnActivate.innerHTML = '<i class="bi bi-check-circle-fill"></i> Activate Account &amp; Access Dashboard';
                return;
            }

            showAlert('Account activated successfully! Redirecting to your dashboard...', 'success');

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1200);

        } catch (err) {
            console.error('Registration submit error:', err);
            showAlert('An error occurred while connecting to the server. Please try again.');
            btnActivate.disabled = false;
            btnActivate.innerHTML = '<i class="bi bi-check-circle-fill"></i> Activate Account &amp; Access Dashboard';
        }
    });

    validateToken();

})();
