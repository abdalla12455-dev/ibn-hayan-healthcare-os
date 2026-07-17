// ==========================================
// MediFlow Super Admin Logic
// app.js — manages clinics, analytics, subscriptions
// ==========================================

// ---- Init on DOM ready ----
document.addEventListener('DOMContentLoaded', () => {
  seedIfEmpty();
  applyTheme();
  applyI18n();
  applyDirection();
  bindNav();
  bindHeader();
  bindSettings();
  renderAll();
  renderNotifBadge();
});

// ==========================================
// SPA Navigation
// ==========================================
function bindNav() {
  document.querySelectorAll('.mf-nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => switchView(item.getAttribute('data-view')));
  });
}

function switchView(viewId) {
  document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById(viewId);
  if (target) target.classList.remove('hidden');
  document.querySelectorAll('.mf-nav-item').forEach(n => n.classList.remove('active'));
  const nav = document.querySelector(`.mf-nav-item[data-view="${viewId}"]`);
  if (nav) nav.classList.add('active');
  // Update page title
  const titleMap = {
    'view-dashboard':     'dashboard',
    'view-clinics':       'clinics',
    'view-subscriptions': 'subscriptions',
    'view-reports':       'reports',
    'view-settings':      'settings'
  };
  const titleKey = titleMap[viewId] || 'dashboard';
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = t(titleKey);
  // Re-render on view switch (data may have changed)
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
    renderAll();
  });
  document.getElementById('notifBtn').addEventListener('click', toggleNotifPanel);
}

