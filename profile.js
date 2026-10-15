/* ═══════════════════════════════════════════════
   PROFILE.JS — Doctor Self-Service Profile Logic
   ═══════════════════════════════════════════════ */

const isProduction = window.location.hostname.includes('aurorasleepscreening.com') || window.location.hostname.includes('aurora-sleep-screening') || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

function getAuthHeaders() {
    const token = localStorage.getItem('aurora_token');
    const headers = { 'Bypass-Tunnel-Remainder': 'true' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

/* ─── Theme Toggle ─── */
(function initTheme() {
    const html = document.documentElement;
    const toggle = document.getElementById('themeToggle');
    const icon = document.getElementById('themeIcon');
    const saved = localStorage.getItem('aurora-theme');

    if (saved) html.setAttribute('data-theme', saved);

    function updateIcon() {
        icon.innerHTML = html.getAttribute('data-theme') === 'dark' ? '<i class="bi bi-moon-fill"></i>' : '<i class="bi bi-sun-fill"></i>';
    }
    updateIcon();

    toggle.addEventListener('click', () => {
        const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('aurora-theme', next);
        updateIcon();
    });
})();

/* ─── Load Profile ─── */
async function loadProfile() {
    try {
        const res = await fetch(`${API_BASE}/api/auth/profile`, { headers: getAuthHeaders(), credentials: 'include' });
        const data = await res.json();

        if (!res.ok || !data.success) {
            window.location.href = 'login.html';
            return;
        }

        const u = data.user;
        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay) {
            userDisplay.innerHTML = `<span style="background: var(--bg-card); border: 1px solid var(--border-card); padding: 5px 14px; border-radius: 20px; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;"><span style="color: var(--accent); font-weight: 800; font-size: 1.15rem; margin-right: -2px;">+</span> <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${u.full_name || u.username}</span></span>`;
        }
        document.getElementById('profFullName').value = u.full_name || '';
        document.getElementById('profUsername').value = u.username;
        document.getElementById('profEmail').value = u.email || '';
        document.getElementById('profPhone').value = u.phone || '';
        document.getElementById('profSpec').value = u.specialization || '';

        // Unique Patient Screening Link
        const link = `${window.location.origin}/?doc=${u.doctor_code || ''}`;
        document.getElementById('patientLinkInput').value = link;

    } catch (err) {
        console.error('Error loading profile:', err);
        window.location.href = 'login.html';
    }
}

/* ─── Copy Link Button ─── */
const btnCopyLink = document.getElementById('btnCopyLink');
btnCopyLink.addEventListener('click', () => {
    const linkInput = document.getElementById('patientLinkInput');
    navigator.clipboard.writeText(linkInput.value).then(() => {
        alert('Patient screening link copied to clipboard:\n' + linkInput.value);
    }).catch(() => {
        linkInput.select();
        document.execCommand('copy');
        alert('Copied link!');
    });
});

/* ─── Save Profile Form ─── */
const profileForm = document.getElementById('profileForm');
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        full_name: document.getElementById('profFullName').value,
        email: document.getElementById('profEmail').value,
        phone: document.getElementById('profPhone').value,
        specialization: document.getElementById('profSpec').value
    };

    const btnSave = document.getElementById('btnSaveProfile');
    btnSave.disabled = true;
    btnSave.textContent = 'Saving...';

    try {
        const res = await fetch(`${API_BASE}/api/auth/profile`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            alert('Profile updated successfully!');
            const u = data.user;
            document.getElementById('userDisplay').innerHTML = `<span style="background: var(--bg-card); border: 1px solid var(--border-card); padding: 5px 14px; border-radius: 20px; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;"><span style="color: var(--accent); font-weight: 800; font-size: 1.15rem; margin-right: -2px;">+</span> <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${u.full_name || u.username}</span></span>`;
        } else {
            alert('Failed to update profile: ' + data.message);
        }
    } catch (err) {
        console.error('Error saving profile:', err);
        alert('An error occurred while saving profile.');
    } finally {
        btnSave.disabled = false;
        btnSave.textContent = 'Save Changes';
    }
});

/* Logout button */
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        try {
            await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
            window.location.href = 'login.html';
        } catch (err) {
            window.location.href = 'login.html';
        }
    });
}

loadProfile();
