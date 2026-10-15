/* ═══════════════════════════════════════════════
   ADMIN.JS — Super Admin Dashboard Logic
   ═══════════════════════════════════════════════ */

const isProduction = window.location.hostname.includes('aurorasleepscreening.com') || window.location.hostname.includes('aurora-sleep-screening') || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

let allDoctors = [];
let allPatients = [];
let chartDoctorsVolumeInstance = null;
let chartPrimaryVsSecondaryAdminInstance = null;

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

/* ─── Tabs ─── */
const tabDoctorsBtn = document.getElementById('tabDoctorsBtn');
const tabPatientsBtn = document.getElementById('tabPatientsBtn');
const tabAnalyticsBtn = document.getElementById('tabAnalyticsBtn');

const tabDoctors = document.getElementById('tabDoctors');
const tabPatients = document.getElementById('tabPatients');
const tabAnalytics = document.getElementById('tabAnalytics');

tabDoctorsBtn.addEventListener('click', () => {
    setActiveTab(tabDoctorsBtn, tabDoctors);
});
tabPatientsBtn.addEventListener('click', () => {
    setActiveTab(tabPatientsBtn, tabPatients);
});
tabAnalyticsBtn.addEventListener('click', () => {
    setActiveTab(tabAnalyticsBtn, tabAnalytics);
    renderAnalyticsChart();
});

function setActiveTab(btn, content) {
    [tabDoctorsBtn, tabPatientsBtn, tabAnalyticsBtn].forEach(b => b.classList.remove('active'));
    [tabDoctors, tabPatients, tabAnalytics].forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    content.classList.add('active');
}

