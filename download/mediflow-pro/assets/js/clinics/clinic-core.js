/* ============================================================
   MediFlow — Clinic Core (Premium Edition)
   ------------------------------------------------------------
   - ClinicRegistry: each specialty module registers a config
   - applyClinicLayout(clinicType): pure registry-driven UI injection
   - Shared patient lifecycle (status flow + timestamps)
   - Shared doctor / employee CRUD
   - Financial engine: fixed salary + (sum invoices * incentiveRate/100)
   - Live queue rendering with status badges + advance buttons
   ============================================================ */

window.MediFlow = window.MediFlow || {};

MediFlow.ClinicRegistry = (function () {
  'use strict';
  const _registry = {};

  function register(config) {
    if (!config || !config.type) throw new Error('Clinic module config requires .type');
    _registry[config.type] = config;
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
  const { escapeHtml, fmtMoney, fmtNum, fmtTime, fmtDate, fmtDuration, fmtRelative, uid, nowIso, clinicTypeMeta } = UI;

  // ---- Active clinic context ----
  let _clinic = null;
  let _ds = null;
  let _module = null;

  // ---- Patient status flow ----
  const PATIENT_FLOW = ['arrived', 'waiting', 'withDoctor', 'completed'];
  const STATUS_META = {
    arrived:    { badge: 'badge-info',    icon: 'login',         color: 'var(--info)' },
    waiting:    { badge: 'badge-warning', icon: 'hourglass_top', color: 'var(--warning)' },
    withDoctor: { badge: 'badge-violet',  icon: 'medical_services', color: 'var(--violet-600)' },
    completed:  { badge: 'badge-success', icon: 'check_circle',  color: 'var(--success)' },
    cancelled:  { badge: 'badge-danger',  icon: 'cancel',        color: 'var(--danger)' }
  };

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    Seed.seedIfEmpty();
    loadClinicContext();
    if (!_clinic) return;

    UI.applyTheme();
    UI.chartDefaults();
    applyI18n();
    applyDirection();
    applyClinicLayout(_clinic.type);

    Router.configure({
      titleEl: 'pageTitle',
      subtitleEl: null,
      titleMap: {
        'view-dashboard': 'dashboard',
        'view-patients': 'patients',
        'view-doctors': 'doctors',
        'view-employees': 'employees',
        'view-financials': 'financials',
        'view-settings': 'settings'
      }
    });
    Router.after(renderAll);
    Router.init();

    bindHeader();
    bindSettings();
    bindPatientFilters();
    bindSidebar();
    UI.bindGlobalEvents();
    renderAll();
    updateLangLabel();
  }

  function loadClinicContext() {
    const meta = Store.getActiveClinic();
    if (!meta) {
      UI.toast('No clinic selected. Redirecting to Super Admin.', 'warning');
      setTimeout(() => { window.location.href = 'index.html'; }, 1200);
      return;
    }
    const clinics = Store.getClinics();
    _clinic = clinics.find(c => c.id === meta.id);
    if (!_clinic) {
      UI.toast('Clinic not found. Redirecting to Super Admin.', 'warning');
      setTimeout(() => { window.location.href = 'index.html'; }, 1200);
      return;
    }
    _ds = Store.forClinic(_clinic.id);
    _module = MediFlow.ClinicRegistry.get(_clinic.type);

    const meta2 = clinicTypeMeta(_clinic.type);
    document.getElementById('clinicNameHeader').textContent = _clinic.name;
    document.getElementById('clinicTypeHeader').textContent = t(meta2.tKey);
    document.getElementById('clinicIcon').textContent = meta2.icon;
    document.getElementById('clinicBreadcrumbName').textContent = _clinic.name;
    document.getElementById('dashboardClinicName').textContent = `${_clinic.name} Dashboard`;

    // Apply brand color to brand-mark
    const wrap = document.getElementById('clinicIconWrap');
    wrap.style.background = `linear-gradient(135deg, ${meta2.color} 0%, ${meta2.color}dd 100%)`;

    // Manager avatar
    const initials = (_clinic.manager || 'CA').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    document.getElementById('managerAvatar').textContent = initials;
    document.getElementById('managerAvatarLarge').textContent = initials;
    document.getElementById('managerName').textContent = _clinic.manager || 'Clinic Admin';

    document.title = `MediFlow · ${_clinic.name}`;

    document.getElementById('settingsClinicName').value = _clinic.name;
    document.getElementById('settingsClinicManager').value = _clinic.manager || '';
  }

  // ============================================================
  // DYNAMIC LAYOUT ENGINE
  // ============================================================
  function applyClinicLayout(clinicType) {
    const mod = MediFlow.ClinicRegistry.get(clinicType);
    if (!mod) {
      console.warn(`[ClinicCore] No module registered for type "${clinicType}"`);
      return;
    }
    _module = mod;

    // 1) Inject extra sidebar nav items (under Operations)
    const navHost = document.getElementById('clinicExtraNav');
    if (navHost && mod.extraNav) {
      navHost.innerHTML = mod.extraNav.map(item => `
        <div class="nav-item" data-view="${item.view}">
          <span class="ms">${item.icon}</span>
          <span class="nav-label">${escapeHtml(item.label)}</span>
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
          const existing = head.querySelector('th[data-extra]');
          if (!existing) {
            head.insertAdjacentHTML('beforeend', mod.extraTableHeaders);
          }
        }
      });
    }

    // 5) Re-bind nav (new items just added)
    Router.bindNav();

    // 6) Module hook
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
    renderQueueStatus();
    renderNotifList();
    renderNotifBadge();
    renderNavCount();
    applyI18n();
    // Module-specific rendering hook
    if (_module && typeof _module.render === 'function') {
      try { _module.render(); } catch (e) { console.error(e); }
    }
  }

  function renderNavCount() {
    const el = document.getElementById('navPatientCount');
    if (el) el.textContent = fmtNum(_ds.getPatients().length);
  }

  // ---- Dashboard stats ----
  function renderDashboardStats() {
    const today = todayPatients();
    setText('statPatientsToday', fmtNum(today.length));
    setText('statDoctorsCount', fmtNum(_ds.getDoctors().length));
    setText('statTodayRevenue', fmtMoney(today.reduce((s, p) => s + (Number(p.invoice) || 0), 0)));
    setText('statWaiting', fmtNum(_ds.getPatients().filter(p => p.status === 'waiting' || p.status === 'arrived').length));
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ---- Queue status breakdown ----
  function renderQueueStatus() {
    const list = document.getElementById('queueStatusList');
    if (!list) return;
    const all = _ds.getPatients();
    const counts = { arrived: 0, waiting: 0, withDoctor: 0, completed: 0, cancelled: 0 };
    all.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });
    const total = all.length || 1;
    list.innerHTML = Object.entries(STATUS_META).map(([key, meta]) => {
      const count = counts[key] || 0;
      const pct = Math.round((count / total) * 100);
      return `
        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span style="width:8px; height:8px; border-radius:50%; background:${meta.color}; display:inline-block;"></span>
              <span class="text-sm font-medium">${t('st_' + key)}</span>
            </div>
            <div class="text-right">
              <span class="font-semibold tabular text-strong">${count}</span>
              <span class="text-xs text-soft ml-1 tabular">${pct}%</span>
            </div>
          </div>
          <div class="progress"><div class="progress-bar" style="width:${pct}%; background:${meta.color};"></div></div>
        </div>
      `;
    }).join('');
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

  // ---- Dashboard live queue table ----
  function renderPatientsTable() {
    const tbody = document.getElementById('patientsTableBody');
    if (!tbody) return;
    const list = _ds.getPatients().slice().reverse();
    if (list.length === 0) {
      tbody.innerHTML = emptyRow(7);
      return;
    }
    tbody.innerHTML = list.map(p => {
      const doc = _ds.getDoctors().find(d => d.id === p.doctorId);
      const wait = fmtDuration(calcWaitTime(p));
      const meta = STATUS_META[p.status] || STATUS_META.arrived;
      const extraCells = _module && _module.renderExtraCells ? _module.renderExtraCells(p) : '';
      return `
        <tr>
          <td>
            <div class="flex items-center gap-3">
              <div class="avatar avatar-sm" style="background: linear-gradient(135deg, ${meta.color} 0%, ${meta.color}cc 100%);">${escapeHtml(initials(p.name))}</div>
              <div>
                <div class="font-semibold text-strong">${escapeHtml(p.name)}</div>
                <div class="text-xs text-soft">${escapeHtml(p.phone || '—')}</div>
              </div>
            </div>
          </td>
          <td>${doc ? escapeHtml(doc.name) : '<span class="text-soft">—</span>'}</td>
          <td><span class="badge ${meta.badge} badge-dot">${t('st_' + p.status)}</span></td>
          <td class="text-soft tabular">${fmtTime(p.arrivedAt)}</td>
          <td class="tabular">${wait}</td>
          <td class="font-semibold tabular text-strong">${fmtMoney(p.invoice || 0)}</td>
          <td>
            <div class="row-actions">
              ${nextStatusButton(p)}
              <button class="btn btn-ghost btn-icon btn-sm" title="Cancel" style="color: var(--danger);" onclick="MediFlow.ClinicCore.setPatientStatus('${p.id}','cancelled')">
                <span class="ms">cancel</span>
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
    if (idx === -1 || idx >= PATIENT_FLOW.length - 1) {
      return `<span class="text-xs text-soft px-2">—</span>`;
    }
    const next = PATIENT_FLOW[idx + 1];
    const icon = { waiting: 'hourglass_top', withDoctor: 'medical_services', completed: 'check_circle' }[next] || 'arrow_forward';
    return `<button class="btn btn-ghost btn-icon btn-sm" title="Advance to ${t('st_' + next)}" onclick="MediFlow.ClinicCore.advancePatientStatus('${p.id}')">
              <span class="ms">${icon}</span>
            </button>`;
  }

  // ---- Full patients table ----
  function bindPatientFilters() {
    const search = document.getElementById('patientSearch');
    const filter = document.getElementById('patientStatusFilter');
    if (search) search.addEventListener('input', UI.debounce(renderPatientsFullTable, 200));
    if (filter) filter.addEventListener('change', renderPatientsFullTable);

    // Global search filters patients table when on patients page
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
      globalSearch.addEventListener('input', UI.debounce((e) => {
        const patientSearch = document.getElementById('patientSearch');
        if (patientSearch) {
          patientSearch.value = e.target.value;
          renderPatientsFullTable();
        }
      }, 200));
    }
  }

  function renderPatientsFullTable() {
    const tbody = document.getElementById('patientsFullTableBody');
    if (!tbody) return;
    const search = (document.getElementById('patientSearch')?.value || '').toLowerCase();
    const status = document.getElementById('patientStatusFilter')?.value || '';
    let list = _ds.getPatients();
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search) || (p.phone || '').includes(search));
    if (status) list = list.filter(p => p.status === status);
    if (list.length === 0) {
      tbody.innerHTML = emptyRow(7);
      return;
    }
    tbody.innerHTML = list.map(p => {
      const doc = _ds.getDoctors().find(d => d.id === p.doctorId);
      const meta = STATUS_META[p.status] || STATUS_META.arrived;
      const extraCells = _module && _module.renderExtraCells ? _module.renderExtraCells(p) : '';
      return `
        <tr>
          <td>
            <div class="flex items-center gap-3">
              <div class="avatar avatar-sm" style="background: linear-gradient(135deg, ${meta.color} 0%, ${meta.color}cc 100%);">${escapeHtml(initials(p.name))}</div>
              <div class="font-semibold text-strong">${escapeHtml(p.name)}</div>
            </div>
          </td>
          <td class="text-soft">${escapeHtml(p.phone || '—')}</td>
          <td class="tabular">${p.age || '—'}</td>
          <td>${doc ? escapeHtml(doc.name) : '<span class="text-soft">—</span>'}</td>
          <td><span class="badge ${meta.badge} badge-dot">${t('st_' + p.status)}</span></td>
          <td class="font-semibold tabular text-strong">${fmtMoney(p.invoice || 0)}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn-ghost btn-icon btn-sm" title="${t('edit')}" onclick="MediFlow.ClinicCore.editPatient('${p.id}')">
                <span class="ms">edit</span>
              </button>
              <button class="btn btn-ghost btn-icon btn-sm" title="${t('delete')}" style="color: var(--danger);" onclick="MediFlow.ClinicCore.deletePatient('${p.id}')">
                <span class="ms">delete</span>
              </button>
            </div>
          </td>
          ${extraCells}
        </tr>
      `;
    }).join('');
  }

  function emptyRow(colspan) {
    return `<tr><td colspan="${colspan}">
      <div class="table-empty">
        <span class="ms">inbox</span>
        <p>${t('noData')}</p>
      </div>
    </td></tr>`;
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
    if (!name) {
      UI.toast('Patient name is required', 'warning');
      const input = document.getElementById('patientNameInput');
      input.classList.add('input-error');
      setTimeout(() => input.classList.remove('input-error'), 2000);
      return;
    }
    const payload = {
      name,
      phone: document.getElementById('patientPhoneInput').value.trim(),
      age: Number(document.getElementById('patientAgeInput').value) || 0,
      gender: document.getElementById('patientGenderInput').value,
      doctorId: document.getElementById('patientDoctorInput').value,
      invoice: Number(document.getElementById('patientInvoiceInput').value) || 0
    };
    if (_module && typeof _module.collectFormFields === 'function') {
      Object.assign(payload, _module.collectFormFields());
    }
    const list = _ds.getPatients();
    if (id) {
      const idx = list.findIndex(p => p.id === id);
      if (idx > -1) list[idx] = { ...list[idx], ...payload };
      Store.pushNotif(`Patient "${name}" updated`, 'info');
      UI.toast('Patient updated successfully', 'success');
    } else {
      payload.id = uid('pat');
      payload.status = 'arrived';
      payload.arrivedAt = nowIso();
      payload.withDoctorAt = null;
      payload.completedAt = null;
      list.push(payload);
      Store.pushNotif(`New patient "${name}" arrived`, 'success');
      UI.toast('Patient added successfully', 'success');
    }
    _ds.setPatients(list);
    bumpClinicStats();
    UI.closeModal('patientModal');
    renderAll();
  }

  async function deletePatient(id) {
    const p = _ds.getPatients().find(x => x.id === id);
    if (!p) return;
    const ok = await UI.confirm({
      title: t('delete'),
      headline: `Delete "${p.name}"?`,
      message: 'This will permanently remove the patient record.',
      confirmText: t('delete'),
      danger: true
    });
    if (!ok) return;
    _ds.setPatients(_ds.getPatients().filter(x => x.id !== id));
    Store.pushNotif(`Patient "${p.name}" deleted`, 'danger');
    UI.toast('Patient deleted', 'success');
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
      grid.innerHTML = `
        <div class="col-span-full">
          <div class="table-empty">
            <span class="ms">medical_services</span>
            <p>${t('noData')}</p>
          </div>
        </div>`;
      return;
    }
    grid.innerHTML = docs.map(d => {
      const today = todayPatients().filter(p => p.doctorId === d.id);
      const earned = calculateDoctorEarning(d, today.length, today);
      const statusMeta = d.status === 'onDuty' ? { badge: 'badge-success', label: t('onDuty') } : { badge: 'badge-warning', label: t('onLeave') };
      return `
        <div class="card card-hover" style="display:flex; flex-direction:column;">
          <div class="card-body" style="flex:1; display:flex; flex-direction:column;">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="avatar avatar-lg" style="background: linear-gradient(135deg, var(--brand) 0%, var(--violet-600) 100%);">${escapeHtml(initials(d.name))}</div>
                <div>
                  <h3 class="font-semibold text-strong">${escapeHtml(d.name)}</h3>
                  <p class="text-sm text-soft">${escapeHtml(d.specialty || '—')}</p>
                </div>
              </div>
              <span class="badge ${statusMeta.badge} badge-dot">${statusMeta.label}</span>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-5 text-sm">
              <div>
                <div class="text-xs text-soft uppercase tracking-wider mb-1">${t('fixedSalary')}</div>
                <div class="font-semibold tabular text-strong">${fmtMoney(d.fixedSalary)}</div>
              </div>
              <div>
                <div class="text-xs text-soft uppercase tracking-wider mb-1">${t('incentiveRate')}</div>
                <div class="font-semibold tabular text-strong">${d.incentiveRate}%</div>
              </div>
              <div>
                <div class="text-xs text-soft uppercase tracking-wider mb-1">${t('patientsToday')}</div>
                <div class="font-semibold tabular text-strong">${today.length}</div>
              </div>
              <div>
                <div class="text-xs text-soft uppercase tracking-wider mb-1">${t('earnedToday')}</div>
                <div class="font-semibold tabular text-success">${fmtMoney(earned)}</div>
              </div>
            </div>

            <div class="flex gap-2 mt-auto">
              <button class="btn btn-success btn-sm flex-1" onclick="MediFlow.ClinicCore.openPayDoctorModal('${d.id}')">
                <span class="ms">payments</span>
                <span data-i18n="payDoctor">Pay Doctor</span>
              </button>
              <button class="btn btn-secondary btn-sm" onclick="MediFlow.ClinicCore.editDoctor('${d.id}')" title="${t('edit')}">
                <span class="ms">edit</span>
              </button>
              <button class="btn btn-secondary btn-sm" onclick="MediFlow.ClinicCore.deleteDoctor('${d.id}')" title="${t('delete')}" style="color: var(--danger);">
                <span class="ms">delete</span>
              </button>
            </div>
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
    if (!name) {
      UI.toast('Doctor name is required', 'warning');
      const input = document.getElementById('doctorNameInput');
      input.classList.add('input-error');
      setTimeout(() => input.classList.remove('input-error'), 2000);
      return;
    }
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
      UI.toast('Doctor updated successfully', 'success');
    } else {
      payload.id = uid('doc');
      list.push(payload);
      Store.pushNotif(`New doctor "${name}" added`, 'success');
      UI.toast('Doctor added successfully', 'success');
    }
    _ds.setDoctors(list);
    UI.closeModal('doctorModal');
    renderAll();
  }

  async function deleteDoctor(id) {
    const d = _ds.getDoctors().find(x => x.id === id);
    if (!d) return;
    const ok = await UI.confirm({
      title: t('delete'),
      headline: `Delete "${d.name}"?`,
      message: 'This will permanently remove the doctor from this clinic.',
      confirmText: t('delete'),
      danger: true
    });
    if (!ok) return;
    _ds.setDoctors(_ds.getDoctors().filter(x => x.id !== id));
    Store.pushNotif(`Doctor "${d.name}" deleted`, 'danger');
    UI.toast('Doctor deleted', 'success');
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
      tbody.innerHTML = `<tr><td colspan="5">${emptyRowInner()}</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(e => {
      const statusMeta = e.status === 'active'
        ? { badge: 'badge-success', label: t('active') }
        : e.status === 'onLeave'
          ? { badge: 'badge-warning', label: t('onLeave') }
          : { badge: 'badge-neutral', label: t('inactive') };
      return `
        <tr>
          <td>
            <div class="flex items-center gap-3">
              <div class="avatar avatar-sm">${escapeHtml(initials(e.name))}</div>
              <div class="font-semibold text-strong">${escapeHtml(e.name)}</div>
            </div>
          </td>
          <td class="text-soft">${escapeHtml(e.role || '—')}</td>
          <td class="font-semibold tabular text-strong">${fmtMoney(e.salary || 0)}</td>
          <td><span class="badge ${statusMeta.badge} badge-dot">${statusMeta.label}</span></td>
          <td>
            <div class="row-actions">
              <button class="btn btn-ghost btn-icon btn-sm" onclick="MediFlow.ClinicCore.editEmployee('${e.id}')" title="${t('edit')}">
                <span class="ms">edit</span>
              </button>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="MediFlow.ClinicCore.deleteEmployee('${e.id}')" title="${t('delete')}" style="color: var(--danger);">
                <span class="ms">delete</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function emptyRowInner() {
    return `<div class="table-empty"><span class="ms">badge</span><p>${t('noData')}</p></div>`;
  }

  function openEmployeeModal() {
    document.getElementById('employeeModalTitle').textContent = t('addEmployee');
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
    document.getElementById('employeeModalTitle').textContent = t('editEmployee') || 'Edit Employee';
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
    if (!name) {
      UI.toast('Employee name is required', 'warning');
      return;
    }
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
      UI.toast('Employee updated', 'success');
    } else {
      payload.id = uid('emp');
      list.push(payload);
      Store.pushNotif(`New employee "${name}" added`, 'success');
      UI.toast('Employee added', 'success');
    }
    _ds.setEmployees(list);
    UI.closeModal('employeeModal');
    renderAll();
  }

  async function deleteEmployee(id) {
    const e = _ds.getEmployees().find(x => x.id === id);
    if (!e) return;
    const ok = await UI.confirm({
      title: t('delete'),
      headline: `Delete "${e.name}"?`,
      message: 'This will permanently remove the employee record.',
      confirmText: t('delete'),
      danger: true
    });
    if (!ok) return;
    _ds.setEmployees(_ds.getEmployees().filter(x => x.id !== id));
    UI.toast('Employee deleted', 'success');
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
  // ============================================================
  function calculateDoctorEarning(doctor, patientsCount, patientList) {
    const list = patientList || todayPatients().filter(p => p.doctorId === doctor.id);
    const incentive = list.reduce((s, p) => s + (Number(p.invoice) || 0) * (doctor.incentiveRate / 100), 0);
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
    setText('finTodayRev', fmtMoney(todayRev));
    setText('finMonthRev', fmtMoney(monthRev));
    setText('finSalaries', fmtMoney(salaries));

    const tbody = document.getElementById('salaryTableBody');
    if (!tbody) return;
    const docs = _ds.getDoctors();
    if (docs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="table-empty"><span class="ms">payments</span><p>${t('noData')}</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = docs.map(d => {
      const today = todayPatients().filter(p => p.doctorId === d.id);
      const earned = calculateDoctorEarning(d, today.length, today);
      return `
        <tr>
          <td>
            <div class="flex items-center gap-3">
              <div class="avatar avatar-sm">${escapeHtml(initials(d.name))}</div>
              <div>
                <div class="font-semibold text-strong">${escapeHtml(d.name)}</div>
                <div class="text-xs text-soft">${escapeHtml(d.specialty || '—')}</div>
              </div>
            </div>
          </td>
          <td class="tabular">${fmtMoney(d.fixedSalary)}</td>
          <td class="tabular">${d.incentiveRate}%</td>
          <td class="tabular">${today.length}</td>
          <td class="font-semibold tabular text-success">${fmtMoney(earned)}</td>
          <td style="text-align:right;">
            <button class="btn btn-success btn-sm" onclick="MediFlow.ClinicCore.openPayDoctorModal('${d.id}')">
              <span class="ms">payments</span>
              <span data-i18n="pay">Pay</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
    applyI18n();
  }

  // ============================================================
  // HEADER / SETTINGS BINDINGS
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
      applyClinicLayout(_clinic.type);
      renderAll();
    });
    document.getElementById('notifBtn').addEventListener('click', () => toggleNotifDrawer(true));
  }

  function bindSettings() {
    const themeToggle = document.getElementById('settingsThemeToggle');
    if (themeToggle) {
      themeToggle.checked = UI.getTheme() === 'dark';
      themeToggle.addEventListener('change', () => {
        UI.setTheme(themeToggle.checked ? 'dark' : 'light');
      });
    }
    document.querySelectorAll('.lang-btn').forEach(b => {
      b.addEventListener('click', () => {
        I18n.setLang(b.getAttribute('data-lang'));
        updateLangLabel();
        applyClinicLayout(_clinic.type);
        renderAll();
      });
    });
  }

  function bindSidebar() {
    const mobileMenu = document.getElementById('mobileMenuBtn');
    if (mobileMenu) {
      mobileMenu.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('mobile-open');
        document.getElementById('sidebarBackdrop').classList.toggle('active');
      });
    }
    const backdrop = document.getElementById('sidebarBackdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('mobile-open');
        backdrop.classList.remove('active');
      });
    }
  }

  function updateLangLabel() {
    const lang = I18n.getLang();
    document.querySelectorAll('.lang-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });
  }

  function updateSettingsTheme() {
    const themeToggle = document.getElementById('settingsThemeToggle');
    if (themeToggle) themeToggle.checked = UI.getTheme() === 'dark';
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
    document.getElementById('clinicBreadcrumbName').textContent = _clinic.name;
    document.getElementById('dashboardClinicName').textContent = `${_clinic.name} Dashboard`;
    const initials = (_clinic.manager || 'CA').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    document.getElementById('managerAvatar').textContent = initials;
    document.getElementById('managerAvatarLarge').textContent = initials;
    document.getElementById('managerName').textContent = _clinic.manager || 'Clinic Admin';
    Store.pushNotif('Clinic info updated', 'success');
    UI.toast('Clinic info saved successfully', 'success');
  }

  // ============================================================
  // NOTIFICATIONS DRAWER
  // ============================================================
  function toggleNotifDrawer(forceOpen) {
    const drawer = document.getElementById('notifDrawer');
    if (!drawer) return;
    if (forceOpen === true) drawer.classList.add('active');
    else if (forceOpen === false) drawer.classList.remove('active');
    else drawer.classList.toggle('active');
  }

  function renderNotifList() {
    const list = document.getElementById('notifList');
    if (!list) return;
    const notifs = Store.getNotifs();
    const countEl = document.getElementById('notifCount');
    if (countEl) countEl.textContent = fmtNum(notifs.length);
    if (notifs.length === 0) {
      list.innerHTML = `
        <div class="table-empty">
          <span class="ms">notifications_off</span>
          <p>${t('noData')}</p>
        </div>`;
      return;
    }
    const iconMap = { info: 'info', success: 'check_circle', danger: 'error', warning: 'warning' };
    const colorMap = { info: 'var(--info)', success: 'var(--success)', danger: 'var(--danger)', warning: 'var(--warning)' };
    list.innerHTML = notifs.map(n => `
      <div class="flex items-start gap-3 p-3 rounded-lg mb-2" style="background: ${n.read ? 'transparent' : 'var(--surface-2)'};">
        <div style="width:32px; height:32px; border-radius:50%; background:${colorMap[n.type] || colorMap.info}20; color:${colorMap[n.type] || colorMap.info}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <span class="ms" style="font-size:18px;">${iconMap[n.type] || 'info'}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-strong">${escapeHtml(n.message)}</p>
          <p class="text-xs text-soft mt-1">${fmtRelative(n.ts)}</p>
        </div>
      </div>
    `).join('');
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
    // notifications
    toggleNotifDrawer,
    // exposed for module access
    getContext: () => ({ clinic: _clinic, ds: _ds, module: _module }),
    calculateDoctorEarning,
    todayPatients
  };
})();

document.addEventListener('DOMContentLoaded', MediFlow.ClinicCore.init);
