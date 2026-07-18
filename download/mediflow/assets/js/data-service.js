/* ==========================================================================
   MediFlow — DataService
   Handles all data persistence with strict per-clinic isolation.
   Every clinic's data lives under its own localStorage namespace:
       mediflow_clinic_{clinicId}_{collection}
   The Super Admin layer uses unprefixed keys:
       mediflow_admin_{collection}
   ========================================================================== */
(function (global) {
  'use strict';

  const NAMESPACE = 'mediflow';
  const ADMIN_PREFIX = `${NAMESPACE}_admin_`;
  const CLINIC_PREFIX = `${NAMESPACE}_clinic_`;

  class DataService {
    constructor() {
      this._currentClinicId = null;
      this._listeners = new Map();
      this._seedIfEmpty();
    }

    /* ----------------------------------------------------------------------
       Internal helpers
       ---------------------------------------------------------------------- */
    _key(collection, clinicId = null) {
      if (clinicId !== null) {
        return `${CLINIC_PREFIX}${clinicId}_${collection}`;
      }
      if (this._currentClinicId) {
        return `${CLINIC_PREFIX}${this._currentClinicId}_${collection}`;
      }
      return `${ADMIN_PREFIX}${collection}`;
    }

    _read(collection, clinicId = null) {
      try {
        const raw = localStorage.getItem(this._key(collection, clinicId));
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        console.error('[MediFlow] Failed to read', collection, e);
        return null;
      }
    }

    _write(collection, data, clinicId = null) {
      try {
        localStorage.setItem(this._key(collection, clinicId), JSON.stringify(data));
        this._notify(collection, data, clinicId);
        return true;
      } catch (e) {
        console.error('[MediFlow] Failed to write', collection, e);
        return false;
      }
    }

    _notify(collection, data, clinicId) {
      const key = `${clinicId || 'admin'}:${collection}`;
      const listeners = this._listeners.get(key) || [];
      listeners.forEach(fn => fn(data));
    }

    /* ----------------------------------------------------------------------
       Public API — Clinic context
       ---------------------------------------------------------------------- */
    setClinicContext(clinicId) {
      this._currentClinicId = clinicId;
    }

    clearClinicContext() {
      this._currentClinicId = null;
    }

    getClinicContext() {
      return this._currentClinicId;
    }

    /* ----------------------------------------------------------------------
       Public API — CRUD
       ---------------------------------------------------------------------- */
    getAll(collection, clinicId = null) {
      const data = this._read(collection, clinicId);
      return Array.isArray(data) ? data : [];
    }

    getById(collection, id, clinicId = null) {
      return this.getAll(collection, clinicId).find(item => item.id === id) || null;
    }

    insert(collection, item, clinicId = null) {
      const items = this.getAll(collection, clinicId);
      const newItem = {
        id: item.id || this.generateId(),
        createdAt: new Date().toISOString(),
        ...item
      };
      items.push(newItem);
      this._write(collection, items, clinicId);
      return newItem;
    }

    update(collection, id, patch, clinicId = null) {
      const items = this.getAll(collection, clinicId);
      const idx = items.findIndex(item => item.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...patch, updatedAt: new Date().toISOString() };
      this._write(collection, items, clinicId);
      return items[idx];
    }

    delete(collection, id, clinicId = null) {
      const items = this.getAll(collection, clinicId);
      const filtered = items.filter(item => item.id !== id);
      this._write(collection, filtered, clinicId);
      return filtered.length !== items.length;
    }

    bulkInsert(collection, items, clinicId = null) {
      const existing = this.getAll(collection, clinicId);
      const newItems = items.map(item => ({
        id: item.id || this.generateId(),
        createdAt: new Date().toISOString(),
        ...item
      }));
      this._write(collection, [...existing, ...newItems], clinicId);
      return newItems;
    }

    query(collection, predicate, clinicId = null) {
      return this.getAll(collection, clinicId).filter(predicate);
    }

    /* ----------------------------------------------------------------------
       Reactive subscriptions
       ---------------------------------------------------------------------- */
    subscribe(collection, callback, clinicId = null) {
      const key = `${clinicId || 'admin'}:${collection}`;
      if (!this._listeners.has(key)) this._listeners.set(key, []);
      this._listeners.get(key).push(callback);
      return () => {
        const arr = this._listeners.get(key) || [];
        const i = arr.indexOf(callback);
        if (i !== -1) arr.splice(i, 1);
      };
    }

    /* ----------------------------------------------------------------------
       Utility
       ---------------------------------------------------------------------- */
    generateId() {
      return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    }

    /* ----------------------------------------------------------------------
       Cross-clinic operations (Super Admin only)
       ---------------------------------------------------------------------- */
    getAllClinicsData(collection) {
      const clinics = this.getAll('clinics');
      const result = [];
      clinics.forEach(clinic => {
        const items = this.getAll(collection, clinic.id);
        items.forEach(item => result.push({ ...item, clinicId: clinic.id, clinicName: clinic.name }));
      });
      return result;
    }

    /* ----------------------------------------------------------------------
       Theme & Language (global)
       ---------------------------------------------------------------------- */
    getTheme() {
      return localStorage.getItem(`${NAMESPACE}_theme`) || 'light';
    }
    setTheme(theme) {
      localStorage.setItem(`${NAMESPACE}_theme`, theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
    getLang() {
      return localStorage.getItem(`${NAMESPACE}_lang`) || 'en';
    }
    setLang(lang) {
      localStorage.setItem(`${NAMESPACE}_lang`, lang);
      document.documentElement.setAttribute('lang', lang);
      document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    }

    /* ----------------------------------------------------------------------
       Seed data — for demo / first run
       ---------------------------------------------------------------------- */
    _seedIfEmpty() {
      if (this._read('clinics')) return;

      const clinics = [
        {
          id: 'clinic_dental_001',
          name: 'Bright Smile Dental',
          type: 'dental',
          specialty: 'Dental Clinic',
          status: 'active',
          plan: 'pro',
          owner: 'Dr. Sarah Mitchell',
          email: 'admin@brightsmile.com',
          phone: '+1 415 555 0101',
          country: 'United States',
          city: 'San Francisco',
          address: '1200 Market St, Suite 200',
          createdAt: '2025-09-15T10:00:00Z',
          mrr: 299,
          patients: 1240,
          staff: 8,
          storageUsed: 2.4,
          storageLimit: 10,
          lastActive: '2026-07-18T08:30:00Z'
        },
        {
          id: 'clinic_laser_001',
          name: 'Lumière Derma & Laser',
          type: 'laser',
          specialty: 'Derma / Laser Center',
          status: 'active',
          plan: 'enterprise',
          owner: 'Dr. Aisha Karim',
          email: 'admin@lumiere-derma.com',
          phone: '+971 4 555 0102',
          country: 'United Arab Emirates',
          city: 'Dubai',
          address: 'Sheikh Zayed Road, Tower B',
          createdAt: '2025-08-22T10:00:00Z',
          mrr: 599,
          patients: 856,
          staff: 14,
          storageUsed: 4.1,
          storageLimit: 50,
          lastActive: '2026-07-18T07:15:00Z'
        },
        {
          id: 'clinic_lab_001',
          name: 'PrecisionLab Diagnostics',
          type: 'lab',
          specialty: 'Medical Laboratory',
          status: 'active',
          plan: 'pro',
          owner: 'Dr. James Chen',
          email: 'admin@precisionlab.com',
          phone: '+1 212 555 0103',
          country: 'United States',
          city: 'New York',
          address: '450 W 33rd St, Floor 5',
          createdAt: '2025-10-05T10:00:00Z',
          mrr: 299,
          patients: 2100,
          staff: 22,
          storageUsed: 7.8,
          storageLimit: 10,
          lastActive: '2026-07-18T09:45:00Z'
        },
        {
          id: 'clinic_pediatrics_001',
          name: 'Little Stars Pediatrics',
          type: 'pediatrics',
          specialty: 'Pediatrics Clinic',
          status: 'trial',
          plan: 'starter',
          owner: 'Dr. Emily Rodriguez',
          email: 'admin@littlestars.com',
          phone: '+1 305 555 0104',
          country: 'United States',
          city: 'Miami',
          address: '1100 Brickell Bay Dr',
          createdAt: '2026-07-01T10:00:00Z',
          mrr: 0,
          patients: 412,
          staff: 6,
          storageUsed: 0.8,
          storageLimit: 5,
          lastActive: '2026-07-17T16:20:00Z'
        },
        {
          id: 'clinic_internal_001',
          name: 'Cardia Internal Medicine',
          type: 'internal',
          specialty: 'Internal Medicine',
          status: 'active',
          plan: 'pro',
          owner: 'Dr. Omar Hassan',
          email: 'admin@cardia-internal.com',
          phone: '+44 20 7946 0105',
          country: 'United Kingdom',
          city: 'London',
          address: '221 Baker Street',
          createdAt: '2025-11-12T10:00:00Z',
          mrr: 299,
          patients: 980,
          staff: 11,
          storageUsed: 3.2,
          storageLimit: 10,
          lastActive: '2026-07-18T06:50:00Z'
        },
        {
          id: 'clinic_dental_002',
          name: 'Nordic Dental Care',
          type: 'dental',
          specialty: 'Dental Clinic',
          status: 'suspended',
          plan: 'starter',
          owner: 'Dr. Lars Anderson',
          email: 'admin@nordic-dental.com',
          phone: '+46 8 555 0106',
          country: 'Sweden',
          city: 'Stockholm',
          address: 'Drottninggatan 45',
          createdAt: '2025-06-30T10:00:00Z',
          mrr: 0,
          patients: 380,
          staff: 4,
          storageUsed: 1.2,
          storageLimit: 5,
          lastActive: '2026-06-28T11:00:00Z'
        },
        {
          id: 'clinic_laser_002',
          name: 'Glow Aesthetics Clinic',
          type: 'laser',
          specialty: 'Derma / Laser Center',
          status: 'active',
          plan: 'pro',
          owner: 'Dr. Sofia Park',
          email: 'admin@glowaesthetics.com',
          phone: '+82 2 555 0107',
          country: 'South Korea',
          city: 'Seoul',
          address: 'Gangnam-gu, Teheran-ro 88',
          createdAt: '2026-01-20T10:00:00Z',
          mrr: 299,
          patients: 620,
          staff: 9,
          storageUsed: 2.0,
          storageLimit: 10,
          lastActive: '2026-07-18T05:00:00Z'
        }
      ];
      this._write('clinics', clinics);

      const plans = [
        {
          id: 'plan_starter',
          name: 'Starter',
          price: 99,
          interval: 'month',
          features: ['Up to 500 patients', '3 staff accounts', '5 GB storage', 'Email support', 'Basic analytics'],
          limits: { patients: 500, staff: 3, storage: 5 },
          color: 'neutral'
        },
        {
          id: 'plan_pro',
          name: 'Professional',
          price: 299,
          interval: 'month',
          features: ['Up to 5,000 patients', 'Unlimited staff', '10 GB storage', 'Priority support', 'Advanced analytics', 'Custom workflows', 'API access'],
          limits: { patients: 5000, staff: 50, storage: 10 },
          color: 'primary',
          popular: true
        },
        {
          id: 'plan_enterprise',
          name: 'Enterprise',
          price: 599,
          interval: 'month',
          features: ['Unlimited patients', 'Unlimited staff', '50 GB storage', '24/7 dedicated support', 'Custom analytics', 'Multi-clinic management', 'White-label option', 'SLA guarantee'],
          limits: { patients: Infinity, staff: Infinity, storage: 50 },
          color: 'secondary'
        }
      ];
      this._write('plans', plans);

      // Activity log
      const activity = [
        { id: 'a1', type: 'clinic_created', title: 'New clinic registered: Little Stars Pediatrics', actor: 'System', clinic: 'Little Stars Pediatrics', timestamp: '2026-07-01T10:00:00Z', severity: 'info' },
        { id: 'a2', type: 'subscription_upgraded', title: 'Lumière Derma upgraded to Enterprise plan', actor: 'Dr. Aisha Karim', clinic: 'Lumière Derma & Laser', timestamp: '2026-07-15T14:22:00Z', severity: 'success' },
        { id: 'a3', type: 'payment_failed', title: 'Payment failed for Nordic Dental Care', actor: 'Billing System', clinic: 'Nordic Dental Care', timestamp: '2026-06-28T11:00:00Z', severity: 'danger' },
        { id: 'a4', type: 'storage_warning', title: 'PrecisionLab Diagnostics reached 78% storage', actor: 'System Monitor', clinic: 'PrecisionLab Diagnostics', timestamp: '2026-07-17T03:10:00Z', severity: 'warning' },
        { id: 'a5', type: 'clinic_suspended', title: 'Nordic Dental Care has been suspended', actor: 'Super Admin', clinic: 'Nordic Dental Care', timestamp: '2026-06-30T09:00:00Z', severity: 'danger' },
        { id: 'a6', type: 'login', title: 'Dr. Sarah Mitchell signed in to Bright Smile Dental', actor: 'Dr. Sarah Mitchell', clinic: 'Bright Smile Dental', timestamp: '2026-07-18T08:30:00Z', severity: 'info' },
        { id: 'a7', type: 'feature_used', title: 'Glow Aesthetics enabled the AI Skin Analysis module', actor: 'Dr. Sofia Park', clinic: 'Glow Aesthetics Clinic', timestamp: '2026-07-16T11:45:00Z', severity: 'info' },
        { id: 'a8', type: 'support_ticket', title: 'Cardia Internal Medicine opened a support ticket', actor: 'Dr. Omar Hassan', clinic: 'Cardia Internal Medicine', timestamp: '2026-07-17T19:20:00Z', severity: 'warning' }
      ];
      this._write('activity', activity);

      // Revenue history (last 12 months)
      const revenue = [
        { month: 'Aug', revenue: 1240, mrr: 1180, clinics: 4 },
        { month: 'Sep', revenue: 1530, mrr: 1490, clinics: 5 },
        { month: 'Oct', revenue: 1798, mrr: 1798, clinics: 6 },
        { month: 'Nov', revenue: 2097, mrr: 2097, clinics: 7 },
        { month: 'Dec', revenue: 2097, mrr: 2097, clinics: 7 },
        { month: 'Jan', revenue: 2396, mrr: 2396, clinics: 8 },
        { month: 'Feb', revenue: 2396, mrr: 2396, clinics: 8 },
        { month: 'Mar', revenue: 2695, mrr: 2695, clinics: 9 },
        { month: 'Apr', revenue: 2695, mrr: 2695, clinics: 9 },
        { month: 'May', revenue: 2695, mrr: 2695, clinics: 9 },
        { month: 'Jun', revenue: 2695, mrr: 2695, clinics: 9 },
        { month: 'Jul', revenue: 2396, mrr: 2396, clinics: 7 }
      ];
      this._write('revenue_history', revenue);

      // Admin user
      const admin = {
        id: 'admin_001',
        name: 'Alex Morgan',
        email: 'alex@mediflow.io',
        role: 'Super Admin',
        avatar: 'AM'
      };
      this._write('current_admin', admin);

      // Patients distribution by clinic type
      const patientsByType = [
        { type: 'Dental', count: 1620, color: '#6366f1' },
        { type: 'Derma/Laser', count: 1476, color: '#8b5cf6' },
        { type: 'Lab', count: 2100, color: '#06b6d4' },
        { type: 'Pediatrics', count: 412, color: '#10b981' },
        { type: 'Internal', count: 980, color: '#f59e0b' }
      ];
      this._write('patients_by_type', patientsByType);

      // Seed per-clinic sample data (only patients counts for Super Admin dashboard)
      clinics.forEach(clinic => {
        if (clinic.patients > 0) {
          this._seedClinicPatients(clinic);
        }
      });
    }

    _seedClinicPatients(clinic) {
      const patients = [];
      const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Chris', 'Karen'];
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
      const seedCount = Math.min(20, clinic.patients);
      const statuses = ['arrived', 'waiting', 'withDoctor', 'completed'];

      for (let i = 0; i < seedCount; i++) {
        const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
        const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
        patients.push({
          id: `pt_${clinic.id}_${i.toString().padStart(3, '0')}`,
          name: `${fn} ${ln}`,
          age: 18 + Math.floor(Math.random() * 60),
          gender: Math.random() > 0.5 ? 'male' : 'female',
          phone: `+1 555 ${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')} ${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
          email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          lastVisit: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 365) * 86400000).toISOString()
        });
      }
      this._write('patients', patients, clinic.id);
    }

    /* ----------------------------------------------------------------------
       Reset (dev only)
       ---------------------------------------------------------------------- */
    resetAll() {
      Object.keys(localStorage)
        .filter(k => k.startsWith(NAMESPACE))
        .forEach(k => localStorage.removeItem(k));
      this._seedIfEmpty();
    }
  }

  // Export singleton
  global.DataService = new DataService();
})(window);
