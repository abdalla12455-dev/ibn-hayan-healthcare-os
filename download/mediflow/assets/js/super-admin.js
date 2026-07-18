/* ==========================================================================
   MediFlow — Super Admin Controller
   Drives the entire Super Admin Dashboard: navigation, charts, tables,
   modals, filters, bulk actions, theme, i18n, and CRUD over clinics.
   ========================================================================== */
(function (global) {
  'use strict';

  const SuperAdmin = {
    // ----- State -----
    state: {
      currentView: 'overview',
      clinics: [],
      plans: [],
      activity: [],
      revenueHistory: [],
      patientsByType: [],
      filters: {
        search: '',
        status: '',
        type: '',
        plan: ''
      },
      sort: { field: 'name', dir: 'asc' },
      selectedClinics: new Set(),
      pagination: { page: 1, pageSize: 10 },
      confirmCallback: null
    },

    /* ---------------------------------------------------------------------
       INIT
       --------------------------------------------------------------------- */
    init() {
      // Apply persisted theme + lang
      DataService.setTheme(DataService.getTheme());
      DataService.setLang(DataService.getLang());
      this.refreshThemeToggle();
      this.refreshLangToggle();

      // Load data
      this.state.clinics = DataService.getAll('clinics');
      this.state.plans = DataService.getAll('plans');
      this.state.activity = DataService.getAll('activity');
      this.state.revenueHistory = DataService.getAll('revenue_history');
      this.state.patientsByType = DataService.getAll('patients_by_type');

      // Wire events
      this.bindNav();
      this.bindTopbar();
      this.bindFilters();
      this.bindModalBackdrop();
      this.bindKeyboard();

      // First render
      this.renderAll();
    },

    /* ---------------------------------------------------------------------
       NAVIGATION
       --------------------------------------------------------------------- */
    bindNav() {
      document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', e => {
          e.preventDefault();
          this.navigate(item.getAttribute('data-view'));
        });
      });
    },

    navigate(viewId) {
      this.state.currentView = viewId;

      // Toggle active nav item
      document.querySelectorAll('.nav-item[data-view]').forEach(n => n.classList.toggle('active', n.getAttribute('data-view') === viewId));

      // Toggle active page
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const page = document.getElementById(`page-${viewId}`);
      if (page) page.classList.add('active');

      // Update breadcrumb
      const breadcrumbEl = document.getElementById('breadcrumbPage');
      if (breadcrumbEl) breadcrumbEl.textContent = I18n.t(`nav.${viewId}`);

      // Re-render the page content (in case data changed)
      this.renderView(viewId);

      // Close mobile sidebar
      document.getElementById('appShell').classList.remove('sidebar-open');

      // Scroll to top
      document.querySelector('.main-content').scrollTop = 0;
    },

    renderView(viewId) {
      switch (viewId) {
        case 'overview': this.renderOverview(); break;
        case 'clinics': this.renderClinicsTable(); break;
        case 'subscriptions': this.renderSubscriptions(); break;
        case 'plans': this.renderPlans(); break;
        case 'analytics': this.renderAnalytics(); break;
        case 'activity': this.renderActivityTable(); break;
      }
    },

    renderAll() {
      this.renderOverview();
      this.renderClinicsTable();
      this.renderSubscriptions();
      this.renderPlans();
      this.renderActivityTable();
      this.renderAnalytics();
    },

    /* ---------------------------------------------------------------------
       TOPBAR (theme, lang, dropdowns)
       --------------------------------------------------------------------- */
    bindTopbar() {
      // Mobile sidebar toggle
      const sidebarToggle = document.getElementById('sidebarToggle');
      const appShell = document.getElementById('appShell');

      // Show mobile toggle on small screens
      const mq = window.matchMedia('(max-width: 1024px)');
      const handleMq = e => {
        sidebarToggle.style.display = e.matches ? 'grid' : 'none';
      };
      handleMq(mq);
      mq.addEventListener('change', handleMq);

      sidebarToggle.addEventListener('click', () => {
        appShell.classList.toggle('sidebar-open');
      });

      // Theme
      document.getElementById('themeLightBtn').addEventListener('click', () => this.setTheme('light'));
      document.getElementById('themeDarkBtn').addEventListener('click', () => this.setTheme('dark'));

      // Language dropdown
      this.bindDropdown('langDropdown', 'langToggleBtn');
      document.querySelectorAll('[data-lang]').forEach(item => {
        item.addEventListener('click', () => {
          this.setLang(item.getAttribute('data-lang'));
          document.getElementById('langDropdown').classList.remove('open');
        });
      });

      // Notifications dropdown
      this.bindDropdown('notifDropdown', 'notifToggleBtn');

      // User dropdown
      this.bindDropdown('userDropdown', 'userToggleBtn');

      // Global search keyboard shortcut (Cmd+K / Ctrl+K)
      document.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          const searchInput = document.querySelector('.global-search .input');
          if (searchInput) searchInput.focus();
        }
      });
    },

    bindDropdown(dropdownId, triggerId) {
      const dd = document.getElementById(dropdownId);
      const trigger = document.getElementById(triggerId);
      if (!dd || !trigger) return;
      trigger.addEventListener('click', e => {
        e.stopPropagation();
        // Close other dropdowns
        document.querySelectorAll('.dropdown.open').forEach(d => { if (d !== dd) d.classList.remove('open'); });
        dd.classList.toggle('open');
      });
      document.addEventListener('click', e => {
        if (!dd.contains(e.target)) dd.classList.remove('open');
      });
    },

    setTheme(theme) {
      DataService.setTheme(theme);
      this.refreshThemeToggle();
    },

    refreshThemeToggle() {
      const theme = DataService.getTheme();
      document.getElementById('themeLightBtn').classList.toggle('active', theme === 'light');
      document.getElementById('themeDarkBtn').classList.toggle('active', theme === 'dark');
    },

    setLang(lang) {
      I18n.setLang(lang);
      this.refreshLangToggle();
      // Refresh all dynamic content
      this.renderAll();
      // Update settings select
      const sel = document.getElementById('settingsLangSelect');
      if (sel) sel.value = lang;
    },

    refreshLangToggle() {
      const lang = I18n.getLang();
      document.getElementById('langEnBadge').style.display = lang === 'en' ? 'inline-flex' : 'none';
      document.getElementById('langArBadge').style.display = lang === 'ar' ? 'inline-flex' : 'none';
    },

    /* ---------------------------------------------------------------------
       OVERVIEW PAGE
       --------------------------------------------------------------------- */
    renderOverview() {
      const clinics = this.state.clinics;
      const active = clinics.filter(c => c.status === 'active');
      const trial = clinics.filter(c => c.status === 'trial');
      const totalPatients = clinics.reduce((s, c) => s + (c.patients || 0), 0);
      const mrr = clinics.filter(c => c.status !== 'suspended').reduce((s, c) => s + (c.mrr || 0), 0);

      document.getElementById('kpiTotalClinics').textContent = clinics.length;
      document.getElementById('kpiActiveClinics').textContent = active.length;
      document.getElementById('kpiTotalPatients').textContent = I18n.formatNumber(totalPatients);
      document.getElementById('kpiMRR').textContent = I18n.formatCurrency(mrr);

      this.renderRevenueChart();
      this.renderSpecialtyDonut();
      this.renderTopClinicsTable();
      this.renderActivityFeed();
      this.renderStorageUsage();
    },

    renderRevenueChart() {
      const data = this.state.revenueHistory;
      const container = document.getElementById('revenueChart');
      if (!container) return;

      const width = container.clientWidth || 600;
      const height = 280;
      const padding = { top: 20, right: 20, bottom: 30, left: 50 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;

      const max = Math.max(...data.map(d => d.revenue)) * 1.1;
      const min = 0;

      const xStep = chartW / (data.length - 1);
      const yScale = v => chartH - ((v - min) / (max - min)) * chartH;

      // Build path
      const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${padding.left + i * xStep} ${padding.top + yScale(d.revenue)}`).join(' ');
      const areaPath = `${linePath} L ${padding.left + (data.length - 1) * xStep} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;

      // Y axis labels (4 ticks)
      const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(min + (max - min) * t));
      const xLabels = data.map(d => d.month);

      // Gridlines
      const gridLines = yTicks.map(t =>
        `<line x1="${padding.left}" y1="${padding.top + yScale(t)}" x2="${padding.left + chartW}" y2="${padding.top + yScale(t)}" stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="4 4"/>`
      ).join('');

      const yLabels = yTicks.map(t =>
        `<text x="${padding.left - 8}" y="${padding.top + yScale(t) + 4}" text-anchor="end" fill="var(--text-tertiary)" font-size="10" font-family="var(--font-mono)">${I18n.formatCurrency(t)}</text>`
      ).join('');

      const xLabelsHtml = xLabels.map((m, i) =>
        `<text x="${padding.left + i * xStep}" y="${height - 8}" text-anchor="middle" fill="var(--text-tertiary)" font-size="10">${m}</text>`
      ).join('');

      // Dots
      const dots = data.map((d, i) =>
        `<circle cx="${padding.left + i * xStep}" cy="${padding.top + yScale(d.revenue)}" r="4" fill="var(--color-primary)" stroke="var(--bg-surface)" stroke-width="2">
          <title>${d.month}: ${I18n.formatCurrency(d.revenue)}</title>
        </circle>`
      ).join('');

      container.innerHTML = `
        <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width: 100%; height: 100%;">
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0"/>
            </linearGradient>
          </defs>
          ${gridLines}
          ${yLabels}
          <path d="${areaPath}" fill="url(#revGrad)"/>
          <path d="${linePath}" fill="none" stroke="var(--color-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          ${dots}
          ${xLabelsHtml}
        </svg>
      `;
    },

    renderSpecialtyDonut() {
      const data = this.state.patientsByType;
      const container = document.getElementById('specialtyDonut');
      const legendEl = document.getElementById('specialtyLegend');
      if (!container || !legendEl) return;

      const total = data.reduce((s, d) => s + d.count, 0);
      const cx = 80, cy = 80, r = 60, strokeWidth = 18;
      const circumference = 2 * Math.PI * r;

      let offset = 0;
      const segments = data.map(d => {
        const pct = d.count / total;
        const dash = pct * circumference;
        const seg = `
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
            stroke="${d.color}" stroke-width="${strokeWidth}"
            stroke-dasharray="${dash} ${circumference - dash}"
            stroke-dashoffset="${-offset}"
            transform="rotate(-90 ${cx} ${cy})"/>
        `;
        offset += dash;
        return seg;
      }).join('');

      container.innerHTML = `
        <div class="donut-chart" style="width: 160px; height: 160px; position: relative;">
          <svg viewBox="0 0 160 160" style="width: 100%; height: 100%;">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--bg-subtle)" stroke-width="${strokeWidth}"/>
            ${segments}
          </svg>
          <div class="donut-chart-center">
            <div class="donut-chart-value">${I18n.formatNumber(total)}</div>
            <div class="donut-chart-label">Patients</div>
          </div>
        </div>
      `;

      legendEl.innerHTML = data.map(d => {
        const pct = ((d.count / total) * 100).toFixed(1);
        return `
          <div class="flex items-center justify-between" style="font-size: var(--text-xs);">
            <div class="flex items-center gap-6">
              <span class="dot" style="background: ${d.color};"></span>
              <span class="text-secondary">${d.type}</span>
            </div>
            <div class="flex items-center gap-8">
              <span class="text-tertiary">${I18n.formatNumber(d.count)}</span>
              <span style="font-weight: var(--weight-semibold); min-width: 36px; text-align: end;">${pct}%</span>
            </div>
          </div>
        `;
      }).join('');
    },

    renderTopClinicsTable() {
      const tbody = document.getElementById('topClinicsTableBody');
      if (!tbody) return;
      const sorted = [...this.state.clinics].sort((a, b) => (b.patients || 0) - (a.patients || 0)).slice(0, 5);
      tbody.innerHTML = sorted.map(c => `
        <tr>
          <td>
            <div class="flex items-center gap-8">
              <div class="avatar avatar-sm" style="background: ${this.clinicTypeColor(c.type)};">${c.name.charAt(0)}</div>
              <div>
                <div class="table-cell-primary">${c.name}</div>
                <div class="table-cell-secondary">${c.owner}</div>
              </div>
            </div>
          </td>
          <td><span class="badge badge-outline">${I18n.t(`type.${c.type}`)}</span></td>
          <td class="table-cell-amount">${I18n.formatNumber(c.patients || 0)}</td>
          <td class="table-cell-amount">${I18n.formatCurrency(c.mrr || 0)}<span class="text-tertiary" style="font-size: 10px;">/mo</span></td>
          <td>${this.statusBadge(c.status)}</td>
        </tr>
      `).join('');
    },

    renderActivityFeed() {
      const feed = document.getElementById('activityFeed');
      if (!feed) return;
      const items = [...this.state.activity].slice(0, 6);
      feed.innerHTML = items.map(a => `
        <div class="activity-item">
          <div class="activity-icon ${a.severity || 'info'}">
            ${this.activityIconSvg(a.type)}
          </div>
          <div class="activity-content">
            <div class="activity-title">${a.title}</div>
            <div class="activity-meta">${a.actor} · ${I18n.timeAgo(a.timestamp)}</div>
          </div>
        </div>
      `).join('');
    },

    renderStorageUsage() {
      const container = document.getElementById('storageUsageList');
      if (!container) return;
      const clinics = [...this.state.clinics].sort((a, b) => (b.storageUsed || 0) - (a.storageUsed || 0)).slice(0, 5);
      container.innerHTML = clinics.map(c => {
        const pct = Math.min(100, ((c.storageUsed || 0) / (c.storageLimit || 1)) * 100);
        const barClass = pct > 80 ? 'danger' : pct > 60 ? 'warning' : 'success';
        return `
          <div>
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-8">
                <div class="avatar avatar-sm" style="background: ${this.clinicTypeColor(c.type)}; font-size: 10px;">${c.name.charAt(0)}</div>
                <div>
                  <div style="font-size: var(--text-sm); font-weight: var(--weight-medium);">${c.name}</div>
                  <div style="font-size: 10px; color: var(--text-tertiary);">${c.city}, ${c.country}</div>
                </div>
              </div>
              <div style="font-size: var(--text-xs); font-family: var(--font-mono); color: var(--text-secondary);">
                ${(c.storageUsed || 0).toFixed(1)} / ${c.storageLimit} GB
              </div>
            </div>
            <div class="progress"><div class="progress-bar ${barClass}" style="width: ${pct}%"></div></div>
          </div>
        `;
      }).join('');
    },

    /* ---------------------------------------------------------------------
       CLINICS TABLE (with filters, sort, pagination, bulk)
       --------------------------------------------------------------------- */
    bindFilters() {
      const search = document.getElementById('clinicSearch');
      const statusFilter = document.getElementById('clinicStatusFilter');
      const typeFilter = document.getElementById('clinicTypeFilter');
      const planFilter = document.getElementById('clinicPlanFilter');

      if (search) search.addEventListener('input', e => { this.state.filters.search = e.target.value; this.state.pagination.page = 1; this.renderClinicsTable(); });
      if (statusFilter) statusFilter.addEventListener('change', e => { this.state.filters.status = e.target.value; this.state.pagination.page = 1; this.renderClinicsTable(); });
      if (typeFilter) typeFilter.addEventListener('change', e => { this.state.filters.type = e.target.value; this.state.pagination.page = 1; this.renderClinicsTable(); });
      if (planFilter) planFilter.addEventListener('change', e => { this.state.filters.plan = e.target.value; this.state.pagination.page = 1; this.renderClinicsTable(); });

      // Sort
      document.querySelectorAll('#page-clinics th.sortable').forEach(th => {
        th.addEventListener('click', () => {
          const field = th.getAttribute('data-sort');
          if (this.state.sort.field === field) {
            this.state.sort.dir = this.state.sort.dir === 'asc' ? 'desc' : 'asc';
          } else {
            this.state.sort.field = field;
            this.state.sort.dir = 'asc';
          }
          this.renderClinicsTable();
        });
      });

      // Select all
      const selectAll = document.getElementById('clinicSelectAll');
      if (selectAll) selectAll.addEventListener('change', e => {
        const visible = this.getFilteredClinics();
        if (e.target.checked) {
          visible.forEach(c => this.state.selectedClinics.add(c.id));
        } else {
          visible.forEach(c => this.state.selectedClinics.delete(c.id));
        }
        this.renderClinicsTable();
      });

      // Subscriptions search
      const subSearch = document.getElementById('subSearch');
      if (subSearch) subSearch.addEventListener('input', () => this.renderSubscriptions());

      const subPlanFilter = document.getElementById('subPlanFilter');
      if (subPlanFilter) subPlanFilter.addEventListener('change', () => this.renderSubscriptions());

      // Activity filter
      const actFilter = document.getElementById('activityTypeFilter');
      if (actFilter) actFilter.addEventListener('change', () => this.renderActivityTable());

      // Settings language
      const settingsLang = document.getElementById('settingsLangSelect');
      if (settingsLang) settingsLang.addEventListener('change', e => this.setLang(e.target.value));
    },

    getFilteredClinics() {
      const { search, status, type, plan } = this.state.filters;
      const { field, dir } = this.state.sort;

      let list = [...this.state.clinics];

      if (search) {
        const q = search.toLowerCase();
        list = list.filter(c =>
          c.name.toLowerCase().includes(q) ||
          (c.owner || '').toLowerCase().includes(q) ||
          (c.city || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q)
        );
      }
      if (status) list = list.filter(c => c.status === status);
      if (type) list = list.filter(c => c.type === type);
      if (plan) list = list.filter(c => c.plan === plan);

      list.sort((a, b) => {
        let av = a[field], bv = b[field];
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return dir === 'asc' ? -1 : 1;
        if (av > bv) return dir === 'asc' ? 1 : -1;
        return 0;
      });

      return list;
    },

    renderClinicsTable() {
      const tbody = document.getElementById('clinicsTableBody');
      if (!tbody) return;

      const filtered = this.getFilteredClinics();
      const { page, pageSize } = this.state.pagination;
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      const curPage = Math.min(page, totalPages);
      const start = (curPage - 1) * pageSize;
      const paged = filtered.slice(start, start + pageSize);

      if (paged.length === 0) {
        tbody.innerHTML = `
          <tr><td colspan="10">
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              </div>
              <div class="empty-state-title" data-i18n="clinics.empty_title">No clinics found</div>
              <div class="empty-state-text" data-i18n="clinics.empty_text">Try adjusting your filters or add a new clinic to get started.</div>
              <button class="btn btn-primary btn-sm" onclick="SuperAdmin.openAddClinicModal()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span data-i18n="clinics.add_clinic">Add Clinic</span>
              </button>
            </div>
          </td></tr>
        `;
      } else {
        tbody.innerHTML = paged.map(c => `
          <tr class="${this.state.selectedClinics.has(c.id) ? 'selected' : ''}">
            <td>
              <label class="checkbox">
                <input type="checkbox" ${this.state.selectedClinics.has(c.id) ? 'checked' : ''} onchange="SuperAdmin.toggleSelect('${c.id}')" />
                <span class="checkbox-box"></span>
              </label>
            </td>
            <td>
              <div class="flex items-center gap-8">
                <div class="avatar avatar-sm" style="background: ${this.clinicTypeColor(c.type)};">${c.name.charAt(0)}</div>
                <div>
                  <div class="table-cell-primary">${c.name}</div>
                  <div class="table-cell-secondary">${c.email || ''}</div>
                </div>
              </div>
            </td>
            <td><span class="badge badge-outline">${I18n.t(`type.${c.type}`)}</span></td>
            <td>${c.owner || '—'}</td>
            <td>
              <div class="table-cell-primary" style="font-weight: var(--weight-normal);">${c.city || '—'}</div>
              <div class="table-cell-secondary">${c.country || ''}</div>
            </td>
            <td>${this.planBadge(c.plan)}</td>
            <td class="table-cell-amount">${I18n.formatNumber(c.patients || 0)}</td>
            <td>${this.statusBadge(c.status)}</td>
            <td class="table-cell-secondary">${I18n.timeAgo(c.lastActive)}</td>
            <td class="table-cell-actions">
              <div class="dropdown" style="position: relative;">
                <button class="icon-btn" onclick="SuperAdmin.toggleRowMenu(event, '${c.id}')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </button>
                <div class="dropdown-menu" id="rowMenu-${c.id}" style="inset-inline-end: 0;">
                  <div class="dropdown-item" onclick="SuperAdmin.openClinicPortal('${c.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    <span data-i18n="clinics.view_portal">Open Clinic Portal</span>
                  </div>
                  <div class="dropdown-item" onclick="SuperAdmin.openEditClinicModal('${c.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    <span data-i18n="common.edit">Edit</span>
                  </div>
                  ${c.status === 'suspended'
                    ? `<div class="dropdown-item" onclick="SuperAdmin.toggleClinicStatus('${c.id}', 'active')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        <span data-i18n="clinics.activate">Activate</span>
                      </div>`
                    : `<div class="dropdown-item" onclick="SuperAdmin.toggleClinicStatus('${c.id}', 'suspended')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        <span data-i18n="clinics.suspend">Suspend</span>
                      </div>`}
                  <div class="dropdown-divider"></div>
                  <div class="dropdown-item danger" onclick="SuperAdmin.deleteClinic('${c.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
                    <span data-i18n="common.delete">Delete</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        `).join('');
      }

      // Footer
      const info = document.getElementById('clinicPaginationInfo');
      if (info) {
        if (filtered.length === 0) info.textContent = I18n.t('common.no_results');
        else info.textContent = `Showing ${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length} ${I18n.t('common.results')}`;
      }

      this.renderPagination('clinicPagination', curPage, totalPages);

      // Bulk bar
      const bulkBar = document.getElementById('clinicBulkBar');
      const selectedCount = document.getElementById('clinicSelectedCount');
      if (bulkBar && selectedCount) {
        const cnt = this.state.selectedClinics.size;
        bulkBar.classList.toggle('hidden', cnt === 0);
        selectedCount.textContent = `${cnt} ${I18n.t('clinics.selected')}`;
      }

      // Sort indicators
      document.querySelectorAll('#page-clinics th.sortable').forEach(th => {
        th.classList.toggle('sorted', th.getAttribute('data-sort') === this.state.sort.field);
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.textContent = th.getAttribute('data-sort') === this.state.sort.field ? (this.state.sort.dir === 'asc' ? '↑' : '↓') : '↕';
      });
    },

    renderPagination(containerId, cur, total) {
      const container = document.getElementById(containerId);
      if (!container) return;
      if (total <= 1) { container.innerHTML = ''; return; }

      const btns = [];
      btns.push(`<button class="pagination-btn" ${cur === 1 ? 'disabled' : ''} onclick="SuperAdmin.goToPage(${cur - 1})">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>`);

      const pages = [];
      if (total <= 7) {
        for (let i = 1; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        if (cur > 3) pages.push('...');
        for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
        if (cur < total - 2) pages.push('...');
        pages.push(total);
      }

      pages.forEach(p => {
        if (p === '...') btns.push(`<span class="text-tertiary" style="padding: 0 4px;">…</span>`);
        else btns.push(`<button class="pagination-btn ${p === cur ? 'active' : ''}" onclick="SuperAdmin.goToPage(${p})">${p}</button>`);
      });

      btns.push(`<button class="pagination-btn" ${cur === total ? 'disabled' : ''} onclick="SuperAdmin.goToPage(${cur + 1})">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>`);

      container.innerHTML = btns.join('');
    },

    goToPage(p) {
      this.state.pagination.page = p;
      this.renderClinicsTable();
    },

    toggleSelect(id) {
      if (this.state.selectedClinics.has(id)) this.state.selectedClinics.delete(id);
      else this.state.selectedClinics.add(id);
      this.renderClinicsTable();
    },

    toggleRowMenu(e, id) {
      e.stopPropagation();
      const menu = document.getElementById(`rowMenu-${id}`);
      document.querySelectorAll('.dropdown-menu').forEach(m => { if (m !== menu) m.style.display = ''; });
      menu.style.display = menu.style.display === 'block' ? '' : 'block';
      if (menu.style.display === 'block') {
        const parent = menu.parentElement;
        parent.classList.add('open');
      }
    },

    /* ---------------------------------------------------------------------
       CLINIC CRUD
       --------------------------------------------------------------------- */
    openAddClinicModal() {
      document.getElementById('clinicModalTitle').textContent = I18n.t('clinics.add_modal_title');
      document.getElementById('clinicForm').reset();
      document.getElementById('clinicId').value = '';
      this.openModal('clinicModal');
    },

    openEditClinicModal(id) {
      const clinic = this.state.clinics.find(c => c.id === id);
      if (!clinic) return;
      document.getElementById('clinicModalTitle').textContent = I18n.t('clinics.edit_modal_title');
      document.getElementById('clinicId').value = clinic.id;
      document.getElementById('clinicName').value = clinic.name;
      document.getElementById('clinicType').value = clinic.type;
      document.getElementById('clinicOwner').value = clinic.owner || '';
      document.getElementById('clinicEmail').value = clinic.email || '';
      document.getElementById('clinicPhone').value = clinic.phone || '';
      document.getElementById('clinicPlan').value = clinic.plan || 'pro';
      document.getElementById('clinicCountry').value = clinic.country || '';
      document.getElementById('clinicCity').value = clinic.city || '';
      document.getElementById('clinicAddress').value = clinic.address || '';
      this.openModal('clinicModal');
      // Close row menu if open
      document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = '');
    },

    saveClinic() {
      const id = document.getElementById('clinicId').value;
      const data = {
        name: document.getElementById('clinicName').value,
        type: document.getElementById('clinicType').value,
        owner: document.getElementById('clinicOwner').value,
        email: document.getElementById('clinicEmail').value,
        phone: document.getElementById('clinicPhone').value,
        plan: document.getElementById('clinicPlan').value,
        country: document.getElementById('clinicCountry').value,
        city: document.getElementById('clinicCity').value,
        address: document.getElementById('clinicAddress').value,
      };
      const plan = this.state.plans.find(p => p.id === `plan_${data.plan}`);
      data.mrr = plan ? plan.price : 0;

      if (id) {
        DataService.update('clinics', id, data);
        this.showToast('success', I18n.t('toast.clinic_updated'));
      } else {
        data.id = `clinic_${data.type}_${DataService.generateId().slice(-6)}`;
        data.status = 'active';
        data.patients = 0;
        data.staff = 1;
        data.storageUsed = 0;
        data.storageLimit = plan ? plan.limits.storage : 5;
        data.lastActive = new Date().toISOString();
        DataService.insert('clinics', data);
        this.showToast('success', I18n.t('toast.clinic_created'));
      }
      this.state.clinics = DataService.getAll('clinics');
      this.closeModal('clinicModal');
      this.renderAll();
    },

    toggleClinicStatus(id, newStatus) {
      DataService.update('clinics', id, { status: newStatus });
      this.state.clinics = DataService.getAll('clinics');
      const msg = newStatus === 'active' ? I18n.t('toast.clinic_activated') : I18n.t('toast.clinic_suspended');
      const type = newStatus === 'active' ? 'success' : 'warning';
      this.showToast(type, msg);
      this.renderAll();
      document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = '');
    },

    deleteClinic(id) {
      const clinic = this.state.clinics.find(c => c.id === id);
      this.openConfirm(
        I18n.t('common.delete'),
        I18n.t('clinics.delete_confirm'),
        () => {
          DataService.delete('clinics', id);
          this.state.clinics = DataService.getAll('clinics');
          this.state.selectedClinics.delete(id);
          this.showToast('success', I18n.t('toast.clinic_deleted'));
          this.renderAll();
        }
      );
      document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = '');
    },

    bulkActivate() {
      this.state.selectedClinics.forEach(id => DataService.update('clinics', id, { status: 'active' }));
      this.state.clinics = DataService.getAll('clinics');
      this.state.selectedClinics.clear();
      this.showToast('success', `${this.state.clinics.length} clinics activated`);
      this.renderAll();
    },

    bulkSuspend() {
      this.state.selectedClinics.forEach(id => DataService.update('clinics', id, { status: 'suspended' }));
      this.state.clinics = DataService.getAll('clinics');
      this.state.selectedClinics.clear();
      this.showToast('warning', 'Clinics suspended');
      this.renderAll();
    },

    bulkDelete() {
      const count = this.state.selectedClinics.size;
      this.openConfirm(
        I18n.t('common.delete'),
        `Delete ${count} clinics? This action cannot be undone.`,
        () => {
          this.state.selectedClinics.forEach(id => DataService.delete('clinics', id));
          this.state.clinics = DataService.getAll('clinics');
          this.state.selectedClinics.clear();
          this.showToast('success', `${count} clinics deleted`);
          this.renderAll();
        }
      );
    },

    openClinicPortal(clinicId) {
      const clinic = this.state.clinics.find(c => c.id === clinicId);
      if (!clinic) return;
      const url = `clinic-portal.html?clinic=${clinicId}&type=${clinic.type}`;
      window.open(url, '_blank');
      document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = '');
    },

    exportClinicsCSV() {
      const clinics = this.getFilteredClinics();
      const headers = ['Name', 'Type', 'Owner', 'Email', 'Phone', 'Country', 'City', 'Plan', 'Patients', 'Status'];
      const rows = clinics.map(c => [c.name, c.type, c.owner, c.email, c.phone, c.country, c.city, c.plan, c.patients, c.status]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'mediflow-clinics.csv';
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('success', 'Clinics exported');
    },

    /* ---------------------------------------------------------------------
       SUBSCRIPTIONS
       --------------------------------------------------------------------- */
    renderSubscriptions() {
      const tbody = document.getElementById('subsTableBody');
      if (!tbody) return;
      const search = (document.getElementById('subSearch')?.value || '').toLowerCase();
      const planFilter = document.getElementById('subPlanFilter')?.value || '';

      let list = [...this.state.clinics];
      if (search) list = list.filter(c => c.name.toLowerCase().includes(search) || (c.owner || '').toLowerCase().includes(search));
      if (planFilter) list = list.filter(c => c.plan === planFilter);

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-title">${I18n.t('common.no_results')}</div></div></td></tr>`;
        return;
      }

      tbody.innerHTML = list.map(c => {
        const plan = this.state.plans.find(p => p.id === `plan_${c.plan}`) || { name: c.plan, price: c.mrr };
        const renewalDate = new Date();
        renewalDate.setMonth(renewalDate.getMonth() + 1);
        return `
          <tr>
            <td>
              <div class="flex items-center gap-8">
                <div class="avatar avatar-sm" style="background: ${this.clinicTypeColor(c.type)};">${c.name.charAt(0)}</div>
                <div>
                  <div class="table-cell-primary">${c.name}</div>
                  <div class="table-cell-secondary">${c.owner}</div>
                </div>
              </div>
            </td>
            <td>${this.planBadge(c.plan)}</td>
            <td class="table-cell-amount">${I18n.formatCurrency(plan.price)}<span class="text-tertiary" style="font-size: 10px;">/mo</span></td>
            <td>${this.statusBadge(c.status)}</td>
            <td class="table-cell-secondary">${renewalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
            <td class="table-cell-actions">
              <button class="btn btn-ghost btn-sm">${c.plan === 'enterprise' ? I18n.t('common.downgrade') : I18n.t('common.upgrade')}</button>
            </td>
          </tr>
        `;
      }).join('');
    },

    /* ---------------------------------------------------------------------
       PLANS
       --------------------------------------------------------------------- */
    renderPlans() {
      const grid = document.getElementById('plansGrid');
      if (!grid) return;
      const subscribers = (planId) => this.state.clinics.filter(c => c.plan === planId).length;

      grid.innerHTML = this.state.plans.map(plan => {
        const id = plan.id.replace('plan_', '');
        const subCount = subscribers(id);
        const featuresHtml = plan.features.map(f => `
          <li style="display: flex; align-items: center; gap: var(--space-8); padding: var(--space-4) 0;">
            <span style="color: var(--color-success-600); display: inline-flex;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            <span class="text-sm">${f}</span>
          </li>
        `).join('');

        return `
          <div class="card ${plan.popular ? 'card-elevated' : ''}" style="position: relative; ${plan.popular ? 'border-color: var(--color-primary);' : ''}">
            ${plan.popular ? `<div class="badge badge-primary" style="position: absolute; top: -10px; inset-inline-start: 50%; transform: translateX(-50%); padding: 4px var(--space-10); box-shadow: var(--shadow-sm);">${I18n.t('common.popular')}</div>` : ''}
            <div class="card-body">
              <div class="flex items-center justify-between mb-12">
                <div>
                  <div style="font-size: var(--text-lg); font-weight: var(--weight-bold);">${plan.name}</div>
                  <div class="text-secondary text-sm">${subCount} ${I18n.t('plans.subscribers')}</div>
                </div>
                ${plan.color === 'primary' ? '<div class="stat-card-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l9 4-9 4-9-4 9-4z"/></svg></div>' :
                  plan.color === 'secondary' ? '<div class="stat-card-icon" style="background: var(--color-secondary-100); color: var(--color-secondary-600);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l9 4-9 4-9-4 9-4z"/></svg></div>' :
                  '<div class="stat-card-icon neutral"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l9 4-9 4-9-4 9-4z"/></svg></div>'}
              </div>
              <div class="flex items-end gap-4 mb-16">
                <span style="font-size: var(--text-4xl); font-weight: var(--weight-bold); letter-spacing: -0.02em;">${I18n.formatCurrency(plan.price)}</span>
                <span class="text-tertiary" style="margin-bottom: 6px;" data-i18n="common.per_month">/mo</span>
              </div>
              <button class="btn ${plan.popular ? 'btn-primary' : 'btn-secondary'} btn-block mb-16">${I18n.t('common.choose_plan')}</button>
              <div class="divider" style="margin: var(--space-12) 0;"></div>
              <div class="text-xs font-semibold text-tertiary uppercase tracking-wide mb-8" data-i18n="plans.features">Features</div>
              <ul>${featuresHtml}</ul>
            </div>
          </div>
        `;
      }).join('');

      // Comparison table
      const compBody = document.getElementById('plansComparisonBody');
      if (compBody) {
        const rows = [
          { label: 'Monthly price', values: ['$99', '$299', '$599'] },
          { label: 'Patients', values: ['500', '5,000', 'Unlimited'] },
          { label: 'Staff accounts', values: ['3', 'Unlimited', 'Unlimited'] },
          { label: 'Storage', values: ['5 GB', '10 GB', '50 GB'] },
          { label: 'Support', values: ['Email', 'Priority', '24/7 Dedicated'] },
          { label: 'Analytics', values: ['Basic', 'Advanced', 'Custom'] },
          { label: 'API access', values: ['—', '✓', '✓'] },
          { label: 'Multi-clinic', values: ['—', '—', '✓'] },
          { label: 'White-label', values: ['—', '—', '✓'] },
          { label: 'SLA guarantee', values: ['—', '—', '✓'] }
        ];
        compBody.innerHTML = rows.map(r => `
          <tr>
            <td class="table-cell-secondary">${r.label}</td>
            <td class="table-cell-primary">${r.values[0]}</td>
            <td class="table-cell-primary" style="background: color-mix(in srgb, var(--color-primary) 4%, transparent);">${r.values[1]}</td>
            <td class="table-cell-primary">${r.values[2]}</td>
          </tr>
        `).join('');
      }
    },

    openAddPlanModal() {
      this.showToast('info', 'Plan creation coming soon');
    },

    /* ---------------------------------------------------------------------
       ANALYTICS
       --------------------------------------------------------------------- */
    renderAnalytics() {
      // Revenue trend (similar to overview but bigger)
      const revContainer = document.getElementById('analyticsRevenueChart');
      if (revContainer) {
        const data = this.state.revenueHistory;
        const width = revContainer.clientWidth || 500;
        const height = 240;
        const padding = { top: 20, right: 20, bottom: 30, left: 50 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;
        const max = Math.max(...data.map(d => d.revenue)) * 1.1;
        const xStep = chartW / (data.length - 1);
        const yScale = v => chartH - (v / max) * chartH;

        const bars = data.map((d, i) => `
          <rect x="${padding.left + i * xStep - 8}" y="${padding.top + yScale(d.revenue)}" width="16" height="${chartH - yScale(d.revenue)}" rx="3" fill="var(--color-primary)" opacity="0.85">
            <title>${d.month}: ${I18n.formatCurrency(d.revenue)}</title>
          </rect>
        `).join('');

        const xLabels = data.map((d, i) => `<text x="${padding.left + i * xStep}" y="${height - 8}" text-anchor="middle" fill="var(--text-tertiary)" font-size="10">${d.month}</text>`).join('');
        const yTicks = [0, 0.5, 1].map(t => Math.round(max * t));
        const yLabels = yTicks.map(t => `<text x="${padding.left - 8}" y="${padding.top + yScale(t) + 4}" text-anchor="end" fill="var(--text-tertiary)" font-size="10">${I18n.formatCurrency(t)}</text>`).join('');
        const grid = yTicks.map(t => `<line x1="${padding.left}" y1="${padding.top + yScale(t)}" x2="${padding.left + chartW}" y2="${padding.top + yScale(t)}" stroke="var(--border-subtle)" stroke-dasharray="4 4"/>`).join('');

        revContainer.innerHTML = `
          <svg class="chart-svg" viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">
            ${grid}
            ${yLabels}
            ${bars}
            ${xLabels}
          </svg>
        `;
      }

      // Patient growth
      const pgContainer = document.getElementById('patientGrowthChart');
      if (pgContainer) {
        const data = [
          { month: 'Aug', count: 3200 }, { month: 'Sep', count: 3800 }, { month: 'Oct', count: 4500 },
          { month: 'Nov', count: 5200 }, { month: 'Dec', count: 5400 }, { month: 'Jan', count: 5800 },
          { month: 'Feb', count: 5950 }, { month: 'Mar', count: 6100 }, { month: 'Apr', count: 6250 },
          { month: 'May', count: 6400 }, { month: 'Jun', count: 6588 }, { month: 'Jul', count: 6588 }
        ];
        const width = pgContainer.clientWidth || 500;
        const height = 240;
        const padding = { top: 20, right: 20, bottom: 30, left: 50 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;
        const max = Math.max(...data.map(d => d.count)) * 1.1;
        const xStep = chartW / (data.length - 1);
        const yScale = v => chartH - (v / max) * chartH;

        const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${padding.left + i * xStep} ${padding.top + yScale(d.count)}`).join(' ');
        const areaPath = `${linePath} L ${padding.left + (data.length - 1) * xStep} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;
        const dots = data.map((d, i) => `<circle cx="${padding.left + i * xStep}" cy="${padding.top + yScale(d.count)}" r="3" fill="var(--color-success-600)"/>`).join('');

        pgContainer.innerHTML = `
          <svg class="chart-svg" viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">
            <defs>
              <linearGradient id="pgGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--color-success)" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="var(--color-success)" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <path d="${areaPath}" fill="url(#pgGrad)"/>
            <path d="${linePath}" fill="none" stroke="var(--color-success-600)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            ${dots}
            ${data.map((d, i) => `<text x="${padding.left + i * xStep}" y="${height - 8}" text-anchor="middle" fill="var(--text-tertiary)" font-size="10">${d.month}</text>`).join('')}
          </svg>
        `;
      }

      // Country stats
      const countryContainer = document.getElementById('countryStats');
      if (countryContainer) {
        const byCountry = {};
        this.state.clinics.forEach(c => { byCountry[c.country] = (byCountry[c.country] || 0) + 1; });
        const entries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]);
        const maxCount = Math.max(...entries.map(e => e[1]));
        countryContainer.innerHTML = entries.map(([country, count]) => `
          <div style="margin-bottom: var(--space-12);">
            <div class="flex items-center justify-between mb-4">
              <span class="text-sm font-medium">${country}</span>
              <span class="text-xs text-secondary">${count} clinics</span>
            </div>
            <div class="progress"><div class="progress-bar" style="width: ${(count / maxCount) * 100}%; background: var(--color-primary);"></div></div>
          </div>
        `).join('');
      }

      // Specialty revenue
      const specContainer = document.getElementById('specialtyRevenue');
      if (specContainer) {
        const bySpec = {};
        this.state.clinics.forEach(c => {
          const type = I18n.t(`type.${c.type}`);
          bySpec[type] = (bySpec[type] || 0) + (c.mrr || 0);
        });
        const entries = Object.entries(bySpec).sort((a, b) => b[1] - a[1]);
        const maxRev = Math.max(...entries.map(e => e[1]));
        specContainer.innerHTML = entries.map(([spec, rev]) => `
          <div style="margin-bottom: var(--space-12);">
            <div class="flex items-center justify-between mb-4">
              <span class="text-sm font-medium">${spec}</span>
              <span class="text-xs text-secondary font-mono">${I18n.formatCurrency(rev)}/mo</span>
            </div>
            <div class="progress"><div class="progress-bar" style="width: ${(rev / maxRev) * 100}%; background: var(--color-secondary);"></div></div>
          </div>
        `).join('');
      }
    },

    /* ---------------------------------------------------------------------
       ACTIVITY LOG
       --------------------------------------------------------------------- */
    renderActivityTable() {
      const tbody = document.getElementById('activityTableBody');
      if (!tbody) return;
      const filter = document.getElementById('activityTypeFilter')?.value || '';
      let list = [...this.state.activity].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      if (filter) {
        list = list.filter(a => {
          const type = a.type || '';
          if (filter === 'clinic') return type.includes('clinic') || type.includes('login') || type.includes('feature');
          if (filter === 'billing') return type.includes('subscription') || type.includes('payment');
          if (filter === 'system') return type.includes('storage') || type.includes('suspend');
          return true;
        });
      }

      tbody.innerHTML = list.map(a => `
        <tr>
          <td><span class="dot dot-${a.severity || 'info'}"></span></td>
          <td class="table-cell-primary">${a.title}</td>
          <td class="table-cell-secondary">${a.actor}</td>
          <td class="table-cell-secondary">${a.clinic || '—'}</td>
          <td class="table-cell-secondary">${I18n.timeAgo(a.timestamp)}</td>
        </tr>
      `).join('');
    },

    /* ---------------------------------------------------------------------
       SETTINGS
       --------------------------------------------------------------------- */
    switchSettingsTab(tab) {
      document.querySelectorAll('[data-settings-tab]').forEach(n => n.classList.toggle('active', n.getAttribute('data-settings-tab') === tab));
      document.querySelectorAll('.settings-panel').forEach(p => p.classList.toggle('hidden', p.getAttribute('data-panel') !== tab));
    },

    /* ---------------------------------------------------------------------
       MODALS
       --------------------------------------------------------------------- */
    openModal(id) {
      document.getElementById(id).classList.add('open');
      document.body.style.overflow = 'hidden';
    },

    closeModal(id) {
      document.getElementById(id).classList.remove('open');
      document.body.style.overflow = '';
    },

    bindModalBackdrop() {
      document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
          if (e.target === overlay) this.closeModal(overlay.id);
        });
      });
    },

    openConfirm(title, message, callback) {
      document.getElementById('confirmModalTitle').textContent = title;
      document.getElementById('confirmModalMessage').textContent = message;
      this.state.confirmCallback = callback;
      const actionBtn = document.getElementById('confirmModalAction');
      actionBtn.onclick = () => {
        if (this.state.confirmCallback) this.state.confirmCallback();
        this.closeModal('confirmModal');
        this.state.confirmCallback = null;
      };
      this.openModal('confirmModal');
    },

    /* ---------------------------------------------------------------------
       TOAST
       --------------------------------------------------------------------- */
    showToast(type, message, title) {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
      };
      toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
          <div class="toast-title">${title || this.defaultToastTitle(type)}</div>
          <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
      toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.add('exit');
        setTimeout(() => toast.remove(), 300);
      });
      container.appendChild(toast);
      setTimeout(() => {
        if (toast.parentNode) {
          toast.classList.add('exit');
          setTimeout(() => toast.remove(), 300);
        }
      }, 4000);
    },

    defaultToastTitle(type) {
      const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Information' };
      return titles[type] || 'Notification';
    },

    /* ---------------------------------------------------------------------
       KEYBOARD
       --------------------------------------------------------------------- */
    bindKeyboard() {
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal-overlay.open').forEach(m => this.closeModal(m.id));
          document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
          document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = '');
        }
      });
    },

    /* ---------------------------------------------------------------------
       HELPERS
       --------------------------------------------------------------------- */
    statusBadge(status) {
      const map = {
        active: 'success',
        suspended: 'danger',
        trial: 'info',
        expired: 'warning'
      };
      return `<span class="badge badge-${map[status] || 'neutral'}"><span class="badge-dot"></span>${I18n.t(`status.${status}`)}</span>`;
    },

    planBadge(plan) {
      const map = {
        starter: '<span class="badge badge-outline">Starter</span>',
        pro: '<span class="badge badge-primary">Professional</span>',
        enterprise: '<span class="badge" style="background: var(--color-secondary-100); color: var(--color-secondary-700);">Enterprise</span>'
      };
      return map[plan] || `<span class="badge">${plan}</span>`;
    },

    clinicTypeColor(type) {
      const colors = {
        dental: 'linear-gradient(135deg, #6366f1, #818cf8)',
        laser: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
        lab: 'linear-gradient(135deg, #06b6d4, #22d3ee)',
        pediatrics: 'linear-gradient(135deg, #10b981, #34d399)',
        internal: 'linear-gradient(135deg, #f59e0b, #fbbf24)'
      };
      return colors[type] || colors.dental;
    },

    activityIconSvg(type) {
      const icons = {
        clinic_created: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        subscription_upgraded: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>',
        payment_failed: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/></svg>',
        storage_warning: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
        clinic_suspended: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
        login: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
        feature_used: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        support_ticket: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>'
      };
      return icons[type] || icons.feature_used;
    }
  };

  // Bootstrap
  document.addEventListener('DOMContentLoaded', () => SuperAdmin.init());

  global.SuperAdmin = SuperAdmin;
})(window);
