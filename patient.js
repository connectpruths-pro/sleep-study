const container = document.getElementById('patientContent');
const isProduction = window.location.hostname.includes('aurorasleepscreening.com') || window.location.hostname.includes('aurora-sleep-screening') || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

function getAuthHeaders() {
    const token = localStorage.getItem('aurora_token');
    const headers = { 'Bypass-Tunnel-Remainder': 'true' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

// Get ID from URL
const params = new URLSearchParams(window.location.search);
const patientId = params.get('id');

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
    });
})();

async function loadPatient() {
    try {
        const res = await fetch(`${API_BASE}/api/patients/${patientId}`, {
            headers: getAuthHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('API failed');

        const data = await res.json();
        if (!data.success) throw new Error('Patient not found');

        const p = data.data;

        const recommendations = p.ai_recommendations;
        renderPatient(p, recommendations);

    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div class="clinical-empty">
                <p>Unable to load patient data.</p>
                <a href="dashboard.html" class="clinical-back-link">← Back to Dashboard</a>
            </div>`;
    }
}

/* ── Helpers ── */
function safe(val, suffix) {
    if (val === null || val === undefined || val === '') return '—';
    return suffix ? `${val} ${suffix}` : val;
}

function riskBadgeClass(tier) {
    if (!tier) return 'badge badge-low';
    const t = tier.toLowerCase();
    if (t === 'high') return 'badge badge-high';
    if (t === 'moderate') return 'badge badge-moderate';
    return 'badge badge-low';
}

function statusBadge(status) {
    if (!status) return '<span class="badge badge-incomplete">Unknown</span>';
    const s = status.toLowerCase();
    if (s === 'completed') return '<span class="badge badge-completed">Completed</span>';
    return '<span class="badge badge-incomplete">Incomplete</span>';
}

function primaryRisk(p) {
    const tiers = [p.osa_tier, p.insomnia_tier, p.hypersomnia_tier, p.circadian_tier].filter(Boolean);
    if (tiers.some(t => t === 'High')) return 'High';
    if (tiers.some(t => t === 'Moderate')) return 'Moderate';
    return 'Low';
}

function formatReportDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function findingSubtext(risk) {
    if (risk === 'High') return 'Likely clinically significant based on reported symptoms and risk factors.';
    if (risk === 'Moderate') return 'Warrants further evaluation based on reported symptom profile.';
    return 'Low overall risk based on current screening responses.';
}

function formatRecommendations(text) {
    if (!text) return [];
    return text
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            let clean = line.replace(/^[\*\-\u2022]\s*/, '').replace(/^\d+\.\s*/, '');
            clean = clean.replace(/\*\*/g, '');
            return clean.trim();
        })
        .filter(line => line.length > 0);
}

const QUESTION_GROUPS = [
    {
        title: "Demographics & Physical Profile",
        icon: "person",
        fields: {
            age: "Age",
            gender: "Gender",
            menstrual: "Menstrual Cycle Status",
            height: "Height (cm)",
            weight: "Weight (kg)",
            neck_raw: "Neck Circumference (cm)",
            medical: "Known Medical Conditions",
            consumption: "Current Consumption"
        }
    },
    {
        title: "Sleep Schedule & Work",
        icon: "calendar3",
        fields: {
            work: "Employment Type",
            schedule: "Work Schedule",
            sleep_start: "Target Bedtime",
            wake_time: "Target Wake Time",
            avg_sleep: "Average Sleep Duration"
        }
    },
    {
        title: "Subjective Sleep Quality",
        icon: "moon-stars",
        fields: {
            sleep_satisfaction: "Sleep Quality Satisfaction",
            daytime_satisfaction: "Daytime Alertness Satisfaction",
            daytime_sleepy: "Daytime Sleepiness",
            sleepy_freq: "Daytime Sleepiness Frequency",
            duration: "Duration of Symptoms"
        }
    },
    {
        title: "Sleep Apnea Symptoms (OSA)",
        icon: "lungs",
        fields: {
            snoring_gate: "Snoring (Gate)",
            witnessed_apnea: "Witnessed Apnea (Breathing Pauses)",
            loud_snoring: "Loud Snoring",
            night_awakenings: "Gasping/Choking Night Awakenings",
            morning_headache: "Morning Headaches",
            dry_mouth: "Dry Mouth Upon Waking"
        }
    },
    {
        title: "Insomnia Symptoms",
        icon: "alarm",
        fields: {
            insomnia_gate: "Insomnia Gate Flag",
            sleep_latency: "Sleep Latency (Time to Fall Asleep)",
            night_waking: "Frequent Night Awakenings",
            difficulty_back_sleep: "Difficulty Falling Back to Sleep"
        }
    },
    {
        title: "Hypersomnia Symptoms",
        icon: "emoji-expressionless",
        fields: {
            hypersomnia_gate: "Hypersomnia Gate Flag",
            difficulty_waking: "Difficulty Waking Up",
            nap_freq: "Daytime Nap Frequency",
            nap_duration: "Average Nap Duration",
            nap_refreshed: "Feeling Refreshed After Naps"
        }
    },
    {
        title: "Circadian Rhythm Symptoms",
        icon: "globe",
        fields: {
            circadian_gate: "Circadian Rhythm Gate Flag",
            chronotype: "Subjective Chronotype",
            brain_fog: "Morning Brain Fog",
            weekend_shift: "Weekend Sleep Schedule Shift"
        }
    }
];

function renderAnswersSection(p) {
    const groupHtml = [];

    QUESTION_GROUPS.forEach(group => {
        const rows = [];
        for (const [key, label] of Object.entries(group.fields)) {
            const val = p[key];
            let hasAnswer = false;
            let displayVal = '';

            if (val !== null && val !== undefined && val !== '') {
                if (Array.isArray(val)) {
                    if (val.length > 0) {
                        hasAnswer = true;
                        displayVal = val.map(v => v === 'none_above' ? 'None of the above' : v).join(', ');
                    }
                } else {
                    hasAnswer = true;
                    displayVal = val === 'none_above' ? 'None of the above' : val;
                }
            }

            if (hasAnswer) {
                // Style highlights for clinically relevant findings
                let highlightStyle = '';
                const lowerVal = String(displayVal).toLowerCase();
                if (
                    lowerVal === 'yes' || 
                    lowerVal === 'high' || 
                    lowerVal.includes('dissatisfied') || 
                    lowerVal.includes('very sleepy') || 
                    lowerVal.includes('>1 hour') || 
                    lowerVal.includes('3 or more')
                ) {
                    highlightStyle = 'color: #f43f5e; font-weight: 700;'; // Highlight in soft coral red
                }

                rows.push(`
                    <div class="detailed-grid-row">
                        <span class="detailed-label">${label}</span>
                        <span class="detailed-value" style="${highlightStyle}">${displayVal}</span>
                    </div>
                `);
            }
        }

        if (rows.length > 0) {
            groupHtml.push(`
                <div class="detailed-accordion-card">
                    <button class="detailed-accordion-trigger" onclick="toggleAccordion(this)">
                        <span style="display: flex; align-items: center; gap: 10px;">
                            <i class="bi bi-${group.icon}" style="font-size: 1.1rem; color: var(--accent);"></i>
                            <span>${group.title}</span>
                        </span>
                        <span class="accordion-arrow" style="transition: transform 0.3s ease; font-size: 0.8rem; color: var(--text-secondary);">▼</span>
                    </button>
                    <div class="detailed-accordion-content" style="max-height: 0px;">
                        <div style="padding: 18px 24px; border-top: 1px solid var(--border-card);">
                            <div class="detailed-grid">
                                ${rows.join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `);
        }
    });

    if (groupHtml.length === 0) {
        return `<p class="table-muted" style="padding: 12px 0;">No questionnaire responses available.</p>`;
    }

    return `
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 16px;">
            <button onclick="expandAllAccordions(true)" style="background: var(--bg-option); border: 1px solid var(--border-option); color: var(--text-secondary); padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: var(--transition); font-family: var(--font);">📂 Expand All</button>
            <button onclick="expandAllAccordions(false)" style="background: var(--bg-option); border: 1px solid var(--border-option); color: var(--text-secondary); padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: var(--transition); font-family: var(--font);">📁 Collapse All</button>
        </div>
        <div class="accordion-container">${groupHtml.join('')}</div>
    `;
}

function initRadarChart(p) {
    const ctx = document.getElementById('patientRadarChart').getContext('2d');
    
    // Map tiers to numeric values (Low=1, Moderate=2, High=3)
    const tierMap = { 'Low': 1, 'Moderate': 2, 'High': 3 };
    const osaValue = tierMap[p.osa_tier] || 1;
    const insomniaValue = tierMap[p.insomnia_tier] || 1;
    const hypersomniaValue = tierMap[p.hypersomnia_tier] || 1;
    const circadianValue = tierMap[p.circadian_tier] || 1;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(71, 85, 105, 0.08)';
    const textColor = isDark ? '#94A3B8' : '#475569';
    const angleLineColor = isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(71, 85, 105, 0.12)';

    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Sleep Apnea (OSA)', 'Insomnia', 'Hypersomnia', 'Circadian Rhythm'],
            datasets: [{
                label: 'Severity Level',
                data: [osaValue, insomniaValue, hypersomniaValue, circadianValue],
                backgroundColor: isDark ? 'rgba(129, 140, 248, 0.15)' : 'rgba(106, 27, 154, 0.1)',
                borderColor: isDark ? '#818CF8' : '#6A1B9A',
                borderWidth: 2.5,
                pointBackgroundColor: isDark ? '#818CF8' : '#6A1B9A',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: isDark ? '#818CF8' : '#6A1B9A',
                pointRadius: 4.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: angleLineColor },
                    grid: { color: gridColor },
                    pointLabels: {
                        color: textColor,
                        font: { family: 'Inter', weight: '700', size: 11 }
                    },
                    ticks: {
                        color: textColor,
                        backdropColor: 'transparent',
                        stepSize: 1,
                        callback: function(value) {
                            if (value === 1) return 'Low';
                            if (value === 2) return 'Mod';
                            if (value === 3) return 'High';
                            return '';
                        }
                    },
                    min: 0,
                    max: 3.2
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

/* ── Main Render ── */
function renderPatient(p, recommendations) {
    const risk = primaryRisk(p);
    const riskClass = risk === 'High' ? 'clinical-finding-banner--high' :
                      risk === 'Moderate' ? 'clinical-finding-banner--moderate' :
                      'clinical-finding-banner--low';

    const reportDate = formatReportDate(p.submitted_at || p.updated_at || p.created_at);
    const recList = recommendations ? formatRecommendations(recommendations) : [];

    let circadianSubtypes = [];
    try {
        circadianSubtypes = typeof p.circadian_subtypes === 'string' ? JSON.parse(p.circadian_subtypes) : (p.circadian_subtypes || []);
    } catch(e) {
        console.error("Failed to parse circadian subtypes", e);
    }

    let comorList = [];
    try {
        comorList = typeof p.comorbidities === 'string' ? JSON.parse(p.comorbidities) : (p.comorbidities || []);
    } catch(e) {
        console.error("Failed to parse comorbidities", e);
    }

    container.innerHTML = `

        <!-- 👥 Patient Profile Header Card -->
        <header class="clinical-section-card" style="margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
                <div>
                    <h1 style="font-size: 2rem; font-weight: 800; color: var(--text-primary); margin: 0; letter-spacing: -0.5px;">${safe(p.full_name, '').trim() || 'Unnamed Patient'}</h1>
                    <div class="clinical-meta-list">
                        <span class="clinical-meta-item-new"><i class="bi bi-telephone"></i> ${safe(p.phone)}</span>
                        <span class="clinical-meta-item-new"><i class="bi bi-envelope"></i> ${safe(p.email)}</span>
                        <span class="clinical-meta-item-new"><i class="bi bi-calendar3"></i> Submitted: ${reportDate}</span>
                    </div>
                </div>
                <div>
                    ${statusBadge(p.status)}
                </div>
            </div>
        </header>

        <!-- ══════════════ DASHBOARD GRID ══════════════ -->
        <div class="clinical-dashboard-grid">
            
            <!-- ⬅️ LEFT COLUMN: FINDINGS & CHARTS -->
            <div class="clinical-col-left">
                
                <!-- Card 1: Primary Clinical Finding -->
                <div class="clinical-section-card">
                    <h2 class="clinical-section-title-new"><i class="bi bi-heart-pulse"></i> Primary Clinical Finding</h2>
                    <div class="clinical-finding-banner ${riskClass}">
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <span style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">${safe(p.primary_finding_label)}</span>
                            <span class="${riskBadgeClass(risk)}" style="padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.8rem;">${risk} RISK</span>
                        </div>
                        ${(p.primary_finding_label || '').toLowerCase().includes('circadian') && circadianSubtypes.length > 0 ? `<div style="font-size: 0.85rem; font-weight: 600; color: var(--accent); margin-top: 4px;"><i class="bi bi-clock-history"></i> Subtype: ${circadianSubtypes.join(', ')}</div>` : ''}
                        <p style="font-size: 0.95rem; color: var(--text-secondary); margin: 6px 0 0 0; line-height: 1.5;">${findingSubtext(risk)}</p>
                    </div>
                </div>

                ${comorList.length > 0 ? `
                <!-- Card 1b: Possible Overlapping & Comorbid Conditions -->
                <div class="clinical-section-card">
                    <h2 class="clinical-section-title-new"><i class="bi bi-exclamation-triangle-fill" style="color: var(--warning);"></i> Overlapping & Comorbid Conditions</h2>
                    <div style="padding: 16px 20px; background: rgba(217, 119, 6, 0.08); border: 1px solid rgba(217, 119, 6, 0.2); border-radius: var(--radius-sm);">
                        <ul style="margin: 0; padding-left: 20px; color: var(--text-primary); font-size: 0.95rem; display: flex; flex-direction: column; gap: 10px;">
                            ${comorList.map(c => `<li style="line-height: 1.5;"><strong>${c.label}</strong> — <span style="color: var(--text-secondary);">${c.description}</span></li>`).join('')}
                        </ul>
                    </div>
                </div>
                ` : ''}
 
                <!-- Card 2: Interactive Diagnostic Radar Map -->
                <div class="clinical-section-card">
                    <h2 class="clinical-section-title-new"><i class="bi bi-bar-chart-steps"></i> Diagnostic Severity Matrix</h2>
                    <div class="chart-box">
                        <canvas id="patientRadarChart"></canvas>
                    </div>
                </div>

            </div>
 
            <!-- ➡️ RIGHT COLUMN: DISORDER SCORE list & QUICK METRICS -->
            <div class="clinical-col-right">
 
                <!-- Card 4: Severity Breakdown Table -->
                <div class="clinical-section-card">
                    <h2 class="clinical-section-title-new"><i class="bi bi-graph-up-arrow"></i> Severity Breakdown</h2>
                    <table class="clinical-table" role="table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--border-card);">
                                <th scope="col" style="text-align: left; padding: 12px 8px; color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase;">Disorder</th>
                                <th scope="col" class="text-right" style="text-align: right; padding: 12px 8px; color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase;">Risk Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="border-bottom: 1px solid rgba(148, 163, 184, 0.08);">
                                <td style="padding: 14px 8px; font-weight: 500; font-size: 0.95rem;">Obstructive Sleep Apnea (OSA)</td>
                                <td class="text-right" style="padding: 14px 8px; text-align: right;"><span class="${riskBadgeClass(p.osa_tier)}">${safe(p.osa_tier)}</span></td>
                            </tr>
                            <tr style="border-bottom: 1px solid rgba(148, 163, 184, 0.08);">
                                <td style="padding: 14px 8px; font-weight: 500; font-size: 0.95rem;">Insomnia</td>
                                <td class="text-right" style="padding: 14px 8px; text-align: right;"><span class="${riskBadgeClass(p.insomnia_tier)}">${safe(p.insomnia_tier)}</span></td>
                            </tr>
                            <tr style="border-bottom: 1px solid rgba(148, 163, 184, 0.08);">
                                <td style="padding: 14px 8px; font-weight: 500; font-size: 0.95rem;">Hypersomnia</td>
                                <td class="text-right" style="padding: 14px 8px; text-align: right;"><span class="${riskBadgeClass(p.hypersomnia_tier)}">${safe(p.hypersomnia_tier)}</span></td>
                            </tr>
                            <tr style="border-bottom: 1px solid rgba(148, 163, 184, 0.08);">
                                <td style="padding: 14px 8px; font-weight: 500; font-size: 0.95rem;">
                                    <div>Circadian Rhythm Disorder</div>
                                    ${circadianSubtypes.length > 0 ? `<div style="font-size: 0.75rem; color: var(--text-hint); font-weight: 400; margin-top: 2.5px;"><i class="bi bi-clock-history"></i> Subtype: ${circadianSubtypes.join(', ')}</div>` : ''}
                                </td>
                                <td class="text-right" style="padding: 14px 8px; text-align: right;"><span class="${riskBadgeClass(p.circadian_tier)}">${safe(p.circadian_tier)}</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
 
                <!-- Card 5: Core Indicators -->
                <div class="clinical-section-card">
                    <h2 class="clinical-section-title-new"><i class="bi bi-lightning-charge"></i> Core Indicators</h2>
                    <div class="clinical-grid" role="list" style="margin-top: 0;">
                        <div class="clinical-grid-row" role="listitem">
                            <span class="clinical-label">Age</span>
                            <span class="clinical-value">${safe(p.age)}</span>
                        </div>
                        <div class="clinical-grid-row" role="listitem">
                            <span class="clinical-label">Gender</span>
                            <span class="clinical-value">${safe(p.gender)}</span>
                        </div>
                        <div class="clinical-grid-row" role="listitem">
                            <span class="clinical-label">Sleep Duration</span>
                            <span class="clinical-value">${safe(p.avg_sleep, 'hrs')}</span>
                        </div>
                        <div class="clinical-grid-row" role="listitem">
                            <span class="clinical-label">Snoring</span>
                            <span class="clinical-value">${safe(p.snoring_gate)}</span>
                        </div>
                        <div class="clinical-grid-row" role="listitem">
                            <span class="clinical-label">Daytime Sleepiness</span>
                            <span class="clinical-value">${safe(p.daytime_sleepy)}</span>
                        </div>
                        <div class="clinical-grid-row" role="listitem">
                            <span class="clinical-label">Sleep Satisfaction</span>
                            <span class="clinical-value">${safe(p.sleep_satisfaction)}</span>
                        </div>
                    </div>
                </div>
 
            </div>
        </div>

        <!-- 📜 FULL WIDTH SECTIONS -->
        <!-- Card 3: Clinical Recommendations -->
        <div class="clinical-section-card">
            <h2 class="clinical-section-title-new"><i class="bi bi-journal-text"></i> Personalized Recommendations</h2>
            ${
                recList.length > 0
                ? `<ul class="clinical-recommendations" style="padding-left: 20px; margin: 0; display: flex; flex-direction: column; gap: 12px;">
                    ${recList.map(r => `<li style="color: var(--text-primary); font-size: 0.95rem; line-height: 1.5;">${r}</li>`).join("")}
                </ul>`
                : `<p style="color: var(--text-secondary); font-style: italic; margin: 0;">No recommendations available.</p>`
            }
        </div>

        <!-- Card 6: Questionnaire Responses -->
        <div class="clinical-section-card">
            <h2 class="clinical-section-title-new"><i class="bi bi-clipboard-data"></i> Detailed Answers</h2>
            ${renderAnswersSection(p)}
        </div>


        <hr class="clinical-divider" style="margin: 32px 0 24px;">

        <!-- ═══ FOOTER: ACTIONS ═══ -->
        <footer class="clinical-footer" style="margin-top: 0; padding-top: 0;">
            <div class="clinical-actions" style="display: flex; gap: 12px; width: 100%; align-items: center; justify-content: flex-end;">
                <button id="btnDeletePatient" class="btn btn-secondary btn-sm" style="background-color: var(--danger); color: white; border: none; margin-right: auto; cursor: pointer;">
                    <i class="bi bi-trash"></i> Delete Record
                </button>
                <a href="dashboard.html" class="btn btn-secondary btn-sm">← Back to Dashboard</a>
                <a href="${API_BASE}/api/pdf/${p.id}" target="_blank" class="btn btn-secondary btn-sm">
                    <i class="bi bi-file-earmark-pdf"></i> Download Report
                </a>
            </div>
        </footer>
    `;

    // Initialize interactive radar chart
    initRadarChart(p);

    // Wire up delete button click listener
    setTimeout(() => {
        const deleteBtn = document.getElementById('btnDeletePatient');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                const name = p.full_name || 'this patient';
                const confirmed = confirm(`Are you sure you want to permanently delete the clinical record and all answers for "${name}"? This action cannot be undone.`);
                if (confirmed) {
                    try {
                        const deleteRes = await fetch(`${API_BASE}/api/patients/${p.id}`, {
                            method: 'DELETE',
                            headers: getAuthHeaders(),
                            credentials: 'include'
                        });
                        if (!deleteRes.ok) throw new Error('Delete failed');
                        
                        const deleteData = await deleteRes.json();
                        if (deleteData.success) {
                            alert('Patient record deleted successfully.');
                            window.location.href = 'dashboard.html';
                        } else {
                            alert('Failed to delete patient: ' + deleteData.message);
                        }
                    } catch (err) {
                        console.error(err);
                        alert('An error occurred while deleting the patient record.');
                    }
                }
            });
        }
    }, 100);
}

window.toggleAccordion = function(button) {
    const content = button.nextElementSibling;
    const arrow = button.querySelector('.accordion-arrow');
    
    if (content.style.maxHeight === '0px' || content.style.maxHeight === '') {
        content.style.maxHeight = '1000px';
        arrow.style.transform = 'rotate(180deg)';
    } else {
        content.style.maxHeight = '0px';
        arrow.style.transform = 'rotate(0deg)';
    }
};

window.expandAllAccordions = function(expand) {
    const contents = document.querySelectorAll('.detailed-accordion-content');
    const arrows = document.querySelectorAll('.accordion-arrow');
    
    contents.forEach((content, i) => {
        if (expand) {
            content.style.maxHeight = '1000px';
            arrows[i].style.transform = 'rotate(180deg)';
        } else {
            content.style.maxHeight = '0px';
            arrows[i].style.transform = 'rotate(0deg)';
        }
    });
};

async function checkAuthAndInit() {
    try {
        const res = await fetch(`${API_BASE}/api/auth/check`, { headers: getAuthHeaders(), credentials: 'include' });
        const data = await res.json();
        if (!data.authenticated) {
            window.location.href = 'login.html';
            return;
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
                const profileRes = await fetch(`${API_BASE}/api/auth/profile`, { credentials: 'include' });
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

        loadPatient();
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

checkAuthAndInit();