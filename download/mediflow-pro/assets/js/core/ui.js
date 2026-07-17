/* ============================================================
   MediFlow — UI Toolkit (Premium Edition)
   - Theme (dark/light, persisted)
   - Modal system (openModal / closeModal / closeAllModals)
   - Drawer system (right-side panels)
   - Confirm dialog (promise-based)
   - Toast notifications (stacked, premium)
   - Formatters (money, date, time, duration)
   - Tiny helpers (uid, escapeHtml, debounce)
   - Chart helpers (Chart.js presets)
   ============================================================ */

window.MediFlow = window.MediFlow || {};

MediFlow.UI = (function () {
  'use strict';

  // ============================================================
  // THEME
  // ============================================================
  function getTheme()  { return MediFlow.Store.getTheme(); }
  function setTheme(t) { MediFlow.Store.setTheme(t); applyTheme(); }
  function toggleTheme() { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

  function applyTheme() {
    const theme = getTheme();
    document.documentElement.classList.toggle('dark', theme === 'dark');
    // Update icon spans
    document.querySelectorAll('[data-theme-icon]').forEach(el => {
      el.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    });
    // Update theme toggle switches
    document.querySelectorAll('#settingsThemeToggle').forEach(el => {
      el.checked = theme === 'dark';
    });
    // Re-render charts if any (so they pick up new colors)
    if (window.MediFlow && MediFlow.SuperAdmin && MediFlow.SuperAdmin.refreshCharts) {
      MediFlow.SuperAdmin.refreshCharts();
    }
  }

  // ============================================================
  // MODAL SYSTEM
  // ============================================================
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) { console.warn('[UI] modal not found:', id); return; }
    // Trap focus inside modal
    m.classList.add('active');
    setTimeout(() => {
      const firstInput = m.querySelector('input:not([type="hidden"]), select, textarea');
      if (firstInput) firstInput.focus();
    }, 60);
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
  }
  function closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }

  // ============================================================
  // DRAWER (right-side panel)
  // ============================================================
  function openDrawer(id) {
    const d = document.getElementById(id);
    if (d) d.classList.add('active');
  }
  function closeDrawer(id) {
    const d = document.getElementById(id);
    if (d) d.classList.remove('active');
  }
  function closeAllDrawers() {
    document.querySelectorAll('.drawer.active').forEach(d => d.classList.remove('active'));
  }

  // ============================================================
  // CONFIRM DIALOG (promise-based)
  // Usage: await UI.confirm({ title, message, confirmText, danger })
  // ============================================================
  let _confirmResolve = null;
  function confirm(opts = {}) {
    const {
      title = 'Confirm Action',
      message = 'This action cannot be undone.',
      headline = 'Are you sure?',
      confirmText = 'Delete',
      cancelText = 'Cancel',
      danger = true,
      icon = 'warning'
    } = opts;

    const modal = document.getElementById('confirmModal');
    if (!modal) {
      // Fallback to native confirm
      return Promise.resolve(window.confirm(message));
    }
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmHeadline').textContent = headline;
    document.getElementById('confirmMessage').textContent = message;
    const okBtn = document.getElementById('confirmOkBtn');
    okBtn.innerHTML = `<span class="ms">${danger ? 'delete' : 'check'}</span><span>${confirmText}</span>`;
    okBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';

    modal.classList.add('active');

    return new Promise((resolve) => {
      _confirmResolve = resolve;
      okBtn.onclick = () => {
        closeModal('confirmModal');
        if (_confirmResolve) { _confirmResolve(true); _confirmResolve = null; }
      };
    });
  }

  // ============================================================
  // TOAST
  // ============================================================
  function toast(message, type = 'info', timeout = 3200) {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const iconMap = { info: 'info', success: 'check_circle', warning: 'warning', danger: 'error' };
    const titleMap = { info: 'Information', success: 'Success', warning: 'Warning', danger: 'Error' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <span class="ms">${iconMap[type] || 'info'}</span>
      <div class="toast-content">
        <div class="toast-title">${titleMap[type] || 'Information'}</div>
        <div class="toast-msg">${escapeHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="Close"><span class="ms ms-sm">close</span></button>
    `;
    el.querySelector('.toast-close').onclick = () => dismiss();
    stack.appendChild(el);

    function dismiss() {
      el.style.transition = 'opacity .25s, transform .25s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      setTimeout(() => el.remove(), 250);
    }
    if (timeout > 0) setTimeout(dismiss, timeout);
  }

  // ============================================================
  // FORMATTERS
  // ============================================================
  function fmtMoney(n, currency = '$') {
    const v = Number(n) || 0;
    return currency + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  function fmtNum(n) { return (Number(n) || 0).toLocaleString(); }
  function fmtTime(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return '—'; }
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return '—'; }
  }
  function fmtDateInput(iso) {
    if (!iso) return '';
    try { return new Date(iso).toISOString().slice(0, 10); }
    catch { return ''; }
  }
  function fmtDuration(ms) {
    if (!ms || ms < 0) return '—';
    const m = Math.floor(ms / 60000);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  }
  function fmtRelative(iso) {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d ago`;
    return fmtDate(iso);
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function debounce(fn, wait = 200) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function nowIso() { return new Date().toISOString(); }

  // ============================================================
  // CLINIC-TYPE VISUAL CONFIG
  // ============================================================
  const CLINIC_TYPE_META = {
    DENTAL:      { icon: 'dentistry',     color: '#2563eb',  tint: 'tint-info',    tKey: 'type_dental' },
    DERMA_LASER: { icon: 'spa',           color: '#7c3aed',  tint: 'tint-violet',  tKey: 'type_laser' },
    LAB:         { icon: 'science',       color: '#059669',  tint: 'tint-success', tKey: 'type_lab' },
    PEDIATRICS:  { icon: 'child_care',    color: '#d97706',  tint: 'tint-warning', tKey: 'type_pediatrics' },
    INTERNAL:    { icon: 'favorite',      color: '#e11d48',  tint: 'tint-danger',  tKey: 'type_internal' }
  };
  function clinicTypeMeta(type) { return CLINIC_TYPE_META[type] || CLINIC_TYPE_META.DENTAL; }

  // ============================================================
  // CHART HELPERS — read semantic colors from CSS vars
  // ============================================================
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function chartColors() {
    const isDark = document.documentElement.classList.contains('dark');
    return {
      text:       cssVar('--text-soft') || (isDark ? '#a1a1aa' : '#71717a'),
      grid:       isDark ? 'rgba(255,255,255,0.06)' : 'rgba(24,24,27,0.06)',
      surface:    cssVar('--surface') || (isDark ? '#18181b' : '#ffffff'),
      brand:      cssVar('--brand') || '#4f46e5',
      success:    cssVar('--success') || '#10b981',
      warning:    cssVar('--warning') || '#f59e0b',
      danger:     cssVar('--danger') || '#ef4444',
      info:       cssVar('--info') || '#3b82f6',
      violet:     '#8b5cf6'
    };
  }

  function chartDefaults() {
    const c = chartColors();
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = c.text;
    Chart.defaults.borderColor = c.grid;
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.tooltip.backgroundColor = c.surface;
    Chart.defaults.plugins.tooltip.borderColor = cssVar('--border');
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.titleColor = cssVar('--text-strong');
    Chart.defaults.plugins.tooltip.bodyColor = cssVar('--text');
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.displayColors = true;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
  }

  // ============================================================
  // GLOBAL EVENT BINDINGS
  // ============================================================
  function bindGlobalEvents() {
    // Close modal on overlay click
    document.addEventListener('click', (e) => {
      if (e.target.classList && e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
      }
      // Close drawer on backdrop click (outside drawer)
      if (e.target.classList && e.target.classList.contains('drawer-backdrop')) {
        e.target.classList.remove('active');
        document.querySelectorAll('.drawer.active').forEach(d => d.classList.remove('active'));
      }
    });
    // ESC closes any open modal/drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllModals();
        closeAllDrawers();
      }
      // Cmd/Ctrl+K focuses global search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const search = document.getElementById('globalSearch');
        if (search) search.focus();
      }
    });
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  return {
    // theme
    getTheme, setTheme, toggleTheme, applyTheme,
    // modals
    openModal, closeModal, closeAllModals,
    // drawers
    openDrawer, closeDrawer, closeAllDrawers,
    // confirm
    confirm,
    // toast
    toast,
    // formatters
    fmtMoney, fmtNum, fmtTime, fmtDate, fmtDateInput, fmtDuration, fmtRelative,
    // helpers
    uid, escapeHtml, debounce, nowIso,
    // clinic type meta
    clinicTypeMeta, CLINIC_TYPE_META,
    // charts
    chartColors, chartDefaults,
    // init
    bindGlobalEvents
  };
})();
