// frontend/reset-password.js
(function () {
    'use strict';

    const isProduction = window.location.hostname.includes('aurorasleepscreening.com') || window.location.hostname.includes('aurora-sleep-screening') || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

    async function apiFetch(path, options = {}) {
        const endpoints = [];
        if (API_BASE) endpoints.push(`${API_BASE}${path}`);
        endpoints.push(`http://localhost:5000${path}`);
        endpoints.push(`http://127.0.0.1:5000${path}`);

        let lastErr = null;
        for (const url of endpoints) {
            try {
                const res = await fetch(url, options);
                const contentType = res.headers.get('content-type') || '';
                if (res.ok || contentType.includes('application/json')) return res;
            } catch (err) {
                lastErr = err;
            }
        }
        if (API_BASE) return fetch(`${API_BASE}${path}`, options);
        throw lastErr || new Error('Network request failed');
    }

    /* ─── Theme Toggle ─── */
    const html = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const savedTheme = localStorage.getItem('aurora-theme') || 'dark';

    function applyTheme(theme) {
        html.setAttribute('data-theme', theme);
        themeIcon.innerHTML = theme === 'dark' ? '<i class="bi bi-moon-fill"></i>' : '<i class="bi bi-sun-fill"></i>';
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

    /* ─── DOM Elements ─── */
    const resetForm = document.getElementById('resetForm');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const btnSubmitReset = document.getElementById('btnSubmitReset');
    const alertBox = document.getElementById('alertBox');
    const alertIcon = document.getElementById('alertIcon');
    const alertMessage = document.getElementById('alertMessage');
    const userGreeting = document.getElementById('userGreeting');
    const toggleNewPass = document.getElementById('toggleNewPass');
    const toggleConfirmPass = document.getElementById('toggleConfirmPass');

    function showAlert(msg, type = 'danger') {
        alertMessage.textContent = msg;
        alertBox.className = `alert-box alert-${type}`;
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

    // Toggle Password Visibility
    function setupPassToggle(btn, input) {
        if (!btn || !input) return;
        btn.addEventListener('click', () => {
            const isPass = input.type === 'password';
            input.type = isPass ? 'text' : 'password';
            btn.innerHTML = isPass ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
        });
    }
    setupPassToggle(toggleNewPass, newPassword);
    setupPassToggle(toggleConfirmPass, confirmPassword);

    // Read token from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showAlert('Invalid or missing password reset link. Please request a new link from the login page.', 'danger');
        if (resetForm) resetForm.style.display = 'none';
        return;
    }

    // Verify token on load
    async function verifyToken() {
        try {
            const res = await apiFetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                showAlert(data.message || 'This password reset link has expired or is invalid.', 'danger');
                if (resetForm) resetForm.style.display = 'none';
                return;
            }

            if (data.fullName || data.username) {
                userGreeting.innerHTML = `Welcome back, <strong>${data.fullName || data.username}</strong>! Please enter your new password below.`;
            }
        } catch (err) {
            console.error('Verify token error:', err);
            showAlert('Failed to connect to the authentication server. Please check your internet connection.', 'danger');
        }
    }
    verifyToken();

    // Handle Form Submit
    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert();

            const p1 = newPassword.value;
            const p2 = confirmPassword.value;

            if (p1.length < 6) {
                showAlert('Password must be at least 6 characters.', 'danger');
                return;
            }

            if (p1 !== p2) {
                showAlert('Passwords do not match. Please re-enter.', 'danger');
                return;
            }

            btnSubmitReset.disabled = true;
            btnSubmitReset.textContent = 'Updating Password... ⏳';

            try {
                const res = await apiFetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, new_password: p1 })
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.message || 'Failed to reset password.');
                }

                showAlert(data.message || 'Password updated successfully! Redirecting to login...', 'success');
                btnSubmitReset.textContent = 'Updated ✅';

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);

            } catch (err) {
                showAlert(err.message || 'An error occurred while resetting your password.', 'danger');
                btnSubmitReset.disabled = false;
                btnSubmitReset.textContent = 'Update Password & Log In';
            }
        });
    }

})();