function getAuthHeaders() {
    const token = localStorage.getItem('aurora_token');
    const headers = { 'Bypass-Tunnel-Remainder': 'true' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

/* ─── Auth check — must be super_admin ─── */
async function checkAdminAuth() {
    try {
        const res = await fetch(`${API_BASE}/api/auth/check`, { headers: getAuthHeaders(), credentials: 'include' });
        const data = await res.json();

        if (!data.authenticated) {
            window.location.href = 'login.html';
            return;
        }

        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay) {
            userDisplay.innerHTML = `<span style="background: var(--bg-card); border: 1px solid var(--border-card); padding: 5px 14px; border-radius: 20px; display: inline-flex; align-items: center; gap: 10px; white-space: nowrap;"><i class="bi bi-shield-lock-fill" style="color: var(--accent); font-size: 0.9rem;"></i><span style="font-size: 0.85rem;">${data.fullName || data.username}</span><span class="badge badge-high" style="font-size: 0.7rem; padding: 2px 8px; border-radius: 10px;">SUPER ADMIN</span></span>`;
        }

        loadDoctors();
        loadAllPatients();
        loadAnalytics();

    } catch (err) {
        console.error('Auth error:', err);
        window.location.href = 'login.html';
    }
}

/* ─── Load Doctors ─── */
async function loadDoctors() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/doctors`, { headers: getAuthHeaders(), credentials: 'include' });
        const data = await res.json();

        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load doctors');

        allDoctors = data.doctors;
        renderDoctors(allDoctors);
        populateDoctorFilter(allDoctors);

    } catch (err) {
        console.error('Load doctors error:', err);
        document.getElementById('doctorsTableBody').innerHTML = '<tr><td colspan="7" class="dashboard-empty">Failed to load doctors.</td></tr>';
    }
}

function renderDoctors(doctors) {
    const body = document.getElementById('doctorsTableBody');
    const empty = document.getElementById('emptyDoctors');

    body.innerHTML = '';
    if (doctors.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    const origin = window.location.origin.includes('localhost') ? 'https://sleep-aurora.web.app' : window.location.origin;

    doctors.forEach(doc => {
        const tr = document.createElement('tr');
        const patientUrl = `${origin}/?doc=${doc.doctor_code || ''}`;
        const registerUrl = doc.invite_token ? `${origin}/register-doctor.html?token=${doc.invite_token}` : '';

        let statusBadge = '<span class="badge badge-completed">Active</span>';
        if (doc.status === 'invited' || (!doc.username && doc.invite_token)) {
            statusBadge = '<span class="badge badge-warning" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);">Invited</span>';
        } else if (!doc.is_active) {
            statusBadge = '<span class="badge badge-high">Deactivated</span>';
        }

        const usernameDisplay = doc.username ? `@${doc.username}` : '<span style="color: var(--warning); font-style: italic; font-size: 0.8rem;">Registration Pending</span>';

        const linkBoxDisplay = (doc.status === 'invited' || !doc.username) && doc.invite_token
            ? `<div class="doctor-link-box" style="border-color: var(--warning); color: var(--warning);">
                    <span style="font-size: 0.75rem;">Invite Link</span>
                    <button type="button" title="Copy Doctor Registration Link" onclick="copyToClipboard('${registerUrl}')">
                        <i class="bi bi-copy"></i>
                    </button>
               </div>`
            : `<div class="doctor-link-box">
                    <span>?doc=${doc.doctor_code || ''}</span>
                    <button type="button" title="Copy patient screening link" onclick="copyToClipboard('${patientUrl}')">
                        <i class="bi bi-copy"></i>
                    </button>
               </div>`;

        tr.innerHTML = `
            <td>
                <div style="font-weight: 600; color: var(--text-primary);">${doc.full_name || 'Unnamed Doctor'}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); font-family: monospace;">${usernameDisplay}</div>
            </td>
            <td>
                <div style="font-size: 0.85rem;">${doc.email || '—'}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${doc.phone || '—'}</div>
            </td>
            <td style="font-size: 0.9rem;">${doc.specialization || 'General'}</td>
            <td>${linkBoxDisplay}</td>
            <td style="font-weight: 600; text-align: center;">${doc.patient_count || 0}</td>
            <td>${statusBadge}</td>
            <td style="text-align: center; white-space: nowrap;">
                <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                    ${(doc.status === 'invited' || !doc.username) && doc.invite_token ? `
                    <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; color: var(--accent); font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px;" title="Resend / View Registration Link" onclick="showInviteResultModal('${doc.full_name || doc.email}', '${registerUrl}', false, '${doc.email || ''}')">
                        <i class="bi bi-link-45deg"></i> Link
                    </button>
                    ` : ''}
                    <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px;" title="Edit Doctor Profile" onclick="openEditModal(${doc.id})">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px; ${doc.is_active ? 'color: var(--warning);' : 'color: var(--success);'}" title="${doc.is_active ? 'Deactivate Account' : 'Activate Account'}" onclick="toggleDoctor(${doc.id})">
                        <i class="bi bi-${doc.is_active ? 'pause-circle' : 'play-circle'}"></i> ${doc.is_active ? 'Pause' : 'Activate'}
                    </button>
                    <button class="btn btn-secondary btn-sm" style="padding: 4px 10px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); color: #ef4444; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Delete Doctor Account Permanently" onclick="deleteDoctor(${doc.id}, '${doc.full_name || doc.username || 'Doctor'}')">
                        <i class="bi bi-trash3-fill" style="font-size: 0.9rem;"></i> Delete
                    </button>
                </div>
            </td>
        `;

        body.appendChild(tr);
    });
}

window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Link copied to clipboard:\n' + text);
    }).catch(() => {
        prompt('Copy link:', text);
    });
};

/* ─── Invitation Result Modal Helpers ─── */
const inviteResultModal = document.getElementById('inviteResultModal');
const inviteModalClose = document.getElementById('inviteModalClose');
const btnCloseInviteModal = document.getElementById('btnCloseInviteModal');
const btnCopyInviteModal = document.getElementById('btnCopyInviteModal');

window.showInviteResultModal = function(doctorName, inviteUrl, emailSent, emailAddress, emailError) {
    document.getElementById('invitedDoctorName').textContent = doctorName;
    document.getElementById('inviteLinkInput').value = inviteUrl;

    const emailNoticeBox = document.getElementById('emailNoticeBox');
    const emailNoticeIcon = document.getElementById('emailNoticeIcon');
    const emailNoticeText = document.getElementById('emailNoticeText');

    if (emailNoticeBox) {
        if (emailSent || (emailAddress && (!emailError || emailError.includes('queued')))) {
            emailNoticeBox.style.display = 'flex';
            emailNoticeBox.style.background = 'rgba(34, 197, 94, 0.15)';
            emailNoticeBox.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            emailNoticeBox.style.color = '#22c55e';
            emailNoticeIcon.className = 'bi bi-envelope-check-fill';
            emailNoticeText.textContent = `Invitation email dispatched to ${emailAddress || doctorName}!`;
        } else if (emailAddress) {
            emailNoticeBox.style.display = 'flex';
            emailNoticeBox.style.background = 'rgba(34, 197, 94, 0.15)';
            emailNoticeBox.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            emailNoticeBox.style.color = '#22c55e';
            emailNoticeIcon.className = 'bi bi-envelope-check-fill';
            emailNoticeText.textContent = `Invitation generated for ${emailAddress}. Use the button below to copy the link.`;
        } else {
            emailNoticeBox.style.display = 'none';
        }
    }

    inviteResultModal.style.display = 'flex';
};

function closeInviteModal() {
    inviteResultModal.style.display = 'none';
}

if (inviteModalClose) inviteModalClose.addEventListener('click', closeInviteModal);
if (btnCloseInviteModal) btnCloseInviteModal.addEventListener('click', closeInviteModal);

if (btnCopyInviteModal) {
    btnCopyInviteModal.addEventListener('click', () => {
        const linkInput = document.getElementById('inviteLinkInput');
        navigator.clipboard.writeText(linkInput.value).then(() => {
            alert('Doctor registration link copied to clipboard:\n' + linkInput.value);
        }).catch(() => {
            linkInput.select();
            document.execCommand('copy');
            alert('Copied registration link!');
        });
    });
}

/* ─── Populate doctor filter dropdown ─── */
function populateDoctorFilter(doctors) {
    const select = document.getElementById('filterDoctor');
    select.innerHTML = '<option value="all">All Doctors</option><option value="unassigned">Unassigned Only</option>';

    doctors.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.full_name ? `${d.full_name} (${d.username ? '@' + d.username : 'Invited'})` : (d.username ? `@${d.username}` : 'Invited Doctor');
        select.appendChild(opt);
    });
}

/* ─── Load All Patients ─── */
async function loadAllPatients() {
    try {
        const res = await fetch(`${API_BASE}/api/patients`, { headers: getAuthHeaders(), credentials: 'include' });
        const data = await res.json();

        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load patients');

        allPatients = data.patients;
        renderAllPatients(allPatients);

    } catch (err) {
        console.error('Load all patients error:', err);
        const tbody = document.getElementById('allPatientsTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="dashboard-empty">Failed to load patients. Check server connection.</td></tr>';
    }
}

function renderAllPatients(patients) {
    const body = document.getElementById('allPatientsTableBody');
    const empty = document.getElementById('emptyPatients');

    const totalCount = patients.length;
    const completedCount = patients.filter(p => p.status === 'completed').length;
    const incompleteCount = totalCount - completedCount;

    const elTotal = document.getElementById('adminStatTotal');
    const elCompleted = document.getElementById('adminStatCompleted');
    const elIncomplete = document.getElementById('adminStatIncomplete');

    if (elTotal) elTotal.textContent = totalCount;
    if (elCompleted) elCompleted.textContent = completedCount;
    if (elIncomplete) elIncomplete.textContent = incompleteCount;

    if (!body) return;

    body.innerHTML = '';
    if (patients.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    patients.forEach(p => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => window.location.href = `patient.html?id=${p.id}`;

        const createdDate = new Date(p.created_at);
        const dateStr = createdDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        const doctorName = (p.doctor_name || p.doctor_username)
            ? `${p.doctor_name || '@' + p.doctor_username}`
            : '<span style="color: var(--warning); font-style: italic;">Unassigned</span>';

        const referralDisplay = p.referral_source
            ? `<span style="font-size:0.85rem; color:var(--text-secondary);">${p.referral_source}</span>`
            : '<span style="color: var(--text-secondary);">—</span>';

        const statusBadgeDisplay = p.status === 'completed'
            ? '<span class="badge badge-completed">Completed</span>'
            : '<span class="badge badge-incomplete">Incomplete</span>';

        // Post-Study Inline Controls (Super Admin Table)
        const currentAhi = p.ahi !== undefined && p.ahi !== null ? p.ahi : '';
        const ahiInputHtml = `<input type="text" id="ahi_input_${p.id}" class="input" style="width:75px; padding: 4px 6px; font-size: 0.82rem; height: 32px; background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-primary);" placeholder="Enter AHI" value="${currentAhi}" onblur="saveStudyInline(${p.id})">`;

        const presetOptions = ['Obstructive Sleep Apnea (OSA)', 'Insomnia', 'Hypersomnia', 'Circadian Rhythm Disorder'];
        const secVal = p.secondary_findings || '';
        const isOther = secVal && !presetOptions.includes(secVal);

        const secondarySelectHtml = `
            <select id="secondary_select_${p.id}" class="input" style="padding: 4px 6px; font-size: 0.82rem; height: 32px; max-width: 140px; background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-primary);" onchange="handleSecondaryInlineChange(${p.id})" data-custom="${isOther ? secVal.replace(/"/g, '&quot;') : ''}">
                <option value="" ${!secVal ? 'selected' : ''}>None</option>
                <option value="Obstructive Sleep Apnea (OSA)" ${secVal === 'Obstructive Sleep Apnea (OSA)' ? 'selected' : ''}>Obstructive Sleep Apnea (OSA)</option>
                <option value="Insomnia" ${secVal === 'Insomnia' ? 'selected' : ''}>Insomnia</option>
                <option value="Hypersomnia" ${secVal === 'Hypersomnia' ? 'selected' : ''}>Hypersomnia</option>
                <option value="Circadian Rhythm Disorder" ${secVal === 'Circadian Rhythm Disorder' ? 'selected' : ''}>Circadian Rhythm Disorder</option>
                <option value="Others" ${isOther ? 'selected' : ''}>${isOther ? `Others (${secVal})` : 'Others'}</option>
            </select>
        `;

        const commentsVal = p.admin_comments || '';
        const commentsInputHtml = `<textarea id="comments_input_${p.id}" class="input" style="width:140px; height: 42px; padding: 4px 6px; font-size: 0.8rem; resize: vertical; background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-primary);" placeholder="Add comments..." onblur="saveStudyInline(${p.id})">${commentsVal}</textarea>`;

        tr.innerHTML = `
            <td>
                <div style="font-weight: 600; color: var(--text-primary);">${p.full_name || 'Anonymous Patient'}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); font-family: monospace;">ID #${p.id}</div>
            </td>
            <td>
                <div style="font-size: 0.85rem;">${p.phone || '—'}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${p.email || '—'}</div>
            </td>
            <td>${referralDisplay}</td>
            <td>${statusBadgeDisplay}</td>
            <td>${p.primary_finding_label || '—'}</td>
            <td>${ahiInputHtml}</td>
            <td>${secondarySelectHtml}</td>
            <td>${commentsInputHtml}</td>
            <td><div style="font-size: 0.85rem; font-weight: 500;">${doctorName}</div></td>
            <td>${dateStr}</td>
            <td style="text-align: center;" onclick="event.stopPropagation()">
                <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size:0.8rem; margin-right: 4px; color: var(--accent);" title="Edit Patient Details" onclick="openEditPatientModal(${p.id})">
                    <i class="bi bi-pencil-square"></i> Edit
                </button>
                <a href="${API_BASE}/api/pdf/${p.id}" target="_blank" class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size:0.8rem; margin-right: 4px; text-decoration: none; display: inline-flex; align-items: center; gap: 3px;" title="View & Download Patient PDF Report">
                    <i class="bi bi-file-earmark-pdf"></i> Report
                </a>
                <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size:0.8rem; margin-right: 4px;" title="Reassign Doctor" onclick="reassignPatientModal(${p.id}, ${p.doctor_id || 'null'}, '${(p.full_name || 'Patient').replace(/'/g, "\\'")}')">
                    <i class="bi bi-arrow-left-right"></i> Assign
                </button>
                <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size:0.8rem; color: var(--danger);" title="Delete Patient Record" onclick="deletePatientModal(${p.id}, '${(p.full_name || 'Patient').replace(/'/g, "\\'")}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;

        body.appendChild(tr);
    });
}

