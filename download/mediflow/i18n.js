// ==========================================
// MediFlow i18n Dictionary (Arabic / English)
// Bidirectional language switching with RTL/LTR support
// ==========================================

const T = {
  // ---- App Brand ----
  appName:        { en: "MediFlow",        ar: "ميدي فلو" },
  appTagline:     { en: "Clinic Management SaaS", ar: "نظام إدارة العيادات" },

  // ---- Navigation / Sidebar ----
  dashboard:      { en: "Dashboard",       ar: "الرئيسية" },
  patients:       { en: "Patients",        ar: "المرضى" },
  doctors:        { en: "Doctors",         ar: "الأطباء" },
  appointments:   { en: "Appointments",    ar: "المواعيد" },
  financials:     { en: "Financials",      ar: "المالية" },
  inventory:      { en: "Inventory",       ar: "المخزون" },
  employees:      { en: "Employees",       ar: "الموظفون" },
  reports:        { en: "Reports",         ar: "التقارير" },
  settings:       { en: "Settings",        ar: "الإعدادات" },
  clinics:        { en: "Clinics",         ar: "العيادات" },
  subscriptions:  { en: "Subscriptions",   ar: "الاشتراكات" },

  // ---- Super Admin ----
  superAdmin:     { en: "Super Admin",     ar: "المشرف العام" },
  totalClinics:   { en: "Total Clinics",   ar: "إجمالي العيادات" },
  totalRevenue:   { en: "Total Revenue",   ar: "إجمالي الإيرادات" },
  activeDoctors:  { en: "Active Doctors",  ar: "الأطباء النشطون" },
  totalPatients:  { en: "Total Patients",  ar: "إجمالي المرضى" },
  addClinic:      { en: "Add Clinic",      ar: "إضافة عيادة" },
  clinicName:     { en: "Clinic Name",     ar: "اسم العيادة" },
  clinicType:     { en: "Clinic Type",     ar: "نوع العيادة" },
  manager:        { en: "Manager",         ar: "المدير" },
  plan:           { en: "Plan",            ar: "الباقة" },
  expiry:         { en: "Expiry",          ar: "تاريخ الانتهاء" },
  bookings:       { en: "Bookings",        ar: "الحجوزات" },
  openClinic:     { en: "Open",            ar: "فتح" },
  actions:        { en: "Actions",         ar: "إجراءات" },

  // ---- Clinic Types ----
  type_dental:    { en: "Dental",          ar: "أسنان" },
  type_derma:     { en: "Dermatology",     ar: "جلدية" },
  type_laser:     { en: "Derma / Laser",   ar: "جلدية / ليزر" },
  type_lab:       { en: "Laboratory",      ar: "مختبر" },
  type_pediatrics:{ en: "Pediatrics",      ar: "أطفال" },
  type_internal:  { en: "Internal Medicine", ar: "باطنية" },

  // ---- Subscription Plans ----
  plan_starter:   { en: "Starter",         ar: "المبتدئ" },
  plan_pro:       { en: "Professional",    ar: "الاحترافي" },
  plan_enterprise:{ en: "Enterprise",      ar: "المؤسسات" },

  // ---- Patient Lifecycle ----
  addPatient:     { en: "Add Patient",     ar: "إضافة مريض" },
  patientName:    { en: "Patient Name",    ar: "اسم المريض" },
  phone:          { en: "Phone",           ar: "الهاتف" },
  age:            { en: "Age",             ar: "العمر" },
  gender:         { en: "Gender",          ar: "الجنس" },
  male:           { en: "Male",            ar: "ذكر" },
  female:         { en: "Female",          ar: "أنثى" },
  assignDoctor:   { en: "Assign Doctor",   ar: "تعيين طبيب" },
  status:         { en: "Status",          ar: "الحالة" },
  st_arrived:     { en: "Arrived",         ar: "وصل" },
  st_waiting:     { en: "Waiting",         ar: "في الانتظار" },
  st_withDoctor:  { en: "With Doctor",     ar: "مع الطبيب" },
  st_completed:   { en: "Completed",       ar: "مكتمل" },
  st_cancelled:   { en: "Cancelled",       ar: "ملغي" },
  arrivedAt:      { en: "Arrived At",      ar: "وقت الوصول" },
  waitTime:       { en: "Wait Time",       ar: "وقت الانتظار" },

  // ---- Doctor ----
  addDoctor:      { en: "Add Doctor",      ar: "إضافة طبيب" },
  doctorName:     { en: "Doctor Name",     ar: "اسم الطبيب" },
  specialty:      { en: "Specialty",       ar: "التخصص" },
  onDuty:         { en: "On Duty",         ar: "في العمل" },
  onLeave:        { en: "On Leave",        ar: "في إجازة" },
  fixedSalary:    { en: "Fixed Salary",    ar: "راتب ثابت" },
  incentiveRate:  { en: "Incentive Rate %", ar: "نسبة الحافز %" },
  payDoctor:      { en: "Pay Doctor",      ar: "دفع للطبيب" },
  patientsToday:  { en: "Patients Today",  ar: "مرضى اليوم" },
  earnedToday:    { en: "Earned Today",    ar: "المحصود اليوم" },

  // ---- Financials ----
  revenue:        { en: "Revenue",         ar: "الإيراد" },
  expenses:       { en: "Expenses",        ar: "المصاريف" },
  netProfit:      { en: "Net Profit",      ar: "صافي الربح" },
  salaryPayouts:  { en: "Salary Payouts",  ar: "مدفوعات الرواتب" },
  todayRevenue:   { en: "Today Revenue",   ar: "إيراد اليوم" },
  monthRevenue:   { en: "Month Revenue",   ar: "إيراد الشهر" },
  invoiceAmount:  { en: "Invoice Amount",  ar: "قيمة الفاتورة" },
  pay:            { en: "Pay",             ar: "ادفع" },

  // ---- Laser / Derma specific ----
  laserType:      { en: "Laser Type",      ar: "نوع الليزر" },
  laserThickness: { en: "Hair Thickness",  ar: "سمك الشعر" },
  skinType:       { en: "Skin Type",       ar: "نوع البشرة" },
  sessions:       { en: "Sessions",        ar: "الجلسات" },
  bodyArea:       { en: "Body Area",       ar: "منطقة الجسم" },

  // ---- Dental specific ----
  toothNumber:    { en: "Tooth #",         ar: "رقم السن" },
  procedure:      { en: "Procedure",       ar: "الإجراء" },
  dentalChart:    { en: "Dental Chart",    ar: "خريطة الأسنان" },

  // ---- Lab specific ----
  testType:       { en: "Test Type",       ar: "نوع الفحص" },
  result:         { en: "Result",          ar: "النتيجة" },
  uploadResult:   { en: "Upload Result",   ar: "رفع النتيجة" },

  // ---- Pediatrics ----
  weight:         { en: "Weight (kg)",     ar: "الوزن (كغ)" },
  guardian:       { en: "Guardian",        ar: "ولي الأمر" },

  // ---- Common ----
  save:           { en: "Save",            ar: "حفظ" },
  cancel:         { en: "Cancel",          ar: "إلغاء" },
  edit:           { en: "Edit",            ar: "تعديل" },
  delete:         { en: "Delete",          ar: "حذف" },
  search:         { en: "Search...",       ar: "بحث..." },
  confirm:        { en: "Confirm",         ar: "تأكيد" },
  close:          { en: "Close",           ar: "إغلاق" },
  yes:            { en: "Yes",             ar: "نعم" },
  no:             { en: "No",              ar: "لا" },
  none:           { en: "—",               ar: "—" },
  loading:        { en: "Loading...",      ar: "جارٍ التحميل..." },
  noData:         { en: "No data available", ar: "لا توجد بيانات" },
  backToAdmin:    { en: "← Back to Super Admin", ar: "→ العودة للمشرف العام" },

  // ---- Settings ----
  darkMode:       { en: "Dark Mode",       ar: "الوضع الداكن" },
  lightMode:      { en: "Light Mode",      ar: "الوضع الفاتح" },
  language:       { en: "Language",        ar: "اللغة" },
  clinicInfo:     { en: "Clinic Info",     ar: "معلومات العيادة" },

  // ---- Notifications ----
  notifications:  { en: "Notifications",   ar: "الإشعارات" },
  patientArrived: { en: "New patient arrived", ar: "وصل مريض جديد" },
  paymentProcessed:{ en: "Payment processed", ar: "تمت معالجة الدفع" },
  subscriptionExpiring:{ en: "Subscription expiring soon", ar: "الاشتراك ينتهي قريباً" }
};

// ==========================================
// i18n Helper Functions
// ==========================================

/** Get current language from localStorage, default 'en' */
function getLang() {
  return localStorage.getItem('mediflow_lang') || 'en';
}

/** Set language and persist */
function setLang(lang) {
  localStorage.setItem('mediflow_lang', lang);
  applyI18n();
  applyDirection();
}

/** Translate a key for current language. Falls back to key if missing. */
function t(key) {
  const entry = T[key];
  if (!entry) return key;
  return entry[getLang()] || entry.en || key;
}

/** Apply translations to all [data-i18n] elements */
function applyI18n() {
  const lang = getLang();
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const entry = T[key];
    if (entry) el.textContent = entry[lang] || entry.en;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    const entry = T[key];
    if (entry) el.placeholder = entry[lang] || entry.en;
  });
  // Update <html lang>
  document.documentElement.lang = lang;
}

/** Apply RTL/LTR direction based on language */
function applyDirection() {
  const lang = getLang();
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.body.classList.toggle('rtl', lang === 'ar');
}
