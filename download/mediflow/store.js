// ==========================================
// MediFlow Shared Store & Helpers
// All persistence happens in localStorage.
// Keys are namespaced: mediflow_*
// ==========================================

const MF_KEYS = {
  clinics:    'mediflow_clinics',
  doctors:    'mediflow_doctors',
  patients:   'mediflow_patients',
  clinicMeta: 'mediflow_clinic_meta',   // current clinic context (id, type)
  theme:      'mediflow_theme',
  lang:       'mediflow_lang',
  notifs:     'mediflow_notifs'
};

// ==========================================
// Persistence helpers
// ==========================================
function storeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn('storeGet parse fail', key, e);
    return fallback;
  }
}
function storeSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ==========================================
// Global stores (loaded once per page)
// ==========================================
let clinicsData   = storeGet(MF_KEYS.clinics, []);
let doctorsData   = storeGet(MF_KEYS.doctors, []);
let patientsData  = storeGet(MF_KEYS.patients, []);
let notifsData    = storeGet(MF_KEYS.notifs, []);

function persistClinics()  { storeSet(MF_KEYS.clinics, clinicsData); }
function persistDoctors()  { storeSet(MF_KEYS.doctors, doctorsData); }
function persistPatients() { storeSet(MF_KEYS.patients, patientsData); }
function persistNotifs()   { storeSet(MF_KEYS.notifs, notifsData); }