/* ─── Search & Filter All Patients ─── */
function applyPatientFilters() {
    const query = document.getElementById('patientSearchInput').value.trim().toLowerCase();
    const docFilter = document.getElementById('filterDoctor').value;

    const filtered = allPatients.filter(p => {
        const matchesQuery = !query || (p.full_name || '').toLowerCase().includes(query) || (p.phone || '').toLowerCase().includes(query);

        let matchesDoc = true;
        if (docFilter === 'unassigned') {
            matchesDoc = !p.doctor_id;
        } else if (docFilter !== 'all') {
            matchesDoc = String(p.doctor_id) === String(docFilter);
        }

        return matchesQuery && matchesDoc;
    });

    renderAllPatients(filtered);
}

document.getElementById('patientSearchInput').addEventListener('input', applyPatientFilters);
document.getElementById('filterDoctor').addEventListener('change', applyPatientFilters);

/* ─── Reassign Patient ─── */
window.reassignPatientModal = async function(patientId, currentDocId, patientName) {
    let docOptions = '0: Unassign Doctor\n';
    allDoctors.forEach(d => {
        docOptions += `${d.id}: ${d.full_name || d.username}\n`;
    });

    const choice = prompt(`Reassign "${patientName}" to a doctor.\n\nEnter Doctor ID from list:\n${docOptions}`, currentDocId || 0);

    if (choice !== null) {
        const doctorId = parseInt(choice) === 0 ? null : parseInt(choice);

        try {
            const res = await fetch(`${API_BASE}/api/admin/patients/${patientId}/assign`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                credentials: 'include',
                body: JSON.stringify({ doctor_id: doctorId })
            });

            const data = await res.json();
            if (data.success) {
                alert('Patient reassigned successfully.');
                loadAllPatients();
                loadDoctors();
            } else {
                alert('Failed: ' + data.message);
            }
        } catch (err) {
            console.error('Reassign error:', err);
            alert('Failed to reassign patient.');
        }
    }
};

