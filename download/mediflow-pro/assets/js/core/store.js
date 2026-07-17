/* ============================================================
   MediFlow — DataService
   Central persistence layer with DYNAMIC PER-CLINIC PREFIXING.
   Each clinic's data lives under `clinic_${clinicId}_${type}`,
   guaranteeing zero data leakage between clinics.
   ============================================================ */

window.MediFlow = window.MediFlow || {};

MediFlow.Store = (function () {
  'use strict';

  // ---- Global key namespace (shared across clinics) ----
  const GLOBAL_KEYS = Object.freeze({
    clinics:   'mediflow_clinics',
    meta:      'mediflow_active_clinic',  // { id, type, name }
    theme:     'mediflow_theme',
    lang:      'mediflow_lang',
    notifs:    'mediflow_notifs',
    dentalChart: 'mediflow_dental_chart'  // map: clinicId -> affected teeth set
  });

  // ---- Clinic-scoped data types ----
  const CLINIC_TYPES = Object.freeze({
    patients:   'patients',
    doctors:    'doctors',
    employees:  'employees',
    financials: 'financials',
    inventory:  'inventory',
    settings:   'settings'
  });

  // ---- Low-level read/write ----
  function _get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : (fallback === undefined ? null : fallback);
    } catch (e) {
      console.warn('[MediFlow.Store] parse fail for', key, e);
      return fallback === undefined ? null : fallback;
    }
  }
  function _set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.error('[MediFlow.Store] write fail for', key, e); }
  }
  function _remove(key) { localStorage.removeItem(key); }

  // ---- Build a clinic-scoped key ----
  function clinicKey(clinicId, type) {
    return `clinic_${clinicId}_${type}`;
  }

  // ============================================================
  // DataService — instance bound to a specific clinic
  // ============================================================
  class DataService {
    constructor(clinicId) {
      if (!clinicId) throw new Error('DataService requires a clinicId');
      this.clinicId = clinicId;
    }

    // ---- Clinic-scoped getters/setters ----
    getPatients()   { return _get(clinicKey(this.clinicId, CLINIC_TYPES.patients),   []); }
    setPatients(d)  { _set(clinicKey(this.clinicId, CLINIC_TYPES.patients),   d); return this; }
    getDoctors()    { return _get(clinicKey(this.clinicId, CLINIC_TYPES.doctors),    []); }
    setDoctors(d)   { _set(clinicKey(this.clinicId, CLINIC_TYPES.doctors),    d); return this; }
    getEmployees()  { return _get(clinicKey(this.clinicId, CLINIC_TYPES.employees),  []); }
    setEmployees(d) { _set(clinicKey(this.clinicId, CLINIC_TYPES.employees),  d); return this; }
    getFinancials() { return _get(clinicKey(this.clinicId, CLINIC_TYPES.financials), { revenue:0, expenses:0, payouts:[] }); }
    setFinancials(d){ _set(clinicKey(this.clinicId, CLINIC_TYPES.financials), d); return this; }
    getInventory()  { return _get(clinicKey(this.clinicId, CLINIC_TYPES.inventory),  []); }
    setInventory(d) { _set(clinicKey(this.clinicId, CLINIC_TYPES.inventory),  d); return this; }
    getSettings()   { return _get(clinicKey(this.clinicId, CLINIC_TYPES.settings),   {}); }
    setSettings(d)  { _set(clinicKey(this.clinicId, CLINIC_TYPES.settings),   d); return this; }

    // ---- Generic clinic-scoped getter (for dynamic types) ----
    get(type, fallback) { return _get(clinicKey(this.clinicId, type), fallback); }
    set(type, value)    { _set(clinicKey(this.clinicId, type), value); return this; }

    // ---- Wipe ALL data for this clinic (used on clinic deletion) ----
    wipe() {
      Object.values(CLINIC_TYPES).forEach(type => _remove(clinicKey(this.clinicId, type)));
      // Also wipe dental chart if present
      const chart = _get(GLOBAL_KEYS.dentalChart, {});
      if (chart[this.clinicId]) {
        delete chart[this.clinicId];
        _set(GLOBAL_KEYS.dentalChart, chart);
      }
      return this;
    }
  }

  // ============================================================
  // Public API
  // ============================================================
  return {
    DataService,
    GLOBAL_KEYS,
    CLINIC_TYPES,

    // ---- Factory ----
    forClinic(clinicId) { return new DataService(clinicId); },

    // ---- Global (non-clinic) accessors ----
    getClinics()          { return _get(GLOBAL_KEYS.clinics, []); },
    setClinics(d)         { _set(GLOBAL_KEYS.clinics, d); },
    getActiveClinic()     { return _get(GLOBAL_KEYS.meta, null); },
    setActiveClinic(meta) { _set(GLOBAL_KEYS.meta, meta); },
    clearActiveClinic()   { _remove(GLOBAL_KEYS.meta); },

    getTheme()  { return _get(GLOBAL_KEYS.theme, 'light'); },
    setTheme(t) { _set(GLOBAL_KEYS.theme, t); },

    getLang()   { return _get(GLOBAL_KEYS.lang, 'en'); },
    setLang(l)  { _set(GLOBAL_KEYS.lang, l); },

    getNotifs()    { return _get(GLOBAL_KEYS.notifs, []); },
    setNotifs(n)   { _set(GLOBAL_KEYS.notifs, n); },
    pushNotif(msg, type = 'info') {
      const list = _get(GLOBAL_KEYS.notifs, []);
      list.unshift({ id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, message: msg, type, ts: new Date().toISOString(), read: false });
      _set(GLOBAL_KEYS.notifs, list.slice(0, 50));
    },
    markAllNotifsRead() {
      const list = _get(GLOBAL_KEYS.notifs, []);
      list.forEach(n => n.read = true);
      _set(GLOBAL_KEYS.notifs, list);
    },

    getDentalChart(clinicId) {
      const chart = _get(GLOBAL_KEYS.dentalChart, {});
      return chart[clinicId] || { affected: [], extracted: [] };
    },
    setDentalChart(clinicId, data) {
      const chart = _get(GLOBAL_KEYS.dentalChart, {});
      chart[clinicId] = data;
      _set(GLOBAL_KEYS.dentalChart, chart);
    },

    // ---- Maintenance ----
    wipeAll() {
      Object.values(GLOBAL_KEYS).forEach(_remove);
      // Wipe every clinic_* key
      Object.keys(localStorage)
        .filter(k => k.startsWith('clinic_'))
        .forEach(_remove);
    }
  };
})();