// ==========================================
// ID generator
// ==========================================
function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ==========================================
// Currency / number formatting
// ==========================================
function fmtMoney(n) {
  const v = Number(n) || 0;
  return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function fmtNum(n) { return (Number(n) || 0).toLocaleString(); }

// ==========================================
// Date / time helpers
// ==========================================
function nowIso() { return new Date().toISOString(); }
function fmtTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}
function fmtDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch { return '—'; }
}
function fmtDuration(ms) {
  if (!ms || ms < 0) return '—';
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

// ==========================================
// Notification helper
// ==========================================
function pushNotif(message, type = 'info') {
  notifsData.unshift({
    id: uid('ntf'),
    message,
    type,
    ts: nowIso(),
    read: false
  });
  // Keep last 50
  if (notifsData.length > 50) notifsData = notifsData.slice(0, 50);
  persistNotifs();
  // Update badge if function exists
  if (typeof renderNotifBadge === 'function') renderNotifBadge();
}

// ==========================================
// Theme helpers
// ==========================================
function getTheme() { return localStorage.getItem(MF_KEYS.theme) || 'light'; }
function setTheme(theme) {
  localStorage.setItem(MF_KEYS.theme, theme);
  applyTheme();
}
function applyTheme() {
  const theme = getTheme();
  document.documentElement.classList.toggle('dark', theme === 'dark');
  // Update toggle icon if present
  const icon = document.getElementById('themeToggleIcon');
  if (icon) icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
}

// ==========================================
// Seed data — only runs once, on first load
// ==========================================
function seedIfEmpty() {
  if (clinicsData.length === 0) {
    const today = new Date();
    const addMonths = (m) => new Date(today.getFullYear(), today.getMonth() + m, today.getDate()).toISOString().slice(0, 10);

    clinicsData = [
      { id: 'cln_dental1',  name: 'Bright Smile Dental',     type: 'DENTAL',     manager: 'Dr. Sara Khalil', plan: 'pro',       expiry: addMonths(8),  bookings: 142, revenue: 18450 },
      { id: 'cln_laser1',   name: 'Glow Derma & Laser',      type: 'DERMA_LASER',manager: 'Dr. Lina Haddad', plan: 'enterprise',expiry: addMonths(14), bookings: 318, revenue: 41200 },
      { id: 'cln_lab1',     name: 'City Lab Diagnostics',    type: 'LAB',        manager: 'Mr. Omar Najjar', plan: 'pro',       expiry: addMonths(3),  bookings: 567, revenue: 22350 },
      { id: 'cln_ped1',     name: 'Tiny Tots Pediatrics',    type: 'PEDIATRICS', manager: 'Dr. Hiba Salem',  plan: 'starter',   expiry: addMonths(2),  bookings: 89,  revenue: 6200  },
      { id: 'cln_int1',     name: 'HeartCare Internal Med',  type: 'INTERNAL',   manager: 'Dr. Karim Awn',   plan: 'pro',       expiry: addMonths(11), bookings: 203, revenue: 15800 }
    ];
    persistClinics();
  }

  if (doctorsData.length === 0) {
    doctorsData = [
      { id: 'doc_1', clinicId: 'cln_dental1', name: 'Dr. Sara Khalil', specialty: 'Orthodontics',  status: 'onDuty',  fixedSalary: 3000, incentiveRate: 20 },
      { id: 'doc_2', clinicId: 'cln_dental1', name: 'Dr. Fadi Mousa',  specialty: 'Endodontics',   status: 'onLeave', fixedSalary: 2800, incentiveRate: 15 },
      { id: 'doc_3', clinicId: 'cln_laser1',  name: 'Dr. Lina Haddad', specialty: 'Dermatology',   status: 'onDuty',  fixedSalary: 4000, incentiveRate: 25 },
      { id: 'doc_4', clinicId: 'cln_laser1',  name: 'Dr. Rana Othman', specialty: 'Laser Therapy', status: 'onDuty',  fixedSalary: 3500, incentiveRate: 22 },
      { id: 'doc_5', clinicId: 'cln_lab1',    name: 'Dr. Sami Khoury', specialty: 'Pathology',     status: 'onDuty',  fixedSalary: 3200, incentiveRate: 10 },
      { id: 'doc_6', clinicId: 'cln_ped1',    name: 'Dr. Hiba Salem',  specialty: 'Pediatrics',    status: 'onDuty',  fixedSalary: 2600, incentiveRate: 18 },
      { id: 'doc_7', clinicId: 'cln_int1',    name: 'Dr. Karim Awn',   specialty: 'Cardiology',    status: 'onDuty',  fixedSalary: 3800, incentiveRate: 20 }
    ];
    persistDoctors();
  }

  if (patientsData.length === 0) {
    patientsData = [
      { id: 'pat_1', clinicId: 'cln_dental1', name: 'Ahmad Taleb',  phone: '+961 70 112 233', age: 34, gender: 'male',   doctorId: 'doc_1', status: 'arrived',    arrivedAt: nowIso(), withDoctorAt: null, completedAt: null, procedure: 'Cleaning', invoice: 80,  toothNumber: '' },
      { id: 'pat_2', clinicId: 'cln_dental1', name: 'Maya Saleh',   phone: '+961 71 445 667', age: 28, gender: 'female', doctorId: 'doc_1', status: 'withDoctor', arrivedAt: new Date(Date.now() - 25*60000).toISOString(), withDoctorAt: new Date(Date.now() - 5*60000).toISOString(), completedAt: null, procedure: 'Filling', invoice: 150, toothNumber: '16' },
      { id: 'pat_3', clinicId: 'cln_laser1',  name: 'Nour Hadi',    phone: '+961 76 778 990', age: 31, gender: 'female', doctorId: 'doc_3', status: 'waiting',    arrivedAt: new Date(Date.now() - 12*60000).toISOString(), withDoctorAt: null, completedAt: null, laserType: 'Diode', bodyArea: 'Underarm', sessions: 3, skinType: 'III', hairThickness: 'Medium', invoice: 120 },
      { id: 'pat_4', clinicId: 'cln_laser1',  name: 'Layla Jamil',  phone: '+961 78 332 110', age: 26, gender: 'female', doctorId: 'doc_4', status: 'completed',  arrivedAt: new Date(Date.now() - 90*60000).toISOString(), withDoctorAt: new Date(Date.now() - 70*60000).toISOString(), completedAt: new Date(Date.now() - 50*60000).toISOString(), laserType: 'Alexandrite', bodyArea: 'Legs', sessions: 5, skinType: 'II', hairThickness: 'Fine', invoice: 280 },
      { id: 'pat_5', clinicId: 'cln_lab1',    name: 'Khaled Adnan', phone: '+961 79 554 332', age: 45, gender: 'male',   doctorId: 'doc_5', status: 'arrived',    arrivedAt: nowIso(), withDoctorAt: null, completedAt: null, testType: 'Lipid Panel', result: '', invoice: 60 },
      { id: 'pat_6', clinicId: 'cln_ped1',    name: 'Yara (Child)', phone: '+961 70 998 776', age: 6,  gender: 'female', doctorId: 'doc_6', status: 'arrived',    arrivedAt: nowIso(), withDoctorAt: null, completedAt: null, weight: 22, guardian: 'Mrs. Hala', invoice: 50 },
      { id: 'pat_7', clinicId: 'cln_int1',    name: 'George Aoun',  phone: '+961 71 223 445', age: 58, gender: 'male',   doctorId: 'doc_7', status: 'withDoctor', arrivedAt: new Date(Date.now() - 35*60000).toISOString(), withDoctorAt: new Date(Date.now() - 8*60000).toISOString(), completedAt: null, procedure: 'ECG', invoice: 95 }
    ];
    persistPatients();
  }
}
