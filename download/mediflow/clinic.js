// ==========================================
// MediFlow Clinic Admin Logic
// clinic.js — daily clinical operations
// Depends on: store.js, i18n.js
// ==========================================

// ---- Current clinic context ----
let currentClinic = null;
let currentClinicType = 'DENTAL';

// ==========================================
// Init
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  seedIfEmpty();
  loadClinicContext();
  applyTheme();
  applyI18n();
  applyDirection();
  applyClinicTypeLayout();
  bindNav();
  bindHeader();
  bindSettings();
  bindPatientFilters();
  renderAll();
  renderNotifBadge();
  renderDentalChart();
});

function loadClinicContext() {
  const meta = storeGet(MF_KEYS.clinicMeta, null);
  if (!meta) {
    // No clinic selected — bounce back to super admin
    alert('No clinic selected. Redirecting to Super Admin.');
    window.location.href = 'index.html';
    return;
  }
  currentClinic = clinicsData.find(c => c.id === meta.id) || clinicsData[0];
  if (!currentClinic) {
    alert('Clinic not found. Redirecting to Super Admin.');
    window.location.href = 'index.html';
    return;
  }
  currentClinicType = currentClinic.type;

  // Update header / sidebar
  document.getElementById('clinicNameHeader').textContent = currentClinic.name;
  document.getElementById('clinicTypeHeader').textContent = t('type_' + clinicTypeKey(currentClinicType));
  document.getElementById('clinicIcon').textContent = clinicTypeIcon(currentClinicType);
  document.getElementById('clinicIconWrap').className =
    'w-10 h-10 rounded-xl flex items-center justify-center text-white ' + clinicTypeColor(currentClinicType);
  document.getElementById('managerAvatar').textContent = (currentClinic.manager || 'CA').slice(0, 2).toUpperCase();
  document.title = `MediFlow · ${currentClinic.name}`;

  // Settings inputs
  document.getElementById('settingsClinicName').value = currentClinic.name;
  document.getElementById('settingsClinicManager').value = currentClinic.manager || '';
}

// ==========================================
// SPA Navigation
// ==========================================
function bindNav() {
  document.querySelectorAll('.mf-nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => switchView(item.getAttribute('data-view')));
  });
}

function switchView(viewId) {
  const target = document.getElementById(viewId);
  if (!target) return;
  document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
  target.classList.remove('hidden');
  document.querySelectorAll('.mf-nav-item').forEach(n => n.classList.remove('active'));
  const nav = document.querySelector(`.mf-nav-item[data-view="${viewId}"]`);
  if (nav) nav.classList.add('active');
  const titleMap = {
    'view-dashboard': 'dashboard',
    'view-patients': 'patients',
    'view-doctors': 'doctors',
    'view-financials': 'financials',
    'view-inventory': 'inventory',
    'view-dental-chart': 'dentalChart',
    'view-settings': 'settings'
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = t(titleMap[viewId] || 'dashboard');
  renderAll();
}

// ==========================================
// Header interactions
// ==========================================
function bindHeader() {
  document.getElementById('themeToggle').addEventListener('click', () => {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    updateSettingsTheme();
  });
  document.getElementById('langToggle').addEventListener('click', () => {
    const next = getLang() === 'en' ? 'ar' : 'en';
    setLang(next);
    document.getElementById('langLabel').textContent = next === 'en' ? 'عربي' : 'English';
    // Refresh type label
    document.getElementById('clinicTypeHeader').textContent = t('type_' + clinicTypeKey(currentClinicType));
    renderAll();
  });
  document.getElementById('notifBtn').addEventListener('click', toggleNotifPanel);
}

function bindSettings() {
  document.getElementById('settingsThemeToggle').addEventListener('click', () => {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    updateSettingsTheme();
  });
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.addEventListener('click', () => {
      setLang(b.getAttribute('data-lang'));
      document.getElementById('langLabel').textContent = b.getAttribute('data-lang') === 'en' ? 'عربي' : 'English';
      document.getElementById('clinicTypeHeader').textContent = t('type_' + clinicTypeKey(currentClinicType));
      renderAll();
    });
  });
  updateSettingsTheme();
}

