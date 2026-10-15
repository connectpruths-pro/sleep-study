/* ═══════════════════════════════════════════════
   DASHBOARD.JS — Aurora Sleep Disorder Screening Patient Dashboard
   ═══════════════════════════════════════════════ */

const tableBody = document.getElementById('patientTableBody');
const isProduction = window.location.hostname.includes('aurorasleepscreening.com') || window.location.hostname.includes('aurora-sleep-screening') || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

function getAuthHeaders() {
    const token = localStorage.getItem('aurora_token');
    const headers = { 'Bypass-Tunnel-Remainder': 'true' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}
const searchInput = document.getElementById('searchInput');
const emptyState = document.getElementById('emptyState');
const patientTable = document.getElementById('patientTable');
const statTotal = document.getElementById('statTotal');
const statCompleted = document.getElementById('statCompleted');
const statIncomplete = document.getElementById('statIncomplete');

let allPatients = [];

// Chart instances
let chartStatusInstance = null;
let chartDisorderInstance = null;
let chartRiskInstance = null;
let chartComorbidInstance = null;
let chartCircadianInstance = null;
let chartPrimaryVsSecondaryInstance = null;

/* ─── Theme Toggle (persists via localStorage) ─── */
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
        // Re-draw charts when theme changes to update label colors if needed
        updateCharts(allPatients);
    });
})();

/* ─── Tab Navigation ─── */
const tabListBtn = document.getElementById('tabListBtn');
const tabChartsBtn = document.getElementById('tabChartsBtn');
const tabListContent = document.getElementById('tabList');
const tabVisualsContent = document.getElementById('tabVisuals');

tabListBtn.addEventListener('click', () => {
    tabListBtn.classList.add('active');
    tabChartsBtn.classList.remove('active');
    tabListContent.classList.add('active');
    tabVisualsContent.classList.remove('active');
});

tabChartsBtn.addEventListener('click', () => {
    tabChartsBtn.classList.add('active');
    tabListBtn.classList.remove('active');
    tabVisualsContent.classList.add('active');
    tabListContent.classList.remove('active');
    // Ensure all charts render and size correctly inside the visible div
    if (chartStatusInstance) chartStatusInstance.resize();
    if (chartDisorderInstance) chartDisorderInstance.resize();
    if (chartRiskInstance) chartRiskInstance.resize();
    if (chartComorbidInstance) chartComorbidInstance.resize();
    if (chartCircadianInstance) chartCircadianInstance.resize();
});

/* ─── Determine highest risk tier across all disorders ─── */
function getHighestRisk(patient) {
    if (patient.status !== 'completed') return null;

    const tiers = [
        patient.osa_tier,
        patient.insomnia_tier,
        patient.hypersomnia_tier,
        patient.circadian_tier
    ].filter(Boolean);

    if (tiers.includes('High')) return 'High';
    if (tiers.includes('Moderate')) return 'Moderate';
    if (tiers.includes('Low')) return 'Low';
    return null;
}

/* ─── Badge HTML helpers ─── */
function statusBadge(status) {
    if (status === 'completed') {
        return '<span class="badge badge-completed">Completed</span>';
    }
    return '<span class="badge badge-incomplete">Incomplete</span>';
}

function riskBadge(risk) {
    if (!risk) return '<span class="table-muted">—</span>';
    const cls = risk === 'High' ? 'badge-high' : risk === 'Moderate' ? 'badge-moderate' : 'badge-low';
    return `<span class="badge ${cls}">${risk}</span>`;
}

/* ─── Update stats counters & KPIs ─── */
function updateStatsAndKPIs(patients) {
    const total = patients.length;
    const completed = patients.filter(p => p.status === 'completed').length;
    
    statTotal.textContent = total;
    statCompleted.textContent = completed;
    statIncomplete.textContent = total - completed;

    const kpiTotal = document.getElementById('kpiTotal');
    const kpiCompleted = document.getElementById('kpiCompleted');
    if (kpiTotal) kpiTotal.textContent = total;
    if (kpiCompleted) kpiCompleted.textContent = completed;
}

