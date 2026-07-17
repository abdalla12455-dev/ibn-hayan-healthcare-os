/* ============================================================
   MediFlow — Super Admin Module
   Handles: clinic CRUD, subscription analytics, reports,
            and hand-off to the clinic-portal.
   All persistence goes through MediFlow.Store (global keys).
   ============================================================ */

window.MediFlow = window.MediFlow || {};

MediFlow.SuperAdmin = (function () {
  'use strict';

  const { Store, I18n, UI, Router, Seed } = MediFlow;
  const { t, applyI18n, applyDirection } = I18n;
  const { escapeHtml, fmtMoney, fmtNum, fmtDate, fmtDateInput, uid, clinicTypeMeta } = UI;

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    Seed.seedIfEmpty();
    UI.applyTheme();
    applyI18n();
    applyDirection();
    Router.configure({
      titleEl: 'pageTitle',
      subtitleEl: 'pageSubtitle',
      titleMap: {
        'view-dashboard': 'dashboard',
        'view-clinics': 'clinics',
        'view-subscriptions': 'subscriptions',
        'view-reports': 'reports',
        'view-settings': 'settings'
      }
    });
    // Re-render after each navigation
    Router.after(renderAll);
    Router.init();
    bindHeader();
    bindSettings();
    UI.bindGlobalEvents();
    renderAll();
    updateLangLabel();
  }

  // ============================================================
  // HEADER
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
      renderAll();
    });
    document.getElementById('notifBtn').addEventListener('click', toggleNotifPanel);
  }

  function updateLangLabel() {
    const el = document.getElementById('langLabel');
    if (el) el.textContent = I18n.getLang() === 'en' ? 'عربي' : 'English';
  }

  // ============================================================
  // SETTINGS
  // ============================================================
  function bindSettings() {
    document.getElementById('settingsThemeToggle').addEventListener('click', () => {
      UI.toggleTheme();
      updateSettingsTheme();
    });
    document.querySelectorAll('.lang-btn').forEach(b => {
      b.addEventListener('click', () => {
        I18n.setLang(b.getAttribute('data-lang'));
        updateLangLabel();
        renderAll();
      });
    });
    updateSettingsTheme();
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

  function resetAllData() {
    if (!confirm('Reset all data? This cannot be undone.')) return;
    Store.wipeAll();
    location.reload();
  }

  // ============================================================
  // RENDER
  // ============================================================
  function renderAll() {
    renderStats();
    renderClinicsTable();
    renderClinicsGrid();
    renderSubscriptions();
    renderReports();
    renderNotifList();
    renderNotifBadge();
    updateSettingsTheme();
    applyI18n();
  }

  function renderStats() {
    const clinics = Store.getClinics();
    const totalRev = clinics.reduce((s, c) => s + (c.revenue || 0), 0);
    let totalDoctors = 0, totalPatients = 0;
    clinics.forEach(c => {
      const ds = Store.forClinic(c.id);
      totalDoctors += ds.getDoctors().filter(d => d.status === 'onDuty').length;
      totalPatients += ds.getPatients().length;
    });
    document.getElementById('statClinics').textContent  = fmtNum(clinics.length);
    document.getElementById('statRevenue').textContent  = fmtMoney(totalRev);
    document.getElementById('statDoctors').textContent  = fmtNum(totalDoctors);
    document.getElementById('statPatients').textContent = fmtNum(totalPatients);
  }

  // ---- Clinics table ----
  function renderClinicsTable() {
    const tbody = document.getElementById('clinicsTableBody');
    if (!tbody) return;
    const clinics = Store.getClinics();
    if (clinics.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8" style="color: var(--mf-text-soft);" data-i18n="noData">No data available</td></tr>`;
      applyI18n();
      return;
    }
    tbody.innerHTML = clinics.map(c => {
      const meta = clinicTypeMeta(c.type);
      const subBadge = subStatusBadge(c);
      return `
        <tr>
          <td class="font-medium">${escapeHtml(c.name)}</td>
          <td><span class="badge ${meta.badge}">${t(meta.tKey)}</span></td>
          <td>${escapeHtml(c.manager || '—')}</td>
          <td><span class="text-xs font-medium uppercase">${t('plan_' + c.plan)}</span></td>
          <td>${fmtDate(c.expiry)} ${subBadge}</td>
          <td>${fmtNum(c.bookings || 0)}</td>
          <td class="font-semibold">${fmtMoney(c.revenue || 0)}</td>
          <td>
            <div class="flex gap-1">
              <button class="btn btn-ghost btn-sm" title="Open" onclick="MediFlow.SuperAdmin.openClinic('${c.id}')">
                <span class="ms ms-sm">open_in_new</span>
              </button>
              <button class="btn btn-ghost btn-sm" title="Edit" onclick="MediFlow.SuperAdmin.editClinic('${c.id}')">
                <span class="ms ms-sm">edit</span>
              </button>
              <button class="btn btn-ghost btn-sm text-red-500" title="Delete" onclick="MediFlow.SuperAdmin.deleteClinic('${c.id}')">
                <span class="ms ms-sm">delete</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function subStatusBadge(c) {
    if (!c.expiry) return '';
    const days = Math.floor((new Date(c.expiry) - new Date()) / 86400000);
    if (days < 0)   return `<span class="badge badge-expired ml-2">${t('st_cancelled')}</span>`;
    if (days < 30)  return `<span class="badge badge-expiring ml-2">Expiring</span>`;
    return '';
  }

  // ---- Clinics grid ----
  function renderClinicsGrid() {
    const grid = document.getElementById('clinicsGrid');
    if (!grid) return;
    const clinics = Store.getClinics();
    if (clinics.length === 0) {
      grid.innerHTML = `<div class="col-span-full text-center py-12" style="color: var(--mf-text-soft);" data-i18n="noData">No data available</div>`;
      applyI18n();
      return;
    }
    grid.innerHTML = clinics.map(c => {
      const meta = clinicTypeMeta(c.type);
      const ds = Store.forClinic(c.id);
      const docs = ds.getDoctors().length;
      const pats = ds.getPatients().length;
      return `
        <div class="mf-card p-5 flex flex-col">
          <div class="flex items-start justify-between mb-3">
            <div class="w-11 h-11 rounded-xl ${meta.color} flex items-center justify-center text-white">
              <span class="ms ms-md">${meta.icon}</span>
            </div>
            <span class="badge ${meta.badge}">${t(meta.tKey)}</span>
          </div>
          <h4 class="font-semibold text-lg mb-1">${escapeHtml(c.name)}</h4>
          <p class="text-xs mb-3" style="color: var(--mf-text-soft);">${escapeHtml(c.manager || '—')}</p>
          <div class="grid grid-cols-2 gap-2 text-sm mb-4">
            <div><span style="color: var(--mf-text-soft);">${t('plan')}:</span> <span class="font-medium">${t('plan_' + c.plan)}</span></div>
            <div><span style="color: var(--mf-text-soft);">${t('bookings')}:</span> <span class="font-medium">${fmtNum(c.bookings || 0)}</span></div>
            <div><span style="color: var(--mf-text-soft);">${t('doctors')}:</span> <span class="font-medium">${docs}</span></div>
            <div><span style="color: var(--mf-text-soft);">${t('patients')}:</span> <span class="font-medium">${pats}</span></div>
          </div>
          <button class="btn btn-primary mt-auto" onclick="MediFlow.SuperAdmin.openClinic('${c.id}')">
            <span class="ms ms-sm">login</span><span data-i18n="openClinic">Open</span>
          </button>
        </div>
      `;
    }).join('');
    applyI18n();
  }

  // ---- Subscriptions ----
  function renderSubscriptions() {
    const counts = { starter: 0, pro: 0, enterprise: 0 };
    Store.getClinics().forEach(c => { if (counts[c.plan] !== undefined) counts[c.plan]++; });
    const map = { starter: 'starterCount', pro: 'proCount', enterprise: 'enterpriseCount' };
    Object.entries(map).forEach(([k, id]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = `${counts[k]} clinics`;
    });
  }

  // ---- Reports ----
  function renderReports() {
    const clinics = Store.getClinics();
    // Revenue by type
    const byType = {};
    clinics.forEach(c => { byType[c.type] = (byType[c.type] || 0) + (c.revenue || 0); });
    const total = Object.values(byType).reduce((s, v) => s + v, 0) || 1;
    const revEl = document.getElementById('revenueByType');
    if (revEl) {
      revEl.innerHTML = Object.entries(byType).map(([type, amt]) => {
        const pct = ((amt / total) * 100).toFixed(1);
        const meta = clinicTypeMeta(type);
        return `
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span>${t(meta.tKey)}</span>
              <span class="font-semibold">${fmtMoney(amt)} · ${pct}%</span>
            </div>
            <div class="progress"><div style="width:${pct}%"></div></div>
          </div>
        `;
      }).join('');
    }
    // Top clinics
    const top = [...clinics].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 5);
    const topEl = document.getElementById('topClinics');
    if (topEl) {
      topEl.innerHTML = top.map((c, i) => {
        const medal = ['bg-amber-400', 'bg-slate-400', 'bg-amber-700', 'bg-slate-300', 'bg-slate-300'][i];
        const meta = clinicTypeMeta(c.type);
        return `
          <div class="flex items-center gap-3 p-3 rounded-xl" style="background-color: var(--mf-muted-bg);">
            <div class="w-8 h-8 rounded-full ${medal} text-white flex items-center justify-center font-bold text-sm">${i + 1}</div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm truncate">${escapeHtml(c.name)}</p>
              <p class="text-xs" style="color: var(--mf-text-soft);">${t(meta.tKey)} · ${fmtNum(c.bookings)} bookings</p>
            </div>
            <span class="font-semibold text-sm">${fmtMoney(c.revenue || 0)}</span>
          </div>
        `;
      }).join('');
    }
  }

  // ============================================================
  // CLINIC CRUD
  // ============================================================
  function openClinicModal() {
    document.getElementById('clinicModalTitle').textContent = t('addClinic');
    document.getElementById('clinicEditId').value = '';
    document.getElementById('clinicNameInput').value = '';
    document.getElementById('clinicTypeSelect').value = 'DENTAL';
    document.getElementById('clinicManagerInput').value = '';
    document.getElementById('clinicPlanSelect').value = 'starter';
    document.getElementById('clinicExpiryInput').value = fmtDateInput(new Date(Date.now() + 365*24*3600*1000).toISOString());
    UI.openModal('clinicModal');
  }

  function editClinic(id) {
    const c = Store.getClinics().find(x => x.id === id);
    if (!c) return;
    document.getElementById('clinicModalTitle').textContent = t('editClinic');
    document.getElementById('clinicEditId').value = c.id;
    document.getElementById('clinicNameInput').value = c.name;
    document.getElementById('clinicTypeSelect').value = c.type;
    document.getElementById('clinicManagerInput').value = c.manager || '';
    document.getElementById('clinicPlanSelect').value = c.plan;
    document.getElementById('clinicExpiryInput').value = c.expiry;
    UI.openModal('clinicModal');
  }

  function saveClinic() {
    const id = document.getElementById('clinicEditId').value;
    const name = document.getElementById('clinicNameInput').value.trim();
    if (!name) { UI.toast('Clinic name is required', 'warning'); return; }
    const payload = {
      name,
      type: document.getElementById('clinicTypeSelect').value,
      manager: document.getElementById('clinicManagerInput').value.trim(),
      plan: document.getElementById('clinicPlanSelect').value,
      expiry: document.getElementById('clinicExpiryInput').value
    };
    const clinics = Store.getClinics();
    if (id) {
      const idx = clinics.findIndex(c => c.id === id);
      if (idx > -1) clinics[idx] = { ...clinics[idx], ...payload };
      Store.pushNotif(`Clinic "${name}" updated`, 'info');
    } else {
      clinics.push({ id: uid('cln'), ...payload, bookings: 0, revenue: 0 });
      Store.pushNotif(`New clinic "${name}" onboarded`, 'success');
    }
    Store.setClinics(clinics);
    UI.closeModal('clinicModal');
    UI.toast(id ? 'Clinic updated' : 'Clinic added', 'success');
    renderAll();
  }

  function deleteClinic(id) {
    const c = Store.getClinics().find(x => x.id === id);
    if (!c) return;
    if (!confirm(`Delete clinic "${c.name}"? This also wipes its doctors, patients, and inventory.`)) return;
    // Wipe clinic-scoped data first
    Store.forClinic(id).wipe();
    Store.setClinics(Store.getClinics().filter(x => x.id !== id));
    Store.pushNotif(`Clinic "${c.name}" deleted`, 'danger');
    UI.toast('Clinic deleted', 'success');
    renderAll();
  }

  // ============================================================
  // HAND-OFF TO CLINIC PORTAL
  // ============================================================
  function openClinic(id) {
    const c = Store.getClinics().find(x => x.id === id);
    if (!c) return;
    Store.setActiveClinic({ id: c.id, type: c.type, name: c.name });
    window.location.href = 'clinic-portal.html';
  }

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  function toggleNotifPanel() {
    document.getElementById('notifPanel').classList.toggle('active');
  }

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
            <p class="text-xs mt-1" style="color: var(--mf-text-soft);">${UI.fmtTime(n.ts)}</p>
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
  // PUBLIC API
  // ============================================================
  return {
    init,
    renderAll,
    openClinicModal, editClinic, saveClinic, deleteClinic,
    openClinic,
    resetAllData,
    toggleNotifPanel
  };
})();

document.addEventListener('DOMContentLoaded', MediFlow.SuperAdmin.init);