function updateSettingsTheme() {
  const dark = getTheme() === 'dark';
  const lbl = document.getElementById('settingsThemeLabel');
  const btn = document.getElementById('settingsThemeToggle');
  if (lbl) lbl.textContent = dark ? 'On' : 'Off';
  if (btn) {
    const icon = btn.querySelector('.ms');
    if (icon) icon.textContent = dark ? 'toggle_on' : 'toggle_off';
  }
}

function saveClinicInfo() {
  currentClinic.name = document.getElementById('settingsClinicName').value.trim() || currentClinic.name;
  currentClinic.manager = document.getElementById('settingsClinicManager').value.trim();
  persistClinics();
  document.getElementById('clinicNameHeader').textContent = currentClinic.name;
  document.getElementById('managerAvatar').textContent = (currentClinic.manager || 'CA').slice(0, 2).toUpperCase();
  pushNotif('Clinic info updated', 'success');
  renderNotifBadge();
}

// ==========================================
// CLINIC-TYPE LAYOUT ENGINE
// applyClinicTypeLayout() toggles UI features based on clinicType
// ==========================================
function applyClinicTypeLayout() {
  const type = currentClinicType;

  // ---- Show/hide optional sidebar items ----
  // Lab → inventory visible
  document.querySelectorAll('.clinic-only-lab').forEach(el => {
    el.classList.toggle('hidden', type !== 'LAB');
  });
  // Dental → dental chart visible
  document.querySelectorAll('.clinic-only-dental').forEach(el => {
    el.classList.toggle('hidden', type !== 'DENTAL');
  });

  // ---- Inject clinic-type-specific patient form fields ----
  const spec = document.getElementById('clinicSpecificFields');
  if (!spec) return;
  spec.innerHTML = clinicSpecificFormFields(type);
  applyI18n();
}

/**
 * Returns HTML for clinic-type-specific fields shown in Add/Edit Patient modal.
 * Each clinic type extends the base patient entity with its own attributes.
 */
function clinicSpecificFormFields(type) {
  switch (type) {
    case 'DENTAL':
      return `
        <div>
          <label class="label" data-i18n="toothNumber">Tooth #</label>
          <input class="input" id="patientToothInput" placeholder="e.g. 16, 21" />
        </div>
        <div>
          <label class="label" data-i18n="procedure">Procedure</label>
          <input class="input" id="patientProcedureInput" placeholder="e.g. Filling, Extraction" />
        </div>
      `;
    case 'DERMA_LASER':
      return `
        <div>
          <label class="label" data-i18n="laserType">Laser Type</label>
          <select class="input" id="patientLaserTypeInput">
            <option value="Diode">Diode</option>
            <option value="Alexandrite">Alexandrite</option>
            <option value="Nd:YAG">Nd:YAG</option>
            <option value="IPL">IPL</option>
          </select>
        </div>
        <div>
          <label class="label" data-i18n="bodyArea">Body Area</label>
          <input class="input" id="patientBodyAreaInput" placeholder="e.g. Underarm, Legs" />
        </div>
        <div>
          <label class="label" data-i18n="skinType">Skin Type</label>
          <select class="input" id="patientSkinTypeInput">
            <option value="I">I</option><option value="II">II</option>
            <option value="III">III</option><option value="IV">IV</option>
            <option value="V">V</option><option value="VI">VI</option>
          </select>
        </div>
        <div>
          <label class="label" data-i18n="laserThickness">Hair Thickness</label>
          <select class="input" id="patientHairThicknessInput">
            <option value="Fine">Fine</option>
            <option value="Medium">Medium</option>
            <option value="Coarse">Coarse</option>
          </select>
        </div>
        <div>
          <label class="label" data-i18n="sessions">Sessions</label>
          <input class="input" type="number" id="patientSessionsInput" value="1" min="1" />
        </div>
      `;
    case 'LAB':
      return `
        <div>
          <label class="label" data-i18n="testType">Test Type</label>
          <input class="input" id="patientTestTypeInput" placeholder="e.g. CBC, Lipid Panel" />
        </div>
        <div>
          <label class="label" data-i18n="result">Result</label>
          <input class="input" id="patientResultInput" placeholder="Pending..." />
        </div>
      `;
    case 'PEDIATRICS':
      return `
        <div>
          <label class="label" data-i18n="weight">Weight (kg)</label>
          <input class="input" type="number" id="patientWeightInput" />
        </div>
        <div>
          <label class="label" data-i18n="guardian">Guardian</label>
          <input class="input" id="patientGuardianInput" placeholder="Parent / Guardian name" />
        </div>
      `;
    case 'INTERNAL':
      return `
        <div>
          <label class="label" data-i18n="procedure">Procedure</label>
          <input class="input" id="patientProcedureInput" placeholder="e.g. ECG, Consultation" />
        </div>
        <div>
          <label class="label" data-i18n="result">Notes</label>
          <input class="input" id="patientResultInput" placeholder="Clinical notes" />
        </div>
      `;
    default:
      return '';
  }
}