/* ─── Delete Patient Record ─── */
window.deletePatientModal = async function(patientId, patientName) {
    const confirmDelete = confirm(`Are you sure you want to permanently delete patient "${patientName}"?\n\nAll screening answers and calculated results will be removed.`);
    if (!confirmDelete) return;

    try {
        const res = await fetch(`${API_BASE}/api/patients/${patientId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include'
        });

        const data = await res.json();
        if (data.success) {
            alert('Patient record deleted successfully.');
            loadAllPatients();
            loadAnalytics();
        } else {
            alert('Failed to delete patient: ' + data.message);
        }
    } catch (err) {
        console.error('Delete patient error:', err);
        alert('An error occurred while deleting the patient record.');
    }
};

/* ─── Toggle Doctor Active Status ─── */
window.toggleDoctor = async function(doctorId) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/doctors/${doctorId}/toggle`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            credentials: 'include'
        });

        const data = await res.json();
        if (data.success) {
            loadDoctors();
            loadAnalytics();
        } else {
            alert('Failed to toggle status: ' + data.message);
        }
    } catch (err) {
        console.error('Toggle doctor error:', err);
    }
};

/* ─── Delete Doctor Account ─── */
window.deleteDoctor = async function(doctorId, docName) {
    const confirmDelete = confirm(`Are you sure you want to delete doctor "${docName}"?\n\nTheir patients will remain in the database but become Unassigned.`);
    if (!confirmDelete) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/doctors/${doctorId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include'
        });

        const data = await res.json();
        if (data.success) {
            alert('Doctor account deleted.');
            loadDoctors();
            loadAllPatients();
            loadAnalytics();
        } else {
            alert('Failed to delete doctor: ' + data.message);
        }
    } catch (err) {
        console.error('Delete doctor error:', err);
    }
};