// ==========================================
// Settings interactions
// ==========================================
function bindSettings() {
  document.getElementById('settingsThemeToggle').addEventListener('click', () => {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    updateSettingsTheme();
  });
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.addEventListener('click', () => {
      setLang(b.getAttribute('data-lang'));
      document.getElementById('langLabel').textContent = b.getAttribute('data-lang') === 'en' ? 'عربي' : 'English';
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

function resetAllData() {
  if (!confirm('Reset all data? This cannot be undone.')) return;
  Object.values(MF_KEYS).forEach(k => localStorage.removeItem(k));
  location.reload();
}

// ==========================================
// Rendering
// ==========================================
function renderAll() {
  renderStats();
  renderClinicsTable();
  renderClinicsGrid();
  renderSubscriptions();
  renderReports();
  renderNotifList();
  renderNotifBadge();
  updateSettingsTheme();
}

function renderStats() {
  document.getElementById('statClinics').textContent  = fmtNum(clinicsData.length);
  const totalRev = clinicsData.reduce((s, c) => s + (c.revenue || 0), 0);
  document.getElementById('statRevenue').textContent  = fmtMoney(totalRev);
  document.getElementById('statDoctors').textContent  = fmtNum(doctorsData.filter(d => d.status === 'onDuty').length);
  document.getElementById('statPatients').textContent = fmtNum(patientsData.length);
}

// ---- Clinics table (Dashboard view) ----
function renderClinicsTable() {
  const tbody = document.getElementById('clinicsTableBody');
  if (!tbody) return;
  if (clinicsData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-slate-400 py-8" data-i18n="noData">No data available</td></tr>`;
    return;
  }
  tbody.innerHTML = clinicsData.map(c => `
    <tr>
      <td class="font-medium">${escapeHtml(c.name)}</td>
      <td><span class="badge ${clinicTypeBadge(c.type)}">${t('type_' + clinicTypeKey(c.type))}</span></td>
      <td>${escapeHtml(c.manager || '—')}</td>
      <td><span class="text-xs font-medium uppercase">${t('plan_' + c.plan)}</span></td>
      <td>${fmtDate(c.expiry)}</td>
      <td>${fmtNum(c.bookings || 0)}</td>
      <td class="font-semibold">${fmtMoney(c.revenue || 0)}</td>
      <td>
        <div class="flex gap-1">
          <button class="btn btn-ghost !py-1 !px-2" title="Open clinic" onclick="openClinic('${c.id}')">
            <span class="ms ms-sm">open_in_new</span>
          </button>
          <button class="btn btn-ghost !py-1 !px-2" title="Edit" onclick="editClinic('${c.id}')">
            <span class="ms ms-sm">edit</span>
          </button>
          <button class="btn btn-ghost !py-1 !px-2 text-red-500" title="Delete" onclick="deleteClinic('${c.id}')">
            <span class="ms ms-sm">delete</span>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ---- Clinics grid (Clinics view) ----
function renderClinicsGrid() {
  const grid = document.getElementById('clinicsGrid');
  if (!grid) return;
  if (clinicsData.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center text-slate-400 py-12" data-i18n="noData">No data available</div>`;
    return;
  }
  grid.innerHTML = clinicsData.map(c => `
    <div class="mf-card p-5 flex flex-col">
      <div class="flex items-start justify-between mb-3">
        <div class="w-11 h-11 rounded-xl ${clinicTypeColor(c.type)} flex items-center justify-center text-white">
          <span class="ms ms-md">${clinicTypeIcon(c.type)}</span>
        </div>
        <span class="badge ${clinicTypeBadge(c.type)}">${t('type_' + clinicTypeKey(c.type))}</span>
      </div>
      <h4 class="font-semibold text-lg mb-1">${escapeHtml(c.name)}</h4>
      <p class="text-xs text-slate-500 mb-3">${escapeHtml(c.manager || '—')}</p>
      <div class="grid grid-cols-2 gap-2 text-sm mb-4">
        <div><span class="text-slate-500">${t('plan')}:</span> <span class="font-medium">${t('plan_' + c.plan)}</span></div>
        <div><span class="text-slate-500">${t('bookings')}:</span> <span class="font-medium">${fmtNum(c.bookings || 0)}</span></div>
        <div><span class="text-slate-500">${t('revenue')}:</span> <span class="font-medium">${fmtMoney(c.revenue || 0)}</span></div>
        <div><span class="text-slate-500">${t('expiry')}:</span> <span class="font-medium">${fmtDate(c.expiry)}</span></div>
      </div>
      <button class="btn btn-primary mt-auto" onclick="openClinic('${c.id}')">
        <span class="ms ms-sm">login</span><span data-i18n="openClinic">Open</span>
      </button>
    </div>
  `).join('');
  applyI18n();
}

// ---- Subscriptions view ----
function renderSubscriptions() {
  const counts = { starter: 0, pro: 0, enterprise: 0 };
  clinicsData.forEach(c => { if (counts[c.plan] !== undefined) counts[c.plan]++; });
  const sEl = document.getElementById('starterCount');
  const pEl = document.getElementById('proCount');
  const eEl = document.getElementById('enterpriseCount');
  if (sEl) sEl.textContent = `${counts.starter} clinics`;
  if (pEl) pEl.textContent = `${counts.pro} clinics`;
  if (eEl) eEl.textContent = `${counts.enterprise} clinics`;
}

// ---- Reports view ----
function renderReports() {
  // Revenue by type
  const byType = {};
  clinicsData.forEach(c => {
    const k = c.type;
    byType[k] = (byType[k] || 0) + (c.revenue || 0);
  });
  const total = Object.values(byType).reduce((s, v) => s + v, 0) || 1;
  const revEl = document.getElementById('revenueByType');
  if (revEl) {
    revEl.innerHTML = Object.entries(byType).map(([type, amt]) => {
      const pct = ((amt / total) * 100).toFixed(1);
      return `
        <div>
          <div class="flex justify-between text-sm mb-1">
            <span>${t('type_' + clinicTypeKey(type))}</span>
            <span class="font-semibold">${fmtMoney(amt)}</span>
          </div>
          <div class="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full bg-indigo-600 rounded-full" style="width:${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Top clinics
  const top = [...clinicsData].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 5);
  const topEl = document.getElementById('topClinics');
  if (topEl) {
    topEl.innerHTML = top.map((c, i) => `
      <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
        <div class="w-8 h-8 rounded-full ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-slate-300'} text-white flex items-center justify-center font-bold text-sm">${i + 1}</div>
        <div class="flex-1">
          <p class="font-medium text-sm">${escapeHtml(c.name)}</p>
          <p class="text-xs text-slate-500">${t('type_' + clinicTypeKey(c.type))} · ${fmtNum(c.bookings)} bookings</p>
        </div>
        <span class="font-semibold text-sm">${fmtMoney(c.revenue || 0)}</span>
      </div>
    `).join('');
  }
}

// ==========================================
// Clinic CRUD
// ==========================================
function openClinicModal() {
  document.getElementById('clinicModalTitle').textContent = t('addClinic');
  document.getElementById('clinicEditId').value = '';
  document.getElementById('clinicNameInput').value = '';
  document.getElementById('clinicTypeSelect').value = 'DENTAL';
  document.getElementById('clinicManagerInput').value = '';
  document.getElementById('clinicPlanSelect').value = 'starter';
  document.getElementById('clinicExpiryInput').value = new Date(Date.now() + 365*24*3600*1000).toISOString().slice(0, 10);
  document.getElementById('clinicModal').classList.add('active');
}

function editClinic(id) {
  const c = clinicsData.find(x => x.id === id);
  if (!c) return;
  document.getElementById('clinicModalTitle').textContent = t('edit');
  document.getElementById('clinicEditId').value = c.id;
  document.getElementById('clinicNameInput').value = c.name;
  document.getElementById('clinicTypeSelect').value = c.type;
  document.getElementById('clinicManagerInput').value = c.manager || '';
  document.getElementById('clinicPlanSelect').value = c.plan;
  document.getElementById('clinicExpiryInput').value = c.expiry;
  document.getElementById('clinicModal').classList.add('active');
}

function closeClinicModal() {
  document.getElementById('clinicModal').classList.remove('active');
}

function saveClinic() {
  const id = document.getElementById('clinicEditId').value;
  const name = document.getElementById('clinicNameInput').value.trim();
  if (!name) { alert('Clinic name is required'); return; }
  const payload = {
    name,
    type: document.getElementById('clinicTypeSelect').value,
    manager: document.getElementById('clinicManagerInput').value.trim(),
    plan: document.getElementById('clinicPlanSelect').value,
    expiry: document.getElementById('clinicExpiryInput').value
  };
  if (id) {
    const idx = clinicsData.findIndex(c => c.id === id);
    if (idx > -1) clinicsData[idx] = { ...clinicsData[idx], ...payload };
    pushNotif(`Clinic "${name}" updated`, 'info');
  } else {
    clinicsData.push({ id: uid('cln'), ...payload, bookings: 0, revenue: 0 });
    pushNotif(`New clinic "${name}" onboarded`, 'success');
  }
  persistClinics();
  closeClinicModal();
  renderAll();
}

function deleteClinic(id) {
  const c = clinicsData.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`Delete clinic "${c.name}"? This also removes its doctors and patients.`)) return;
  clinicsData = clinicsData.filter(x => x.id !== id);
  doctorsData = doctorsData.filter(d => d.clinicId !== id);
  patientsData = patientsData.filter(p => p.clinicId !== id);
  persistClinics(); persistDoctors(); persistPatients();
  pushNotif(`Clinic "${c.name}" deleted`, 'danger');
  renderAll();
}

// ==========================================
// Open clinic (handoff to Clinic Admin SPA)
// ==========================================
function openClinic(id) {
  const c = clinicsData.find(x => x.id === id);
  if (!c) return;
  // Save clinic context for clinic.html to consume
  storeSet(MF_KEYS.clinicMeta, { id: c.id, type: c.type, name: c.name });
  window.location.href = `clinic.html`;
}

// ==========================================
// Notifications panel
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
// Clinic-type helpers
// ==========================================
function clinicTypeKey(type) {
  return {
    DENTAL: 'dental',
    DERMA_LASER: 'laser',
    LAB: 'lab',
    PEDIATRICS: 'pediatrics',
    INTERNAL: 'internal'
  }[type] || 'dental';
}
function clinicTypeBadge(type) {
  return {
    DENTAL: 'badge-arrived',
    DERMA_LASER: 'badge-withDoctor',
    LAB: 'badge-completed',
    PEDIATRICS: 'badge-waiting',
    INTERNAL: 'badge-onDuty'
  }[type] || 'badge-arrived';
}
function clinicTypeColor(type) {
  return {
    DENTAL: 'bg-blue-500',
    DERMA_LASER: 'bg-purple-500',
    LAB: 'bg-emerald-500',
    PEDIATRICS: 'bg-amber-500',
    INTERNAL: 'bg-rose-500'
  }[type] || 'bg-indigo-500';
}
function clinicTypeIcon(type) {
  return {
    DENTAL: 'dentistry',
    DERMA_LASER: 'spa',
    LAB: 'science',
    PEDIATRICS: 'child_care',
    INTERNAL: 'favorite'
  }[type] || 'local_hospital';
}

// ==========================================
// Tiny HTML-escape helper (prevents XSS from user input)
// ==========================================
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList && e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});