// ==========================================
// Rendering — Dashboard
// ==========================================
function renderAll() {
  renderDashboardStats();
  renderPatientsTable();
  renderPatientsFullTable();
  renderDoctors();
  renderFinancials();
  renderNotifList();
  renderNotifBadge();
  updateSettingsTheme();
}

function renderDashboardStats() {
  const todayPatients = getTodayPatients();
  document.getElementById('statPatientsToday').textContent = fmtNum(todayPatients.length);
  document.getElementById('statDoctorsCount').textContent = fmtNum(getClinicDoctors().length);
  document.getElementById('statTodayRevenue').textContent = fmtMoney(todayPatients.reduce((s, p) => s + (Number(p.invoice) || 0), 0));
  document.getElementById('statWaiting').textContent = fmtNum(getClinicPatients().filter(p => p.status === 'waiting' || p.status === 'arrived').length);
}

// ==========================================
// PATIENT LIFECYCLE
// Status flow: arrived → waiting → withDoctor → completed
// Each transition timestamps the event for wait-time analytics.
// ==========================================
const PATIENT_FLOW = ['arrived', 'waiting', 'withDoctor', 'completed'];

function advancePatientStatus(id) {
  const p = patientsData.find(x => x.id === id);
  if (!p) return;
  const idx = PATIENT_FLOW.indexOf(p.status);
  if (idx === -1 || idx >= PATIENT_FLOW.length - 1) return;
  const next = PATIENT_FLOW[idx + 1];
  p.status = next;
  if (next === 'withDoctor') p.withDoctorAt = nowIso();
  if (next === 'completed')  p.completedAt  = nowIso();
  persistPatients();
  pushNotif(`Patient "${p.name}" → ${t('st_' + next)}`, 'info');
  renderAll();
}

function setPatientStatus(id, status) {
  const p = patientsData.find(x => x.id === id);
  if (!p) return;
  p.status = status;
  if (status === 'withDoctor' && !p.withDoctorAt) p.withDoctorAt = nowIso();
  if (status === 'completed'  && !p.completedAt)  p.completedAt  = nowIso();
  if (status === 'cancelled') p.completedAt = nowIso();
  persistPatients();
  pushNotif(`Patient "${p.name}" marked ${t('st_' + status)}`, 'info');
  renderAll();
}

function calcWaitTime(p) {
  if (!p.arrivedAt) return 0;
  const end = p.withDoctorAt || p.completedAt || nowIso();
  return new Date(end) - new Date(p.arrivedAt);
}