/* ─── Add / Edit Doctor Modal ─── */
const doctorModal = document.getElementById('doctorModal');
const btnNewDoctor = document.getElementById('btnNewDoctor');
const modalClose = document.getElementById('modalClose');
const btnCancelModal = document.getElementById('btnCancelModal');
const doctorForm = document.getElementById('doctorForm');
const editFieldsGroup = document.getElementById('editFieldsGroup');
const modalSubTitle = document.getElementById('modalSubTitle');

btnNewDoctor.addEventListener('click', () => {
    document.getElementById('modalTitle').textContent = 'Invite New Doctor';
    if (modalSubTitle) modalSubTitle.style.display = 'block';
    document.getElementById('editDoctorId').value = '';
    if (editFieldsGroup) editFieldsGroup.style.display = 'none';
    document.getElementById('btnSaveDoctor').textContent = 'Generate Invitation Link';
    document.getElementById('docEmail').required = true;
    doctorForm.reset();
    doctorModal.style.display = 'flex';
});

modalClose.addEventListener('click', closeModal);
btnCancelModal.addEventListener('click', closeModal);

function closeModal() {
    doctorModal.style.display = 'none';
}

window.openEditModal = function(doctorId) {
    const doc = allDoctors.find(d => d.id === doctorId);
    if (!doc) return;

    document.getElementById('modalTitle').textContent = `Edit Profile — ${doc.full_name || doc.email || 'Doctor'}`;
    if (modalSubTitle) modalSubTitle.style.display = 'none';
    document.getElementById('editDoctorId').value = doc.id;
    document.getElementById('docFullName').value = doc.full_name || '';
    document.getElementById('docEmail').value = doc.email || '';
    document.getElementById('docPhone').value = doc.phone || '';
    document.getElementById('docSpec').value = doc.specialization || '';

    if (editFieldsGroup) {
        editFieldsGroup.style.display = 'block';
        document.getElementById('docUsername').value = doc.username || 'Invited (Not yet set)';
        document.getElementById('docPassword').value = '';
    }

    document.getElementById('btnSaveDoctor').textContent = 'Save Profile Changes';
    doctorModal.style.display = 'flex';
};

doctorForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const saveBtn = document.getElementById('btnSaveDoctor');
    const originalText = saveBtn ? saveBtn.textContent : 'Generate Invitation Link';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Generating & Sending... ⏳';
    }

    const editId = document.getElementById('editDoctorId').value;
    const payload = {
        full_name: document.getElementById('docFullName').value,
        email: document.getElementById('docEmail').value,
        phone: document.getElementById('docPhone').value,
        specialization: document.getElementById('docSpec').value
    };

    if (editId) {
        const usernameVal = document.getElementById('docUsername').value;
        const passVal = document.getElementById('docPassword').value;
        if (usernameVal && !usernameVal.includes('Invited')) payload.username = usernameVal;
        if (passVal) payload.password = passVal;
    }

    try {
        let res;
        if (editId) {
            // Update existing
            res = await fetch(`${API_BASE}/api/admin/doctors/${editId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
        } else {
            // Create invitation
            res = await fetch(`${API_BASE}/api/admin/doctors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
        }

        const data = await res.json();
        if (data.success) {
            closeModal();
            loadDoctors();
            loadAnalytics();

            if (!editId && data.doctor && data.doctor.invite_token) {
                const origin = window.location.origin.includes('localhost') ? 'https://sleep-aurora.web.app' : window.location.origin;
                const inviteUrl = `${origin}/register-doctor.html?token=${data.doctor.invite_token}`;
                showInviteResultModal(data.doctor.full_name || data.doctor.email, inviteUrl, data.emailSent, data.doctor.email, data.emailError);
            } else {
                alert(editId ? 'Doctor profile updated successfully.' : 'Doctor created successfully.');
            }
        } else {
            alert('Error: ' + data.message);
        }
    } catch (err) {
        console.error('Save doctor error:', err);
        alert('Failed to save doctor account: ' + (err.message || 'Server error'));
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }
});

