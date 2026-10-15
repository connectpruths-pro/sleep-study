/* ═══════════════════════════════════════════════════════════════════════════
   Sleep Disorder Screening — Application Logic
   All disorders evaluated on backend. No PHI is logged or stored.
   Theme preference saved to localStorage (NOT user answers).
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const isProduction = window.location.hostname.includes('aurorasleepscreening.com') || window.location.hostname.includes('aurora-sleep-screening') || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';

  /* ─── DOM refs ─── */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  const consentCheckbox = $('#consentCheckbox');
  const btnStart = $('#btnStartConsent');
  const btnSubmit = $('#btnSubmit');
  const btnRestart = $('#btnRestart');
  const themeToggle = $('#themeToggle');
  const themeIcon = $('#themeIcon');

  let patientId = null;
  let patientDraftCreated = false;
  let resultsChartInstance = null;
  let lastResults = null;
  let recaptchaCompleted = true; // Bypassed for dev/local instance

  const STEPS = [
    'step-consent',
    'step-personal',
    'step-basic',
    'step-satisfaction',
    'step-insomnia',
    'step-hypersomnia',
    'step-apnea',
    'step-circadian',
    'step-duration',
    'step-results'
  ];

  /* ═══════════════════════════════════════════════
     THEME TOGGLE
     Only theme preference is stored — never user answers.
     ═══════════════════════════════════════════════ */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeIcon.innerHTML = theme === 'dark' ? '<i class="bi bi-moon-fill"></i>' : '<i class="bi bi-sun-fill"></i>';
  }

  // Load saved theme or default to dark
  const savedTheme = localStorage.getItem('aurora-theme') || 'dark';
  applyTheme(savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('aurora-theme', next);
    if (lastResults) {
      initResultsRadarChart(lastResults);
    }
  });

  /* ═══════════════════════════════════════════════
     STEP PROGRESS BAR
     ═══════════════════════════════════════════════ */
  const stepItems = $$('.step-item');
  const stepConnectors = $$('.step-connector');

  function updateProgress(stepIndex) {
    stepItems.forEach((item, i) => {
      item.classList.remove('active', 'completed');
      if (i < stepIndex) {
        item.classList.add('completed');
      } else if (i === stepIndex) {
        item.classList.add('active');
      }
    });

    stepConnectors.forEach((conn, i) => {
      conn.classList.toggle('done', i < stepIndex);
    });
  }

  /* ─── Helper: read radio value ─── */
  function radio(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
  }

  /* ─── Helper: read checkboxes ─── */
  function checks(name) {
    return $$(`input[name="${name}"]:checked`).map((e) => e.value);
  }

  /* ═══════════════════════════════════════════════
     STEP NAVIGATION
     ═══════════════════════════════════════════════ */
  function goToStep(id) {
    $$('.step').forEach((s) => s.classList.remove('active'));
    const target = $(`#${id}`);
    if (target) target.classList.add('active');

    const idx = STEPS.indexOf(id);
    updateProgress(idx);

    // Clear any validation errors when navigating
    $$('.validation-error').forEach(el => el.remove());

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ─── Validation helpers ─── */
  function showError(container, message) {
    // Remove existing error in this container first
    const existing = container.querySelector('.validation-error');
    if (existing) existing.remove();

    const err = document.createElement('p');
    err.className = 'validation-error';
    err.style.cssText = 'color:#DC2626;font-size:13px;margin-top:6px;font-weight:600;display:flex;align-items:center;gap:5px;';
    err.innerHTML = '<i class="bi bi-exclamation-circle-fill"></i> ' + message;
    container.appendChild(err);
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearErrors() {
    $$('.validation-error').forEach(el => el.remove());
  }

  function validateStep(currentStepId) {
    clearErrors();
    let valid = true;

    if (currentStepId === 'step-personal') {
      // Full name required
      const name = $('#q_name');
      if (name && !name.value.trim()) {
        showError(name.closest('.form-group'), 'Please enter your full name.');
        valid = false;
      }
      // Phone required
      const phone = $('#q_phone');
      if (phone && !phone.value.trim()) {
        showError(phone.closest('.form-group'), 'Please enter your phone number.');
        valid = false;
      }
      // Email required and basic format check
      const email = $('#q_email');
      if (email && !email.value.trim()) {
        showError(email.closest('.form-group'), 'Please enter your email address.');
        valid = false;
      } else if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        showError(email.closest('.form-group'), 'Please enter a valid email address.');
        valid = false;
      }
      // Referral required + conditional inputs required
      const mainRef = radio('q_referral');
      if (!mainRef) {
        showError($('[name="q_referral"]').closest('.form-group'), 'Please select how you found this questionnaire.');
        valid = false;
      } else if (mainRef === 'Clinics/hospital') {
        const cName = $('#q_clinic_name');
        const dName = $('#q_doctor_name');
        const city = $('#q_city_name');

        if (cName && !cName.value.trim()) {
          showError(cName.closest('div'), 'Please enter clinic/hospital name.');
          valid = false;
        }
        if (dName && !dName.value.trim()) {
          showError(dName.closest('div'), 'Please enter doctor name.');
          valid = false;
        }
        if (city && !city.value.trim()) {
          showError(city.closest('div'), 'Please enter city.');
          valid = false;
        }
      } else if (mainRef === 'Online' || mainRef === 'Events') {
        const det = $('#q_referral_details');
        if (det && !det.value.trim()) {
          showError(det.closest('.form-group'), 'Please enter details.');
          valid = false;
        }
      }
    }

    if (currentStepId === 'step-basic') {
      // Age required
      const age = $('#q_age');
      if (!age.value || parseInt(age.value) < 1) {
        showError(age.closest('.form-group'), 'Please enter your age.');
        valid = false;
      }
      // Gender required
      if (!radio('q_gender')) {
        showError($('[name="q_gender"]').closest('.form-group'), 'Please select your gender.');
        valid = false;
      }
      // Height & Weight required
      const height = $('#q_height');
      if (!height.value || parseInt(height.value) < 50) {
        showError(height.closest('.form-group'), 'Please enter your height.');
        valid = false;
      }
      const weight = $('#q_weight');
      if (!weight.value || parseInt(weight.value) < 10) {
        showError(weight.closest('.form-group'), 'Please enter your weight.');
        valid = false;
      }
      // Medical conditions — at least one checkbox required
      if (checks('q_medical').length === 0) {
        showError($('[name="q_medical"]').closest('.form-group'), 'Please select at least one option (or "None of the above").');
        valid = false;
      }
      // Consumption — at least one checkbox required
      if (checks('q_consumption').length === 0) {
        showError($('[name="q_consumption"]').closest('.form-group'), 'Please select at least one option (or "None of the above").');
        valid = false;
      }
      // Work schedule required
      if (!radio('q_work')) {
        showError($('[name="q_work"]').closest('.form-group'), 'Please select your work schedule.');
        valid = false;
      }
      // Sleep schedule required
      if (!radio('q_schedule')) {
        showError($('[name="q_schedule"]').closest('.form-group'), 'Please select your sleep schedule type.');
        valid = false;
      }
    }

    if (currentStepId === 'step-satisfaction') {
      if (!radio('q_sleep_satisfaction')) {
        showError($('[name="q_sleep_satisfaction"]').closest('.form-group'), 'Please answer this question.');
        valid = false;
      }
      if (!radio('q_daytime_satisfaction')) {
        showError($('[name="q_daytime_satisfaction"]').closest('.form-group'), 'Please answer this question.');
        valid = false;
      }
      if (!radio('q_daytime_sleepy')) {
        showError($('[name="q_daytime_sleepy"]').closest('.form-group'), 'Please answer this question.');
        valid = false;
      }
      // If sleepy = Yes, frequency required
      if (radio('q_daytime_sleepy') === 'Yes' && !radio('q_sleepy_freq')) {
        showError($('#daytimeSleepyGroup'), 'Please indicate how often you feel sleepy.');
        valid = false;
      }
    }

    if (currentStepId === 'step-insomnia') {
      // Gate required
      if (!radio('q_insomnia_gate')) {
        showError($('[name="q_insomnia_gate"]').closest('.form-group'), 'Please answer this gate question.');
        valid = false;
      }
      // If gate = Yes, sub-questions required
      if (radio('q_insomnia_gate') === 'Yes') {
        if (!radio('q_sleep_latency')) {
          showError($('[name="q_sleep_latency"]').closest('.form-group'), 'Please answer this question.');
          valid = false; 
        }
        if (!radio('q_night_waking')) {
          showError($('[name="q_night_waking"]').closest('.form-group'), 'Please answer this question.');
          valid = false;
        }
        if (!radio('q_difficulty_back_sleep')) {
          showError($('[name="q_difficulty_back_sleep"]').closest('.form-group'), 'Please answer this question.');
          valid = false;
        }
      }
    }

    if (currentStepId === 'step-hypersomnia') {
      // Gate required
      if (!radio('q_hypersomnia_gate')) {
        showError($('[name="q_hypersomnia_gate"]').closest('.form-group'), 'Please answer this gate question.');
        valid = false;
      }
      // If gate = Yes, sub-questions required
      if (radio('q_hypersomnia_gate') === 'Yes') {
        if (!radio('q_difficulty_waking')) {
          showError($('[name="q_difficulty_waking"]').closest('.form-group'), 'Please answer this question.');
          valid = false;
        }
        if (!radio('q_nap_freq')) {
          showError($('[name="q_nap_freq"]').closest('.form-group'), 'Please answer this question.');
          valid = false;
        }
        // If naps, nap detail required
        const napFreqVal = radio('q_nap_freq');
        if (napFreqVal && napFreqVal !== "I don't") {
          if (!radio('q_nap_duration')) {
            showError($('[name="q_nap_duration"]').closest('.form-group'), 'Please answer this question.');
            valid = false;
          }
          if (!radio('q_nap_refreshed')) {
            showError($('[name="q_nap_refreshed"]').closest('.form-group'), 'Please answer this question.');
            valid = false;
          }
        }
      }
    }

    if (currentStepId === 'step-apnea') {
      // Gate required
      if (!radio('q_snoring_gate')) {
        showError($('[name="q_snoring_gate"]').closest('.form-group'), 'Please answer this gate question.');
        valid = false;
      }
      // If gate = Yes, sub-questions required
      if (radio('q_snoring_gate') === 'Yes') {
        if (!radio('q_witnessed_apnea')) {
          showError($('[name="q_witnessed_apnea"]').closest('.form-group'), 'Please answer this question.');
          valid = false;
        }
        if (!radio('q_loud_snoring')) {
          showError($('[name="q_loud_snoring"]').closest('.form-group'), 'Please answer this question.');
          valid = false;
        }
        if (!radio('q_night_awakenings')) {
          showError($('[name="q_night_awakenings"]').closest('.form-group'), 'Please answer this question.');
          valid = false;
        }
        if (!radio('q_morning_headache')) {
          showError($('[name="q_morning_headache"]').closest('.form-group'), 'Please answer this question.');
          valid = false;
        }
        if (!radio('q_dry_mouth')) {
          showError($('[name="q_dry_mouth"]').closest('.form-group'), 'Please answer this question.');
          valid = false;
        }
      }
    }

    if (currentStepId === 'step-circadian') {
      // Gate required
      if (!radio('q_circadian_gate')) {
        showError($('[name="q_circadian_gate"]').closest('.form-group'), 'Please answer this gate question.');
        valid = false;
      }
      // If gate = Yes, sub-questions required
      if (radio('q_circadian_gate') === 'Yes') {
        if (!radio('q_chronotype')) {
          showError($('[name="q_chronotype"]').closest('.form-group'), 'Please answer this question.');
          valid = false;
        }
        if (!radio('q_brain_fog')) {
          showError($('[name="q_brain_fog"]').closest('.form-group'), 'Please answer this question.');
          valid = false;
        }
        if (!radio('q_weekend_shift')) {
          showError($('[name="q_weekend_shift"]').closest('.form-group'), 'Please answer this question.');
          valid = false;
        }
      }
    }

    if (currentStepId === 'step-duration') {
      if (!radio('q_duration')) {
        showError($('[name="q_duration"]').closest('.form-group'), 'Please indicate how long you have been experiencing symptoms.');
        valid = false;
      }
    }

    return valid;
  }

  /* ─── Consent ─── */
  function syncStartButton() {
    btnStart.disabled = !consentCheckbox.checked;
  }

  window.onRecaptchaVerified = function () {
    recaptchaCompleted = true;
    syncStartButton();
  };

  window.onRecaptchaExpired = function () {
    recaptchaCompleted = true;
    syncStartButton();
  };

  consentCheckbox.addEventListener('change', () => {
    syncStartButton();
  });

  btnStart.addEventListener('click', async () => {
    if (!consentCheckbox.checked) return;

    try {
      if (!patientDraftCreated) {
        await createPatientDraft();
      }
    } catch (error) {
      console.warn('Could not create draft on server, using local draft:', error);
    }

    goToStep('step-personal');
  });

  /* ─── Next / Back buttons ─── */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-next]');
    if (btn) {
      (async () => {
        try {
          // Find current active step
          const activeStep = document.querySelector('.step.active');
          const currentStepId = activeStep ? activeStep.id : null;

          // Validate current step before proceeding
          if (currentStepId && !validateStep(currentStepId)) {
            return; // Stop — errors shown inline
          }

          try {
            await updatePatientInfo();
            await savePatientAnswers({
              completionPercent: Math.round(((STEPS.indexOf(btn.dataset.next)) / STEPS.length) * 100),
              lastCompletedStep: STEPS.indexOf(btn.dataset.next)
            });
            console.log('Autosaved step:', btn.dataset.next);
          } catch (syncErr) {
            console.warn('Autosave background sync warning:', syncErr);
          }

          goToStep(btn.dataset.next);
        } catch (error) {
          console.error('Step navigation error:', error);
          goToStep(btn.dataset.next);
        }
      })();

      return;
    }

    const btnPrev = e.target.closest('[data-prev]');
    if (btnPrev) {
      goToStep(btnPrev.dataset.prev);
    }
  });

  /* ─── Restart ─── */
  btnRestart.addEventListener('click', () => {
    $$('input[type="text"], input[type="number"], input[type="time"], input[type="tel"], input[type="email"]').forEach((i) => { i.value = ''; });
    $$('input[type="radio"], input[type="checkbox"]').forEach((i) => { i.checked = false; });
    $$('.conditional, #insomniaSubQuestions, #hypersomniaSubQuestions, #apneaSubQuestions, #circadianSubQuestions, #napFollowUpQuestions').forEach((g) => { g.style.display = 'none'; });
    $$('.radio-option.selected, .checkbox-option.selected').forEach((o) => o.classList.remove('selected'));

    recaptchaCompleted = true;
    syncStartButton();
    if (resultsChartInstance) {
      resultsChartInstance.destroy();
      resultsChartInstance = null;
    }
    lastResults = null;
    goToStep('step-consent');
  });

  /* ═══════════════════════════════════════════════
     CONDITIONAL QUESTION LOGIC
     ═══════════════════════════════════════════════ */

  /* Helper: add selected class on any radio/checkbox change */
  document.addEventListener('change', (e) => {
    const opt = e.target.closest('.radio-option, .checkbox-option');
    if (!opt) return;

    if (e.target.type === 'radio') {
      $$(`input[name="${e.target.name}"]`).forEach((r) => {
        r.closest('.radio-option').classList.toggle('selected', r.checked);
      });
    } else if (e.target.type === 'checkbox') {
      opt.classList.toggle('selected', e.target.checked);
    }
  });

  /* Gender → menstrual status */
  document.addEventListener('change', (e) => {
    if (e.target.name === 'q_gender') {
      $('#menstrualGroup').style.display = e.target.value === 'Female' ? 'block' : 'none';

      /* Hide PCOS when Male is selected */
      const pcosOption = $('#pcosOption');
      if (pcosOption) {
        if (e.target.value === 'Male') {
          pcosOption.style.display = 'none';
          const pcosCheckbox = pcosOption.querySelector('input[type="checkbox"]');
          if (pcosCheckbox) { pcosCheckbox.checked = false; pcosOption.classList.remove('selected'); }
        } else {
          pcosOption.style.display = '';
        }
      }
    }
  });

  /* "None of the above" — mutual exclusion for checkbox groups */
  document.addEventListener('change', (e) => {
    if (e.target.id === 'medicalNone' && e.target.checked) {
      $$('input[name="q_medical"]').forEach(cb => {
        if (cb !== e.target) { cb.checked = false; cb.closest('.checkbox-option')?.classList.remove('selected'); }
      });
    } else if (e.target.name === 'q_medical' && e.target.value !== 'None' && e.target.checked) {
      const none = $('#medicalNone');
      if (none) { none.checked = false; none.closest('.checkbox-option')?.classList.remove('selected'); }
    }

    if (e.target.id === 'consumptionNone' && e.target.checked) {
      $$('input[name="q_consumption"]').forEach(cb => {
        if (cb !== e.target) { cb.checked = false; cb.closest('.checkbox-option')?.classList.remove('selected'); }
      });
    } else if (e.target.name === 'q_consumption' && e.target.value !== 'None' && e.target.checked) {
      const none = $('#consumptionNone');
      if (none) { none.checked = false; none.closest('.checkbox-option')?.classList.remove('selected'); }
    }
  });

  /* Sleep schedule → fixed / irregular */
  document.addEventListener('change', (e) => {
    if (e.target.name === 'q_schedule') {
      $('#fixedScheduleGroup').style.display = e.target.value === 'Fixed' ? 'block' : 'none';
      $('#irregularScheduleGroup').style.display = e.target.value === 'Irregular' ? 'block' : 'none';
    }
  });

  /* Daytime sleepiness → frequency */
  document.addEventListener('change', (e) => {
    if (e.target.name === 'q_daytime_sleepy') {
      $('#daytimeSleepyGroup').style.display = e.target.value === 'Yes' ? 'block' : 'none';
    }
  });

  /* Gate questions for disorder sections */
  const gates = [
    { name: 'q_insomnia_gate', target: '#insomniaSubQuestions' },
    { name: 'q_hypersomnia_gate', target: '#hypersomniaSubQuestions' },
    { name: 'q_snoring_gate', target: '#apneaSubQuestions' },
    { name: 'q_circadian_gate', target: '#circadianSubQuestions' },
  ];

  gates.forEach(({ name, target }) => {
    document.addEventListener('change', (e) => {
      if (e.target.name === name) {
        $(target).style.display = e.target.value === 'Yes' ? 'block' : 'none';
      }
    });
  });

  /* Skip Duration step when ALL gate questions are answered "No" */
  function allGatesNo() {
    const gateNames = ['q_insomnia_gate', 'q_hypersomnia_gate', 'q_snoring_gate', 'q_circadian_gate'];
    return gateNames.every(name => {
      const val = radio(name);
      return val === 'No';
    });
  }

  /* Override the Circadian → Duration "Next" button dynamically */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-next="step-duration"]');
    if (btn && allGatesNo()) {
      e.stopImmediatePropagation();
      e.preventDefault();
      /* Skip duration, go straight to submit with no duration selected */
      goToStep('step-results');
      /* Auto-trigger submit */
      btnSubmit.click();
    }
  }, true);  /* capture phase so it fires before the generic [data-next] handler */

  /* Nap frequency → show/hide nap duration & refreshed questions */
  document.addEventListener('change', (e) => {
    if (e.target.name === 'q_nap_freq') {
      const show = e.target.value !== "I don't";
      $('#napFollowUpQuestions').style.display = show ? 'block' : 'none';
    }
  });

  /* ═══════════════════════════════════════════════
     COLLECT ANSWERS
     ═══════════════════════════════════════════════ */
  function collectAnswers() {
    return {
      full_name: $('#q_name') ? $('#q_name').value.trim() : '',
      phone: $('#q_phone') ? $('#q_phone').value.trim() : '',
      email: $('#q_email') ? $('#q_email').value.trim() : '',
      referral_source: getReferralSource(),
      age: parseFloat($('#q_age').value) || 0,
      gender: radio('q_gender'),
      menstrual: radio('q_menstrual'),
      height: parseFloat($('#q_height').value) || 0,
      weight: parseFloat($('#q_weight').value) || 0,
      neckRaw: parseFloat($('#q_neck').value) || 0,
      medical: checks('q_medical'),
      consumption: checks('q_consumption'),
      work: radio('q_work'),
      schedule: radio('q_schedule'),
      sleepStart: $('#q_sleep_start').value || '',
      wakeTime: $('#q_wake_time').value || '',
      avgSleep: parseFloat($('#q_avg_sleep').value) || 0,
      sleepSatisfaction: radio('q_sleep_satisfaction'),
      daytimeSatisfaction: radio('q_daytime_satisfaction'),
      daytimeSleepy: radio('q_daytime_sleepy'),
      sleepyFreq: radio('q_sleepy_freq'),
      insomniaGate: radio('q_insomnia_gate'),
      sleepLatency: radio('q_sleep_latency'),
      nightWaking: radio('q_night_waking'),
      difficultyBackSleep: radio('q_difficulty_back_sleep'),
      hypersomniaGate: radio('q_hypersomnia_gate'),
      difficultyWaking: radio('q_difficulty_waking'),
      napFreq: radio('q_nap_freq'),
      napDuration: radio('q_nap_duration'),
      napRefreshed: radio('q_nap_refreshed'),
      snoringGate: radio('q_snoring_gate'),
      witnessedApnea: radio('q_witnessed_apnea'),
      loudSnoring: radio('q_loud_snoring'),
      nightAwakenings: radio('q_night_awakenings'),
      morningHeadache: radio('q_morning_headache'),
      dryMouth: radio('q_dry_mouth'),
      circadianGate: radio('q_circadian_gate'),
      chronotype: radio('q_chronotype'),
      brainFog: radio('q_brain_fog'),
      weekendShift: radio('q_weekend_shift'),
      duration: radio('q_duration'),
    };
  }

  /* How did you find questionnaire → conditional details */
  document.addEventListener('change', (e) => {
    if (e.target.name === 'q_referral') {
      const val = e.target.value;
      const clinicGrp = $('#referralClinicGroup');
      const detailsGrp = $('#referralDetailsGroup');

      if (clinicGrp) clinicGrp.style.display = val === 'Clinics/hospital' ? 'block' : 'none';
      if (detailsGrp) detailsGrp.style.display = (val === 'Online' || val === 'Events') ? 'block' : 'none';
    }
  });

  /* Real-time autosave trigger as soon as patient types/changes contact details in Step 1 */
  document.addEventListener('focusout', (e) => {
    if (e.target && ['q_name', 'q_phone', 'q_email', 'q_clinic_name', 'q_doctor_name', 'q_city_name', 'q_referral_details'].includes(e.target.id)) {
      updatePatientInfo();
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target && (e.target.name === 'q_referral' || ['q_name', 'q_phone', 'q_email'].includes(e.target.id))) {
      updatePatientInfo();
    }
  });

  function getReferralSource() {
    let referralFull = radio('q_referral') || '';
    if (referralFull === 'Clinics/hospital') {
      const c = $('#q_clinic_name') ? $('#q_clinic_name').value.trim() : '';
      const d = $('#q_doctor_name') ? $('#q_doctor_name').value.trim() : '';
      const city = $('#q_city_name') ? $('#q_city_name').value.trim() : '';
      const parts = [];
      if (c) parts.push(`Clinic: ${c}`);
      if (d) parts.push(`Doctor: ${d}`);
      if (city) parts.push(`City: ${city}`);
      referralFull = parts.length > 0 ? `Clinics/hospital (${parts.join(', ')})` : 'Clinics/hospital';
    } else if (referralFull === 'Online' || referralFull === 'Events') {
      const det = $('#q_referral_details') ? $('#q_referral_details').value.trim() : '';
      referralFull = det ? `${referralFull} (${det})` : referralFull;
    }
    return referralFull;
  }

  async function updatePatientInfo() {
    if (!patientId) return;

    const nameEl = $('#q_name');
    const phoneEl = $('#q_phone');
    const emailEl = $('#q_email');
    const referralFull = getReferralSource();

    const payload = {};
    if (nameEl && nameEl.value.trim()) payload.full_name = nameEl.value.trim();
    if (phoneEl && phoneEl.value.trim()) payload.phone = phoneEl.value.trim();
    if (emailEl && emailEl.value.trim()) payload.email = emailEl.value.trim();
    if (referralFull) payload.referral_source = referralFull;

    if (Object.keys(payload).length === 0) return;

    try {
      const response = await fetch(`${API_BASE}/api/patients/${patientId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('Failed to update patient info');
      } else {
        console.log('Patient info updated:', payload);
      }
    } catch (err) {
      console.error('Error updating patient:', err);
    }
  }

  async function createPatientDraft() {
    if (patientDraftCreated && patientId && !String(patientId).startsWith('draft_')) {
      return { success: true, patient: { id: patientId } };
    }

    const recaptchaToken = 'bypass';
    const urlParams = new URLSearchParams(window.location.search);
    const docCode = urlParams.get('doc');

    const phoneEl = $('#q_phone');
    const emailEl = $('#q_email');

    const payload = {
      full_name: '',
      phone: phoneEl ? phoneEl.value || '' : '',
      email: emailEl ? emailEl.value || '' : '',
      consent_given: consentCheckbox.checked,
      recaptchaToken,
      doctor_code: docCode || null
    };

    const endpoint = docCode ? `/api/patients?doc=${encodeURIComponent(docCode)}` : `/api/patients`;
    const url = API_BASE ? `${API_BASE}${endpoint}` : endpoint;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        if (result && result.patient && result.patient.id) {
          patientId = result.patient.id;
          patientDraftCreated = true;
          return result;
        }
      }
    } catch (err) {
      console.warn('Draft creation network call failed, falling back to local session draft:', err);
    }

    // Fallback: client draft ID so user is never blocked from filling the form
    patientId = patientId || ('draft_' + Date.now());
    patientDraftCreated = true;
    return { success: true, patient: { id: patientId } };
  }

  async function savePatientAnswers(progress = {}) {
    if (!patientDraftCreated || !patientId) {
      await createPatientDraft();
    }

    const answers = collectAnswers();

    const payload = {
      full_name: answers.full_name,
      phone: answers.phone,
      email: answers.email,
      referral_source: answers.referral_source,
      age: answers.age,
      gender: answers.gender,
      menstrual: answers.menstrual,
      height: answers.height,
      weight: answers.weight,
      neck_raw: answers.neckRaw,
      medical: answers.medical,
      consumption: answers.consumption,
      work: answers.work,
      schedule: answers.schedule,
      sleep_start: answers.sleepStart || null,
      wake_time: answers.wakeTime || null,
      avg_sleep: answers.avgSleep,
      sleep_satisfaction: answers.sleepSatisfaction,
      daytime_satisfaction: answers.daytimeSatisfaction,
      daytime_sleepy: answers.daytimeSleepy,
      sleepy_freq: answers.sleepyFreq,
      insomnia_gate: answers.insomniaGate,
      sleep_latency: answers.sleepLatency,
      night_waking: answers.nightWaking,
      difficulty_back_sleep: answers.difficultyBackSleep,
      hypersomnia_gate: answers.hypersomniaGate,
      difficulty_waking: answers.difficultyWaking,
      nap_freq: answers.napFreq,
      nap_duration: answers.napDuration,
      nap_refreshed: answers.napRefreshed,
      snoring_gate: answers.snoringGate,
      witnessed_apnea: answers.witnessedApnea,
      loud_snoring: answers.loudSnoring,
      night_awakenings: answers.nightAwakenings,
      morning_headache: answers.morningHeadache,
      dry_mouth: answers.dryMouth,
      circadian_gate: answers.circadianGate,
      chronotype: answers.chronotype,
      brain_fog: answers.brainFog,
      weekend_shift: answers.weekendShift,
      duration: answers.duration,
      completion_percent: progress.completionPercent || 0,
      last_completed_step: progress.lastCompletedStep || 0
    };

    const response = await fetch(`${API_BASE}/api/patients/${patientId}/answers`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to save answers. Status: ${response.status}`);
    }

    return await response.json();
  }

  /* ═══════════════════════════════════════════════
     SUBMIT → SEND TO BACKEND
     ═══════════════════════════════════════════════ */
  btnSubmit.addEventListener('click', async () => {
    // Validate the duration step before final submit
    const activeStep = document.querySelector('.step.active');
    const currentStepId = activeStep ? activeStep.id : null;
    if (currentStepId && !validateStep(currentStepId)) {
      return; // Stop — errors shown inline
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Processing...';

    try {
      if (!patientDraftCreated || !patientId) {
        await createPatientDraft();
      }

      await updatePatientInfo();

      try {
        await savePatientAnswers({
          completionPercent: 100,
          lastCompletedStep: 8
        });
      } catch (saveErr) {
        console.warn('Autosave notice before final submit:', saveErr);
      }

      const response = await fetch(`${API_BASE}/api/patients/${patientId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: $('#q_name') ? $('#q_name').value.trim() : '',
          phone: $('#q_phone') ? $('#q_phone').value.trim() : '',
          email: $('#q_email') ? $('#q_email').value.trim() : '',
          referral_source: getReferralSource()
        })
      });

      if (!response.ok) {
        let message = `Submission failed with status ${response.status}`;
        try {
          const errorBody = await response.json();
          message = errorBody.message || errorBody.error || message;
        } catch (_) {}
        throw new Error(message);
      }

      const result = await response.json();
      console.log('Backend results:', result);

      renderResults(result.results, result.recommendations || null);

      /* Show PDF download button */
      const pdfBtn = document.getElementById('btnDownloadPdf');
      if (pdfBtn && patientId) {
        pdfBtn.href = `${API_BASE}/api/pdf/${patientId}`;
        pdfBtn.style.display = '';
      }

      goToStep('step-results');

    } catch (error) {
      console.error('Error submitting answers:', error);
      alert(`Error submitting answers: ${error.message}`);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Submit & View Results';
    }
  });

  /* ═══════════════════════════════════════════════
     DISORDER DESCRIPTIONS & RECOMMENDATIONS
     ═══════════════════════════════════════════════ */
  const DISORDER_INFO = {
    'Obstructive Sleep Apnea': {
      desc: {
        'Moderate': 'Your responses suggest possible obstructive sleep apnea. Symptoms like snoring, breathing pauses, and risk factors warrant clinical attention.',
        'High': 'Your responses strongly indicate risk for obstructive sleep apnea. Multiple symptoms and risk factors are present. Clinical evaluation with a sleep study is recommended.'
      },
      rec: 'A polysomnography (sleep study) can confirm this diagnosis.'
    },
    'Insomnia': {
      desc: {
        'Moderate': 'Your responses indicate difficulty falling or staying asleep that may be affecting your daily life.',
        'High': 'Your responses suggest significant insomnia symptoms with frequent sleep disruption impacting daytime functioning.'
      },
      rec: 'Cognitive behavioral therapy for insomnia (CBT-I) is the first-line treatment.'
    },
    'Hypersomnia': {
      desc: {
        'Moderate': 'Despite adequate sleep time, you report excessive daytime sleepiness and frequent napping.',
        'High': 'Your responses indicate significant excessive daytime sleepiness with unrefreshing naps and difficulty waking, despite adequate sleep opportunity.'
      },
      rec: 'Further evaluation is needed to rule out underlying causes.'
    },
    'Circadian Rhythm Disorder': {
      desc: {
        'Moderate': 'Your sleep timing appears misaligned with conventional schedules, which may be affecting your sleep quality.',
        'High': 'Your responses indicate significant circadian rhythm misalignment with clear impact on sleep timing and daytime functioning.'
      },
      rec: 'Chronotherapy, light therapy, or melatonin may help realign your sleep schedule.'
    }
  };

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

  /* ═══════════════════════════════════════════════
     RENDER RESULTS
     ═══════════════════════════════════════════════ */
  function initResultsRadarChart(results) {
    const canvas = $('#resultsRadarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (resultsChartInstance) {
      resultsChartInstance.destroy();
    }

    const tierMap = { 'Low': 1, 'Moderate': 2, 'High': 3 };
    const osaValue = tierMap[results.osa.tier] || 1;
    const insomniaValue = tierMap[results.insomnia.tier] || 1;
    const hypersomniaValue = tierMap[results.hypersomnia.tier] || 1;
    const circadianValue = tierMap[results.circadian.tier] || 1;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(71, 85, 105, 0.08)';
    const textColor = isDark ? '#94A3B8' : '#475569';
    const angleLineColor = isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(71, 85, 105, 0.12)';

    resultsChartInstance = new Chart(ctx, {
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

  function renderResults(results, recommendations) {
    const recList = formatRecommendations(recommendations);
    const primarySection = $('#primaryFindingSection');
    const primaryCardWrap = $('#primaryFindingCard');
    const additionalSection = $('#additionalFindingsSection');
    const grid = $('#resultsGrid');
    const intro = $('#resultsIntro');

    const comorbidSection = $('#comorbidSection');
    const comorbidList = $('#comorbidList');
    const radarSection = $('#radarChartSection');

    primaryCardWrap.innerHTML = '';
    grid.innerHTML = '';
    comorbidList.innerHTML = '';

    const disorders = [results.osa, results.insomnia, results.hypersomnia, results.circadian];
    const flagged = disorders.filter((d) => d.tier !== 'Low');

    const tierRank = { Low: 0, Moderate: 1, High: 2 };

    flagged.sort((a, b) => {
      if (tierRank[b.tier] !== tierRank[a.tier]) {
        return tierRank[b.tier] - tierRank[a.tier];
      }
      return (b.score || 0) - (a.score || 0);
    });

    if (flagged.length === 0) {
      intro.textContent =
        'Your responses do not show strong screening patterns for the sleep disorders assessed. If you still have concerns about your sleep, consider consulting a healthcare professional.';

      primarySection.style.display = 'none';
      additionalSection.style.display = 'none';
      comorbidSection.style.display = 'none';
      if (radarSection) radarSection.style.display = 'none';

      grid.innerHTML = `
      <div class="no-concerns">
        <h4>✅ No significant screening concerns detected</h4>
        <p>This result is based only on the responses provided and does not replace a clinical evaluation.</p>
      </div>
    `;
      additionalSection.style.display = 'block';
      return;
    }

    intro.textContent =
      'Your responses were analyzed for patterns associated with common sleep disorders. The findings below indicate possible areas of sleep-related concern and should be interpreted as screening results only.';

    lastResults = results;
    if (radarSection) {
      radarSection.style.display = 'block';
      initResultsRadarChart(results);
    }

    const primary = flagged[0];
    const additional = flagged.slice(1);

    function getDisorderIcon(name) {
      const lower = String(name).toLowerCase();
      if (lower.includes('apnea') || lower.includes('osa')) {
        return '<i class="bi bi-wind"></i>';
      }
      if (lower.includes('insomnia')) {
        return '<i class="bi bi-alarm"></i>';
      }
      if (lower.includes('hypersomnia')) {
        return '<i class="bi bi-moon-stars"></i>';
      }
      if (lower.includes('circadian')) {
        return '<i class="bi bi-globe"></i>';
      }
      return '<i class="bi bi-heart-pulse"></i>';
    }

    function getCardHTML(d) {
      const tierClass = `tier-${d.tier.toLowerCase()}`;
      const info = DISORDER_INFO[d.name] || {};
      const desc = info.desc ? (info.desc[d.tier] || '') : '';
      const rec = info.rec || '';

      let subtypeHtml = '';
      if (d.subtypes && d.subtypes.length > 0 && d.name.toLowerCase().includes('circadian')) {
        subtypeHtml = `<div class="result-card-subtype"><i class="bi bi-pin-angle-fill"></i> Subtype: ${d.subtypes.join(', ')}</div>`;
      }

      return `
      <div class="result-card ${tierClass}">
        <div class="result-card-icon">${getDisorderIcon(d.name)}</div>
        <div class="result-card-body">
          <h4>${d.name}</h4>
          <span class="result-card-tier">${d.tier} Risk</span>
          <p class="result-card-desc">${desc}</p>
          ${subtypeHtml}
          <p class="result-card-rec">${rec}</p>
        </div>
      </div>
    `;
    }

    primarySection.style.display = 'block';
    primaryCardWrap.innerHTML = getCardHTML(primary);

    if (additional.length > 0) {
      additionalSection.style.display = 'block';
      if (additional.length === 1) {
        grid.className = 'results-grid results-grid-single';
      } else {
        grid.className = 'results-grid';
      }
      additional.forEach((d) => {
        grid.innerHTML += getCardHTML(d);
      });
    } else {
      additionalSection.style.display = 'none';
    }

    if (results.comorbidities && results.comorbidities.length > 0) {
      comorbidSection.style.display = 'block';
      results.comorbidities.forEach((c) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${c.label}</strong> — ${c.description}`;
        comorbidList.appendChild(li);
      });
    } else {
      comorbidSection.style.display = 'none';
    }

    const aiBox = document.getElementById("aiRecommendationsBox");

    if (aiBox && recList.length > 0) {
      aiBox.innerHTML = `
        <h4 style="margin-top:10px;">Personalized Recommendations</h4>
        <ul style="padding-left:18px;">
          ${recList.map(r => `<li>${r}</li>`).join("")}
        </ul>
      `;
    }
  }

  // Sync button state on page load
  syncStartButton();

})();
