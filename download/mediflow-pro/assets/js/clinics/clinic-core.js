/* ============================================================
   MediFlow — Clinic Core
   - ClinicRegistry: each specialty module registers a config
   - applyClinicLayout(clinicType): looks up registry & renders
   - Shared patient lifecycle (status flow + timestamps)
   - Shared doctor/employee CRUD
   - Financial engine: fixed salary + incentive * patientsCount
   ============================================================ */

window.MediFlow = window.MediFlow || {};

MediFlow.ClinicRegistry = (function () {
  'use strict';
  const _registry = {};

  function register(config) {
    if (!config || !config.type) throw new Error('Clinic module config requires .type');
    _registry[config.type] = config;
    // Auto-init if defined
    if (typeof config.init === 'function') {
      try { config.init(); } catch (e) { console.error(`[ClinicRegistry] init fail for ${config.type}`, e); }
    }
  }
  function get(type) { return _registry[type] || null; }
  function all() { return Object.values(_registry); }
  function types() { return Object.keys(_registry); }

  return { register, get, all, types };
})();

MediFlow.ClinicCore = (function () {
  'use strict';

  const { Store, I18n, UI, Router, Seed } = MediFlow;
  const { t, applyI18n, applyDirection } = I18n;
  const { escapeHtml, fmtMoney, fmtNum, fmtTime, fmtDate, fmtDuration, uid, nowIso, clinicTypeMeta } = UI;

  // ---- Active clinic context ----
  let _clinic = null;        // { id, type, name, manager, plan, ... }
  let _ds = null;            // DataService bound to _clinic.id
  let _module = null;        // Active clinic module config

  // ---- Patient status flow ----
  const PATIENT_FLOW = ['arrived', 'waiting', 'withDoctor', 'completed'];

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    Seed.seedIfEmpty();
    loadClinicContext();
    if (!_clinic) return;

    UI.applyTheme();
    applyI18n();
    applyDirection();
    applyClinicLayout(_clinic.type);

    Router.configure({
      titleEl: 'pageTitle',
      subtitleEl: 'pageSubtitle',
      titleMap: {
        'view-dashboard': 'dashboard',
        'view-patients': 'patients',
        'view-doctors': 'doctors',
        'view-employees': 'employees',
        'view-financials': 'financials',
        'view-settings': 'settings'
      }
    });
    // Re-render after every navigation
    Router.after(renderAll);
    Router.init();

    bindHeader();
    bindSettings();
    bindPatientFilters();
    UI.bindGlobalEvents();
    renderAll();
    updateLangLabel();
  }

  function loadClinicContext() {
    const meta = Store.getActiveClinic();
    if (!meta) {
      alert('No clinic selected. Redirecting to Super Admin.');
      window.location.href = 'index.html';
      return;
    }
    const clinics = Store.getClinics();
    _clinic = clinics.find(c => c.id === meta.id);
    if (!_clinic) {
      alert('Clinic not found. Redirecting to Super Admin.');
      window.location.href = 'index.html';
      return;
    }
    _ds = Store.forClinic(_clinic.id);
    _module = MediFlow.ClinicRegistry.get(_clinic.type);

    // Header / sidebar cosmetics
    const meta2 = clinicTypeMeta(_clinic.type);
    document.getElementById('clinicNameHeader').textContent = _clinic.name;
    document.getElementById('clinicTypeHeader').textContent = t(meta2.tKey);
    document.getElementById('clinicIcon').textContent = meta2.icon;
    document.getElementById('clinicIconWrap').className = `w-10 h-10 rounded-xl flex items-center justify-center text-white ${meta2.color}`;
    document.getElementById('managerAvatar').textContent = (_clinic.manager || 'CA').slice(0, 2).toUpperCase();
    document.title = `MediFlow · ${_clinic.name}`;

    document.getElementById('settingsClinicName').value = _clinic.name;
    document.getElementById('settingsClinicManager').value = _clinic.manager || '';
  }

  // ============================================================
  // DYNAMIC LAYOUT ENGINE
  // applyClinicLayout(clinicType) — looks up registry, injects:
  //   - extra sidebar nav items
  //   - extra content-canvas sections
  //   - clinic-specific patient form fields
  //   - clinic-specific table columns
  // No if/switch chains — pure registry lookup.
  // ============================================================
  function applyClinicLayout(clinicType) {
    const mod = MediFlow.ClinicRegistry.get(clinicType);
    if (!mod) {
      console.warn(`[ClinicCore] No module registered for type "${clinicType}"`);
      return;
    }
    _module = mod;

    // 1) Inject extra sidebar nav items
    const navHost = document.getElementById('clinicExtraNav');
    if (navHost && mod.extraNav) {
      navHost.innerHTML = mod.extraNav.map(item => `
        <div class="mf-nav-item" data-view="${item.view}">
          <span class="ms ms-md">${item.icon}</span><span>${escapeHtml(item.label)}</span>
        </div>
      `).join('');
    } else if (navHost) {
      navHost.innerHTML = '';
    }

    // 2) Inject extra content-canvas sections
    const viewsHost = document.getElementById('clinicExtraViews');
    if (viewsHost && mod.extraViews) {
      viewsHost.innerHTML = mod.extraViews.map(v => v.html).join('');
    } else if (viewsHost) {
      viewsHost.innerHTML = '';
    }

    // 3) Inject clinic-specific patient form fields
    const fieldsHost = document.getElementById('clinicSpecificFields');
    if (fieldsHost && mod.renderFormFields) {
      fieldsHost.innerHTML = mod.renderFormFields();
    } else if (fieldsHost) {
      fieldsHost.innerHTML = '';
    }

    // 4) Inject clinic-specific table headers (optional)
    if (mod.extraTableHeaders) {
      ['patientTableHead', 'patientFullTableHead'].forEach(id => {
        const head = document.getElementById(id);
        if (head) {
          // Rebuild keeping the standard ones at start, extra before actions
          // Simpler: append if not present
          const existing = head.querySelector('th[data-extra]');
          if (!existing) {
            head.insertAdjacentHTML('beforeend', mod.extraTableHeaders);
          }
        }
      });
    }

    // 5) Re-bind nav (new items just added)
    Router.bindNav();

    // 6) Run module's onLayoutApplied hook
    if (typeof mod.onLayoutApplied === 'function') {
      try { mod.onLayoutApplied(); } catch (e) { console.error(e); }
    }

    applyI18n();
  }

  // ============================================================
  // RENDER ALL
  // ============================================================
  function renderAll() {
    if (!_clinic) return;
    renderDashboardStats();
    renderPatientsTable();
    renderPatientsFullTable();
    renderDoctors();
    renderEmployees();
    renderFinancials();
    renderNotifList();
    renderNotifBadge();
    applyI18n();
    // Module-specific rendering hook
    if (_module && typeof _module.render === 'function') {
      try { _module.render(); } catch (e) { console.error(e); }
    }
  }

  // ---- Dashboard stats ----
  function renderDashboardStats() {
    const today = todayPatients();
    document.getElementById('statPatientsToday').textContent = fmtNum(today.length);
    document.getElementById('statDoctorsCount').textContent = fmtNum(_ds.getDoctors().length);
    document.getElementById('statTodayRevenue').textContent = fmtMoney(today.reduce((s, p) => s + (Number(p.invoice) || 0), 0));
    document.getElementById('statWaiting').textContent = fmtNum(_ds.getPatients().filter(p => p.status === 'waiting' || p.status === 'arrived').length);
  }

  // ============================================================
  // PATIENT LIFECYCLE
  // ============================================================
  function advancePatientStatus(id) {
    const list = _ds.getPatients();
    const p = list.find(x => x.id === id);
    if (!p) return;
    const idx = PATIENT_FLOW.indexOf(p.status);
    if (idx === -1 || idx >= PATIENT_FLOW.length - 1) return;
    const next = PATIENT_FLOW[idx + 1];
    p.status = next;
    if (next === 'withDoctor') p.withDoctorAt = nowIso();
    if (next === 'completed')  p.completedAt  = nowIso();
    _ds.setPatients(list);
    Store.pushNotif(`Patient "${p.name}" → ${t('st_' + next)}`, 'info');
    UI.toast(`Patient advanced to ${t('st_' + next)}`, 'success');
    bumpClinicStats();
    renderAll();
  }

  function setPatientStatus(id, status) {
    const list = _ds.getPatients();
    const p = list.find(x => x.id === id);
    if (!p) return;
    p.status = status;
    if (status === 'withDoctor' && !p.withDoctorAt) p.withDoctorAt = nowIso();
    if (status === 'completed'  && !p.completedAt)  p.completedAt  = nowIso();
    if (status === 'cancelled') p.completedAt = nowIso();
    _ds.setPatients(list);
    Store.pushNotif(`Patient "${p.name}" marked ${t('st_' + status)}`, 'info');
    bumpClinicStats();
    renderAll();
  }

  function calcWaitTime(p) {
    if (!p.arrivedAt) return 0;
    const end = p.withDoctorAt || p.completedAt || nowIso();
    return new Date(end) - new Date(p.arrivedAt);
  }

  // ---- Bump super-admin's bookings/revenue counters for this clinic ----
  function bumpClinicStats() {
    const clinics = Store.getClinics();
    const idx = clinics.findIndex(c => c.id === _clinic.id);
    if (idx === -1) return;
    const all = _ds.getPatients();
    clinics[idx].bookings = all.length;
    clinics[idx].revenue  = all.reduce((s, p) => s + (Number(p.invoice) || 0), 0);
    _clinic = clinics[idx];
    Store.setClinics(clinics);
  }

  // ---- Dashboard table (live queue) ----
  function renderPatientsTable() {
    const tbody = document.getElementById('patientsTableBody');
    if (!tbody) return;
    const list = _ds.getPatients().slice().reverse();
    if (list.length === 0) {
      tbody.innerHTML = emptyRow(8);
      return;
    }
    tbody.innerHTML = list.map(p => {
      const doc = _ds.getDoctors().find(d => d.id === p.doctorId);
      const wait = fmtDuration(calcWaitTime(p));
      const extraCells = _module && _module.renderExtraCells
        ? _module.renderExtraCells(p)
        : '';
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
              <button class="btn btn-ghost btn-sm text-red-500" title="Cancel" onclick="MediFlow.ClinicCore.setPatientStatus('${p.id}','cancelled')">
                <span class="ms ms-sm">cancel</span>
              </button>
            </div>
          </td>
          ${extraCells}
        </tr>
      `;
    }).join('');
  }

  function nextStatusButton(p) {
    const idx = PATIENT_FLOW.indexOf(p.status);
    if (idx === -1 || idx >= PATIENT_FLOW.length - 1) return `<span class="text-xs px-2" style="color: var(--mf-text-soft);">—</span>`;
    const next = PATIENT_FLOW[idx + 1];
    const icon = { waiting: 'hourglass_top', withDoctor: 'medical_services', completed: 'check_circle' }[next] || 'arrow_forward';
    return `<button class="btn btn-ghost btn-sm" title="Advance" onclick="MediFlow.ClinicCore.advancePatientStatus('${p.id}')">
              <span class="ms ms-sm">${icon}</span>
            </button>`;
  }

  // ---- Full patients table (with filters) ----
  function bindPatientFilters() {
    const search = document.getElementById('patientSearch');
    const filter = document.getElementById('patientStatusFilter');
    if (search) search.addEventListener('input', UI.debounce(renderPatientsFullTable, 150));
    if (filter) filter.addEventListener('change', renderPatientsFullTable);
  }

  function renderPatientsFullTable() {
    const tbody = document.getElementById('patientsFullTableBody');
    if (!tbody) return;
    const search = (document.getElementById('patientSearch').value || '').toLowerCase();
    const status = document.getElementById('patientStatusFilter').value;
    let list = _ds.getPatients();
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search) || (p.phone || '').includes(search));
    if (status) list = list.filter(p => p.status === status);
    if (list.length === 0) {
      tbody.innerHTML = emptyRow(7);
      return;
    }
    tbody.innerHTML = list.map(p => {
      const doc = _ds.getDoctors().find(d => d.id === p.doctorId);
      const extraCells = _module && _module.renderExtraCells
        ? _module.renderExtraCells(p)
        : '';
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
              <button class="btn btn-ghost btn-sm" title="Edit" onclick="MediFlow.ClinicCore.editPatient('${p.id}')">
                <span class="ms ms-sm">edit</span>
              </button>
              <button class="btn btn-ghost btn-sm text-red-500" title="Delete" onclick="MediFlow.ClinicCore.deletePatient('${p.id}')">
                <span class="ms ms-sm">delete</span>
              </button>
            </div>
          </td>
          ${extraCells}
        </tr>
      `;
    }).join('');
  }

  function emptyRow(colspan) {
    return `<tr><td colspan="${colspan}" class="text-center py-8" style="color: var(--mf-text-soft);" data-i18n="noData">No data available</td></tr>`;
  }

  // ============================================================
  // PATIENT CRUD
  // ============================================================
  function openPatientModal() {
    document.getElementById('patientModalTitle').textContent = t('addPatient');
    document.getElementById('patientEditId').value = '';
    document.getElementById('patientNameInput').value = '';
    document.getElementById('patientPhoneInput').value = '';
    document.getElementById('patientAgeInput').value = '';
    document.getElementById('patientGenderInput').value = 'male';
    document.getElementById('patientInvoiceInput').value = '0';
    populateDoctorSelect('');
    // Reset clinic-specific fields
    if (_module && _module.renderFormFields) {
      document.getElementById('clinicSpecificFields').innerHTML = _module.renderFormFields();
    }
    UI.openModal('patientModal');
  }

  function editPatient(id) {
    const p = _ds.getPatients().find(x => x.id === id);
    if (!p) return;
    document.getElementById('patientModalTitle').textContent = t('editPatient');
    document.getElementById('patientEditId').value = p.id;
    document.getElementById('patientNameInput').value = p.name;
    document.getElementById('patientPhoneInput').value = p.phone || '';
    document.getElementById('patientAgeInput').value = p.age || '';
    document.getElementById('patientGenderInput').value = p.gender || 'male';
    document.getElementById('patientInvoiceInput').value = p.invoice || 0;
    populateDoctorSelect(p.doctorId);
    if (_module && _module.renderFormFields) {
      document.getElementById('clinicSpecificFields').innerHTML = _module.renderFormFields();
      if (typeof _module.hydrateFormFields === 'function') _module.hydrateFormFields(p);
    }
    UI.openModal('patientModal');
  }

  function populateDoctorSelect(selectedId) {
    const sel = document.getElementById('patientDoctorInput');
    const docs = _ds.getDoctors();
    if (docs.length === 0) {
      sel.innerHTML = `<option value="">— No doctors —</option>`;
      return;
    }
    sel.innerHTML = docs.map(d =>
      `<option value="${d.id}" ${d.id === selectedId ? 'selected' : ''}>${escapeHtml(d.name)} — ${escapeHtml(d.specialty || '')}</option>`
    ).join('');
  }

  function savePatient() {
    const id = document.getElementById('patientEditId').value;
    const name = document.getElementById('patientNameInput').value.trim();
    if (!name) { UI.toast('Patient name is required', 'warning'); return; }
    const payload = {
      name,
      phone: document.getElementById('patientPhoneInput').value.trim(),
      age: Number(document.getElementById('patientAgeInput').value) || 0,
      gender: document.getElementById('patientGenderInput').value,
      doctorId: document.getElementById('patientDoctorInput').value,
      invoice: Number(document.getElementById('patientInvoiceInput').value) || 0
    };
    // Attach clinic-specific fields via the module
    if (_module && typeof _module.collectFormFields === 'function') {
      Object.assign(payload, _module.collectFormFields());
    }
    const list = _ds.getPatients();
    if (id) {
      const idx = list.findIndex(p => p.id === id);
      if (idx > -1) list[idx] = { ...list[idx], ...payload };
      Store.pushNotif(`Patient "${name}" updated`, 'info');
      UI.toast('Patient updated', 'success');
    } else {
      payload.id = uid('pat');
      payload.status = 'arrived';
      payload.arrivedAt = nowIso();
      payload.withDoctorAt = null;
      payload.completedAt = null;
      list.push(payload);
      Store.pushNotif(`New patient "${name}" arrived`, 'success');
      UI.toast('Patient added', 'success');
    }
    _ds.setPatients(list);
    bumpClinicStats();
    UI.closeModal('patientModal');
    renderAll();
  }

  function deletePatient(id) {
    const p = _ds.getPatients().find(x => x.id === id);
    if (!p) return;
    if (!confirm(`Delete patient "${p.name}"?`)) return;
    _ds.setPatients(_ds.getPatients().filter(x => x.id !== id));
    Store.pushNotif(`Patient "${p.name}" deleted`, 'danger');
    bumpClinicStats();
    renderAll();
  }

  // ============================================================
  // DOCTOR CRUD
  // ============================================================
  function renderDoctors() {
    const grid = document.getElementById('doctorsGrid');
    if (!grid) return;
    const docs = _ds.getDoctors();
    if (docs.length === 0) {
      grid.innerHTML = `<div class="col-span-full text-center py-12" style="color: var(--mf-text-soft);" data-i18n="noData">No data available</div>`;
      return;
    }
    grid.innerHTML = docs.map(d => {
      const today = todayPatients().filter(p => p.doctorId === d.id);
      const earned = calculateDoctorEarning(d, today.length, today);
      return `
        <div class="mf-card p-5">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-semibold">
                ${escapeHtml(initials(d.name))}
              </div>
              <div>
                <h4 class="font-semibold">${escapeHtml(d.name)}</h4>
                <p class="text-xs" style="color: var(--mf-text-soft);">${escapeHtml(d.specialty || '—')}</p>
              </div>
            </div>
            <span class="badge badge-${d.status}">${t(d.status)}</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm mb-4">
            <div><span style="color: var(--mf-text-soft);">${t('fixedSalary')}:</span> <span class="font-medium">${fmtMoney(d.fixedSalary)}</span></div>
            <div><span style="color: var(--mf-text-soft);">${t('incentiveRate')}:</span> <span class="font-medium">${d.incentiveRate}%</span></div>
            <div><span style="color: var(--mf-text-soft);">${t('patientsToday')}:</span> <span class="font-medium">${today.length}</span></div>
            <div><span style="color: var(--mf-text-soft);">${t('earnedToday')}:</span> <span class="font-medium">${fmtMoney(earned)}</span></div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-success flex-1" onclick="MediFlow.ClinicCore.openPayDoctorModal('${d.id}')">
              <span class="ms ms-sm">payments</span><span data-i18n="payDoctor">Pay Doctor</span>
            </button>
            <button class="btn btn-ghost" onclick="MediFlow.ClinicCore.editDoctor('${d.id}')">
              <span class="ms ms-sm">edit</span>
            </button>
            <button class="btn btn-ghost text-red-500" onclick="MediFlow.ClinicCore.deleteDoctor('${d.id}')">
              <span class="ms ms-sm">delete</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
    applyI18n();
  }

  function initials(name) {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  function openDoctorModal() {
    document.getElementById('doctorModalTitle').textContent = t('addDoctor');
    document.getElementById('doctorEditId').value = '';
    document.getElementById('doctorNameInput').value = '';
    document.getElementById('doctorSpecialtyInput').value = '';
    document.getElementById('doctorStatusInput').value = 'onDuty';
    document.getElementById('doctorSalaryInput').value = '0';
    document.getElementById('doctorIncentiveInput').value = '0';
    UI.openModal('doctorModal');
  }

  function editDoctor(id) {
    const d = _ds.getDoctors().find(x => x.id === id);
    if (!d) return;
    document.getElementById('doctorModalTitle').textContent = t('editDoctor');
    document.getElementById('doctorEditId').value = d.id;
    document.getElementById('doctorNameInput').value = d.name;
    document.getElementById('doctorSpecialtyInput').value = d.specialty || '';
    document.getElementById('doctorStatusInput').value = d.status;
    document.getElementById('doctorSalaryInput').value = d.fixedSalary;
    document.getElementById('doctorIncentiveInput').value = d.incentiveRate;
    UI.openModal('doctorModal');
  }

  function saveDoctor() {
    const id = document.getElementById('doctorEditId').value;
    const name = document.getElementById('doctorNameInput').value.trim();
    if (!name) { UI.toast('Doctor name is required', 'warning'); return; }
    const payload = {
      name,
      specialty: document.getElementById('doctorSpecialtyInput').value.trim(),
      status: document.getElementById('doctorStatusInput').value,
      fixedSalary: Number(document.getElementById('doctorSalaryInput').value) || 0,
      incentiveRate: Number(document.getElementById('doctorIncentiveInput').value) || 0
    };
    const list = _ds.getDoctors();
    if (id) {
      const idx = list.findIndex(d => d.id === id);
      if (idx > -1) list[idx] = { ...list[idx], ...payload };
      UI.toast('Doctor updated', 'success');
    } else {
      payload.id = uid('doc');
      list.push(payload);
      Store.pushNotif(`New doctor "${name}" added`, 'success');
      UI.toast('Doctor added', 'success');
    }
    _ds.setDoctors(list);
    UI.closeModal('doctorModal');
    renderAll();
  }

  function deleteDoctor(id) {
    const d = _ds.getDoctors().find(x => x.id === id);
    if (!d) return;
    if (!confirm(`Delete doctor "${d.name}"?`)) return;
    _ds.setDoctors(_ds.getDoctors().filter(x => x.id !== id));
    Store.pushNotif(`Doctor "${d.name}" deleted`, 'danger');
    renderAll();
  }

  // ============================================================
  // EMPLOYEE CRUD
  // ============================================================
  function renderEmployees() {
    const tbody = document.getElementById('employeesTableBody');
    if (!tbody) return;
    const list = _ds.getEmployees();
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8" style="color: var(--mf-text-soft);">No employees yet</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(e => `
      <tr>
        <td class="font-medium">${escapeHtml(e.name)}</td>
        <td>${escapeHtml(e.role || '—')}</td>
        <td class="font-semibold">${fmtMoney(e.salary || 0)}</td>
        <td><span class="badge ${e.status === 'active' ? 'badge-active' : e.status === 'onLeave' ? 'badge-onLeave' : 'badge-cancelled'}">${escapeHtml(e.status || '—')}</span></td>
        <td>
          <div class="flex gap-1">
            <button class="btn btn-ghost btn-sm" onclick="MediFlow.ClinicCore.editEmployee('${e.id}')">
              <span class="ms ms-sm">edit</span>
            </button>
            <button class="btn btn-ghost btn-sm text-red-500" onclick="MediFlow.ClinicCore.deleteEmployee('${e.id}')">
              <span class="ms ms-sm">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function openEmployeeModal() {
    document.getElementById('employeeModalTitle').textContent = 'Add Employee';
    document.getElementById('employeeEditId').value = '';
    document.getElementById('employeeNameInput').value = '';
    document.getElementById('employeeRoleInput').value = '';
    document.getElementById('employeeSalaryInput').value = '0';
    document.getElementById('employeeStatusInput').value = 'active';
    UI.openModal('employeeModal');
  }

  function editEmployee(id) {
    const e = _ds.getEmployees().find(x => x.id === id);
    if (!e) return;
    document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
    document.getElementById('employeeEditId').value = e.id;
    document.getElementById('employeeNameInput').value = e.name;
    document.getElementById('employeeRoleInput').value = e.role || '';
    document.getElementById('employeeSalaryInput').value = e.salary || 0;
    document.getElementById('employeeStatusInput').value = e.status || 'active';
    UI.openModal('employeeModal');
  }

  function saveEmployee() {
    const id = document.getElementById('employeeEditId').value;
    const name = document.getElementById('employeeNameInput').value.trim();
    if (!name) { UI.toast('Employee name is required', 'warning'); return; }
    const payload = {
      name,
      role: document.getElementById('employeeRoleInput').value.trim(),
      salary: Number(document.getElementById('employeeSalaryInput').value) || 0,
      status: document.getElementById('employeeStatusInput').value
    };
    const list = _ds.getEmployees();
    if (id) {
      const idx = list.findIndex(e => e.id === id);
      if (idx > -1) list[idx] = { ...list[idx], ...payload };
    } else {
      payload.id = uid('emp');
      list.push(payload);
    }
    _ds.setEmployees(list);
    UI.closeModal('employeeModal');
    renderAll();
  }

  function deleteEmployee(id) {
    if (!confirm('Delete this employee?')) return;
    _ds.setEmployees(_ds.getEmployees().filter(x => x.id !== id));
    renderAll();
  }

  // ============================================================
  // PAY DOCTOR
  // ============================================================
  function openPayDoctorModal(id) {
    const d = _ds.getDoctors().find(x => x.id === id);
    if (!d) return;
    const today = todayPatients().filter(p => p.doctorId === d.id);
    const earned = calculateDoctorEarning(d, today.length, today);
    document.getElementById('payDoctorId').value = d.id;
    document.getElementById('payDoctorName').textContent = d.name;
    document.getElementById('payDoctorSalary').textContent = fmtMoney(d.fixedSalary);
    document.getElementById('payDoctorEarned').textContent = fmtMoney(earned);
    document.getElementById('payDoctorAmount').value = (d.fixedSalary + earned).toFixed(2);
    UI.openModal('payDoctorModal');
  }

  function confirmPayDoctor() {
    const id = document.getElementById('payDoctorId').value;
    const amount = Number(document.getElementById('payDoctorAmount').value) || 0;
    const d = _ds.getDoctors().find(x => x.id === id);
    if (!d) return;
    // Record payout
    const fin = _ds.getFinancials();
    fin.payouts = fin.payouts || [];
    fin.payouts.unshift({ id: uid('pyt'), doctorId: d.id, doctorName: d.name, amount, ts: nowIso() });
    fin.expenses = (fin.expenses || 0) + amount;
    _ds.setFinancials(fin);
    Store.pushNotif(`Payment of ${fmtMoney(amount)} processed to ${d.name}`, 'success');
    UI.toast(`Paid ${fmtMoney(amount)} to ${d.name}`, 'success');
    UI.closeModal('payDoctorModal');
    renderAll();
  }

  // ============================================================
  // FINANCIAL ENGINE
  // Calculates payout = fixedSalary + (sum of invoices * incentiveRate/100)
  // where patientsCount drives the incentive component.
  // ============================================================
  function calculateDoctorEarning(doctor, patientsCount, patientList) {
    const list = patientList || todayPatients().filter(p => p.doctorId === doctor.id);
    const incentive = list.reduce((s, p) => s + (Number(p.invoice) || 0) * (doctor.incentiveRate / 100), 0);
    // For "today earned" we return only the incentive portion (salary is monthly)
    return incentive;
  }

  function renderFinancials() {
    const today = todayPatients();
    const todayRev = today.reduce((s, p) => s + (Number(p.invoice) || 0), 0);
    const all = _ds.getPatients();
    const monthRev = all.filter(p => {
      if (!p.arrivedAt) return false;
      const d = new Date(p.arrivedAt);
      const now = new Date();
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).reduce((s, p) => s + (Number(p.invoice) || 0), 0);
    const salaries = _ds.getDoctors().reduce((s, d) => s + (d.fixedSalary || 0), 0);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('finTodayRev', fmtMoney(todayRev));
    set('finMonthRev', fmtMoney(monthRev));
    set('finSalaries', fmtMoney(salaries));

    // Salary table
    const tbody = document.getElementById('salaryTableBody');
    if (!tbody) return;
    const docs = _ds.getDoctors();
    if (docs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8" style="color: var(--mf-text-soft);" data-i18n="noData">No data available</td></tr>`;
      return;
    }
    tbody.innerHTML = docs.map(d => {
      const today = todayPatients().filter(p => p.doctorId === d.id);
      const earned = calculateDoctorEarning(d, today.length, today);
      return `
        <tr>
          <td class="font-medium">${escapeHtml(d.name)}</td>
          <td>${fmtMoney(d.fixedSalary)}</td>
          <td>${d.incentiveRate}%</td>
          <td>${today.length}</td>
          <td class="font-semibold text-emerald-600">${fmtMoney(earned)}</td>
          <td>
            <button class="btn btn-success btn-sm" onclick="MediFlow.ClinicCore.openPayDoctorModal('${d.id}')">
              <span class="ms ms-sm">payments</span><span data-i18n="pay">Pay</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
    applyI18n();
  }

  // ============================================================
  // SETTINGS
  // ============================================================
  function bindHeader() {
    document.getElementById('themeToggle').addEventListener('click', () => {
      UI.toggleTheme();
      updateSettingsTheme();
    });
    document.getElementById('langToggle').addEventListener('click', () => {
      const next = I18n.getLang() === 'en' ? 'ar' : 'en';
      I18n.setLang(next);
      updateLangLabel();
      // Re-apply layout so clinic-type labels re-render in new lang
      applyClinicLayout(_clinic.type);
      renderAll();
    });
    document.getElementById('notifBtn').addEventListener('click', () => {
      document.getElementById('notifPanel').classList.toggle('active');
    });
  }

  function bindSettings() {
    document.getElementById('settingsThemeToggle').addEventListener('click', () => {
      UI.toggleTheme();
      updateSettingsTheme();
    });
    document.querySelectorAll('.lang-btn').forEach(b => {
      b.addEventListener('click', () => {
        I18n.setLang(b.getAttribute('data-lang'));
        updateLangLabel();
        applyClinicLayout(_clinic.type);
        renderAll();
      });
    });
    updateSettingsTheme();
  }

  function updateLangLabel() {
    const el = document.getElementById('langLabel');
    if (el) el.textContent = I18n.getLang() === 'en' ? 'عربي' : 'English';
  }

  function updateSettingsTheme() {
    const dark = UI.getTheme() === 'dark';
    document.querySelectorAll('[data-theme-label]').forEach(el => {
      el.textContent = dark ? t('darkMode') : t('lightMode');
    });
    document.querySelectorAll('[data-theme-toggle-icon]').forEach(el => {
      el.textContent = dark ? 'toggle_on' : 'toggle_off';
    });
  }

  function saveClinicInfo() {
    const clinics = Store.getClinics();
    const idx = clinics.findIndex(c => c.id === _clinic.id);
    if (idx === -1) return;
    clinics[idx].name = document.getElementById('settingsClinicName').value.trim() || clinics[idx].name;
    clinics[idx].manager = document.getElementById('settingsClinicManager').value.trim();
    Store.setClinics(clinics);
    _clinic = clinics[idx];
    document.getElementById('clinicNameHeader').textContent = _clinic.name;
    document.getElementById('managerAvatar').textContent = (_clinic.manager || 'CA').slice(0, 2).toUpperCase();
    Store.pushNotif('Clinic info updated', 'success');
    UI.toast('Clinic info saved', 'success');
  }

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  function renderNotifList() {
    const list = document.getElementById('notifList');
    if (!list) return;
    const notifs = Store.getNotifs();
    if (notifs.length === 0) {
      list.innerHTML = `<p class="text-center py-8 text-sm" style="color: var(--mf-text-soft);" data-i18n="noData">No data available</p>`;
      return;
    }
    const iconMap = { info: 'info', success: 'check_circle', danger: 'error', warning: 'warning' };
    const colorMap = { info: 'text-blue-500', success: 'text-emerald-500', danger: 'text-red-500', warning: 'text-amber-500' };
    list.innerHTML = notifs.map(n => `
      <div class="p-3 rounded-xl ${n.read ? '' : 'bg-indigo-50 dark:bg-indigo-900/30'}" style="${n.read ? '' : 'background-color: var(--mf-primary-l);'}">
        <div class="flex items-start gap-2">
          <span class="ms ms-sm ${colorMap[n.type] || 'text-blue-500'} mt-0.5">${iconMap[n.type] || 'info'}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium">${escapeHtml(n.message)}</p>
            <p class="text-xs mt-1" style="color: var(--mf-text-soft);">${fmtTime(n.ts)}</p>
          </div>
        </div>
      </div>
    `).join('');
    Store.markAllNotifsRead();
  }

  function renderNotifBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    const unread = Store.getNotifs().filter(n => !n.read).length;
    if (unread > 0) {
      badge.textContent = unread > 9 ? '9+' : unread;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // ============================================================
  // DATA HELPERS
  // ============================================================
  function todayPatients() {
    const today = new Date().toDateString();
    return _ds.getPatients().filter(p => p.arrivedAt && new Date(p.arrivedAt).toDateString() === today);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    init,
    renderAll,
    applyClinicLayout,
    // patient
    openPatientModal, editPatient, savePatient, deletePatient,
    advancePatientStatus, setPatientStatus,
    // doctor
    openDoctorModal, editDoctor, saveDoctor, deleteDoctor,
    openPayDoctorModal, confirmPayDoctor,
    // employee
    openEmployeeModal, editEmployee, saveEmployee, deleteEmployee,
    // settings
    saveClinicInfo,
    // exposed for module access (read-only)
    getContext: () => ({ clinic: _clinic, ds: _ds, module: _module }),
    calculateDoctorEarning,
    todayPatients
  };
})();

document.addEventListener('DOMContentLoaded', MediFlow.ClinicCore.init);