/* ─── Render table rows ─── */
function renderPatients(patients) {
    tableBody.innerHTML = '';

    if (patients.length === 0) {
        patientTable.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    patientTable.style.display = '';
    emptyState.style.display = 'none';

    const fragment = document.createDocumentFragment();

    patients.forEach(p => {
        const risk = getHighestRisk(p);
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';

        tr.addEventListener('click', () => {
            window.location.href = `patient.html?id=${p.id}`;
        });

        let findingSubtext = '';
        if (p.status === 'completed' && (p.primary_finding_label || '').toLowerCase().includes('circadian')) {
            let subtypes = [];
            try {
                subtypes = typeof p.circadian_subtypes === 'string' ? JSON.parse(p.circadian_subtypes) : (p.circadian_subtypes || []);
            } catch(e) {}
            if (subtypes && subtypes.length > 0) {
                findingSubtext = `<div style="font-size: 0.75rem; color: var(--text-hint); margin-top: 2.5px; font-weight: 400;"><i class="bi bi-clock-history"></i> ${subtypes.join(', ')}</div>`;
            }
        }

        const finding = p.status === 'completed'
            ? `<div>${p.primary_finding_label || '—'}${findingSubtext}</div>`
            : '<span class="table-muted">—</span>';

        const dateStr = p.created_at
            ? new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—';

        // Post-Study Inline Controls (Clinician Dashboard Table)
        const currentAhi = p.ahi !== undefined && p.ahi !== null ? p.ahi : '';
        const ahiInputHtml = `<input type="text" id="ahi_input_${p.id}" class="input" style="width:75px; padding: 4px 6px; font-size: 0.82rem; height: 32px; background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-primary);" placeholder="Enter AHI" value="${currentAhi}" onclick="event.stopPropagation()" onblur="saveStudyInline(${p.id})">`;

        const presetOptions = ['Obstructive Sleep Apnea (OSA)', 'Insomnia', 'Hypersomnia', 'Circadian Rhythm Disorder'];
        const secVal = p.secondary_findings || '';
        const isOther = secVal && !presetOptions.includes(secVal);

        const secondarySelectHtml = `
            <select id="secondary_select_${p.id}" class="input" style="padding: 4px 6px; font-size: 0.82rem; height: 32px; max-width: 140px; background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-primary);" onclick="event.stopPropagation()" onchange="handleSecondaryInlineChange(${p.id})" data-custom="${isOther ? secVal.replace(/"/g, '&quot;') : ''}">
                <option value="" ${!secVal ? 'selected' : ''}>None</option>
                <option value="Obstructive Sleep Apnea (OSA)" ${secVal === 'Obstructive Sleep Apnea (OSA)' ? 'selected' : ''}>Obstructive Sleep Apnea (OSA)</option>
                <option value="Insomnia" ${secVal === 'Insomnia' ? 'selected' : ''}>Insomnia</option>
                <option value="Hypersomnia" ${secVal === 'Hypersomnia' ? 'selected' : ''}>Hypersomnia</option>
                <option value="Circadian Rhythm Disorder" ${secVal === 'Circadian Rhythm Disorder' ? 'selected' : ''}>Circadian Rhythm Disorder</option>
                <option value="Others" ${isOther ? 'selected' : ''}>${isOther ? `Others (${secVal})` : 'Others'}</option>
            </select>
        `;

        const commentsVal = p.admin_comments || '';
        const commentsInputHtml = `<textarea id="comments_input_${p.id}" class="input" style="width:140px; height: 42px; padding: 4px 6px; font-size: 0.8rem; resize: vertical; background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-primary);" placeholder="Add comments..." onclick="event.stopPropagation()" onblur="saveStudyInline(${p.id})">${commentsVal}</textarea>`;

        // Table cells
        tr.innerHTML = `
          <td class="cell-name" style="font-weight: 600;">${p.full_name || 'Unnamed Patient'}</td>
          <td class="cell-phone">${p.phone || '—'}</td>
          <td>${statusBadge(p.status)}</td>
          <td class="cell-finding">${finding}</td>
          <td>${ahiInputHtml}</td>
          <td>${secondarySelectHtml}</td>
          <td>${commentsInputHtml}</td>
          <td>${riskBadge(risk)}</td>
          <td class="cell-date">${dateStr}</td>
        `;

        // Action cell (PDF Report & Delete buttons)
        const actionTd = document.createElement('td');
        actionTd.style.textAlign = 'center';
        actionTd.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent row navigation when clicking actions cell
        });

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary btn-sm';
        editBtn.style.cssText = 'padding: 4px 10px; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px; border-radius: 6px; margin-right: 6px; color: var(--accent); cursor: pointer;';
        editBtn.innerHTML = '<i class="bi bi-pencil-square"></i> Edit';
        editBtn.title = 'Edit Patient Details';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditPatientModal(p.id);
        });

        const pdfBtn = document.createElement('a');
        pdfBtn.className = 'btn btn-secondary btn-sm';
        pdfBtn.style.cssText = 'padding: 4px 10px; font-size: 0.78rem; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; border-radius: 6px; margin-right: 6px;';
        pdfBtn.href = `${API_BASE}/api/pdf/${p.id}`;
        pdfBtn.target = '_blank';
        pdfBtn.innerHTML = '<i class="bi bi-file-earmark-pdf"></i> Report';
        pdfBtn.title = 'View & Download PDF Patient Report';
        pdfBtn.addEventListener('click', (e) => e.stopPropagation());

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete-row';
        deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
        deleteBtn.title = 'Delete Record';
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const name = p.full_name || 'Unnamed Patient';
            const confirmed = confirm(`Are you sure you want to permanently delete patient "${name}"? All screening results and answers will be deleted.`);
            if (confirmed) {
                try {
                    const res = await fetch(`${API_BASE}/api/patients/${p.id}`, {
                        method: 'DELETE',
                        headers: getAuthHeaders(),
                        credentials: 'include'
                    });
                    const resJson = await res.json();
                    if (res.ok && resJson.success) {
                        alert('Patient record deleted successfully.');
                        allPatients = allPatients.filter(x => String(x.id) !== String(p.id));
                        updateStatsAndKPIs(allPatients);
                        renderPatients(allPatients);
                        updateCharts(allPatients);
                    } else {
                        alert('Failed to delete patient: ' + (resJson.message || 'Server error'));
                    }
                } catch (err) {
                    console.error('Delete error:', err);
                    alert('An error occurred while deleting the patient record.');
                }
            }
        });

        actionTd.appendChild(editBtn);
        actionTd.appendChild(pdfBtn);
        actionTd.appendChild(deleteBtn);
        tr.appendChild(actionTd);
        fragment.appendChild(tr);
    });

    tableBody.appendChild(fragment);
}