/* ─── Load Analytics ─── */
async function loadAnalytics() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/analytics`, { headers: getAuthHeaders(), credentials: 'include' });
        const data = await res.json();

        if (!res.ok || !data.success) return;

        const a = data.analytics;
        document.getElementById('kpiDoctors').textContent = a.totalDoctors;
        document.getElementById('kpiActiveDoctors').textContent = a.activeDoctors;
        document.getElementById('kpiTotalPatients').textContent = a.totalPatients;
        document.getElementById('kpiCompletedScreenings').textContent = a.completedPatients;
        document.getElementById('kpiUnassigned').textContent = a.unassignedPatients;

    } catch (err) {
        console.error('Load analytics error:', err);
    }
}

function renderAnalyticsChart() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#475569';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(71, 85, 105, 0.08)';

    // Primary vs. Secondary Findings Comparison Chart for Super Admin
    const ctxCompare = document.getElementById('chartPrimaryVsSecondaryAdmin');
    if (ctxCompare) {
        if (chartPrimaryVsSecondaryAdminInstance) chartPrimaryVsSecondaryAdminInstance.destroy();

        const categories = ['OSA', 'Insomnia', 'Hypersomnia', 'Circadian', 'Others / None'];
        const primaryCounts = { OSA: 0, Insomnia: 0, Hypersomnia: 0, Circadian: 0, 'Others / None': 0 };
        const secondaryCounts = { OSA: 0, Insomnia: 0, Hypersomnia: 0, Circadian: 0, 'Others / None': 0 };

        allPatients.filter(p => p.status === 'completed').forEach(p => {
            const pLabel = (p.primary_finding_label || '').toLowerCase();
            if (pLabel.includes('apnea') || pLabel.includes('osa')) primaryCounts.OSA++;
            else if (pLabel.includes('insomnia')) primaryCounts.Insomnia++;
            else if (pLabel.includes('hypersomnia')) primaryCounts.Hypersomnia++;
            else if (pLabel.includes('circadian')) primaryCounts.Circadian++;
            else primaryCounts['Others / None']++;

            const sVal = p.secondary_findings || '';
            if (sVal.includes('Obstructive Sleep Apnea') || sVal.includes('OSA')) secondaryCounts.OSA++;
            else if (sVal.includes('Insomnia')) secondaryCounts.Insomnia++;
            else if (sVal.includes('Hypersomnia')) secondaryCounts.Hypersomnia++;
            else if (sVal.includes('Circadian')) secondaryCounts.Circadian++;
            else secondaryCounts['Others / None']++;
        });

        const fontObj = { family: "'Inter', sans-serif", size: 12 };

        chartPrimaryVsSecondaryAdminInstance = new Chart(ctxCompare.getContext('2d'), {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [
                    {
                        label: 'Primary Screening Diagnoses',
                        data: Object.values(primaryCounts),
                        backgroundColor: '#6366f1',
                        borderRadius: 6,
                        barPercentage: 0.7,
                        categoryPercentage: 0.6
                    },
                    {
                        label: 'Secondary Post-Study Findings',
                        data: Object.values(secondaryCounts),
                        backgroundColor: '#10b981',
                        borderRadius: 6,
                        barPercentage: 0.7,
                        categoryPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: textColor, font: fontObj }, grid: { display: false } },
                    y: { ticks: { color: textColor, font: fontObj, stepSize: 1 }, grid: { color: gridColor } }
                },
                plugins: {
                    legend: { labels: { color: textColor, font: fontObj } }
                }
            }
        });
    }
}

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

/* Export All Patients to Excel button */
const btnAdminExportExcel = document.getElementById('btnAdminExportExcel');
if (btnAdminExportExcel) {
    btnAdminExportExcel.addEventListener('click', async () => {
        btnAdminExportExcel.disabled = true;
        const originalText = btnAdminExportExcel.innerHTML;
        btnAdminExportExcel.innerHTML = '<i class="bi bi-hourglass-split"></i> Exporting...';

        try {
            const token = localStorage.getItem('aurora_token');
            const headers = { 'Bypass-Tunnel-Remainder': 'true' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE}/api/patients/export/csv`, {
                method: 'GET',
                headers,
                credentials: 'include'
            });

            if (!res.ok) {
                throw new Error('Failed to download clinic export file.');
            }

            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `Aurora_All_Clinic_Screenings_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            console.error('Admin export error:', err);
            alert('Failed to export clinic records: ' + err.message);
        } finally {
            btnAdminExportExcel.disabled = false;
            btnAdminExportExcel.innerHTML = originalText;
        }
    });
}

/* ─── Direct Inline Editing Handlers (Super Admin Table) ─── */
window.handleSecondaryInlineChange = function(patientId) {
    const selectEl = document.getElementById(`secondary_select_${patientId}`);
    if (!selectEl) return;

    if (selectEl.value === 'Others') {
        const p = allPatients.find(x => x.id === patientId);
        const defaultVal = (p && p.secondary_findings && !['Obstructive Sleep Apnea (OSA)', 'Insomnia', 'Hypersomnia', 'Circadian Rhythm Disorder'].includes(p.secondary_findings)) ? p.secondary_findings : '';
        const customVal = prompt('Enter custom Secondary Finding for this patient:', defaultVal);
        if (customVal !== null && customVal.trim()) {
            selectEl.setAttribute('data-custom', customVal.trim());
        } else if (!defaultVal) {
            selectEl.value = '';
        }
    }
    saveStudyInline(patientId);
};

window.saveStudyInline = async function(patientId) {
    const ahiEl = document.getElementById(`ahi_input_${patientId}`);
    const secEl = document.getElementById(`secondary_select_${patientId}`);
    const commentsEl = document.getElementById(`comments_input_${patientId}`);

    if (!ahiEl || !secEl || !commentsEl) return;

    const ahi = ahiEl.value.trim();
    let secondary = secEl.value;
    if (secondary === 'Others') {
        secondary = secEl.getAttribute('data-custom') || 'Others';
    }
    const admin_comments = commentsEl.value.trim();

    try {
        const res = await fetch(`${API_BASE}/api/admin/patients/${patientId}/study-results`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            credentials: 'include',
            body: JSON.stringify({ ahi, secondary_findings: secondary, admin_comments })
        });

        const data = await res.json();
        if (data.success) {
            const p = allPatients.find(x => x.id === patientId);
            if (p) {
                p.ahi = ahi;
                p.secondary_findings = secondary;
                p.admin_comments = admin_comments;
            }
            ahiEl.style.borderColor = '#10b981';
            secEl.style.borderColor = '#10b981';
            commentsEl.style.borderColor = '#10b981';
            setTimeout(() => {
                ahiEl.style.borderColor = '';
                secEl.style.borderColor = '';
                commentsEl.style.borderColor = '';
            }, 1000);
        }
    } catch (err) {
        console.error('Inline save error:', err);
    }
};

/* ─── Edit Patient Modal ─── */
window.openEditPatientModal = function(patientId) {
    const p = allPatients.find(item => String(item.id) === String(patientId));
    if (!p) return;

    document.getElementById('editPatientId').value = p.id;
    document.getElementById('editPatientName').value = p.full_name || '';
    document.getElementById('editPatientPhone').value = p.phone || '';
    document.getElementById('editPatientEmail').value = p.email || '';
    document.getElementById('editPatientReferral').value = p.referral_source || '';
    document.getElementById('editPatientAhi').value = (p.ahi !== undefined && p.ahi !== null) ? p.ahi : '';
    document.getElementById('editPatientComments').value = p.admin_comments || '';

    // Populate doctor select
    const docSelect = document.getElementById('editPatientDoctor');
    if (docSelect) {
        docSelect.innerHTML = '<option value="unassigned">Unassigned</option>';
        allDoctors.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = d.full_name ? `${d.full_name} (${d.username ? '@' + d.username : 'Invited'})` : `@${d.username || 'Doctor'}`;
            if (String(d.id) === String(p.doctor_id)) opt.selected = true;
            docSelect.appendChild(opt);
        });
    }

    // Populate secondary select
    const secSelect = document.getElementById('editPatientSecondary');
    if (secSelect) {
        const presetOptions = ['Obstructive Sleep Apnea (OSA)', 'Insomnia', 'Hypersomnia', 'Circadian Rhythm Disorder'];
        const secVal = p.secondary_findings || '';
        if (presetOptions.includes(secVal) || !secVal) {
            secSelect.value = secVal;
        } else {
            secSelect.value = 'Others';
        }
    }

    const modal = document.getElementById('editPatientModal');
    if (modal) modal.style.display = 'flex';
};

function closeEditPatientModal() {
    const modal = document.getElementById('editPatientModal');
    if (modal) modal.style.display = 'none';
}

const closeEditBtn = document.getElementById('closeEditPatientModal');
if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditPatientModal);

const cancelEditBtn = document.getElementById('btnCancelEditPatient');
if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditPatientModal);

const editPatientForm = document.getElementById('editPatientForm');
if (editPatientForm) {
    editPatientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const patientId = document.getElementById('editPatientId').value;
        const btnSave = document.getElementById('btnSaveEditPatient');

        btnSave.disabled = true;
        btnSave.textContent = 'Saving...';

        const docVal = document.getElementById('editPatientDoctor') ? document.getElementById('editPatientDoctor').value : undefined;

        const payload = {
            full_name: document.getElementById('editPatientName').value.trim(),
            phone: document.getElementById('editPatientPhone').value.trim(),
            email: document.getElementById('editPatientEmail').value.trim(),
            referral_source: document.getElementById('editPatientReferral').value.trim(),
            doctor_id: docVal,
            ahi: document.getElementById('editPatientAhi').value.trim(),
            secondary_findings: document.getElementById('editPatientSecondary').value,
            admin_comments: document.getElementById('editPatientComments').value.trim()
        };

        try {
            const res = await fetch(`${API_BASE}/api/patients/${patientId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update patient details');

            alert('Patient details updated successfully!');
            closeEditPatientModal();
            await loadAllPatients();

        } catch (err) {
            alert('Error updating patient: ' + err.message);
        } finally {
            btnSave.disabled = false;
            btnSave.textContent = 'Save Changes';
        }
    });
}

checkAdminAuth();
