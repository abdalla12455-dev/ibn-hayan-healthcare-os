/* ============================================================
   MediFlow — i18n Module
   Translation dictionary `T` + helpers for Arabic (RTL) /
   English (LTR) bidirectional switching without page refresh.
   ============================================================ */

window.MediFlow = window.MediFlow || {};

MediFlow.I18n = (function () {
  'use strict';

  // ---- Master dictionary ----
  const T = {
    // ---- Brand ----
    appName:        { en: 'MediFlow',         ar: 'ميدي فلو' },
    appTagline:     { en: 'Clinic Management SaaS', ar: 'نظام إدارة العيادات' },

    // ---- Navigation ----
    dashboard:      { en: 'Dashboard',        ar: 'الرئيسية' },
    patients:       { en: 'Patients',         ar: 'المرضى' },
    doctors:        { en: 'Doctors',          ar: 'الأطباء' },
    employees:      { en: 'Employees',        ar: 'الموظفون' },
    appointments:   { en: 'Appointments',     ar: 'المواعيد' },
    financials:     { en: 'Financials',       ar: 'المالية' },
    inventory:      { en: 'Inventory',        ar: 'المخزون' },
    reports:        { en: 'Reports',          ar: 'التقارير' },
    settings:       { en: 'Settings',         ar: 'الإعدادات' },
    clinics:        { en: 'Clinics',          ar: 'العيادات' },
    subscriptions:  { en: 'Subscriptions',    ar: 'الاشتراكات' },

    // ---- Super Admin ----
    superAdmin:     { en: 'Super Admin',      ar: 'المشرف العام' },
    totalClinics:   { en: 'Total Clinics',    ar: 'إجمالي العيادات' },
    totalRevenue:   { en: 'Total Revenue',    ar: 'إجمالي الإيرادات' },
    activeDoctors:  { en: 'Active Doctors',   ar: 'الأطباء النشطون' },
    totalPatients:  { en: 'Total Patients',   ar: 'إجمالي المرضى' },
    addClinic:      { en: 'Add Clinic',       ar: 'إضافة عيادة' },
    editClinic:     { en: 'Edit Clinic',      ar: 'تعديل عيادة' },
    clinicName:     { en: 'Clinic Name',      ar: 'اسم العيادة' },
    clinicType:     { en: 'Clinic Type',      ar: 'نوع العيادة' },
    manager:        { en: 'Manager',          ar: 'المدير' },
    plan:           { en: 'Plan',             ar: 'الباقة' },
    expiry:         { en: 'Expiry',           ar: 'تاريخ الانتهاء' },
    bookings:       { en: 'Bookings',         ar: 'الحجوزات' },
    revenue:        { en: 'Revenue',          ar: 'الإيراد' },
    openClinic:     { en: 'Open',             ar: 'فتح' },
    actions:        { en: 'Actions',          ar: 'إجراءات' },
    backToAdmin:    { en: 'Back to Super Admin', ar: 'العودة للمشرف العام' },

    // ---- Clinic Types ----
    type_dental:    { en: 'Dental',           ar: 'أسنان' },
    type_laser:     { en: 'Derma / Laser',    ar: 'جلدية / ليزر' },
    type_lab:       { en: 'Laboratory',       ar: 'مختبر' },
    type_pediatrics:{ en: 'Pediatrics',       ar: 'أطفال' },
    type_internal:  { en: 'Internal Medicine', ar: 'باطنية' },

    // ---- Plans ----
    plan_starter:   { en: 'Starter',          ar: 'المبتدئ' },
    plan_pro:       { en: 'Professional',     ar: 'الاحترافي' },
    plan_enterprise:{ en: 'Enterprise',       ar: 'المؤسسات' },

    // ---- Patient ----
    addPatient:     { en: 'Add Patient',      ar: 'إضافة مريض' },
    editPatient:    { en: 'Edit Patient',     ar: 'تعديل مريض' },
    patientName:    { en: 'Patient Name',     ar: 'اسم المريض' },
    phone:          { en: 'Phone',            ar: 'الهاتف' },
    age:            { en: 'Age',              ar: 'العمر' },
    gender:         { en: 'Gender',           ar: 'الجنس' },
    male:           { en: 'Male',             ar: 'ذكر' },
    female:         { en: 'Female',           ar: 'أنثى' },
    assignDoctor:   { en: 'Assign Doctor',    ar: 'تعيين طبيب' },
    status:         { en: 'Status',           ar: 'الحالة' },
    st_arrived:     { en: 'Arrived',          ar: 'وصل' },
    st_waiting:     { en: 'Waiting',          ar: 'في الانتظار' },
    st_withDoctor:  { en: 'With Doctor',      ar: 'مع الطبيب' },
    st_completed:   { en: 'Completed',        ar: 'مكتمل' },
    st_cancelled:   { en: 'Cancelled',        ar: 'ملغي' },
    arrivedAt:      { en: 'Arrived At',       ar: 'وقت الوصول' },
    waitTime:       { en: 'Wait Time',        ar: 'وقت الانتظار' },
    patientsToday:  { en: 'Patients Today',   ar: 'مرضى اليوم' },

    // ---- Doctor ----
    addDoctor:      { en: 'Add Doctor',       ar: 'إضافة طبيب' },
    editDoctor:     { en: 'Edit Doctor',      ar: 'تعديل طبيب' },
    doctorName:     { en: 'Doctor Name',      ar: 'اسم الطبيب' },
    specialty:      { en: 'Specialty',        ar: 'التخصص' },
    onDuty:         { en: 'On Duty',          ar: 'في العمل' },
    onLeave:        { en: 'On Leave',         ar: 'في إجازة' },
    fixedSalary:    { en: 'Fixed Salary',     ar: 'الراتب الثابت' },
    incentiveRate:  { en: 'Incentive Rate %', ar: 'نسبة الحافز %' },
    payDoctor:      { en: 'Pay Doctor',       ar: 'دفع للطبيب' },
    earnedToday:    { en: 'Earned Today',     ar: 'المحصود اليوم' },
    payoutAmount:   { en: 'Payout Amount',    ar: 'مبلغ الدفعة' },

    // ---- Financials ----
    expenses:       { en: 'Expenses',         ar: 'المصاريف' },
    netProfit:      { en: 'Net Profit',       ar: 'صافي الربح' },
    salaryPayouts:  { en: 'Salary Payouts',   ar: 'مدفوعات الرواتب' },
    todayRevenue:   { en: 'Today Revenue',    ar: 'إيراد اليوم' },
    monthRevenue:   { en: 'Month Revenue',    ar: 'إيراد الشهر' },
    invoiceAmount:  { en: 'Invoice Amount',   ar: 'قيمة الفاتورة' },
    pay:            { en: 'Pay',              ar: 'ادفع' },

    // ---- Laser / Derma ----
    laserType:      { en: 'Laser Type',       ar: 'نوع الليزر' },
    hairThickness:  { en: 'Hair Thickness',   ar: 'سمك الشعر' },
    skinType:       { en: 'Skin Type',        ar: 'نوع البشرة' },
    sessions:       { en: 'Sessions',         ar: 'الجلسات' },
    bodyArea:       { en: 'Body Area',        ar: 'منطقة الجسم' },

    // ---- Dental ----
    toothNumber:    { en: 'Tooth #',          ar: 'رقم السن' },
    procedure:      { en: 'Procedure',        ar: 'الإجراء' },
    dentalChart:    { en: 'Dental Chart',     ar: 'خريطة الأسنان' },
    markAffected:   { en: 'Mark Affected',    ar: 'تعليم كمؤثر' },
    markExtracted:  { en: 'Mark Extracted',   ar: 'تعليم كمخلوع' },

    // ---- Lab ----
    testType:       { en: 'Test Type',        ar: 'نوع الفحص' },
    result:         { en: 'Result',           ar: 'النتيجة' },
    uploadResult:   { en: 'Upload Result',    ar: 'رفع النتيجة' },
    addItem:        { en: 'Add Item',         ar: 'إضافة عنصر' },
    itemName:       { en: 'Item Name',        ar: 'اسم العنصر' },
    quantity:       { en: 'Quantity',         ar: 'الكمية' },
    unit:           { en: 'Unit',             ar: 'الوحدة' },

    // ---- Pediatrics ----
    weight:         { en: 'Weight (kg)',      ar: 'الوزن (كغ)' },
    guardian:       { en: 'Guardian',         ar: 'ولي الأمر' },

    // ---- Common ----
    save:           { en: 'Save',             ar: 'حفظ' },
    cancel:         { en: 'Cancel',           ar: 'إلغاء' },
    edit:           { en: 'Edit',             ar: 'تعديل' },
    delete:         { en: 'Delete',           ar: 'حذف' },
    search:         { en: 'Search...',        ar: 'بحث...' },
    confirm:        { en: 'Confirm',          ar: 'تأكيد' },
    close:          { en: 'Close',            ar: 'إغلاق' },
    yes:            { en: 'Yes',              ar: 'نعم' },
    no:             { en: 'No',               ar: 'لا' },
    none:           { en: '—',                ar: '—' },
    noData:         { en: 'No data available', ar: 'لا توجد بيانات' },
    loading:        { en: 'Loading...',       ar: 'جارٍ التحميل...' },
    advance:        { en: 'Advance',          ar: 'تقديم' },

    // ---- Settings ----
    darkMode:       { en: 'Dark Mode',        ar: 'الوضع الداكن' },
    lightMode:      { en: 'Light Mode',       ar: 'الوضع الفاتح' },
    language:       { en: 'Language',         ar: 'اللغة' },
    clinicInfo:     { en: 'Clinic Info',      ar: 'معلومات العيادة' },
    resetData:      { en: 'Reset All Data',   ar: 'إعادة تعيين البيانات' },

    // ---- Notifications ----
    notifications:  { en: 'Notifications',    ar: 'الإشعارات' }
  };

  // ---- Helpers ----
  function getLang() { return MediFlow.Store.getLang(); }
  function setLang(lang) {
    MediFlow.Store.setLang(lang);
    applyI18n();
    applyDirection();
  }

  function t(key) {
    const entry = T[key];
    if (!entry) return key;
    return entry[getLang()] || entry.en || key;
  }

  function applyI18n() {
    const lang = getLang();
    document.documentElement.lang = lang;
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
  }

  function applyDirection() {
    const lang = getLang();
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', lang === 'ar');
  }

  // ---- Expose dictionary for advanced lookups ----
  return { T, t, getLang, setLang, applyI18n, applyDirection };
})();