/* ─── Unified search and filter ─── */
function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    const disorder = document.getElementById('filterDisorder').value;
    const status = document.getElementById('filterStatus').value;

    const filtered = allPatients.filter(p => {
        // 1. Search Query filter
        const name = (p.full_name || '').toLowerCase();
        const phone = (p.phone || '').toLowerCase();
        const matchesQuery = !query || name.includes(query) || phone.includes(query);

        // 2. Status filter
        const matchesStatus = status === 'all' || p.status === status;

        // 3. Disorder/Comorbidity filter
        let matchesDisorder = true;
        if (disorder !== 'all') {
            if (p.status !== 'completed') {
                matchesDisorder = false; // incomplete screenings do not have findings
            } else {
                const label = (p.primary_finding_label || '').toLowerCase();
                const code = (p.primary_finding_code || '').toLowerCase();
                
                // Parse comorbidities
                let comorCodes = [];
                try {
                    const parsed = typeof p.comorbidities === 'string' ? JSON.parse(p.comorbidities) : (p.comorbidities || []);
                    comorCodes = parsed.map(c => (c.code || '').toLowerCase());
                } catch(e) {
                    console.error("Failed to parse comorbidities", e);
                }

                if (disorder === 'osa') {
                    matchesDisorder = label.includes('apnea') || code.includes('osa');
                } else if (disorder === 'insomnia') {
                    matchesDisorder = label.includes('insomnia') || code.includes('insomnia');
                } else if (disorder === 'hypersomnia') {
                    matchesDisorder = label.includes('hypersomnia') || code.includes('hypersomnia');
                } else if (disorder === 'circadian') {
                    matchesDisorder = label.includes('circadian') || code.includes('circadian');
                } else if (disorder === 'comorbid') {
                    matchesDisorder = comorCodes.length > 0;
                } else if (disorder === 'comisa') {
                    matchesDisorder = comorCodes.includes('comisa');
                } else if (disorder === 'swsd') {
                    matchesDisorder = comorCodes.includes('swsd');
                }
            }
        }

        return matchesQuery && matchesStatus && matchesDisorder;
    });

    renderPatients(filtered);
}

