/* ============================================================
   MediFlow — UI Toolkit
   - Modal system (reusable openModal / closeModal)
   - Theme (dark/light, persisted)
   - Toast notifications
   - Formatters (money, date, time, duration)
   - Tiny helpers (uid, escapeHtml, debounce)
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
    document.querySelectorAll('[data-theme-icon]').forEach(el => {
      el.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    });
    document.querySelectorAll('[data-theme-label]').forEach(el => {
      el.textContent = theme === 'dark' ? MediFlow.I18n.t('darkMode') : MediFlow.I18n.t('lightMode');
    });
    document.querySelectorAll('[data-theme-toggle-icon]').forEach(el => {
      el.textContent = theme === 'dark' ? 'toggle_on' : 'toggle_off';
    });
  }

  // ============================================================
  // MODAL SYSTEM
  // Usage:
  //   openModal('clinicModal')
  //   closeModal('clinicModal')
  //   closeAllModals()
  // ============================================================
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) { console.warn('[UI] modal not found:', id); return; }
    m.classList.add('active');
    // Auto-focus first input
    setTimeout(() => {
      const firstInput = m.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }, 50);
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
  }
  function closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }

  // ============================================================
  // TOAST
  // ============================================================
  function toast(message, type = 'info', timeout = 3000) {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const icon = { info: 'info', success: 'check_circle', warning: 'warning', danger: 'error' }[type] || 'info';
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <span class="ms ms-sm" style="color:var(--mf-${type === 'danger' ? 'danger' : type})">${icon}</span>
      <span class="text-sm font-medium flex-1">${escapeHtml(message)}</span>
      <button class="text-slate-400 hover:text-slate-700" onclick="this.parentElement.remove()">
        <span class="ms ms-sm">close</span>
      </button>
    `;
    stack.appendChild(el);
    if (timeout > 0) {
      setTimeout(() => {
        el.style.transition = 'opacity .25s';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 250);
      }, timeout);
    }
  }

  // ============================================================
  // FORMATTERS
  // ============================================================
  function fmtMoney(n) {
    const v = Number(n) || 0;
    return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  function fmtNum(n) { return (Number(n) || 0).toLocaleString(); }
  function fmtTime(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return '—'; }
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString(); }
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
  // Used by both super-admin and clinic-portal layers.
  // ============================================================
  const CLINIC_TYPE_META = {
    DENTAL:      { icon: 'dentistry',     color: 'bg-blue-500',    badge: 'badge-arrived',    tKey: 'type_dental' },
    DERMA_LASER: { icon: 'spa',           color: 'bg-purple-500',  badge: 'badge-withDoctor', tKey: 'type_laser' },
    LAB:         { icon: 'science',       color: 'bg-emerald-500', badge: 'badge-completed',  tKey: 'type_lab' },
    PEDIATRICS:  { icon: 'child_care',    color: 'bg-amber-500',   badge: 'badge-waiting',    tKey: 'type_pediatrics' },
    INTERNAL:    { icon: 'favorite',      color: 'bg-rose-500',    badge: 'badge-onDuty',     tKey: 'type_internal' }
  };
  function clinicTypeMeta(type) { return CLINIC_TYPE_META[type] || CLINIC_TYPE_META.DENTAL; }

  // ============================================================
  // GLOBAL EVENT BINDINGS
  // ============================================================
  function bindGlobalEvents() {
    // Close modal on overlay click (not on card)
    document.addEventListener('click', (e) => {
      if (e.target.classList && e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
      }
    });
    // ESC closes any open modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllModals();
    });
  }

  return {
    // theme
    getTheme, setTheme, toggleTheme, applyTheme,
    // modals
    openModal, closeModal, closeAllModals,
    // toast
    toast,
    // formatters
    fmtMoney, fmtNum, fmtTime, fmtDate, fmtDateInput, fmtDuration,
    // helpers
    uid, escapeHtml, debounce, nowIso,
    // clinic type meta
    clinicTypeMeta, CLINIC_TYPE_META,
    // init
    bindGlobalEvents
  };
})();
