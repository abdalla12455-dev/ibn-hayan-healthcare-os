/* ============================================================
   MediFlow — Seed Data
   On first load, creates 5 demo clinics with isolated
   localStorage namespaces (one per clinic via DataService).
   Idempotent: only seeds when mediflow_clinics is empty.
   ============================================================ */

window.MediFlow = window.MediFlow || {};

MediFlow.Seed = (function () {
  'use strict';

  const { forClinic, getClinics, setClinics } = MediFlow.Store;

  function seedIfEmpty() {
    if (getClinics().length > 0) return;

    const today = new Date();
    const addMonths = (m) => new Date(today.getFullYear(), today.getMonth() + m, today.getDate()).toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString();

    // ---- Clinics (global) ----
    const clinics = [
      { id: 'cln_dental1', name: 'Bright Smile Dental',    type: 'DENTAL',      manager: 'Dr. Sara Khalil', plan: 'pro',        expiry: addMonths(8),  bookings: 0, revenue: 0 },
      { id: 'cln_laser1',  name: 'Glow Derma & Laser',     type: 'DERMA_LASER', manager: 'Dr. Lina Haddad', plan: 'enterprise', expiry: addMonths(14), bookings: 0, revenue: 0 },
      { id: 'cln_lab1',    name: 'City Lab Diagnostics',   type: 'LAB',         manager: 'Mr. Omar Najjar', plan: 'pro',        expiry: addMonths(3),  bookings: 0, revenue: 0 },
      { id: 'cln_ped1',    name: 'Tiny Tots Pediatrics',   type: 'PEDIATRICS',  manager: 'Dr. Hiba Salem',  plan: 'starter',    expiry: addMonths(2),  bookings: 0, revenue: 0 },
      { id: 'cln_int1',    name: 'HeartCare Internal Med', type: 'INTERNAL',    manager: 'Dr. Karim Awn',   plan: 'pro',        expiry: addMonths(11), bookings: 0, revenue: 0 }
    ];
    setClinics(clinics);

    // ---- Per-clinic isolated data ----
    seedDental(clinics[0].id, ago, now);
    seedLaser(clinics[1].id, ago, now);
    seedLab(clinics[2].id, ago, now);
    seedPeds(clinics[3].id, ago, now);
    seedInternal(clinics[4].id, ago, now);

    // ---- Notifications ----
    MediFlow.Store.pushNotif('Welcome to MediFlow — demo clinics seeded', 'success');
    MediFlow.Store.pushNotif('Subscription for Tiny Tots Pediatrics expires soon', 'warning');
  }

  // ============================================================
  // Per-clinic seeders — each writes ONLY to its own keys
  // ============================================================
  function seedDental(id, ago, now) {
    const ds = forClinic(id);
    ds.setDoctors([
      { id: 'doc_1', name: 'Dr. Sara Khalil', specialty: 'Orthodontics', status: 'onDuty',  fixedSalary: 3000, incentiveRate: 20 },
      { id: 'doc_2', name: 'Dr. Fadi Mousa',  specialty: 'Endodontics',  status: 'onLeave', fixedSalary: 2800, incentiveRate: 15 }
    ]);
    ds.setPatients([
      { id: 'pat_1', name: 'Ahmad Taleb',  phone: '+961 70 112 233', age: 34, gender: 'male',   doctorId: 'doc_1', status: 'arrived',    arrivedAt: now, withDoctorAt: null, completedAt: null, procedure: 'Cleaning', invoice: 80,  toothNumber: '' },
      { id: 'pat_2', name: 'Maya Saleh',   phone: '+961 71 445 667', age: 28, gender: 'female', doctorId: 'doc_1', status: 'withDoctor', arrivedAt: ago(25), withDoctorAt: ago(5),  completedAt: null, procedure: 'Filling',  invoice: 150, toothNumber: '16' },
      { id: 'pat_3', name: 'Joe Rashid',   phone: '+961 76 220 991', age: 41, gender: 'male',   doctorId: 'doc_2', status: 'completed',   arrivedAt: ago(120), withDoctorAt: ago(95), completedAt: ago(70), procedure: 'Extraction', invoice: 220, toothNumber: '37' }
    ]);
    ds.setEmployees([
      { id: 'emp_1', name: 'Nadia Khoury', role: 'Receptionist', salary: 800, status: 'active' },
      { id: 'emp_2', name: 'Elias Aoun',   role: 'Assistant',    salary: 600, status: 'active' }
    ]);
    ds.setFinancials({ revenue: 450, expenses: 0, payouts: [] });
    ds.setSettings({ currency: 'USD', taxRate: 0 });
    MediFlow.Store.setDentalChart(id, { affected: [16, 37], extracted: [18] });
  }

  function seedLaser(id, ago, now) {
    const ds = forClinic(id);
    ds.setDoctors([
      { id: 'doc_3', name: 'Dr. Lina Haddad', specialty: 'Dermatology',   status: 'onDuty', fixedSalary: 4000, incentiveRate: 25 },
      { id: 'doc_4', name: 'Dr. Rana Othman', specialty: 'Laser Therapy', status: 'onDuty', fixedSalary: 3500, incentiveRate: 22 }
    ]);
    ds.setPatients([
      { id: 'pat_4', name: 'Nour Hadi',    phone: '+961 76 778 990', age: 31, gender: 'female', doctorId: 'doc_3', status: 'waiting',    arrivedAt: ago(12), withDoctorAt: null,        completedAt: null,       laserType: 'Diode',        bodyArea: 'Underarm', sessions: 3, skinType: 'III', hairThickness: 'Medium', invoice: 120 },
      { id: 'pat_5', name: 'Layla Jamil',  phone: '+961 78 332 110', age: 26, gender: 'female', doctorId: 'doc_4', status: 'completed',  arrivedAt: ago(90), withDoctorAt: ago(70),     completedAt: ago(50),    laserType: 'Alexandrite', bodyArea: 'Legs',     sessions: 5, skinType: 'II',  hairThickness: 'Fine',   invoice: 280 },
      { id: 'pat_6', name: 'Sara Mansour', phone: '+961 79 110 442', age: 35, gender: 'female', doctorId: 'doc_3', status: 'arrived',    arrivedAt: now,     withDoctorAt: null,        completedAt: null,       laserType: 'Nd:YAG',      bodyArea: 'Face',     sessions: 2, skinType: 'IV',  hairThickness: 'Coarse', invoice: 200 }
    ]);
    ds.setEmployees([
      { id: 'emp_3', name: 'Hala Saad', role: 'Nurse',     salary: 900, status: 'active' },
      { id: 'emp_4', name: 'Rim Awwad', role: 'Receptionist', salary: 800, status: 'active' }
    ]);
    ds.setFinancials({ revenue: 600, expenses: 0, payouts: [] });
    ds.setSettings({ currency: 'USD', taxRate: 0 });
  }

  function seedLab(id, ago, now) {
    const ds = forClinic(id);
    ds.setDoctors([
      { id: 'doc_5', name: 'Dr. Sami Khoury', specialty: 'Pathology', status: 'onDuty', fixedSalary: 3200, incentiveRate: 10 }
    ]);
    ds.setPatients([
      { id: 'pat_7', name: 'Khaled Adnan', phone: '+961 79 554 332', age: 45, gender: 'male', doctorId: 'doc_5', status: 'arrived',  arrivedAt: now,    withDoctorAt: null, completedAt: null, testType: 'Lipid Panel', result: '', invoice: 60 },
      { id: 'pat_8', name: 'Mona Said',    phone: '+961 70 220 778', age: 38, gender: 'female', doctorId: 'doc_5', status: 'completed', arrivedAt: ago(180), withDoctorAt: ago(150), completedAt: ago(120), testType: 'CBC', result: 'Normal', invoice: 45 }
    ]);
    ds.setInventory([
      { id: 'inv_1', name: 'Lancets',       quantity: 500, unit: 'pcs', expiry: '2026-12-31' },
      { id: 'inv_2', name: 'Test Tubes',    quantity: 320, unit: 'pcs', expiry: '2026-08-15' },
      { id: 'inv_3', name: 'Hemoglobin Reagent', quantity: 12, unit: 'vials', expiry: '2026-03-01' }
    ]);
    ds.setEmployees([
      { id: 'emp_5', name: 'Tareq Nabil', role: 'Lab Tech', salary: 1000, status: 'active' }
    ]);
    ds.setFinancials({ revenue: 105, expenses: 0, payouts: [] });
    ds.setSettings({ currency: 'USD', taxRate: 0 });
  }

  function seedPeds(id, ago, now) {
    const ds = forClinic(id);
    ds.setDoctors([
      { id: 'doc_6', name: 'Dr. Hiba Salem', specialty: 'Pediatrics', status: 'onDuty', fixedSalary: 2600, incentiveRate: 18 }
    ]);
    ds.setPatients([
      { id: 'pat_9', name: 'Yara (Child)', phone: '+961 70 998 776', age: 6, gender: 'female', doctorId: 'doc_6', status: 'arrived', arrivedAt: now, withDoctorAt: null, completedAt: null, weight: 22, guardian: 'Mrs. Hala', invoice: 50 }
    ]);
    ds.setEmployees([
      { id: 'emp_6', name: 'Lina Azar', role: 'Nurse', salary: 850, status: 'active' }
    ]);
    ds.setFinancials({ revenue: 50, expenses: 0, payouts: [] });
    ds.setSettings({ currency: 'USD', taxRate: 0 });
  }

  function seedInternal(id, ago, now) {
    const ds = forClinic(id);
    ds.setDoctors([
      { id: 'doc_7', name: 'Dr. Karim Awn', specialty: 'Cardiology', status: 'onDuty', fixedSalary: 3800, incentiveRate: 20 }
    ]);
    ds.setPatients([
      { id: 'pat_10', name: 'George Aoun', phone: '+961 71 223 445', age: 58, gender: 'male', doctorId: 'doc_7', status: 'withDoctor', arrivedAt: ago(35), withDoctorAt: ago(8), completedAt: null, procedure: 'ECG', result: '', invoice: 95 }
    ]);
    ds.setEmployees([
      { id: 'emp_7', name: 'Nour Asmar', role: 'Nurse', salary: 900, status: 'active' }
    ]);
    ds.setFinancials({ revenue: 95, expenses: 0, payouts: [] });
    ds.setSettings({ currency: 'USD', taxRate: 0 });
  }

  return { seedIfEmpty };
})();