searchInput.addEventListener('input', applyFilters);
document.getElementById('filterDisorder').addEventListener('change', applyFilters);
document.getElementById('filterStatus').addEventListener('change', applyFilters);

/* ─── Visual Analytics (Chart.js Rendering) ─── */
function updateCharts(patients) {
    const total = patients.length;
    const completedCount = patients.filter(p => p.status === 'completed').length;
    const incompleteCount = total - completedCount;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#475569';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(71, 85, 105, 0.08)';

    // Chart Options Helper
    const chartFont = { family: 'Inter', weight: '600', size: 11 };

    // 1. Status Chart (Doughnut)
    const ctxStatus = document.getElementById('chartStatus').getContext('2d');
    if (chartStatusInstance) chartStatusInstance.destroy();
    chartStatusInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Incomplete'],
            datasets: [{
                data: [completedCount, incompleteCount],
                backgroundColor: ['#16a34a', '#dc2626'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, font: chartFont }
                }
            }
        }
    });

    // 2. Disorder Chart (Pie)
    const completedPatients = patients.filter(p => p.status === 'completed');
    const disorderCounts = {
        'OSA': 0,
        'Insomnia': 0,
        'Hypersomnia': 0,
        'Circadian': 0,
        'No Concerns': 0
    };

    completedPatients.forEach(p => {
        const label = p.primary_finding_label || '';
        if (label.includes('Apnea') || label.includes('OSA')) {
            disorderCounts['OSA']++;
        } else if (label.includes('Insomnia')) {
            disorderCounts['Insomnia']++;
        } else if (label.includes('Hypersomnia')) {
            disorderCounts['Hypersomnia']++;
        } else if (label.includes('Circadian')) {
            disorderCounts['Circadian']++;
        } else {
            disorderCounts['No Concerns']++;
        }
    });

    const ctxDisorder = document.getElementById('chartDisorder').getContext('2d');
    if (chartDisorderInstance) chartDisorderInstance.destroy();
    chartDisorderInstance = new Chart(ctxDisorder, {
        type: 'pie',
        data: {
            labels: Object.keys(disorderCounts),
            datasets: [{
                data: Object.values(disorderCounts),
                backgroundColor: ['#143C8C', '#6A1B9A', '#B0127D', '#818CF8', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, font: chartFont }
                }
            }
        }
    });

    // 3. Risk Level Breakdown (Bar)
    const riskCounts = { High: 0, Moderate: 0, Low: 0 };
    completedPatients.forEach(p => {
        const risk = getHighestRisk(p);
        if (risk === 'High') riskCounts.High++;
        else if (risk === 'Moderate') riskCounts.Moderate++;
        else if (risk === 'Low') riskCounts.Low++;
    });

    const ctxRisk = document.getElementById('chartRisk').getContext('2d');
    if (chartRiskInstance) chartRiskInstance.destroy();
    chartRiskInstance = new Chart(ctxRisk, {
        type: 'bar',
        data: {
            labels: ['High Risk', 'Moderate Risk', 'Low Risk'],
            datasets: [{
                label: 'Patients',
                data: [riskCounts.High, riskCounts.Moderate, riskCounts.Low],
                backgroundColor: ['#dc2626', '#d97706', '#16a34a'],
                borderRadius: 8,
                barThickness: 32
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { 
                    ticks: { color: textColor, font: chartFont }, 
                    grid: { display: false } 
                },
                y: { 
                    ticks: { color: textColor, font: chartFont, stepSize: 1 }, 
                    grid: { color: gridColor } 
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    // 4. Comorbidities Co-occurrence Chart (Horizontal Bar for better readability of labels)
    const comorbidCounts = {
        'COMISA (Insomnia + OSA)': 0,
        'OSA + Hypersomnia': 0,
        'Circadian + Insomnia': 0,
        'SWSD': 0
    };
    
    completedPatients.forEach(p => {
        let codes = [];
        try {
            const parsed = typeof p.comorbidities === 'string' ? JSON.parse(p.comorbidities) : (p.comorbidities || []);
            codes = parsed.map(c => c.code || '');
        } catch(e) {
            console.error("Failed to parse comorbidities for chart", e);
        }
        
        codes.forEach(code => {
            if (code === 'COMISA') comorbidCounts['COMISA (Insomnia + OSA)']++;
            else if (code === 'OSA-Hypersomnia') comorbidCounts['OSA + Hypersomnia']++;
            else if (code === 'Circadian-Insomnia') comorbidCounts['Circadian + Insomnia']++;
            else if (code === 'SWSD') comorbidCounts['SWSD']++;
        });
    });

    const ctxComorbid = document.getElementById('chartComorbid').getContext('2d');
    if (chartComorbidInstance) chartComorbidInstance.destroy();
    chartComorbidInstance = new Chart(ctxComorbid, {
        type: 'bar',
        data: {
            labels: Object.keys(comorbidCounts),
            datasets: [{
                label: 'Patient Count',
                data: Object.values(comorbidCounts),
                backgroundColor: ['#6A1B9A', '#143C8C', '#B0127D', '#818CF8'],
                borderRadius: 6,
                barThickness: 20
            }]
        },
        options: {
            indexAxis: 'y', // horizontal bar chart
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { 
                    ticks: { color: textColor, font: chartFont, stepSize: 1 }, 
                    grid: { color: gridColor } 
                },
                y: { 
                    ticks: { color: textColor, font: chartFont }, 
                    grid: { display: false } 
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    // 5. Circadian Subtype Chart (Vertical Bar)
    const circadianCounts = {
        'Delayed Sleep Phase': 0,
        'Advanced Sleep Phase': 0,
        'Irregular Sleep-Wake': 0,
        'Shift Work Sleep Disorder': 0
    };

    completedPatients.forEach(p => {
        let subtypes = [];
        try {
            subtypes = typeof p.circadian_subtypes === 'string' ? JSON.parse(p.circadian_subtypes) : (p.circadian_subtypes || []);
        } catch(e) {
            console.error("Failed to parse circadian subtypes for chart", e);
        }

        subtypes.forEach(s => {
            if (s.includes('Delayed')) circadianCounts['Delayed Sleep Phase']++;
            else if (s.includes('Advanced')) circadianCounts['Advanced Sleep Phase']++;
            else if (s.includes('Irregular')) circadianCounts['Irregular Sleep-Wake']++;
            else if (s.includes('Shift Work') || s.includes('SWSD')) circadianCounts['Shift Work Sleep Disorder']++;
        });
    });

    const ctxCircadian = document.getElementById('chartCircadian').getContext('2d');
    if (chartCircadianInstance) chartCircadianInstance.destroy();
    chartCircadianInstance = new Chart(ctxCircadian, {
        type: 'bar',
        data: {
            labels: Object.keys(circadianCounts),
            datasets: [{
                label: 'Patient Count',
                data: Object.values(circadianCounts),
                backgroundColor: ['#818CF8', '#143C8C', '#B0127D', '#6A1B9A'],
                borderRadius: 6,
                barThickness: 24
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { 
                    ticks: { color: textColor, font: chartFont }, 
                    grid: { display: false } 
                },
                y: { 
                    ticks: { color: textColor, font: chartFont, stepSize: 1 }, 
                    grid: { color: gridColor } 
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

/* ─── Load patients from API ─── */
async function loadPatients() {
    try {
        const res = await fetch(`${API_BASE}/api/patients`, { headers: getAuthHeaders(), credentials: 'include' });
        const data = await res.json();
        if (res.status === 401) {
            window.location.href = 'login.html';
            return;
        }
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load');

        allPatients = data.patients;
        updateStatsAndKPIs(allPatients);
        renderPatients(allPatients);
        updateCharts(allPatients);
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = '<tr><td colspan="7" class="dashboard-empty">Error loading patients. Check server connection.</td></tr>';
    }
}
async function checkAuthAndInit() {
    try {
        const res = await fetch(`${API_BASE}/api/auth/check`, { headers: getAuthHeaders(), credentials: 'include' });
        const data = await res.json();
        if (!data.authenticated) {
            window.location.href = 'login.html';
            return;
        }

        const superAdminBadge = document.getElementById('superAdminHeaderBadge');
        if (superAdminBadge) {
            superAdminBadge.style.display = (data.role === 'super_admin') ? 'inline-flex' : 'none';
        }

        const userDisplay = document.getElementById('userDisplay');
        const profileDropdown = document.getElementById('profileDropdown');
        if (userDisplay && profileDropdown) {
            userDisplay.innerHTML = `<span style="background: var(--bg-card); border: 1px solid var(--border-card); padding: 5px 14px; border-radius: 20px; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;"><span style="color: var(--accent); font-weight: 800; font-size: 1.15rem; margin-right: -2px;">+</span> <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${data.fullName || data.username}</span></span>`;

            userDisplay.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = profileDropdown.style.display === 'none';
                if (isHidden) {
                    profileDropdown.style.display = 'block';
                    fetchProfileDetails();
                } else {
                    profileDropdown.style.display = 'none';
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.profile-dropdown-wrapper')) {
                    profileDropdown.style.display = 'none';
                }
            });
        }

        async function fetchProfileDetails() {
            try {
                profileDropdown.innerHTML = `<div style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 10px;">Loading profile...</div>`;
                const profileRes = await fetch(`${API_BASE}/api/auth/profile`, { headers: getAuthHeaders(), credentials: 'include' });
                const profileData = await profileRes.json();
                if (!profileData.success) {
                    profileDropdown.innerHTML = `<div style="text-align: center; color: var(--danger); font-size: 0.85rem; padding: 10px;">Error loading profile.</div>`;
                    return;
                }

                const u = profileData.user;
                const isSuper = u.role === 'super_admin';
                const roleLabel = isSuper ? 'SUPER ADMIN' : 'DOCTOR';
                const specLabel = isSuper ? 'Platform Administrator' : (u.specialization || 'Sleep Specialist');
                const linkVal = `${window.location.origin}/?doc=${u.doctor_code || ''}`;

                profileDropdown.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 12px; font-family: var(--font);">
                        <div style="display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border-card); padding-bottom: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--accent-glow); border: 1px solid var(--accent); display: flex; align-items: center; justify-content: center; color: var(--accent); font-weight: 800; font-size: 1.25rem;">
                                +
                            </div>
                            <div style="display: flex; flex-direction: column; min-width: 0; text-align: left;">
                                <span style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.full_name || u.username}</span>
                                <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${specLabel}</span>
                            </div>
                        </div>
                        <div style="font-size: 0.8rem; display: flex; flex-direction: column; gap: 6px; color: var(--text-secondary); text-align: left;">
                            <div style="display: flex; justify-content: space-between; gap: 8px;"><span style="font-weight: 600; color: var(--text-primary);">Role:</span> <span>${roleLabel}</span></div>
                            <div style="display: flex; justify-content: space-between; gap: 8px; min-width: 0;"><span style="font-weight: 600; color: var(--text-primary);">Username:</span> <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.username}</span></div>
                            <div style="display: flex; justify-content: space-between; gap: 8px; min-width: 0;"><span style="font-weight: 600; color: var(--text-primary);">Email:</span> <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${u.email || ''}">${u.email || '—'}</span></div>
                            <div style="display: flex; justify-content: space-between; gap: 8px;"><span style="font-weight: 600; color: var(--text-primary);">Phone:</span> <span>${u.phone || '—'}</span></div>
                        </div>
                        ${isSuper ? '' : `
                        <div style="border-top: 1px solid var(--border-card); padding-top: 12px; display: flex; flex-direction: column; gap: 6px; text-align: left;">
                            <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                                <i class="bi bi-link-45deg" style="color: var(--accent); font-size: 1rem;"></i> Patient Screening Link
                            </span>
                            <div style="display: flex; gap: 6px; width: 100%;">
                                <input type="text" id="dropdownPatientLink" readonly value="${linkVal}" style="flex: 1; font-family: monospace; font-size: 0.75rem; background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-primary); padding: 6px 10px; border-radius: var(--radius-xs); min-width: 0;" />
                                <button id="btnDropdownCopy" class="btn btn-primary btn-sm" style="padding: 6px 10px; font-size: 0.75rem; display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-xs); cursor: pointer;">
                                    <i class="bi bi-copy"></i>
                                </button>
                            </div>
                        </div>
                        `}
                        <div style="border-top: 1px solid var(--border-card); padding-top: 10px; display: flex; justify-content: flex-end; gap: 8px;">
                            ${isSuper ? `
                            <a href="admin.html" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 6px 12px; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="bi bi-shield-lock"></i> Admin Portal
                            </a>
                            ` : `
                            <a href="profile.html" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 6px 12px; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="bi bi-gear"></i> Edit Profile
                            </a>
                            `}
                        </div>
                    </div>
                `;

                const btnDropdownCopy = profileDropdown.querySelector('#btnDropdownCopy');
                if (btnDropdownCopy) {
                    btnDropdownCopy.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const linkInput = profileDropdown.querySelector('#dropdownPatientLink');
                        if (linkInput) {
                            navigator.clipboard.writeText(linkInput.value).then(() => {
                                const originalText = btnDropdownCopy.innerHTML;
                                btnDropdownCopy.innerHTML = '<i class="bi bi-check-lg" style="color: var(--success-text);"></i>';
                                setTimeout(() => { btnDropdownCopy.innerHTML = originalText; }, 1500);
                            }).catch(() => {
                                linkInput.select();
                                document.execCommand('copy');
                                alert('Link copied!');
                            });
                        }
                    });
                }
            } catch (err) {
                console.error(err);
                profileDropdown.innerHTML = `<div style="text-align: center; color: var(--danger); font-size: 0.85rem; padding: 10px;">Failed to fetch profile.</div>`;
            }
        }

        loadPatients();
    } catch (err) {
        console.error(err);
        window.location.href = 'login.html';
    }
}

// Bind Logout button
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        try {
            await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
            window.location.href = 'login.html';
        } catch (err) {
            console.error('Logout error:', err);
            window.location.href = 'login.html';
        }
    });
}

// Bind Export to Excel button
const btnExportExcel = document.getElementById('btnExportExcel');
if (btnExportExcel) {
    btnExportExcel.addEventListener('click', async () => {
        btnExportExcel.disabled = true;
        const originalText = btnExportExcel.innerHTML;
        btnExportExcel.innerHTML = '<i class="bi bi-hourglass-split"></i> Exporting...';

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
                throw new Error('Failed to download export file.');
            }

            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `Aurora_Doctor_Screenings_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to export patient records: ' + err.message);
        } finally {
            btnExportExcel.disabled = false;
            btnExportExcel.innerHTML = originalText;
        }
    });
}

/* ─── Direct Inline Editing Handlers (Doctor Clinician Dashboard Table) ─── */
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
        const res = await fetch(`${API_BASE}/api/patients/${patientId}/study-results`, {
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

const closeEditBtnDashboard = document.getElementById('closeEditPatientModal');
if (closeEditBtnDashboard) closeEditBtnDashboard.addEventListener('click', closeEditPatientModal);

const cancelEditBtnDashboard = document.getElementById('btnCancelEditPatient');
if (cancelEditBtnDashboard) cancelEditBtnDashboard.addEventListener('click', closeEditPatientModal);

const editPatientFormDashboard = document.getElementById('editPatientForm');
if (editPatientFormDashboard) {
    editPatientFormDashboard.addEventListener('submit', async (e) => {
        e.preventDefault();
        const patientId = document.getElementById('editPatientId').value;
        const btnSave = document.getElementById('btnSaveEditPatient');

        btnSave.disabled = true;
        btnSave.textContent = 'Saving...';

        const payload = {
            full_name: document.getElementById('editPatientName').value.trim(),
            phone: document.getElementById('editPatientPhone').value.trim(),
            email: document.getElementById('editPatientEmail').value.trim(),
            referral_source: document.getElementById('editPatientReferral').value.trim(),
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
            await fetchPatients();

        } catch (err) {
            alert('Error updating patient: ' + err.message);
        } finally {
            btnSave.disabled = false;
            btnSave.textContent = 'Save Changes';
        }
    });
}

checkAuthAndInit();
