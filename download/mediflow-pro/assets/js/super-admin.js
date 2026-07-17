/* ============================================================
   MediFlow — Super Admin Module (Premium Edition)
   ------------------------------------------------------------
   Features:
     - Clinic CRUD with confirm-delete dialog
     - Dashboard with KPI cards + Chart.js charts
     - Sortable / searchable / filterable clinics table
     - Clinics grid with type & plan filters
     - Subscriptions page with plan comparison
     - Reports page with revenue breakdown
     - Activity timeline (audit log)
     - Settings (theme / language / reset)
     - Notifications drawer
   ============================================================ */

window.MediFlow = window.MediFlow || {};

MediFlow.SuperAdmin = (function () {
  'use strict';

  const { Store, I18n, UI, Router, Seed } = MediFlow;
  const { t, applyI18n, applyDirection } = I18n;
  const { escapeHtml, fmtMoney, fmtNum, fmtDate, fmtDateInput, fmtRelative, fmtTime, uid, clinicTypeMeta } = UI;

  // ---- State ----
  let _revenueChart = null;
  let _typesChart   = null;
  let _sortKey      = 'name';
  let _sortDir      = 'asc';
  let _searchQuery  = '';
  let _gridSearch   = '';
  let _filterType   = '';
  let _filterPlan   = '';

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    Seed.seedIfEmpty();
    UI.applyTheme();
    UI.chartDefaults();
    applyI18n();
    applyDirection();

    Router.configure({
      titleEl: 'pageTitle',
      subtitleEl: 'pageSubtitle',
      titleMap: {
        'view-dashboard':     'dashboard',
        'view-clinics':       'clinics',
        'view-subscriptions': 'subscriptions',
        'view-reports':       'reports',
        'view-activity':      'activity',
        'view-settings':      'settings'
      }
    });
    Router.after(onNavigate);
    Router.init();

    bindHeader();
    bindSettings();
    bindFilters();
    bindSidebar();
    UI.bindGlobalEvents();
    renderAll();
    updateLangLabel();
  }

  function onNavigate(viewId) {
    // Re-render the views that depend on data
    renderAll();
    // Refresh charts when entering dashboard
    if (viewId === 'view-dashboard') {
      setTimeout(initCharts, 50);
    }
    // Close mobile sidebar on nav
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('sidebarBackdrop').classList.remove('active');
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
      setTimeout(initCharts, 50);
    });
    document.getElementById('notifBtn').addEventListener('click', () => toggleNotifDrawer(true));

    // Global search (filters clinics table on dashboard)
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
      globalSearch.addEventListener('input', UI.debounce((e) => {
        _searchQuery = e.target.value.toLowerCase().trim();
        renderClinicsTable();
      }, 200));
    }
  }

  function updateLangLabel() {
    // Could show flag/label on the lang button — currently icon-only
    // Highlight active language in settings segmented control
    const lang = I18n.getLang();
    document.querySelectorAll('.lang-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });
  }

  // ============================================================
  // SIDEBAR (mobile + collapse)
  // ============================================================
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

  // ============================================================
  // SETTINGS
  // ============================================================
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
        renderAll();
        setTimeout(initCharts, 50);
      });
    });
  }

  function updateSettingsTheme() {
    const themeToggle = document.getElementById('settingsThemeToggle');
    if (themeToggle) themeToggle.checked = UI.getTheme() === 'dark';
  }

  async function resetAllData() {
    const ok = await UI.confirm({
      title: t('resetData'),
      headline: 'Reset all data?',
      message: 'This will permanently delete all clinics, doctors, patients, and settings, then re-seed sample data.',
      confirmText: t('resetData'),
      danger: true
    });
    if (!ok) return;
    Store.wipeAll();
    UI.toast('All data reset successfully', 'success');
    setTimeout(() => location.reload(), 600);
  }

  // ============================================================
  // FILTERS / SORTING / SEARCH
  // ============================================================
  function bindFilters() {
    // Dashboard clinics table search
    const clinicsSearch = document.getElementById('clinicsSearch');
    if (clinicsSearch) {
      clinicsSearch.addEventListener('input', UI.debounce((e) => {
        _searchQuery = e.target.value.toLowerCase().trim();
        renderClinicsTable();
      }, 200));
    }
    // Sortable column headers
    document.querySelectorAll('.table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-sort');
        if (_sortKey === key) {
          _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          _sortKey = key;
          _sortDir = 'asc';
        }
        renderClinicsTable();
      });
    });
    // Clinics grid filters
    const gridSearch = document.getElementById('clinicsGridSearch');
    if (gridSearch) {
      gridSearch.addEventListener('input', UI.debounce((e) => {
        _gridSearch = e.target.value.toLowerCase().trim();
        renderClinicsGrid();
      }, 200));
    }
    const filterType = document.getElementById('filterType');
    if (filterType) {
      filterType.addEventListener('change', (e) => {
        _filterType = e.target.value;
        renderClinicsGrid();
      });
    }
    const filterPlan = document.getElementById('filterPlan');
    if (filterPlan) {
      filterPlan.addEventListener('change', (e) => {
        _filterPlan = e.target.value;
        renderClinicsGrid();
      });
    }
    // View toggle (grid/table) — future
    document.querySelectorAll('#viewToggle .segment').forEach(seg => {
      seg.addEventListener('click', () => {
        document.querySelectorAll('#viewToggle .segment').forEach(s => s.classList.remove('active'));
        seg.classList.add('active');
      });
    });
  }

  function filteredClinics() {
    let list = Store.getClinics();
    if (_searchQuery) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(_searchQuery) ||
        (c.manager || '').toLowerCase().includes(_searchQuery)
      );
    }
    return list;
  }

  function filteredGridClinics() {
    let list = Store.getClinics();
    if (_gridSearch) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(_gridSearch) ||
        (c.manager || '').toLowerCase().includes(_gridSearch)
      );
    }
    if (_filterType) list = list.filter(c => c.type === _filterType);
    if (_filterPlan) list = list.filter(c => c.plan === _filterPlan);
    return list;
  }

  function sortedClinics(list) {
    return [...list].sort((a, b) => {
      let va = a[_sortKey], vb = b[_sortKey];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return _sortDir === 'asc' ? -1 : 1;
      if (va > vb) return _sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // ============================================================
  // RENDER — called after every navigation
  // ============================================================
  function renderAll() {
    renderStats();
    renderNavCount();
    renderClinicsTable();
    renderClinicsGrid();
    renderSubscriptions();
    renderReports();
    renderActivity();
    renderRecentActivity();
    renderNotifList();
    renderNotifBadge();
    updateSettingsTheme();
    applyI18n();
  }

  // ---- Nav badge count ----
  function renderNavCount() {
    const el = document.getElementById('navClinicCount');
    if (el) el.textContent = fmtNum(Store.getClinics().length);
  }

  // ---- KPI stats ----
  function renderStats() {
    const clinics = Store.getClinics();
    const totalRev = clinics.reduce((s, c) => s + (c.revenue || 0), 0);
    let totalDoctors = 0, totalPatients = 0;
    clinics.forEach(c => {
      const ds = Store.forClinic(c.id);
      totalDoctors += ds.getDoctors().filter(d => d.status === 'onDuty').length;
      totalPatients += ds.getPatients().length;
    });
    setText('statClinics',  fmtNum(clinics.length));
    setText('statRevenue',  fmtMoney(totalRev));
    setText('statDoctors',  fmtNum(totalDoctors));
    setText('statPatients', fmtNum(totalPatients));

    // Reports KPIs
    const avgRev = clinics.length ? totalRev / clinics.length : 0;
    const totalBookings = clinics.reduce((s, c) => s + (c.bookings || 0), 0);
    const avgBookings = clinics.length ? totalBookings / clinics.length : 0;
    const today = new Date();
    const expiringSoon = clinics.filter(c => {
      if (!c.expiry) return false;
      const days = Math.floor((new Date(c.expiry) - today) / 86400000);
      return days >= 0 && days <= 30;
    }).length;
    const expired = clinics.filter(c => {
      if (!c.expiry) return false;
      return new Date(c.expiry) < today;
    }).length;
    setText('statAvgRevenue',  fmtMoney(avgRev));
    setText('statAvgBookings', fmtNum(Math.round(avgBookings)));
    setText('statExpiring',    fmtNum(expiringSoon));
    setText('statChurn',       fmtNum(expired));
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ---- Clinics table (dashboard) ----
  function renderClinicsTable() {
    const tbody = document.getElementById('clinicsTableBody');
    if (!tbody) return;
    const list = sortedClinics(filteredClinics());

    // Update sort indicators
    document.querySelectorAll('.table th.sortable').forEach(th => {
      const key = th.getAttribute('data-sort');
      th.classList.toggle('sorted', key === _sortKey);
      const icon = th.querySelector('.sort-icon');
      if (icon) {
        icon.textContent = key === _sortKey ? (_sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more';
      }
    });

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="table-empty">
            <span class="ms">inbox</span>
            <p>${t('noResults')}</p>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(c => {
      const meta = clinicTypeMeta(c.type);
      const subStatus = subStatusBadge(c);
      return `
        <tr>
          <td>
            <div class="flex items-center gap-3">
              <div class="kpi-icon ${meta.tint}" style="width:32px; height:32px;">
                <span class="ms" style="font-size:18px;">${meta.icon}</span>
              </div>
              <div>
                <div class="font-semibold text-strong">${escapeHtml(c.name)}</div>
                <div class="text-xs text-soft">${escapeHtml(c.manager || '—')}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="clinic-pill clinic-type-${c.type}">
              <span class="clinic-pill-icon"><span class="ms">${meta.icon}</span></span>
              ${t(meta.tKey)}
            </span>
          </td>
          <td class="text-soft">${escapeHtml(c.manager || '—')}</td>
          <td><span class="badge badge-neutral uppercase">${t('plan_' + c.plan)}</span></td>
          <td>
            <div class="flex items-center gap-2">
              <span class="text-soft">${fmtDate(c.expiry)}</span>
              ${subStatus}
            </div>
          </td>
          <td class="tabular">${fmtNum(c.bookings || 0)}</td>
          <td class="font-semibold tabular text-strong">${fmtMoney(c.revenue || 0)}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn-ghost btn-icon btn-sm" title="${t('openClinic')}" onclick="MediFlow.SuperAdmin.openClinic('${c.id}')">
                <span class="ms">open_in_new</span>
              </button>
              <button class="btn btn-ghost btn-icon btn-sm" title="${t('edit')}" onclick="MediFlow.SuperAdmin.editClinic('${c.id}')">
                <span class="ms">edit</span>
              </button>
              <button class="btn btn-ghost btn-icon btn-sm" title="${t('delete')}" style="color: var(--danger);" onclick="MediFlow.SuperAdmin.deleteClinic('${c.id}')">
                <span class="ms">delete</span>
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
    if (days < 0)   return `<span class="badge badge-danger badge-dot">${t('expired')}</span>`;
    if (days < 30)  return `<span class="badge badge-warning badge-dot">${t('expiring')}</span>`;
    return `<span class="badge badge-success badge-dot">${t('active')}</span>`;
  }

  // ---- Clinics grid ----
  function renderClinicsGrid() {
    const grid = document.getElementById('clinicsGrid');
    if (!grid) return;
    const list = filteredGridClinics();
    if (list.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full">
          <div class="table-empty">
            <span class="ms">inbox</span>
            <p>${t('noResults')}</p>
          </div>
        </div>`;
      return;
    }
    grid.innerHTML = list.map(c => {
      const meta = clinicTypeMeta(c.type);
      const ds = Store.forClinic(c.id);
      const docs = ds.getDoctors().length;
      const pats = ds.getPatients().length;
      const subStatus = subStatusBadge(c);
      return `
        <div class="card card-hover" style="display:flex; flex-direction:column;">
          <div class="card-body" style="flex:1; display:flex; flex-direction:column;">
            <div class="flex items-start justify-between mb-4">
              <div class="kpi-icon ${meta.tint}" style="width:44px; height:44px;">
                <span class="ms" style="font-size:24px;">${meta.icon}</span>
              </div>
              ${subStatus}
            </div>
            <h3 class="text-lg font-semibold text-strong mb-1">${escapeHtml(c.name)}</h3>
            <p class="text-sm text-soft mb-4">${escapeHtml(c.manager || '—')}</p>

            <div class="grid grid-cols-2 gap-3 mb-5 text-sm">
              <div>
                <div class="text-xs text-soft uppercase tracking-wider mb-1">${t('plan')}</div>
                <div class="font-semibold capitalize">${t('plan_' + c.plan)}</div>
              </div>
              <div>
                <div class="text-xs text-soft uppercase tracking-wider mb-1">${t('doctors')}</div>
                <div class="font-semibold tabular">${docs}</div>
              </div>
              <div>
                <div class="text-xs text-soft uppercase tracking-wider mb-1">${t('patients')}</div>
                <div class="font-semibold tabular">${pats}</div>
              </div>
              <div>
                <div class="text-xs text-soft uppercase tracking-wider mb-1">${t('revenue')}</div>
                <div class="font-semibold tabular">${fmtMoney(c.revenue || 0)}</div>
              </div>
            </div>

            <div class="flex gap-2 mt-auto">
              <button class="btn btn-primary btn-sm flex-1" onclick="MediFlow.SuperAdmin.openClinic('${c.id}')">
                <span class="ms">login</span>
                <span>${t('openClinic')}</span>
              </button>
              <button class="btn btn-secondary btn-sm" onclick="MediFlow.SuperAdmin.editClinic('${c.id}')" title="${t('edit')}">
                <span class="ms">edit</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ---- Subscriptions ----
  function renderSubscriptions() {
    const counts = { starter: 0, pro: 0, enterprise: 0 };
    Store.getClinics().forEach(c => { if (counts[c.plan] !== undefined) counts[c.plan]++; });
    setText('starterCount',     fmtNum(counts.starter));
    setText('proCount',         fmtNum(counts.pro));
    setText('enterpriseCount',  fmtNum(counts.enterprise));

    const tbody = document.getElementById('subscriptionsTableBody');
    if (!tbody) return;
    const clinics = Store.getClinics();
    if (clinics.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="table-empty"><span class="ms">card_membership</span><p>${t('noData')}</p></div></td></tr>`;
      return;
    }
    const monthlyValue = { starter: 49, pro: 149, enterprise: 399 };
    tbody.innerHTML = clinics.map(c => {
      const meta = clinicTypeMeta(c.type);
      const subStatus = subStatusBadge(c);
      return `
        <tr>
          <td>
            <div class="flex items-center gap-3">
              <div class="kpi-icon ${meta.tint}" style="width:32px; height:32px;">
                <span class="ms" style="font-size:18px;">${meta.icon}</span>
              </div>
              <div>
                <div class="font-semibold text-strong">${escapeHtml(c.name)}</div>
                <div class="text-xs text-soft">${t(meta.tKey)}</div>
              </div>
            </div>
          </td>
          <td><span class="badge badge-neutral uppercase">${t('plan_' + c.plan)}</span></td>
          <td class="text-soft">${fmtDate(c.expiry)}</td>
          <td>${subStatus}</td>
          <td class="font-semibold tabular text-strong">$${monthlyValue[c.plan] || 0}/mo</td>
        </tr>
      `;
    }).join('');
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
      const entries = Object.entries(byType);
      if (entries.length === 0) {
        revEl.innerHTML = `<div class="text-center text-soft py-8">${t('noData')}</div>`;
      } else {
        revEl.innerHTML = entries.map(([type, amt]) => {
          const pct = ((amt / total) * 100).toFixed(1);
          const meta = clinicTypeMeta(type);
          return `
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="clinic-pill clinic-type-${type}" style="font-size:12px;">
                    <span class="clinic-pill-icon" style="width:18px; height:18px;"><span class="ms" style="font-size:12px;">${meta.icon}</span></span>
                    ${t(meta.tKey)}
                  </span>
                </div>
                <div class="text-right">
                  <div class="font-semibold tabular text-strong">${fmtMoney(amt)}</div>
                  <div class="text-xs text-soft tabular">${pct}%</div>
                </div>
              </div>
              <div class="progress"><div class="progress-bar" style="width:${pct}%; background:${meta.color};"></div></div>
            </div>
          `;
        }).join('');
      }
    }

    // Top clinics
    const top = [...clinics].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 5);
    const topEl = document.getElementById('topClinics');
    if (topEl) {
      if (top.length === 0) {
        topEl.innerHTML = `<div class="text-center text-soft py-8">${t('noData')}</div>`;
      } else {
        const medalColors = ['#d97706', '#71717a', '#b45309', '#a1a1aa', '#a1a1aa'];
        topEl.innerHTML = top.map((c, i) => {
          const meta = clinicTypeMeta(c.type);
          return `
            <div class="flex items-center gap-3 p-3 rounded-lg" style="background: var(--surface-2);">
              <div style="width:28px; height:28px; border-radius:50%; background:${medalColors[i]}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; flex-shrink:0;">${i + 1}</div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm text-strong truncate">${escapeHtml(c.name)}</div>
                <div class="text-xs text-soft flex items-center gap-1">
                  <span class="clinic-pill clinic-type-${c.type}" style="font-size:10px; padding:1px 6px 1px 1px;">
                    <span class="clinic-pill-icon" style="width:14px; height:14px;"><span class="ms" style="font-size:10px;">${meta.icon}</span></span>
                    ${t(meta.tKey)}
                  </span>
                  <span>·</span>
                  <span>${fmtNum(c.bookings)} ${t('bookings').toLowerCase()}</span>
                </div>
              </div>
              <div class="font-semibold tabular text-strong text-sm">${fmtMoney(c.revenue || 0)}</div>
            </div>
          `;
        }).join('');
      }
    }

    // Performance table
    const perfTbody = document.getElementById('performanceTableBody');
    if (perfTbody) {
      const maxRev = Math.max(...clinics.map(c => c.revenue || 0), 1);
      if (clinics.length === 0) {
        perfTbody.innerHTML = `<tr><td colspan="6"><div class="table-empty"><span class="ms">bar_chart</span><p>${t('noData')}</p></div></td></tr>`;
      } else {
        perfTbody.innerHTML = [...clinics].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).map(c => {
          const meta = clinicTypeMeta(c.type);
          const pct = ((c.revenue || 0) / maxRev * 100).toFixed(0);
          return `
            <tr>
              <td>
                <div class="font-semibold text-strong">${escapeHtml(c.name)}</div>
                <div class="text-xs text-soft">${escapeHtml(c.manager || '—')}</div>
              </td>
              <td><span class="clinic-pill clinic-type-${c.type}" style="font-size:11px;"><span class="clinic-pill-icon" style="width:18px; height:18px;"><span class="ms" style="font-size:11px;">${meta.icon}</span></span>${t(meta.tKey)}</span></td>
              <td><span class="badge badge-neutral uppercase">${t('plan_' + c.plan)}</span></td>
              <td class="tabular">${fmtNum(c.bookings || 0)}</td>
              <td class="font-semibold tabular text-strong">${fmtMoney(c.revenue || 0)}</td>
              <td>
                <div class="flex items-center gap-2">
                  <div class="progress" style="flex:1;"><div class="progress-bar" style="width:${pct}%; background:${meta.color};"></div></div>
                  <span class="text-xs text-soft tabular" style="min-width:32px;">${pct}%</span>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  // ============================================================
  // CHARTS (Chart.js)
  // ============================================================
  function initCharts() {
    initRevenueChart();
    initTypesChart();
  }

  function initRevenueChart() {
    const canvas = document.getElementById('revenueChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const c = UI.chartColors();

    // Build 6-month synthetic data based on actual clinic revenue
    const clinics = Store.getClinics();
    const totalRev = clinics.reduce((s, c) => s + (c.revenue || 0), 0);
    const baseRev = Math.max(totalRev / 6, 500);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const data = months.map((_, i) => Math.round(baseRev * (0.7 + i * 0.08 + Math.random() * 0.15)));

    if (_revenueChart) _revenueChart.destroy();
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, c.brand + '40');
    gradient.addColorStop(1, c.brand + '00');

    _revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Revenue',
          data,
          borderColor: c.brand,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: c.brand,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ' ' + fmtMoney(ctx.parsed.y)
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: c.text }
          },
          y: {
            beginAtZero: true,
            grid: { color: c.grid, drawBorder: false },
            ticks: {
              color: c.text,
              callback: (v) => '$' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v)
            }
          }
        }
      }
    });
  }

  function initTypesChart() {
    const canvas = document.getElementById('clinicTypesChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const c = UI.chartColors();
    const clinics = Store.getClinics();
    const counts = {};
    clinics.forEach(cl => { counts[cl.type] = (counts[cl.type] || 0) + 1; });

    const labels = [];
    const data = [];
    const colors = [];
    Object.entries(clinicTypeMeta).forEach(([type, meta]) => {
      if (counts[type]) {
        labels.push(t(meta.tKey));
        data.push(counts[type]);
        colors.push(meta.color);
      }
    });

    if (_typesChart) _typesChart.destroy();
    _typesChart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: c.surface,
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: c.text,
              padding: 12,
              boxWidth: 12,
              boxHeight: 12,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.parsed} clinics`
            }
          }
        }
      }
    });
  }

  function refreshCharts() {
    if (_revenueChart) { _revenueChart.destroy(); _revenueChart = null; }
    if (_typesChart)   { _typesChart.destroy();   _typesChart   = null; }
    initCharts();
  }

  // ============================================================
  // ACTIVITY TIMELINE
  // ============================================================
  function renderActivity() {
    const container = document.getElementById('activityTimeline');
    if (!container) return;
    const notifs = Store.getNotifs();
    if (notifs.length === 0) {
      container.innerHTML = `
        <div class="table-empty">
          <span class="ms">history</span>
          <p>${t('noData')}</p>
        </div>`;
      return;
    }
    const iconMap = { info: 'info', success: 'check_circle', danger: 'cancel', warning: 'warning' };
    const colorMap = { info: 'var(--info)', success: 'var(--success)', danger: 'var(--danger)', warning: 'var(--warning)' };
    container.innerHTML = `
      <div class="relative">
        ${notifs.map((n, i) => `
          <div class="flex gap-4 ${i === notifs.length - 1 ? '' : 'pb-6'}">
            <div class="flex flex-col items-center">
              <div style="width:32px; height:32px; border-radius:50%; background:${colorMap[n.type] || colorMap.info}20; color:${colorMap[n.type] || colorMap.info}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <span class="ms" style="font-size:18px;">${iconMap[n.type] || 'info'}</span>
              </div>
              ${i === notifs.length - 1 ? '' : `<div style="width:2px; flex:1; background:var(--border); margin-top:4px;"></div>`}
            </div>
            <div class="flex-1 min-w-0 pt-1">
              <p class="text-sm font-medium text-strong">${escapeHtml(n.message)}</p>
              <p class="text-xs text-soft mt-1">${fmtRelative(n.ts)} · ${fmtTime(n.ts)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderRecentActivity() {
    const container = document.getElementById('recentActivityList');
    if (!container) return;
    const notifs = Store.getNotifs().slice(0, 5);
    if (notifs.length === 0) {
      container.innerHTML = `
        <div class="table-empty">
          <span class="ms">history</span>
          <p>${t('noData')}</p>
        </div>`;
      return;
    }
    const iconMap = { info: 'info', success: 'check_circle', danger: 'cancel', warning: 'warning' };
    const colorMap = { info: 'var(--info)', success: 'var(--success)', danger: 'var(--danger)', warning: 'var(--warning)' };
    container.innerHTML = notifs.map(n => `
      <div class="flex items-start gap-3 px-5 py-3" style="border-bottom: 1px solid var(--border-subtle);">
        <div style="width:32px; height:32px; border-radius:50%; background:${colorMap[n.type] || colorMap.info}20; color:${colorMap[n.type] || colorMap.info}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <span class="ms" style="font-size:18px;">${iconMap[n.type] || 'info'}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-strong">${escapeHtml(n.message)}</p>
          <p class="text-xs text-soft mt-0.5">${fmtRelative(n.ts)}</p>
        </div>
      </div>
    `).join('');
  }

  function clearActivity() {
    Store.setNotifs([]);
    UI.toast('Activity cleared', 'success');
    renderAll();
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
    document.getElementById('clinicExpiryInput').value = fmtDateInput(new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString());
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
    if (!name) {
      UI.toast('Clinic name is required', 'warning');
      const input = document.getElementById('clinicNameInput');
      input.classList.add('input-error');
      setTimeout(() => input.classList.remove('input-error'), 2000);
      return;
    }
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
      UI.toast('Clinic updated successfully', 'success');
    } else {
      clinics.push({ id: uid('cln'), ...payload, bookings: 0, revenue: 0 });
      Store.pushNotif(`New clinic "${name}" onboarded`, 'success');
      UI.toast('Clinic added successfully', 'success');
    }
    Store.setClinics(clinics);
    UI.closeModal('clinicModal');
    renderAll();
  }

  async function deleteClinic(id) {
    const c = Store.getClinics().find(x => x.id === id);
    if (!c) return;
    const ok = await UI.confirm({
      title: t('delete'),
      headline: `Delete "${c.name}"?`,
      message: 'This will permanently delete the clinic and wipe its doctors, patients, inventory, and financials.',
      confirmText: t('delete'),
      danger: true
    });
    if (!ok) return;
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
    Store.pushNotif(`Opened clinic portal: ${c.name}`, 'info');
    window.location.href = 'clinic-portal.html';
  }

  function choosePlan(plan) {
    UI.toast(`Plan "${t('plan_' + plan)}" selected — apply it to a clinic from the Clinics page`, 'info', 4000);
    Router.navigate('view-clinics');
  }

  // ============================================================
  // EXPORT
  // ============================================================
  function exportReport() {
    const clinics = Store.getClinics();
    const data = clinics.map(c => {
      const ds = Store.forClinic(c.id);
      return {
        clinic: c.name,
        type: c.type,
        manager: c.manager,
        plan: c.plan,
        expiry: c.expiry,
        bookings: c.bookings,
        revenue: c.revenue,
        doctors: ds.getDoctors().length,
        patients: ds.getPatients().length
      };
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mediflow-report-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    UI.toast('Report exported', 'success');
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

  function markAllRead() {
    Store.markAllNotifsRead();
    renderNotifList();
    renderNotifBadge();
    UI.toast('All notifications marked as read', 'info');
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    init,
    renderAll,
    refreshCharts,
    // CRUD
    openClinicModal, editClinic, saveClinic, deleteClinic,
    openClinic,
    choosePlan,
    // Activity
    clearActivity,
    // Settings
    resetAllData,
    // Notifications
    toggleNotifDrawer, markAllRead,
    // Export
    exportReport
  };
})();

document.addEventListener('DOMContentLoaded', MediFlow.SuperAdmin.init);