// ==========================================
// Patients — Dashboard table
// ==========================================
function renderPatientsTable() {
  const tbody = document.getElementById('patientsTableBody');
  if (!tbody) return;
  const list = getClinicPatients().slice().reverse();
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-slate-400 py-8" data-i18n="noData">No data available</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(p => {
    const doc = doctorsData.find(d => d.id === p.doctorId);
    const wait = fmtDuration(calcWaitTime(p));
    return `
      <tr>
        <td class="font-medium">${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.phone || '—')}</td>
        <td>${doc ? escapeHtml(doc.name) : '—'}</td>
        <td><span class="badge badge-${p.status}">${t('st_' + p.status)}</span></td>
        <td>${fmtTime(p.arrivedAt)}</td>
        <td>${wait}</td>
        <td class="font-semibold">${fmtMoney(p.invoice || 0)}</td>
        <td>
          <div class="flex gap-1">
            ${nextStatusButton(p)}
            <button class="btn btn-ghost !py-1 !px-2 text-red-500" title="Cancel" onclick="setPatientStatus('${p.id}','cancelled')">
              <span class="ms ms-sm">cancel</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function nextStatusButton(p) {
  const idx = PATIENT_FLOW.indexOf(p.status);
  if (idx === -1 || idx >= PATIENT_FLOW.length - 1) {
    return `<span class="text-xs text-slate-400 px-2">—</span>`;
  }
  const next = PATIENT_FLOW[idx + 1];
  const icon = { waiting: 'hourglass_top', withDoctor: 'medical_services', completed: 'check_circle' }[next] || 'arrow_forward';
  return `<button class="btn btn-ghost !py-1 !px-2" title="Advance" onclick="advancePatientStatus('${p.id}')">
            <span class="ms ms-sm">${icon}</span>
          </button>`;
}

// ==========================================
// Patients — Full table (with filters)
// ==========================================
function bindPatientFilters() {
  const search = document.getElementById('patientSearch');
  const filter = document.getElementById('patientStatusFilter');
  if (search) search.addEventListener('input', renderPatientsFullTable);
  if (filter) filter.addEventListener('change', renderPatientsFullTable);
}

function renderPatientsFullTable() {
  const tbody = document.getElementById('patientsFullTableBody');
  if (!tbody) return;
  const search = (document.getElementById('patientSearch').value || '').toLowerCase();
  const status = document.getElementById('patientStatusFilter').value;
  let list = getClinicPatients();
  if (search) list = list.filter(p =>
    p.name.toLowerCase().includes(search) || (p.phone || '').includes(search)
  );
  if (status) list = list.filter(p => p.status === status);
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-slate-400 py-8" data-i18n="noData">No data available</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(p => {
    const doc = doctorsData.find(d => d.id === p.doctorId);
    return `
      <tr>
        <td class="font-medium">${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.phone || '—')}</td>
        <td>${p.age || '—'}</td>
        <td>${doc ? escapeHtml(doc.name) : '—'}</td>
        <td><span class="badge badge-${p.status}">${t('st_' + p.status)}</span></td>
        <td class="font-semibold">${fmtMoney(p.invoice || 0)}</td>
        <td>
          <div class="flex gap-1">
            <button class="btn btn-ghost !py-1 !px-2" title="Edit" onclick="editPatient('${p.id}')">
              <span class="ms ms-sm">edit</span>
            </button>
            <button class="btn btn-ghost !py-1 !px-2 text-red-500" title="Delete" onclick="deletePatient('${p.id}')">
              <span class="ms ms-sm">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// Patient CRUD
// ==========================================
function openPatientModal() {
  document.getElementById('patientModalTitle').textContent = t('addPatient');
  document.getElementById('patientEditId').value = '';
  document.getElementById('patientNameInput').value = '';
  document.getElementById('patientPhoneInput').value = '';
  document.getElementById('patientAgeInput').value = '';
  document.getElementById('patientGenderInput').value = 'male';
  document.getElementById('patientInvoiceInput').value = '0';
  populateDoctorSelect('');
  // Reset specific fields
  applyClinicTypeLayout();
  document.getElementById('patientModal').classList.add('active');
}

function editPatient(id) {
  const p = patientsData.find(x => x.id === id);
  if (!p) return;
  document.getElementById('patientModalTitle').textContent = t('edit');
  document.getElementById('patientEditId').value = p.id;
  document.getElementById('patientNameInput').value = p.name;
  document.getElementById('patientPhoneInput').value = p.phone || '';
  document.getElementById('patientAgeInput').value = p.age || '';
  document.getElementById('patientGenderInput').value = p.gender || 'male';
  document.getElementById('patientInvoiceInput').value = p.invoice || 0;
  populateDoctorSelect(p.doctorId);
  applyClinicTypeLayout();
  // Hydrate specific fields
  hydrateClinicSpecificFields(p);
  document.getElementById('patientModal').classList.add('active');
}

