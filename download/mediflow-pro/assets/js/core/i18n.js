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
    notifications:  { en: 'Notifications',    ar: 'الإشعارات' },

    // ---- Premium UI additions ----
    navOverview:        { en: 'Overview',          ar: 'نظرة عامة' },
    navInsights:        { en: 'Insights',          ar: 'الرؤى' },
    navSystem:          { en: 'System',            ar: 'النظام' },
    activity:           { en: 'Activity',          ar: 'السجل' },
    welcomeBack:        { en: "Welcome back, Admin", ar: 'مرحباً بعودتك، المشرف' },
    vsLastMonth:        { en: 'vs last month',     ar: 'مقارنة بالشهر الماضي' },
    revenueOverview:    { en: 'Revenue Overview',  ar: 'نظرة عامة على الإيرادات' },
    revenueOverviewSubtitle: { en: 'Monthly revenue across all clinics', ar: 'الإيرادات الشهرية لجميع العيادات' },
    clinicTypes:        { en: 'Clinic Types',      ar: 'أنواع العيادات' },
    distributionBySpecialty: { en: 'Distribution by specialty', ar: 'التوزيع حسب التخصص' },
    clinicsManageSubtitle: { en: 'Manage all clinics in your network', ar: 'إدارة جميع العيادات في شبكتك' },
    clinicsGridSubtitle: { en: 'All clinics in your network, organized by specialty', ar: 'جميع العيادات في شبكتك، مرتبة حسب التخصص' },
    recentActivity:     { en: 'Recent Activity',   ar: 'النشاط الأخير' },
    viewAll:            { en: 'View all',          ar: 'عرض الكل' },
    quickActions:       { en: 'Quick Actions',     ar: 'إجراءات سريعة' },
    manageSubs:         { en: 'Manage subscriptions', ar: 'إدارة الاشتراكات' },
    viewReports:        { en: 'View reports',      ar: 'عرض التقارير' },
    exportData:         { en: 'Export data',       ar: 'تصدير البيانات' },
    export:             { en: 'Export',            ar: 'تصدير' },
    subsSubtitle:       { en: 'Compare plans and track subscription health', ar: 'قارن الباقات وتتبع حالة الاشتراكات' },
    starterTagline:     { en: 'For small single-doctor clinics getting started.', ar: 'للعيادات الصغيرة ذات الطبيب الواحد التي تبدأ.' },
    proTagline:         { en: 'For growing multi-doctor clinics with reporting needs.', ar: 'للعيادات النامية متعددة الأطباء ذات متطلبات التقارير.' },
    enterpriseTagline:  { en: 'For large multi-branch networks with advanced needs.', ar: 'للشبكات الكبيرة متعددة الفروع ذات الاحتياجات المتقدمة.' },
    activeSubscriptions:{ en: 'Active Subscriptions', ar: 'الاشتراكات النشطة' },
    monthlyValue:       { en: 'Monthly Value',     ar: 'القيمة الشهرية' },
    reportsSubtitle:    { en: 'Deep-dive analytics across your clinic network', ar: 'تحليلات معمقة عبر شبكة العيادات' },
    avgRevenuePerClinic:{ en: 'Avg Revenue / Clinic', ar: 'متوسط الإيراد / عيادة' },
    avgBookings:        { en: 'Avg Bookings / Clinic', ar: 'متوسط الحجوزات / عيادة' },
    expiringSoon:       { en: 'Expiring Soon',     ar: 'تنتهي قريباً' },
    churnRisk:          { en: 'Churn Risk',        ar: 'خطر التسرب' },
    revenueByType:      { en: 'Revenue by Clinic Type', ar: 'الإيرادات حسب نوع العيادة' },
    topClinics:         { en: 'Top Performing Clinics', ar: 'أفضل العيادات أداءً' },
    allClinicsPerformance: { en: 'All Clinics Performance', ar: 'أداء جميع العيادات' },
    performance:        { en: 'Performance',       ar: 'الأداء' },
    activitySubtitle:   { en: 'Audit trail of all administrative actions', ar: 'سجل تدقيق لجميع الإجراءات الإدارية' },
    clearAll:           { en: 'Clear All',         ar: 'مسح الكل' },
    settingsSubtitle:   { en: 'Manage your console preferences', ar: 'إدارة تفضيلات وحدة التحكم' },
    appearance:         { en: 'Appearance',        ar: 'المظهر' },
    darkModeDesc:       { en: 'Switch between light and dark themes', ar: 'التبديل بين السمات الفاتحة والداكنة' },
    languageDesc:       { en: 'Select your preferred language', ar: 'اختر لغتك المفضلة' },
    profile:            { en: 'Profile',           ar: 'الملف الشخصي' },
    dangerZone:         { en: 'Danger Zone',       ar: 'منطقة الخطر' },
    resetDataDesc:      { en: 'Wipe all clinics, doctors, patients, and settings. Cannot be undone.', ar: 'مسح جميع العيادات والأطباء والمرضى والإعدادات. لا يمكن التراجع.' },
    clinicNameHelp:     { en: 'The display name shown across the platform', ar: 'الاسم المعروض عبر المنصة' },
    markAllRead:        { en: 'Mark all read',     ar: 'تعليم الكل كمقروء' },
    viewClinic:         { en: 'View Clinic',       ar: 'عرض العيادة' },
    expired:            { en: 'Expired',           ar: 'منتهي' },
    expiring:           { en: 'Expiring',          ar: 'قيد الانتهاء' },
    active:             { en: 'Active',            ar: 'نشط' },
    noResults:          { en: 'No results found',  ar: 'لا توجد نتائج' },
    totalBookings:      { en: 'Total Bookings',    ar: 'إجمالي الحجوزات' },
    totalDoctors:       { en: 'Total Doctors',     ar: 'إجمالي الأطباء' },
    monthlyRecurring:   { en: 'Monthly Recurring', ar: 'الإيراد المتكرر الشهري' },

    // ---- Clinic Portal additions ----
    navOperations:           { en: 'Operations',     ar: 'العمليات' },
    clinicAdmin:             { en: 'Clinic Administrator', ar: 'مدير العيادة' },
    clinicDashboardSubtitle: { en: "Live overview of today's clinic operations", ar: 'نظرة حية على عمليات العيادة اليوم' },
    currentlyInQueue:        { en: 'in queue now',   ar: 'في قائمة الانتظار الآن' },
    onDutyNow:               { en: 'on duty',        ar: 'في الخدمة' },
    vsYesterday:             { en: 'vs yesterday',   ar: 'مقارنة بالأمس' },
    avgWait:                 { en: 'avg wait 12m',   ar: 'متوسط الانتظار 12 د' },
    liveQueue:               { en: 'Live Patient Queue', ar: 'قائمة المرضى المباشرة' },
    liveQueueSubtitle:       { en: 'Real-time patient flow through the clinic', ar: 'تدفق المرضى في الوقت الحقيقي عبر العيادة' },
    queueStatus:             { en: 'Queue Status',   ar: 'حالة قائمة الانتظار' },
    viewAllPatients:         { en: 'View Patients',  ar: 'عرض المرضى' },
    patientsManageSubtitle:  { en: 'Manage all patients in this clinic', ar: 'إدارة جميع المرضى في هذه العيادة' },
    doctorsManageSubtitle:   { en: "Manage doctors, their schedules, and compensation", ar: 'إدارة الأطباء وجداولهم والتعويضات' },
    addEmployee:             { en: 'Add Employee',   ar: 'إضافة موظف' },
    employeeName:            { en: 'Name',           ar: 'الاسم' },
    role:                    { en: 'Role',           ar: 'الدور' },
    salary:                  { en: 'Salary',         ar: 'الراتب' },
    inactive:                { en: 'Inactive',       ar: 'غير نشط' },
    employeesManageSubtitle: { en: 'Manage non-doctor staff and their roles', ar: 'إدارة الموظفين غير الأطباء وأدوارهم' },
    financialsSubtitle:      { en: 'Track revenue, expenses, and doctor payouts', ar: 'تتبع الإيرادات والمصاريف ومدفوعات الأطباء' },
    fromPatients:            { en: 'from patients today', ar: 'من المرضى اليوم' },
    thisMonth:               { en: 'this month',     ar: 'هذا الشهر' },
    totalMonthly:            { en: 'total monthly salaries', ar: 'إجمالي الرواتب الشهرية' },
    doctorCompensation:      { en: 'Doctor Compensation', ar: 'تعويضات الأطباء' },
    doctorCompensationSubtitle: { en: 'Fixed salary + incentive per patient', ar: 'راتب ثابت + حافز لكل مريض' },
    clinicSettingsSubtitle:  { en: "Manage this clinic's preferences", ar: 'إدارة تفضيلات هذه العيادة' },
    incentiveHelp:           { en: "Percentage of patient invoice added to doctor's earnings", ar: 'نسبة من فاتورة المريض تضاف إلى أرباح الطبيب' },
    payoutHelp:              { en: 'Total = fixed salary + earned incentive', ar: 'الإجمالي = الراتب الثابت + الحافز المكتسب' },
    arrived2:                { en: 'Arrived',        ar: 'وصل' },
    inQueue:                 { en: 'in queue',       ar: 'في الانتظار' },
    withDoctorNow:           { en: 'with doctor',    ar: 'مع الطبيب' },
    completedToday:          { en: 'completed',      ar: 'مكتمل' }
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