function populateDoctorSelect(selectedId) {
  const sel = document.getElementById('patientDoctorInput');
  const docs = getClinicDoctors();
  if (docs.length === 0) {
    sel.innerHTML = `<option value="">— No doctors —</option>`;
    return;
  }
  sel.innerHTML = docs.map(d =>
    `<option value="${d.id}" ${d.id === selectedId ? 'selected' : ''}>${escapeHtml(d.name)} — ${escapeHtml(d.specialty || '')}</option>`
  ).join('');
}

function hydrateClinicSpecificFields(p) {
  const type = currentClinicType;
  if (type === 'DENTAL') {
    setVal('patientToothInput', p.toothNumber);
    setVal('patientProcedureInput', p.procedure);
  } else if (type === 'DERMA_LASER') {
    setVal('patientLaserTypeInput', p.laserType);
    setVal('patientBodyAreaInput', p.bodyArea);
    setVal('patientSkinTypeInput', p.skinType);
    setVal('patientHairThicknessInput', p.hairThickness);
    setVal('patientSessionsInput', p.sessions);
  } else if (type === 'LAB') {
    setVal('patientTestTypeInput', p.testType);
    setVal('patientResultInput', p.result);
  } else if (type === 'PEDIATRICS') {
    setVal('patientWeightInput', p.weight);
    setVal('patientGuardianInput', p.guardian);
  } else if (type === 'INTERNAL') {
    setVal('patientProcedureInput', p.procedure);
    setVal('patientResultInput', p.result);
  }
}
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }
function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }

function closePatientModal() {
  document.getElementById('patientModal').classList.remove('active');
}

function savePatient() {
  const id = document.getElementById('patientEditId').value;
  const name = document.getElementById('patientNameInput').value.trim();
  if (!name) { alert('Patient name is required'); return; }
  const payload = {
    clinicId: currentClinic.id,
    name,
    phone: document.getElementById('patientPhoneInput').value.trim(),
    age: Number(document.getElementById('patientAgeInput').value) || 0,
    gender: document.getElementById('patientGenderInput').value,
    doctorId: document.getElementById('patientDoctorInput').value,
    invoice: Number(document.getElementById('patientInvoiceInput').value) || 0
  };
  // Attach clinic-type-specific fields
  Object.assign(payload, collectClinicSpecificFields());

  if (id) {
    const idx = patientsData.findIndex(p => p.id === id);
    if (idx > -1) patientsData[idx] = { ...patientsData[idx], ...payload };
    pushNotif(`Patient "${name}" updated`, 'info');
  } else {
    payload.id = uid('pat');
    payload.status = 'arrived';
    payload.arrivedAt = nowIso();
    payload.withDoctorAt = null;
    payload.completedAt = null;
    patientsData.push(payload);
    // Bump clinic bookings counter
    currentClinic.bookings = (currentClinic.bookings || 0) + 1;
    currentClinic.revenue = (currentClinic.revenue || 0) + (payload.invoice || 0);
    persistClinics();
    pushNotif(`New patient "${name}" arrived`, 'success');
  }
  persistPatients();
  closePatientModal();
  renderAll();
}

function collectClinicSpecificFields() {
  const type = currentClinicType;
  if (type === 'DENTAL') {
    return { toothNumber: getVal('patientToothInput'), procedure: getVal('patientProcedureInput') };
  } else if (type === 'DERMA_LASER') {
    return {
      laserType: getVal('patientLaserTypeInput'),
      bodyArea: getVal('patientBodyAreaInput'),
      skinType: getVal('patientSkinTypeInput'),
      hairThickness: getVal('patientHairThicknessInput'),
      sessions: Number(getVal('patientSessionsInput')) || 1
    };
  } else if (type === 'LAB') {
    return { testType: getVal('patientTestTypeInput'), result: getVal('patientResultInput') };
  } else if (type === 'PEDIATRICS') {
    return { weight: Number(getVal('patientWeightInput')) || 0, guardian: getVal('patientGuardianInput') };
  } else if (type === 'INTERNAL') {
    return { procedure: getVal('patientProcedureInput'), result: getVal('patientResultInput') };
  }
  return {};
}

function deletePatient(id) {
  const p = patientsData.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Delete patient "${p.name}"?`)) return;
  patientsData = patientsData.filter(x => x.id !== id);
  persistPatients();
  pushNotif(`Patient "${p.name}" deleted`, 'danger');
  renderAll();
}

// ==========================================
// Doctors
// ==========================================
function renderDoctors() {
  const grid = document.getElementById('doctorsGrid');
  if (!grid) return;
  const docs = getClinicDoctors();
  if (docs.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center text-slate-400 py-12" data-i18n="noData">No data available</div>`;
    return;
  }
  grid.innerHTML = docs.map(d => {
    const todayPatients = getTodayPatients().filter(p => p.doctorId === d.id);
    const earned = todayPatients.reduce((s, p) => s + (Number(p.invoice) || 0) * (d.incentiveRate / 100), 0);
    return `
      <div class="mf-card p-5">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-semibold">
              ${escapeHtml(d.name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase())}
            </div>
            <div>
              <h4 class="font-semibold">${escapeHtml(d.name)}</h4>
              <p class="text-xs text-slate-500">${escapeHtml(d.specialty || '—')}</p>
            </div>
          </div>
          <span class="badge badge-${d.status}">${t(d.status)}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm mb-4">
          <div><span class="text-slate-500">${t('fixedSalary')}:</span> <span class="font-medium">${fmtMoney(d.fixedSalary)}</span></div>
          <div><span class="text-slate-500">${t('incentiveRate')}:</span> <span class="font-medium">${d.incentiveRate}%</span></div>
          <div><span class="text-slate-500">${t('patientsToday')}:</span> <span class="font-medium">${todayPatients.length}</span></div>
          <div><span class="text-slate-500">${t('earnedToday')}:</span> <span class="font-medium">${fmtMoney(earned)}</span></div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-success flex-1 !py-2" onclick="openPayDoctorModal('${d.id}')">
            <span class="ms ms-sm">payments</span><span data-i18n="payDoctor">Pay Doctor</span>
          </button>
          <button class="btn btn-ghost !py-2" onclick="editDoctor('${d.id}')">
            <span class="ms ms-sm">edit</span>
          </button>
          <button class="btn btn-ghost !py-2 text-red-500" onclick="deleteDoctor('${d.id}')">
            <span class="ms ms-sm">delete</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
  applyI18n();
}

function openDoctorModal() {
  document.getElementById('doctorModalTitle').textContent = t('addDoctor');
  document.getElementById('doctorEditId').value = '';
  document.getElementById('doctorNameInput').value = '';
  document.getElementById('doctorSpecialtyInput').value = '';
  document.getElementById('doctorStatusInput').value = 'onDuty';
  document.getElementById('doctorSalaryInput').value = '0';
  document.getElementById('doctorIncentiveInput').value = '0';
  document.getElementById('doctorModal').classList.add('active');
}

function editDoctor(id) {
  const d = doctorsData.find(x => x.id === id);
  if (!d) return;
  document.getElementById('doctorModalTitle').textContent = t('edit');
  document.getElementById('doctorEditId').value = d.id;
  document.getElementById('doctorNameInput').value = d.name;
  document.getElementById('doctorSpecialtyInput').value = d.specialty || '';
  document.getElementById('doctorStatusInput').value = d.status;
  document.getElementById('doctorSalaryInput').value = d.fixedSalary;
  document.getElementById('doctorIncentiveInput').value = d.incentiveRate;
  document.getElementById('doctorModal').classList.add('active');
}

function closeDoctorModal() {
  document.getElementById('doctorModal').classList.remove('active');
}

function saveDoctor() {
  const id = document.getElementById('doctorEditId').value;
  const name = document.getElementById('doctorNameInput').value.trim();
  if (!name) { alert('Doctor name is required'); return; }
  const payload = {
    clinicId: currentClinic.id,
    name,
    specialty: document.getElementById('doctorSpecialtyInput').value.trim(),
    status: document.getElementById('doctorStatusInput').value,
    fixedSalary: Number(document.getElementById('doctorSalaryInput').value) || 0,
    incentiveRate: Number(document.getElementById('doctorIncentiveInput').value) || 0
  };
  if (id) {
    const idx = doctorsData.findIndex(d => d.id === id);
    if (idx > -1) doctorsData[idx] = { ...doctorsData[idx], ...payload };
    pushNotif(`Doctor "${name}" updated`, 'info');
  } else {
    payload.id = uid('doc');
    doctorsData.push(payload);
    pushNotif(`New doctor "${name}" added`, 'success');
  }
  persistDoctors();
  closeDoctorModal();
  renderAll();
}

function deleteDoctor(id) {
  const d = doctorsData.find(x => x.id === id);
  if (!d) return;
  if (!confirm(`Delete doctor "${d.name}"?`)) return;
  doctorsData = doctorsData.filter(x => x.id !== id);
  persistDoctors();
  pushNotif(`Doctor "${d.name}" deleted`, 'danger');
  renderAll();
}

// ==========================================
// Pay Doctor Modal
// ==========================================
function openPayDoctorModal(id) {
  const d = doctorsData.find(x => x.id === id);
  if (!d) return;
  const todayPatients = getTodayPatients().filter(p => p.doctorId === d.id);
  const earned = todayPatients.reduce((s, p) => s + (Number(p.invoice) || 0) * (d.incentiveRate / 100), 0);
  document.getElementById('payDoctorId').value = d.id;
  document.getElementById('payDoctorName').textContent = d.name;
  document.getElementById('payDoctorSalary').textContent = fmtMoney(d.fixedSalary);
  document.getElementById('payDoctorEarned').textContent = fmtMoney(earned);
  document.getElementById('payDoctorAmount').value = (d.fixedSalary + earned).toFixed(2);
  document.getElementById('payDoctorModal').classList.add('active');
}

function closePayDoctorModal() {
  document.getElementById('payDoctorModal').classList.remove('active');
}

function confirmPayDoctor() {
  const id = document.getElementById('payDoctorId').value;
  const amount = Number(document.getElementById('payDoctorAmount').value) || 0;
  const d = doctorsData.find(x => x.id === id);
  if (!d) return;
  pushNotif(`Payment of ${fmtMoney(amount)} processed to ${d.name}`, 'success');
  closePayDoctorModal();
  renderAll();
}

// ==========================================
// Financials
// ==========================================
function renderFinancials() {
  const todayPatients = getTodayPatients();
  const todayRev = todayPatients.reduce((s, p) => s + (Number(p.invoice) || 0), 0);
  const monthRev = getClinicPatients().filter(p => {
    if (!p.arrivedAt) return false;
    const d = new Date(p.arrivedAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).reduce((s, p) => s + (Number(p.invoice) || 0), 0);
  const salaries = getClinicDoctors().reduce((s, d) => s + (d.fixedSalary || 0), 0);

  const r1 = document.getElementById('finTodayRev'); if (r1) r1.textContent = fmtMoney(todayRev);
  const r2 = document.getElementById('finMonthRev'); if (r2) r2.textContent = fmtMoney(monthRev);
  const r3 = document.getElementById('finSalaries'); if (r3) r3.textContent = fmtMoney(salaries);

  // Salary table
  const tbody = document.getElementById('salaryTableBody');
  if (!tbody) return;
  const docs = getClinicDoctors();
  if (docs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-slate-400 py-8" data-i18n="noData">No data available</td></tr>`;
    return;
  }
  tbody.innerHTML = docs.map(d => {
    const todayPatients = getTodayPatients().filter(p => p.doctorId === d.id);
    const earned = todayPatients.reduce((s, p) => s + (Number(p.invoice) || 0) * (d.incentiveRate / 100), 0);
    return `
      <tr>
        <td class="font-medium">${escapeHtml(d.name)}</td>
        <td>${fmtMoney(d.fixedSalary)}</td>
        <td>${d.incentiveRate}%</td>
        <td>${todayPatients.length}</td>
        <td class="font-semibold text-emerald-600">${fmtMoney(earned)}</td>
        <td>
          <button class="btn btn-success !py-1 !px-3" onclick="openPayDoctorModal('${d.id}')">
            <span class="ms ms-sm">payments</span><span data-i18n="pay">Pay</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  applyI18n();
}

// ==========================================
// Dental Chart (Dental clinic only)
// ==========================================
let affectedTeeth = new Set();

function renderDentalChart() {
  const upper = document.getElementById('upperTeeth');
  const lower = document.getElementById('lowerTeeth');
  if (!upper || !lower) return;
  // Universal numbering: upper 1-32, lower 17-32 (simplified: upper 1-16, lower 17-32)
  const upperTeeth = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
  const lowerTeeth = [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32];
  upper.innerHTML = upperTeeth.map(n =>
    `<div class="tooth ${affectedTeeth.has(n) ? 'affected' : ''}" data-tooth="${n}" onclick="toggleTooth(${n})">${n}</div>`
  ).join('');
  lower.innerHTML = lowerTeeth.map(n =>
    `<div class="tooth ${affectedTeeth.has(n) ? 'affected' : ''}" data-tooth="${n}" onclick="toggleTooth(${n})">${n}</div>`
  ).join('');
}

function toggleTooth(n) {
  if (affectedTeeth.has(n)) affectedTeeth.delete(n);
  else affectedTeeth.add(n);
  renderDentalChart();
}

// ==========================================
// Notifications
// ==========================================
function toggleNotifPanel() {
  document.getElementById('notifPanel').classList.toggle('active');
}
function renderNotifList() {
  const list = document.getElementById('notifList');
  if (!list) return;
  if (notifsData.length === 0) {
    list.innerHTML = `<p class="text-center text-slate-400 py-8 text-sm" data-i18n="noData">No data available</p>`;
    return;
  }
  list.innerHTML = notifsData.map(n => `
    <div class="p-3 rounded-xl ${n.read ? 'bg-slate-50 dark:bg-slate-800' : 'bg-indigo-50 dark:bg-indigo-900/30'}">
      <div class="flex items-start gap-2">
        <span class="ms ms-sm ${notifColor(n.type)} mt-0.5">${notifIcon(n.type)}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium">${escapeHtml(n.message)}</p>
          <p class="text-xs text-slate-500 mt-1">${fmtTime(n.ts)}</p>
        </div>
      </div>
    </div>
  `).join('');
}
function renderNotifBadge() {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  const unread = notifsData.filter(n => !n.read).length;
  if (unread > 0) {
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}
function notifIcon(type) {
  return { info: 'info', success: 'check_circle', danger: 'warning', warning: 'warning' }[type] || 'info';
}
function notifColor(type) {
  return { info: 'text-blue-500', success: 'text-emerald-500', danger: 'text-red-500', warning: 'text-amber-500' }[type] || 'text-blue-500';
}

// ==========================================
// Data filter helpers
// ==========================================
function getClinicDoctors()  { return doctorsData.filter(d => d.clinicId === currentClinic.id); }
function getClinicPatients() { return patientsData.filter(p => p.clinicId === currentClinic.id); }
function getTodayPatients() {
  const today = new Date().toDateString();
  return getClinicPatients().filter(p => p.arrivedAt && new Date(p.arrivedAt).toDateString() === today);
}

// ==========================================
// Clinic-type helpers (mirrors app.js)
// ==========================================
function clinicTypeKey(type) {
  return { DENTAL:'dental', DERMA_LASER:'laser', LAB:'lab', PEDIATRICS:'pediatrics', INTERNAL:'internal' }[type] || 'dental';
}
function clinicTypeColor(type) {
  return { DENTAL:'bg-blue-500', DERMA_LASER:'bg-purple-500', LAB:'bg-emerald-500', PEDIATRICS:'bg-amber-500', INTERNAL:'bg-rose-500' }[type] || 'bg-indigo-500';
}
function clinicTypeIcon(type) {
  return { DENTAL:'dentistry', DERMA_LASER:'spa', LAB:'science', PEDIATRICS:'child_care', INTERNAL:'favorite' }[type] || 'local_hospital';
}

// ==========================================
// HTML escape
// ==========================================
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList && e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});
