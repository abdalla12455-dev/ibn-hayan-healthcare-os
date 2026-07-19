/* ============================================================
   MediFlow — Clinic Admin Logic (clinic-app.js)
   Fixed Secure Version: Clinic type cannot be switched by clinic admin.
   ============================================================ */

const T = {
    ar: {
        day_mon:"الاثنين",day_tue:"الثلاثاء",day_wed:"الأربعاء",day_thu:"الخميس",day_fri:"الجمعة",day_sat:"السبت",day_sun:"الأحد",
        waitTimeValue:"12 دقيقة",patientFlowValue:"3 بالداخل | 2 انتظار",
        onDuty:"على رأس العمل",onLeave:"في إجازة",active:"نشط",inactive:"متوقف",
        paymentPaid:"مدفوع",paymentPending:"معلق",paymentStatus:"الدفع",
        appointmentConfirmed:"مؤكد",appointmentPending:"قيد الانتظار",
        patientArrived:"وصل",patientWaiting:"في الانتظار",patientWithDoctor:"مع الطبيب",
        patientCompleted:"تمت المعاينة",patientCancelled:"ملغي",patientNoShow:"لم يحضر",
        edit:"تعديل",delete:"حذف",add:"إضافة",save:"حفظ",cancel:"إلغاء",
        confirm:"تأكيد",close:"إغلاق",saveChanges:"حفظ التعديلات",
        doctor:"طبيب",employee:"موظف",patient:"مريض",
        status:"الحالة",name:"الاسم",phone:"رقم الهاتف",specialty:"الاختصاص",
        department:"القسم",position:"المسمى الوظيفي",
        salary:"الراتب",incentive:"الحوافز",total:"الإجمالي",
        currency:"د.ع",iqd:"IQD",
        yes:"نعم",no:"لا",
        search:"بحث...",loading:"جاري التحميل...",
        error:"خطأ",success:"نجاح",warning:"تحذير",info:"معلومات",
        required:"مطلوب",optional:"اختياري",
        select:"اختر",all:"الكل",none:"لا شيء",
        filter:"تصفية",sort:"ترتيب",export:"تصدير",import:"استيراد",
        print:"طباعة",download:"تحميل",upload:"رفع",
        date:"التاريخ",time:"الوقت",from:"من",to:"إلى",
        today:"اليوم",yesterday:"أمس",tomorrow:"غداً",
        week:"أسبوع",month:"شهر",year:"سنة",
        jan:"يناير",feb:"فبراير",mar:"مارس",apr:"أبريل",
        may:"مايو",jun:"يونيو",jul:"يوليو",aug:"أغسطس",
        sep:"سبتمبر",oct:"أكتوبر",nov:"نوفمبر",dec:"ديسمبر",
        sun:"الأحد",mon:"الاثنين",tue:"الثلاثاء",wed:"الأربعاء",
        thu:"الخميس",fri:"الجمعة",sat:"السبت",
        am:"ص",pm:"م",
        minute:"دقيقة",minutes:"دقائق",hour:"ساعة",hours:"ساعات",
        day:"يوم",days:"أيام",
        calPaid:'مدفوع',calPending:'معلق',calConfirmed:'مؤكد',calCheckedIn:'تم التسجيل',
        calWithDoctor:'مع الطبيب',calCompleted:'مكتمل',calCancelled:'ملغي',calNoShow:'لم يحضر',
        revenueToday:"إجمالي إيرادات اليوم",inventoryAlert:"تنبيه مخزني",
        inventoryText:"المواد الطبية بحاجة لطلب",waitTime:"وقت الانتظار",
        patientFlow:"تدفق المرضى",doctorsOnDuty:"الأطباء المتواجدون",
        employeesActive:"الموظفون النشطون",appointmentsToday:"مواعيد اليوم",
        appointmentsValue:"حجز مؤكد",doctorsSection:"إدارة الأطباء",
        employeesSection:"إدارة الموظفين",financeSection:"التقارير المالية",
        inventorySection:"المخازن والعهد",settingsTitle:"الإعدادات",
        noDoctors:"لا يوجد أطباء",noEmployees:"لا يوجد موظفون",
        noPatients:"لا يوجد مرضى",noAppointments:"لا يوجد مواعيد",
        tableName:"اسم الطبيب",tableSpecialty:"الاختصاص",
        tablePhone:"رقم الهاتف",tableStatus:"الحالة",tableActions:"الإجراءات",
        empTableName:"الاسم",empTablePosition:"المسمى الوظيفي",
        empTableDepartment:"القسم",empTableStatus:"الحالة",empTableActions:"الإجراءات",
        editDoctorTitle:"تعديل بيانات الطبيب",editEmployeeTitle:"تعديل بيانات الموظف",
        addDoctorTitle:"إضافة طبيب جديد",addEmployeeTitle:"إضافة موظف جديد",
        paymentSettingsTitle:"إعدادات الدفع",
        switchToSalary:"تحويل إلى راتب",switchToIncentive:"تحويل إلى حوافز",
        procedurePrice:"سعر العملية",completeProcedure:"إتمام عملية",
        confirmDelete:"هل تريد بالتأكيد حذف هذا العنصر؟",
        confirmTogglePaid:"هل أنت متأكد من تغيير حالة الدفع？",
        incentiveRate:"سعر الحافز لكل مريض",patientsCount:"عدد المرضى",
        totalIncentive:"إجمالي الحافز",incentivePaid:"تم دفع الحوافز",
        togglePaid:"تغيير الحالة",payBtn:"تأكيد الدفع",
        salaryTitle:"رواتب الموظفين",incentiveTitle:"مدفوعات الأطباء",
        salaryLabel:"الراتب",salaryPaid:"تم التسليم",salaryUnpaid:"لم يسلم بعد",
        cycleDaily:"يومي",cycleWeekly:"أسبوعي",cycleBiweekly:"كل أسبوعين",cycleMonthly:"شهري",
        periodicSalary:"الراتب الدوري",
        doctorCountLabel:"عدد الأطباء",employeeCountLabel:"عدد الموظفين",
        doctorUnit:"طبيب",employeeUnit:"موظف",
        patientName:"اسم المريض",patientPhone:"رقم الهاتف",patientAge:"العمر",
        patientHistory:"التاريخ المرضي",patientMedications:"الأدوية",
        patientDoctor:"الطبيب المشرف",patientStatus:"الحالة",
        waitingMinutes:"دقيقة انتظار",waitingNow:"ينتظر منذ",
        notif1:"تم تسجيل مريض جديد",notif2:"تنبيه: مخزون المواد منخفض",
        notif3:"موعد الساعة 3:00 مساءً مع د. علي",
        notifNow:"الآن",notifTime5m:"قبل 5 دقائق",notifTime30m:"قبل 30 دقيقة",notifTime1h:"قبل ساعة",
        notifDoctorAdded:"تمت إضافة طبيب جديد",
        payDoctorTitle:"دفع مستحقات الطبيب",paySalary:"الراتب المستحق",
        payIncentive:"الحوافز المستحقة",payTotal:"الإجمالي",
        legendTitle:"دليل الألوان",
        recentActivity:"النشاطات الأخيرة",quickActions:"إجراءات سريعة",
        generateReport:"تقرير أسبوعي",homeTitle:"لوحة الإدارة العليا",
        homeSubtitle:"نظرة عامة على عمليات العيادة.",
        sidebarHome:"الرئيسية",sidebarDoctors:"إدارة الأطباء",
        sidebarEmployees:"إدارة الموظفين",sidebarPatients:"المرضى",
        sidebarAppointments:"المواعيد",sidebarRecords:"السجلات الطبية",
        sidebarFinance:"التقارير المالية",sidebarInventory:"المخازن والعهد",
        sidebarSettings:"الإعدادات",sidebarTitle:"إدارة العيادة",
        help:"المساعدة",logout:"تسجيل الخروج",
        notifTitle:"الإشعارات",clearNotifications:"مسح الكل",
        noNotifications:"لا توجد إشعارات حالية.",
        lightMode:"الوضع النهاري",darkMode:"الوضع الليلي",
        langSwitch:"English",view:"عرض",cycle:"الدورة",
        salaryDue:"الراتب المستحق",incentivePending:"حوافز معلقة",confirmPayment:"تأكيد الدفع",
        chartWeekly:"الإيرادات الأسبوعية",peak:"الذروة",
        patientsTitle:"المرضى",appointmentsTitle:"المواعيد",recordsTitle:"السجلات الطبية",
        laserThickness:"سماكة الشعرة",laserSkinTone:"لون البشرة",laserType:"نوع الليزر",
        doctorNotes:"ملاحظات الطبيب",
        arrivedAt:"وقت الوصول",waitDuration:"مدة الانتظار",
        withDoctorSince:"مع الطبيب منذ",completedAt:"انتهت المعاينة",
        createAccount:"إنشاء حساب",email:"البريد الإلكتروني",password:"كلمة المرور",
        clinicInfo:"معلومات العيادة",clinicName:"اسم العيادة",
        preferences:"التفضيلات",arabicLang:"العربية",comingSoon:"قريباً..."
    },
    en: {
        day_mon:"Mon",day_tue:"Tue",day_wed:"Wed",day_thu:"Thu",day_fri:"Fri",day_sat:"Sat",day_sun:"Sun",
        waitTimeValue:"12 mins",patientFlowValue:"3 inside | 2 waiting",
        onDuty:"On Duty",onLeave:"On Leave",active:"Active",inactive:"Inactive",
        paymentPaid:"Paid",paymentPending:"Pending",paymentStatus:"Payment",
        appointmentConfirmed:"Confirmed",appointmentPending:"Pending",
        patientArrived:"Arrived",patientWaiting:"In Waiting Room",patientWithDoctor:"With Doctor",
        patientCompleted:"Completed",patientCancelled:"Cancelled",patientNoShow:"No Show",
        edit:"Edit",delete:"Delete",add:"Add",save:"Save",cancel:"Cancel",
        confirm:"Confirm",close:"Close",saveChanges:"Save Changes",
        doctor:"Doctor",employee:"Employee",patient:"Patient",
        status:"Status",name:"Name",phone:"Phone",specialty:"Specialty",
        department:"Department",position:"Position",
        salary:"Salary",incentive:"Incentive",total:"Total",
        currency:"IQD",iqd:"IQD",
        yes:"Yes",no:"No",
        search:"Search...",loading:"Loading...",
        error:"Error",success:"Success",warning:"Warning",info:"Info",
        required:"Required",optional:"Optional",
        select:"Select",all:"All",none:"None",
        filter:"Filter",sort:"Sort",export:"Export",import:"Import",
        print:"Print",download:"Download",upload:"Upload",
        date:"Date",time:"Time",from:"From",to:"To",
        today:"Today",yesterday:"Yesterday",tomorrow:"Tomorrow",
        week:"Week",month:"Month",year:"Year",
        jan:"Jan",feb:"Feb",mar:"Mar",apr:"Apr",
        may:"May",jun:"Jun",jul:"Jul",aug:"Aug",
        sep:"Sep",oct:"Oct",nov:"Nov",dec:"Dec",
        sun:"Sun",mon:"Mon",tue:"Tue",wed:"Wed",
        thu:"Thu",fri:"Fri",sat:"Sat",
        am:"AM",pm:"PM",
        minute:"minute",minutes:"minutes",hour:"hour",hours:"hours",
        day:"day",days:"days",
        calPaid:'Paid',calPending:'Pending',calConfirmed:'Confirmed',calCheckedIn:'Checked In',
        calWithDoctor:'With Doctor',calCompleted:'Completed',calCancelled:'Cancelled',calNoShow:'No Show',
        revenueToday:"Today's Total Revenue",inventoryAlert:"Inventory Alert",
        inventoryText:"Medical items need restocking",waitTime:"Wait Time",
        patientFlow:"Patient Flow",doctorsOnDuty:"Doctors on Duty",
        employeesActive:"Active Employees",appointmentsToday:"Today's Appointments",
        appointmentsValue:"Confirmed",doctorsSection:"Manage Doctors",
        employeesSection:"Manage Employees",financeSection:"Financial Reports",
        inventorySection:"Inventory & Custody",settingsTitle:"Settings",
        noDoctors:"No doctors registered yet.",noEmployees:"No employees registered yet.",
        noPatients:"No patients registered yet.",noAppointments:"No appointments registered yet.",
        tableName:"Doctor Name",tableSpecialty:"Specialty",
        tablePhone:"Phone",tableStatus:"Status",tableActions:"Actions",
        empTableName:"Name",empTablePosition:"Position",
        empTableDepartment:"Department",empTableStatus:"Status",empTableActions:"Actions",
        editDoctorTitle:"Edit Doctor Details",editEmployeeTitle:"Edit Employee Details",
        addDoctorTitle:"Add New Doctor",addEmployeeTitle:"Add New Employee",
        paymentSettingsTitle:"Payment Settings",
        switchToSalary:"Switch to Salary",switchToIncentive:"Switch to Incentive",
        procedurePrice:"Procedure Price",completeProcedure:"Complete Procedure",
        confirmDelete:"Are you sure you want to delete this item?",
        confirmTogglePaid:"Are you sure you want to change the payment status?",
        incentiveRate:"Incentive per patient",patientsCount:"Patients count",
        totalIncentive:"Total Incentive",incentivePaid:"Incentive Paid",
        togglePaid:"Toggle Status",payBtn:"Confirm Payment",
        salaryTitle:"Employee Salaries",incentiveTitle:"Doctor Payments",
        salaryLabel:"Salary",salaryPaid:"Paid",salaryUnpaid:"Unpaid",
        cycleDaily:"Daily",cycleWeekly:"Weekly",cycleBiweekly:"Biweekly",cycleMonthly:"Monthly",
        periodicSalary:"Periodic Salary",
        doctorCountLabel:"Doctors Count",employeeCountLabel:"Employees Count",
        doctorUnit:"doctor",employeeUnit:"employee",
        patientName:"Patient Name",patientPhone:"Phone",patientAge:"Age",
        patientHistory:"Medical History",patientMedications:"Medications",
        patientDoctor:"Supervising Doctor",patientStatus:"Status",
        waitingMinutes:"min waiting",waitingNow:"waiting since",
        notif1:"New patient registered",notif2:"Alert: Stock is low",
        notif3:"Appointment at 3:00 PM with Dr. Ali",
        notifNow:"Now",notifTime5m:"5 min ago",notifTime30m:"30 min ago",notifTime1h:"1 hour ago",
        notifDoctorAdded:"New doctor added",
        payDoctorTitle:"Pay Doctor",paySalary:"Salary Due",
        payIncentive:"Incentive Due",payTotal:"Total",
        legendTitle:"Color Legend",
        recentActivity:"Recent Activity",quickActions:"Quick Actions",
        generateReport:"Weekly Report",homeTitle:"Top Management Dashboard",
        homeSubtitle:"Clinic operations overview.",
        sidebarHome:"Home",sidebarDoctors:"Doctors",
        sidebarEmployees:"Employees",sidebarPatients:"Patients",
        sidebarAppointments:"Appointments",sidebarRecords:"Medical Records",
        sidebarFinance:"Finance",sidebarInventory:"Inventory",
        sidebarSettings:"Settings",sidebarTitle:"Clinic Admin",
        help:"Help",logout:"Logout",
        notifTitle:"Notifications",clearNotifications:"Clear All",
        noNotifications:"No notifications.",
        lightMode:"Light Mode",darkMode:"Dark Mode",
        langSwitch:"العربية",view:"View",cycle:"Cycle",
        salaryDue:"Salary Due",incentivePending:"Pending Incentive",confirmPayment:"Confirm Payment",
        chartWeekly:"Weekly Revenue",peak:"Peak",
        patientsTitle:"Patients",appointmentsTitle:"Appointments",recordsTitle:"Medical Records",
        laserThickness:"Hair Thickness",laserSkinTone:"Skin Tone",laserType:"Laser Type",
        doctorNotes:"Doctor Notes",
        arrivedAt:"Arrival Time",waitDuration:"Wait Duration",
        withDoctorSince:"With Doctor Since",completedAt:"Completed At",
        createAccount:"Create Account",email:"Email",password:"Password",
        clinicInfo:"Clinic Info",clinicName:"Clinic name",
        preferences:"Preferences",arabicLang:"Arabic",comingSoon:"Coming soon..."
    }
};

let L = 'ar', V = 'home';

// --- LOCAL STORAGE STATE MANAGEMENT ---
function getStorage(key, defaultVal) {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
}
function setStorage(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
}

// Initial Data Seeds
const initialDoctors = [
    {id:1,nameAr:"د. علي حسن",nameEn:"Dr. Ali Hassan",specialtyAr:"جراحة وجه وفكين",specialtyEn:"Maxillofacial Surgery",status:"على رأس العمل",phone:"07700000001",hasIncentive:true,incentiveRate:15000,patientsCount:12,pendingIncentive:180000,hasSalary:true,salary:500000,paymentCycle:"monthly",lastPaymentDate:null,paymentHistory:[]},
    {id:2,nameAr:"د. مريم العاني",nameEn:"Dr. Maryam Al-Ani",specialtyAr:"تقويم أسنان",specialtyEn:"Orthodontics",status:"في إجازة",phone:"07700000002",hasIncentive:true,incentiveRate:20000,patientsCount:0,pendingIncentive:0,hasSalary:false,salary:0,paymentCycle:"monthly",lastPaymentDate:null,paymentHistory:[]},
    {id:3,nameAr:"د. عمر الدليمي",nameEn:"Dr. Omar Al-Dulaimi",specialtyAr:"علاج جذور",specialtyEn:"Endodontics",status:"على رأس العمل",phone:"07700000003",hasIncentive:true,incentiveRate:10000,patientsCount:8,pendingIncentive:80000,hasSalary:true,salary:300000,paymentCycle:"biweekly",lastPaymentDate:"2026-06-20",paymentHistory:[{date:"2026-06-20",salaryAmount:300000,incentiveAmount:0,total:300000}]}
];

const initialEmployees = [
    {id:1,nameAr:"سارة حسن",nameEn:"Sara Hassan",positionAr:"مساعد طبيب أسنان",positionEn:"Dental Assistant",departmentAr:"العيادة",departmentEn:"Clinic",status:"نشط",salary:500000,salaryPaid:false},
    {id:2,nameAr:"يوسف كريم",nameEn:"Yusuf Karim",positionAr:"موظف استقبال",positionEn:"Receptionist",departmentAr:"الاستقبال",departmentEn:"Reception",status:"نشط",salary:400000,salaryPaid:true},
    {id:3,nameAr:"نور علي",nameEn:"Noor علي",positionAr:"فني تعقيم",positionEn:"Sterilization Tech",departmentAr:"التعقيم",departmentEn:"Sterilization",status:"متوقف",salary:350000,salaryPaid:false}
];

const initialPatients = [
    {id:1,nameAr:"أحمد محمد",nameEn:"Ahmed Mohammed",phone:"07701111111",age:34,history:"سكري، ضغط دم مرتفع",medications:"Metformin, Lisinopril",doctorId:1,status:"waiting",arrivedAt:"09:30",waitingSince:"09:35",withDoctorSince:null,completedAt:null,paymentStatus:"paid",confirmed:true,laserThickness:"0.08 mm",laserSkinTone:"حنطي",laserType:"Diode",doctorNotes:"يحتاج إلى متابعة شهرية",appointmentDay:"mon",appointmentHour:"09:00",procedurePrice:45000},
    {id:2,nameAr:"فاطمة علي",nameEn:"Fatima Ali",phone:"07702222222",age:28,history:"حساسية موسمية",medications:"Cetirizine",doctorId:2,status:"withDoctor",arrivedAt:"10:00",waitingSince:"10:00",withDoctorSince:"10:15",completedAt:null,paymentStatus:"pending",confirmed:true,laserThickness:"0.05 mm",laserSkinTone:"أبيض",laserType:"Alexandrite",doctorNotes:"",appointmentDay:"wed",appointmentHour:"11:00",procedurePrice:60000},
    {id:3,nameAr:"حسن كريم",nameEn:"Hassan Karim",phone:"07703333333",age:45,history:"آلام ظهر مزمنة",medications:"Ibuprofen",doctorId:1,status:"arrived",arrivedAt:"10:45",waitingSince:"10:45",withDoctorSince:null,completedAt:null,paymentStatus:"paid",confirmed:true,laserThickness:"0.12 mm",laserSkinTone:"أسمر",laserType:"Nd:YAG",doctorNotes:"جلسة ليزر ثانية",appointmentDay:"thu",appointmentHour:"14:00",procedurePrice:50000}
];

const initialClinicData = {
    revenue: 450000,
    notifications: [
        {id:1,key:"notif1",timeKey:"notifTime5m",type:"info"},
        {id:2,key:"notif2",timeKey:"notifTime30m",type:"error"},
        {id:3,key:"notif3",timeKey:"notifTime1h",type:"info"}
    ]
};

// Load state - clinicType is managed exclusively by Super Admin
let doctorsData = getStorage('doctorsData', initialDoctors);
let employeesData = getStorage('employeesData', initialEmployees);
let patientsData = getStorage('patientsData', initialPatients);
let clinicData = getStorage('clinicData', initialClinicData);
let clinicType = getStorage('clinicType', 'DERMA_LASER'); 

function saveState() {
    setStorage('doctorsData', doctorsData);
    setStorage('employeesData', employeesData);
    setStorage('patientsData', patientsData);
    setStorage('clinicData', clinicData);
}

const weeklyRevenue = [180000, 140000, 260000, 220000, 290000, 90000, 60000];
const dayLabels = ['sun','mon','tue','wed','thu','fri','sat'];
const statusLabels = {arrived:'patientArrived',waiting:'patientWaiting',withDoctor:'patientWithDoctor',completed:'patientCompleted',cancelled:'patientCancelled',noShow:'patientNoShow',pending:'appointmentPending'};
const statusColors = {arrived:'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',waiting:'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',withDoctor:'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400',completed:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',cancelled:'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',noShow:'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',pending:'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'};

function t(k){return T[L][k]||k}
function dn(d){return L==='ar'?d.nameAr:d.nameEn}
function ds(d){return L==='ar'?d.specialtyAr:d.specialtyEn}
function en(e){return L==='ar'?e.nameAr:e.nameEn}
function ep(e){return L==='ar'?e.positionAr:e.positionEn}
function ed(e){return L==='ar'?e.departmentAr:e.departmentEn}
function pn(p){return L==='ar'?p.nameAr:p.nameEn}
function nowHM(){const n=new Date();return String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');}

function toggleDarkMode(){
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme',document.body.classList.contains('dark-mode')?'dark':'light');
    document.getElementById('dark-mode-icon').innerText=document.body.classList.contains('dark-mode')?'light_mode':'dark_mode';
}
function applyAllTranslations(){
    document.querySelectorAll('[data-key]').forEach(el=>{const k=el.getAttribute('data-key');if(T[L][k])el.textContent=T[L][k];});
    document.querySelectorAll('[data-key-ph]').forEach(el=>{const k=el.getAttribute('data-key-ph');if(T[L][k])el.placeholder=T[L][k];});
    document.getElementById('dark-mode-icon').innerText=document.body.classList.contains('dark-mode')?'light_mode':'dark_mode';
}
function toggleLanguage(){
    L=L==='ar'?'en':'ar';localStorage.setItem('lang',L);
    document.documentElement.lang=L;document.documentElement.dir=L==='ar'?'rtl':'ltr';
    document.body.classList.toggle('rtl',L==='ar');
    document.getElementById('lang-btn').innerText=L==='ar'?'EN':'AR';
    applyAllTranslations();refreshView();
}
function refreshView(){
    switch(V){case'home':showHome();break;case'doctors':showDoctors();break;case'employees':showEmployees();break;case'patients':showPatients();break;case'appointments':showAppointments();break;case'records':showRecords();break;case'finance':showFinance();break;case'inventory':showInventory();break;case'settings':showSettings();break;}
    applyAllTranslations();renderNotifications();
    applyClinicTypeLayout();
}
function switchView(viewId){
    document.querySelectorAll('#content-canvas > section').forEach(s=>s.classList.add('hidden'));
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    V=viewId;
    document.querySelectorAll('.nav-item').forEach(btn=>{
        const isActive=btn.getAttribute('data-view')===viewId;
        btn.classList.toggle('bg-indigo-100',isActive);btn.classList.toggle('dark:bg-indigo-900/60',isActive);
        btn.classList.toggle('text-indigo-700',isActive);btn.classList.toggle('dark:text-indigo-200',isActive);
        btn.classList.toggle('text-gray-600',!isActive);btn.classList.toggle('dark:text-gray-400',!isActive);
    });
    refreshView();
}

// --- SECURE CLINIC TYPE LAYOUT ---
function applyClinicTypeLayout() {
    const inventoryBtn = document.querySelector('[data-view="inventory"]');
    if (inventoryBtn) {
        if (clinicType === 'GENERAL') {
            inventoryBtn.classList.add('hidden');
        } else {
            inventoryBtn.classList.remove('hidden');
        }
    }
    const laserSection = document.getElementById('laserFieldsContainer');
    if (laserSection) {
        if (clinicType === 'DERMA_LASER') {
            laserSection.classList.remove('hidden');
        } else {
            laserSection.classList.add('hidden');
        }
    }
}

function renderNotifications(){
    const list=document.getElementById('notif-list'),badge=document.getElementById('notif-badge');
    if(!list||!badge)return;
    badge.textContent=clinicData.notifications.length;
    badge.classList.toggle('hidden',clinicData.notifications.length===0);
    list.innerHTML=clinicData.notifications.length?clinicData.notifications.map(n=>
        `<div onclick="markNotificationRead(${n.id})" class="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
            <span class="text-gray-800 dark:text-gray-100 text-sm">${t(n.key)}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500">${t(n.timeKey)}</span>
        </div>`).join(''):`<p class="text-center text-sm text-gray-400">${t('noNotifications')}</p>`;
}
function markNotificationRead(id){
    clinicData.notifications=clinicData.notifications.filter(n=>n.id!==id);
    saveState();
    renderNotifications();
}
function toggleNotifications(){
    const panel=document.getElementById('notif-panel');
    const bell=document.getElementById('notif-bell-btn');
    const rect=bell.getBoundingClientRect();
    panel.classList.toggle('hidden');
    if(!panel.classList.contains('hidden')){
        const panelW=320;
        let left=rect.left+rect.width/2-panelW/2;
        if(left+panelW>window.innerWidth)left=window.innerWidth-panelW-10;
        if(left<10)left=10;
        panel.style.left=left+'px';
        panel.style.top=(rect.bottom+8)+'px';
    }
}
function clearNotifications(){
    clinicData.notifications=[];
    saveState();
    renderNotifications();
}
document.addEventListener('click',e=>{
    const panel=document.getElementById('notif-panel');
    const bell=document.getElementById('notif-bell-btn');
    if(!panel||!bell)return;
    if(!panel.classList.contains('hidden')&&!bell.contains(e.target)&&!panel.contains(e.target))panel.classList.add('hidden');
});

function calcDueSalary(d){
    if(!d.hasSalary||!d.paymentCycle)return 0;
    const now=new Date();
    if(!d.lastPaymentDate)return d.salary;
    const last=new Date(d.lastPaymentDate);
    const daysDiff=Math.floor((now-last)/(1000*60*60*24));
    const cycles={daily:1,weekly:7,biweekly:14,monthly:30};
    const interval=cycles[d.paymentCycle]||30;
    const periods=Math.floor(daysDiff/interval);
    return periods>0?d.salary:0;
}

function calcWaitMinutes(p){
    if(!p.waitingSince)return'—';
    const now = new Date();
    const endTime = p.withDoctorSince ? p.withDoctorSince : (p.completedAt ? p.completedAt : null);
    const startParts = p.waitingSince.split(':').map(Number);
    const endParts = endTime ? endTime.split(':').map(Number) : [now.getHours(), now.getMinutes()];
    const startMins = startParts[0] * 60 + startParts[1];
    const endMins = endParts[0] * 60 + endParts[1];
    const diff = Math.max(0, endMins - startMins);
    if(!endTime)return `${t('waitingNow')} ${diff} ${t('waitingMinutes')}`;
    return `${diff} ${t('waitingMinutes')}`;
}

function renderRevenueChart(){
    const container=document.getElementById('revenue-chart-container');
    if(!container)return;
    const max=Math.max(...weeklyRevenue);
    const dayKeys=['day_sun','day_mon','day_tue','day_wed','day_thu','day_fri','day_sat'];
    container.innerHTML=weeklyRevenue.map((val,i)=>`
        <div class="flex flex-col items-center w-full h-full justify-end">
            <div class="bg-indigo-100 dark:bg-gray-600 w-full rounded-t-sm relative group" style="height:${(val/max)*100}%">
                <div class="absolute inset-0 bg-indigo-500 dark:bg-indigo-400 rounded-t-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800 text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">${val.toLocaleString()} ${t('currency')}</div>
            </div>
            <span class="text-[10px] mt-1 font-bold uppercase text-gray-500 dark:text-gray-300">${t(dayKeys[i])}</span>
        </div>`).join('');
}

function showHome(){
    document.getElementById('view-home').innerHTML=`
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div class="xl:col-span-2 relative h-64 rounded-2xl overflow-hidden shadow-xl flex items-center px-6 bg-gradient-to-r from-indigo-600 to-indigo-400 card"><div class="relative z-10 text-white"><h2 class="text-3xl font-bold">${t('homeTitle')}</h2><p class="text-lg mt-2">${t('homeSubtitle')}</p><button class="mt-4 px-6 py-2 bg-white text-indigo-600 rounded-full font-bold shadow">${t('generateReport')}</button></div></div>
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 card flex flex-col h-64"><h4 class="font-bold dark:text-gray-100">${t('chartWeekly')}</h4><div class="flex-1 flex items-end justify-between gap-1 mt-2" id="revenue-chart-container"></div></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 card"><div class="flex justify-between"><div class="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400"><span class="material-symbols-outlined">payments</span></div><span class="text-emerald-600 dark:text-emerald-400 font-bold">+12.4%</span></div><p class="text-sm mt-2 text-gray-500 dark:text-gray-300">${t('revenueToday')}</p><h3 class="text-2xl font-bold dark:text-gray-100">${clinicData.revenue.toLocaleString()} ${t('currency')}</h3></div>
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 card"><div class="flex justify-between"><div class="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl text-red-600 dark:text-red-400"><span class="material-symbols-outlined">inventory</span></div><span class="text-red-600 dark:text-red-400 font-bold">${t('inventoryAlert')}</span></div><p class="text-sm mt-2 text-gray-500 dark:text-gray-300">${t('inventoryText')}</p><h3 class="text-2xl font-bold dark:text-gray-100">12</h3></div>
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 card"><div class="flex justify-between"><div class="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400"><span class="material-symbols-outlined">schedule</span></div><span class="text-indigo-600 dark:text-indigo-400 font-bold">-4 min</span></div><p class="text-sm mt-2 text-gray-500 dark:text-gray-300">${t('waitTime')}</p><h3 class="text-2xl font-bold dark:text-gray-100">${t('waitTimeValue')}</h3></div>
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 card"><div class="flex justify-between"><div class="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-400"><span class="material-symbols-outlined">trending_up</span></div><span class="text-emerald-600 dark:text-emerald-400 font-bold">${t('peak')}</span></div><p class="text-sm mt-2 text-gray-500 dark:text-gray-300">${t('patientFlow')}</p><h3 class="text-2xl font-bold dark:text-gray-100">${t('patientFlowValue')}</h3></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 card"><h4 class="font-bold mb-4 dark:text-gray-100">${t('doctorsOnDuty')}</h4>${doctorsData.map(d=>`<div class="flex justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-xl mb-2"><span class="dark:text-gray-100">${dn(d)}</span><span class="text-xs px-2 py-0.5 rounded-full ${d.status==='على رأس العمل'?'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400':'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'}">${t(d.status==='على رأس العمل'?'onDuty':'onLeave')}</span></div>`).join('')}</div>
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 card"><h4 class="font-bold mb-4 dark:text-gray-100">${t('recentActivity')}</h4>${clinicData.notifications.map(n=>`<div class="flex items-center gap-2 mb-2"><span class="w-2 h-2 rounded-full ${n.type==='error'?'bg-red-500':'bg-indigo-500'}"></span><span class="text-sm dark:text-gray-200">${t(n.key)}</span></div>`).join('')}</div>
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 card"><h4 class="font-bold mb-4 dark:text-gray-100">${t('quickActions')}</h4><button class="w-full text-left p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mb-2 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600" onclick="switchView('patients')">👥 ${t('sidebarPatients')}</button><button class="w-full text-left p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mb-2 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600" onclick="switchView('appointments')">📅 ${t('sidebarAppointments')}</button><button class="w-full text-left p-2 bg-gray-100 dark:bg-gray-700 rounded-lg dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600" onclick="switchView('settings')">⚙️ ${t('sidebarSettings')}</button></div>
        </div>`;
    renderRevenueChart();applyAllTranslations();
}

function showDoctors(){
    document.getElementById('view-doctors').innerHTML=`
        <div class="flex justify-between items-end mb-6"><div><h2 class="text-2xl font-bold dark:text-gray-100">${t('doctorsSection')}</h2></div><button onclick="openAddDoctorModal()" class="px-4 py-2 bg-indigo-600 text-white rounded-full flex items-center gap-2 hover:bg-indigo-700"><span class="material-symbols-outlined">add</span> ${t('add')}</button></div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-x-auto card"><table class="w-full text-right"><thead><tr class="bg-gray-100 dark:bg-gray-700 text-sm font-bold uppercase text-gray-600 dark:text-gray-200"><th class="p-4">${t('tableName')}</th><th class="p-4">${t('tableSpecialty')}</th><th class="p-4">${t('tablePhone')}</th><th class="p-4">${t('tableStatus')}</th><th class="p-4 text-center">${t('tableActions')}</th></tr></thead>
        <tbody class="text-sm">${doctorsData.map(d=>`<tr onclick="openEditDoctor(${d.id})" class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"><td class="p-4 font-bold dark:text-gray-100">${dn(d)}</td><td class="p-4 dark:text-gray-300">${ds(d)}</td><td class="p-4 dark:text-gray-300" dir="ltr">${d.phone}</td><td class="p-4"><span class="px-2 py-1 rounded-full text-xs ${d.status==='على رأس العمل'?'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400':'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'}">${t(d.status==='على رأس العمل'?'onDuty':'onLeave')}</span></td><td class="p-4 text-center" onclick="event.stopPropagation()"><button onclick="openEditDoctor(${d.id})" class="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 rounded-lg text-xs">${t('edit')}</button> <button onclick="deleteDoctor(${d.id})" class="px-3 py-1 bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg text-xs ml-1">${t('delete')}</button></td></tr>`).join('')}</tbody></table></div>`;
    applyAllTranslations();
}
function showEmployees(){
    document.getElementById('view-employees').innerHTML=`
        <div class="flex justify-between items-end mb-6"><div><h2 class="text-2xl font-bold dark:text-gray-100">${t('employeesSection')}</h2></div><button onclick="openAddEmployeeModal()" class="px-4 py-2 bg-emerald-600 text-white rounded-full flex items-center gap-2 hover:bg-emerald-700"><span class="material-symbols-outlined">add</span> ${t('add')}</button></div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-x-auto card"><table class="w-full text-right"><thead><tr class="bg-gray-100 dark:bg-gray-700 text-sm font-bold uppercase text-gray-600 dark:text-gray-200"><th class="p-4">${t('empTableName')}</th><th class="p-4">${t('empTablePosition')}</th><th class="p-4">${t('empTableDepartment')}</th><th class="p-4">${t('empTableStatus')}</th><th class="p-4 text-center">${t('empTableActions')}</th></tr></thead>
        <tbody class="text-sm">${employeesData.map(e=>`<tr onclick="openEditEmployee(${e.id})" class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"><td class="p-4 font-bold dark:text-gray-100">${en(e)}</td><td class="p-4 dark:text-gray-300">${ep(e)}</td><td class="p-4 dark:text-gray-300">${ed(e)}</td><td class="p-4"><span class="px-2 py-1 rounded-full text-xs ${e.status==='نشط'?'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400':'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'}">${t(e.status==='نشط'?'active':'inactive')}</span></td><td class="p-4 text-center" onclick="event.stopPropagation()"><button onclick="openEditEmployee(${e.id})" class="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 rounded-lg text-xs">${t('edit')}</button> <button onclick="deleteEmployee(${e.id})" class="px-3 py-1 bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg text-xs ml-1">${t('delete')}</button></td></tr>`).join('')}</tbody></table></div>`;
    applyAllTranslations();
}

function showPatients(){
    let rows=patientsData.map(p=>{
        const doc=doctorsData.find(d=>d.id===parseInt(p.doctorId));
        const docName=doc?dn(doc):'—';
        const sc=statusColors[p.status]||'bg-gray-100 text-gray-700';
        const payColor=p.paymentStatus==='paid'?'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400':'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400';
        return `<tr class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onclick="showPatientDetail(${p.id})"><td class="p-3 font-bold dark:text-gray-100">${pn(p)}</td><td class="p-3 dark:text-gray-300" dir="ltr">${p.phone}</td><td class="p-3 dark:text-gray-300">${p.age}</td><td class="p-3 dark:text-gray-300">${docName}</td><td class="p-3"><span class="px-2 py-1 rounded-full text-xs ${sc}">${t(statusLabels[p.status]||p.status)}</span></td><td class="p-3"><span class="px-2 py-1 rounded-full text-xs ${payColor}">${t(p.paymentStatus==='paid'?'paymentPaid':'paymentPending')}</span></td></tr>`;
    }).join('');
    document.getElementById('view-patients').innerHTML=`
        <div class="flex justify-between items-end mb-6"><div><h2 class="text-2xl font-bold dark:text-gray-100">${t('patientsTitle')}</h2></div><button onclick="openAddPatientModal()" class="px-4 py-2 bg-indigo-600 text-white rounded-full flex items-center gap-2 hover:bg-indigo-700"><span class="material-symbols-outlined">person_add</span> ${t('add')}</button></div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-x-auto card"><table class="w-full text-right"><thead><tr class="bg-gray-100 dark:bg-gray-700 text-sm font-bold uppercase text-gray-600 dark:text-gray-200"><th class="p-3">${t('patientName')}</th><th class="p-3">${t('patientPhone')}</th><th class="p-3">${t('patientAge')}</th><th class="p-3">${t('patientDoctor')}</th><th class="p-3">${t('patientStatus')}</th><th class="p-3">${t('paymentStatus')}</th></tr></thead><tbody class="text-sm">${rows}</tbody></table></div><div id="patientDetail" class="mt-6"></div>`;
    applyAllTranslations();
}

function showPatientDetail(id){
    const p=patientsData.find(pt=>pt.id===id);if(!p)return;
    const doc=doctorsData.find(d=>d.id===parseInt(p.doctorId));
    const docName=doc?dn(doc):'—';
    const sc=statusColors[p.status]||'bg-gray-100 text-gray-700';
    const waitStr=calcWaitMinutes(p);

    let laserDetailsHTML = '';
    if (clinicType === 'DERMA_LASER') {
        laserDetailsHTML = `
            <div class="col-span-2"><p class="text-sm text-gray-500 dark:text-gray-400">${t('laserThickness')}</p><p class="dark:text-gray-100">${p.laserThickness||'—'}</p></div>
            <div class="col-span-2"><p class="text-sm text-gray-500 dark:text-gray-400">${t('laserSkinTone')}</p><p class="dark:text-gray-100">${p.laserSkinTone||'—'}</p></div>
            <div class="col-span-2"><p class="text-sm text-gray-500 dark:text-gray-400">${t('laserType')}</p><p class="dark:text-gray-100">${p.laserType||'—'}</p></div>
        `;
    }

    document.getElementById('patientDetail').innerHTML=`
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 card">
            <div class="flex justify-between items-start mb-4"><h3 class="text-xl font-bold dark:text-gray-100">${pn(p)}</h3><div class="flex gap-2"><span class="px-3 py-1 rounded-full text-sm ${sc}">${t(statusLabels[p.status]||p.status)}</span><button onclick="deletePatient(${p.id})" class="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"><span class="material-symbols-outlined">delete</span></button></div></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><p class="text-sm text-gray-500 dark:text-gray-400">${t('patientPhone')}</p><p class="font-bold dark:text-gray-100" dir="ltr">${p.phone}</p></div>
                <div><p class="text-sm text-gray-500 dark:text-gray-400">${t('patientAge')}</p><p class="font-bold dark:text-gray-100">${p.age}</p></div>
                <div><p class="text-sm text-gray-500 dark:text-gray-400">${t('patientDoctor')}</p><p class="font-bold dark:text-gray-100">${docName}</p></div>
                <div><p class="text-sm text-gray-500 dark:text-gray-400">${t('paymentStatus')}</p><p class="font-bold dark:text-gray-100">${t(p.paymentStatus==='paid'?'paymentPaid':'paymentPending')} (${p.procedurePrice.toLocaleString()} ${t('currency')})</p></div>
                <div class="col-span-2"><p class="text-sm text-gray-500 dark:text-gray-400">${t('patientHistory')}</p><p class="dark:text-gray-100">${p.history||'—'}</p></div>
                <div class="col-span-2"><p class="text-sm text-gray-500 dark:text-gray-400">${t('patientMedications')}</p><p class="dark:text-gray-100">${p.medications||'—'}</p></div>
                ${laserDetailsHTML}
                <div class="col-span-2"><p class="text-sm text-gray-500 dark:text-gray-400">${t('doctorNotes')}</p><p class="dark:text-gray-100">${p.doctorNotes||'—'}</p></div>
                <div><p class="text-sm text-gray-500 dark:text-gray-400">${t('arrivedAt')}</p><p class="dark:text-gray-100">${p.arrivedAt||'—'}</p></div>
                <div><p class="text-sm text-gray-500 dark:text-gray-400">${t('waitDuration')}</p><p class="dark:text-gray-100 font-bold">${waitStr}</p></div>
                <div><p class="text-sm text-gray-500 dark:text-gray-400">${t('withDoctorSince')}</p><p class="dark:text-gray-100">${p.withDoctorSince||'—'}</p></div>
                <div><p class="text-sm text-gray-500 dark:text-gray-400">${t('completedAt')}</p><p class="dark:text-gray-100">${p.completedAt||'—'}</p></div>
            </div>
            <div class="flex flex-wrap gap-2 mt-4 border-t pt-4">
                <button onclick="updatePatientStatus(${p.id},'arrived')" class="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg text-xs">${t('patientArrived')}</button>
                <button onclick="updatePatientStatus(${p.id},'waiting')" class="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-lg text-xs">${t('patientWaiting')}</button>
                <button onclick="updatePatientStatus(${p.id},'withDoctor')" class="px-3 py-1 bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-400 rounded-lg text-xs">${t('patientWithDoctor')}</button>
                <button onclick="updatePatientStatus(${p.id},'completed')" class="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs">${t('patientCompleted')}</button>
                <button onclick="updatePatientStatus(${p.id},'cancelled')" class="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg text-xs">${t('patientCancelled')}</button>
                <button onclick="togglePaymentStatus(${p.id})" class="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 rounded-lg text-xs ml-auto">${t('paymentStatus')}: ${t(p.paymentStatus==='paid'?'paymentPaid':'paymentPending')}</button>
            </div>
        </div>`;
    applyAllTranslations();
}

function updatePatientStatus(id,status){
    const p=patientsData.find(pt=>pt.id===id);if(!p)return;
    const now=nowHM();
    p.status=status;
    if(status==='arrived'){p.arrivedAt=now;p.waitingSince=now;}
    else if(status==='waiting')p.waitingSince=now;
    else if(status==='withDoctor')p.withDoctorSince=now;
    else if(status==='completed')p.completedAt=now;
    
    saveState();
    showPatients();
    showPatientDetail(id);
}

async function togglePaymentStatus(id) {
    const p = patientsData.find(pt=>pt.id===id);if(!p)return;
    if(await confirmAction(t('confirmTogglePaid'))) {
        const oldStatus = p.paymentStatus;
        p.paymentStatus = (oldStatus === 'paid') ? 'pending' : 'paid';
        
        const doc = doctorsData.find(d => d.id === parseInt(p.doctorId));
        if (p.paymentStatus === 'paid') {
            clinicData.revenue += p.procedurePrice;
            if (doc && doc.hasIncentive) {
                doc.patientsCount += 1;
                doc.pendingIncentive += doc.incentiveRate;
            }
        } else if (p.paymentStatus === 'pending' && oldStatus === 'paid') {
            clinicData.revenue = Math.max(0, clinicData.revenue - p.procedurePrice);
            if (doc && doc.hasIncentive) {
                doc.patientsCount = Math.max(0, doc.patientsCount - 1);
                doc.pendingIncentive = Math.max(0, doc.pendingIncentive - doc.incentiveRate);
            }
        }
        
        saveState();
        showPatients();
        showPatientDetail(id);
    }
}

async function deletePatient(id) {
    if(await confirmAction(t('confirmDelete'))) {
        patientsData = patientsData.filter(p => p.id !== id);
        saveState();
        showPatients();
        document.getElementById('patientDetail').innerHTML = '';
    }
}

function showAppointments(){
    const hours=['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'];
    let calHTML='';
    
    dayLabels.forEach((day)=>{
        calHTML+=`<div class="flex-1 min-w-[120px]"><div class="text-center font-bold py-2 bg-gray-100 dark:bg-gray-700 rounded-t-lg dark:text-gray-100">${t('day_'+day)}</div>`;
        hours.forEach((hour)=>{
            const matchedPatient = patientsData.find(p => p.appointmentDay === day && p.appointmentHour === hour && p.status !== 'completed' && p.status !== 'cancelled' && p.status !== 'noShow');
            
            if(matchedPatient){
                const p = matchedPatient;
                const calClass=p.paymentStatus==='paid'?'cal-paid':(p.confirmed?'cal-confirmed':'cal-pending');
                calHTML+=`<div class="${calClass} p-2 m-1 rounded text-xs cursor-pointer hover:shadow-md transition" onclick="switchView('patients'); showPatientDetail(${p.id})"><div class="font-bold">${pn(p)}</div><div class="text-[10px]">${hour}</div></div>`;
            }else{
                calHTML+=`<div class="p-2 m-1 border border-dashed border-gray-200 dark:border-gray-700 rounded text-[10px] text-gray-300 dark:text-gray-600 text-center">${hour}</div>`;
            }
        });
        calHTML+=`</div>`;
    });
    
    document.getElementById('view-appointments').innerHTML=`
        <div class="flex justify-between items-end mb-6"><div><h2 class="text-2xl font-bold dark:text-gray-100">${t('appointmentsTitle')}</h2></div></div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 card mb-6"><h4 class="font-bold mb-3 dark:text-gray-100">${t('legendTitle')}</h4><div class="flex flex-wrap gap-3 text-xs">
            <span class="flex items-center gap-1"><span class="w-4 h-4 rounded cal-paid"></span> ${t('paymentPaid')}</span>
            <span class="flex items-center gap-1"><span class="w-4 h-4 rounded cal-confirmed"></span> ${t('appointmentConfirmed')}</span>
            <span class="flex items-center gap-1"><span class="w-4 h-4 rounded cal-pending"></span> ${t('appointmentPending')}</span>
        </div></div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 card overflow-x-auto"><div class="flex gap-1 min-w-[700px]">${calHTML}</div></div>`;
    applyAllTranslations();
}

function showRecords(){document.getElementById('view-records').innerHTML=`<h2 class="text-2xl font-bold dark:text-gray-100">${t('recordsTitle')}</h2><p class="text-gray-400 dark:text-gray-500 mt-4">${t('comingSoon')}</p>`;applyAllTranslations();}

function showFinance(){
    let empRows=employeesData.map(e=>`<tr><td class="p-3 font-bold dark:text-gray-100">${en(e)}</td><td class="p-3"><input type="number" value="${e.salary}" onchange="updateSalary(${e.id},this.value)" class="w-24 border rounded p-1 text-xs dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"></td><td class="p-3"><span class="px-2 py-1 rounded-full text-xs ${e.salaryPaid?'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400':'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'}">${e.salaryPaid?t('salaryPaid'):t('salaryUnpaid')}</span></td><td class="p-3"><button onclick="toggleSalaryPaid(${e.id})" class="px-3 py-1 bg-gray-100 dark:bg-gray-700 dark:text-gray-200 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-gray-600">${t('togglePaid')}</button></td></tr>`).join('');
    let docRows=doctorsData.map(d=>{
        const dueSalary=calcDueSalary(d);
        const pendingIncentive=d.pendingIncentive||0;
        const totalDue=dueSalary+pendingIncentive;
        const cycleText=t('cycle'+d.paymentCycle.charAt(0).toUpperCase()+d.paymentCycle.slice(1))||d.paymentCycle;
        return `<tr>
            <td class="p-3 font-bold dark:text-gray-100">${dn(d)}</td>
            <td class="p-3 dark:text-gray-300">${cycleText}</td>
            <td class="p-3 dark:text-gray-100">${dueSalary.toLocaleString()} ${t('currency')}</td>
            <td class="p-3 dark:text-gray-100">${pendingIncentive.toLocaleString()} ${t('currency')}</td>
            <td class="p-3 font-bold dark:text-gray-100">${totalDue.toLocaleString()} ${t('currency')}</td>
            <td class="p-3"><button onclick="openPayDoctorModal(${d.id})" class="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs">${t('payBtn')}</button></td>
        </tr>`;
    }).join('');
    document.getElementById('view-finance').innerHTML=`
        <div class="space-y-6">
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 card"><h3 class="font-bold text-lg mb-4 dark:text-gray-100">${t('salaryTitle')}</h3><table class="w-full text-right"><thead><tr class="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 text-sm"><th class="p-3">${t('empTableName')}</th><th class="p-3">${t('salaryLabel')}</th><th class="p-3">${t('tableStatus')}</th><th class="p-3">${t('tableActions')}</th></tr></thead><tbody>${empRows}</tbody></table></div>
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 card"><h3 class="font-bold text-lg mb-4 dark:text-gray-100">${t('incentiveTitle')}</h3><table class="w-full text-right"><thead><tr class="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 text-sm"><th class="p-3">${t('tableName')}</th><th class="p-3">${t('cycle')}</th><th class="p-3">${t('salaryDue')}</th><th class="p-3">${t('incentivePending')}</th><th class="p-3">${t('total')}</th><th class="p-3">${t('tableActions')}</th></tr></thead><tbody>${docRows}</tbody></table></div>
        </div>`;
    applyAllTranslations();
}

function openPayDoctorModal(id){
    const d=doctorsData.find(d=>d.id===id);if(!d)return;
    document.getElementById('payDoctorId').value=d.id;
    document.getElementById('paySalaryAmount').value=calcDueSalary(d);
    document.getElementById('payIncentiveAmount').value=d.pendingIncentive||0;
    updatePayTotal();
    openModal('payDoctorModal');
}
function closePayDoctorModal(){closeModal('payDoctorModal');}
function updatePayTotal(){
    const s=+document.getElementById('paySalaryAmount').value||0;
    const i=+document.getElementById('payIncentiveAmount').value||0;
    document.getElementById('payTotal').innerText=(s+i).toLocaleString();
}
function confirmPayDoctor(){
    const id=+document.getElementById('payDoctorId').value;
    const d=doctorsData.find(d=>d.id===id);if(!d)return;
    const salaryPaid=+document.getElementById('paySalaryAmount').value||0;
    const incentivePaid=+document.getElementById('payIncentiveAmount').value||0;
    const total=salaryPaid+incentivePaid;
    if(total<=0)return;
    const today=new Date().toISOString().split('T')[0];
    d.lastPaymentDate=today;
    d.paymentHistory.push({date:today,salaryAmount:salaryPaid,incentiveAmount:incentivePaid,total});
    d.pendingIncentive=Math.max(0,(d.pendingIncentive||0)-incentivePaid);
    
    saveState();
    closePayDoctorModal();
    showFinance();
}

function showInventory(){document.getElementById('view-inventory').innerHTML=`<div class="text-center py-12 opacity-40"><span class="material-symbols-outlined text-[80px]">construction</span><h3 class="dark:text-gray-100">${t('inventorySection')}</h3><p class="text-gray-400">${t('comingSoon')}</p></div>`;applyAllTranslations();}

function showSettings(){
    document.getElementById('view-settings').innerHTML=`
        <h2 class="text-2xl font-bold dark:text-gray-100">${t('settingsTitle')}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 card">
                <h3 class="font-bold dark:text-gray-100">${t('clinicInfo')}</h3>
                <div class="mt-4 space-y-3">
                    <input class="w-full p-2 border rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" placeholder="${t('clinicName')}">
                    <input class="w-full p-2 border rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" placeholder="${t('email')}">
                </div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 card">
                <h3 class="font-bold dark:text-gray-100">${t('preferences')}</h3>
                <div class="mt-4 space-y-3">
                    <label class="flex items-center justify-between dark:text-gray-200"><span>${t('darkMode')}</span><input type="checkbox" onchange="toggleDarkMode()" ${document.body.classList.contains('dark-mode')?'checked':''}></label>
                    <label class="flex items-center justify-between dark:text-gray-200"><span>${t('arabicLang')}</span><input type="checkbox" ${L==='ar'?'checked':''} onchange="toggleLanguage()"></label>
                </div>
            </div>
        </div>`;
    applyAllTranslations();
}

function openModal(id){
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById(id).classList.remove('hidden');
}
function closeModal(id){
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById(id).classList.add('hidden');
}
function closeAllModals(){
    document.getElementById('modal-overlay').classList.add('hidden');
    ['editDoctorModal','addDoctorModal','payDoctorModal','editEmployeeModal','addEmployeeModal','confirmModal','promptModal', 'addPatientModal'].forEach(id=>{const m=document.getElementById(id);if(m)m.classList.add('hidden');});
    if(confirmResolve){const r=confirmResolve;confirmResolve=null;r(false);}
    if(promptResolve){const r=promptResolve;promptResolve=null;r(null);}
}
document.addEventListener('click',e=>{if(e.target&&e.target.id==='modal-overlay')closeAllModals();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAllModals();});

function openAddPatientModal() {
    const docOptions = doctorsData.map(d => `<option value="${d.id}">${dn(d)}</option>`).join('');
    
    if(!document.getElementById('addPatientModal')) {
        const modalHTML = `
        <div id="addPatientModal" class="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden hidden">
            <div class="p-4 bg-indigo-600 text-white flex justify-between items-center"><h3 class="font-bold">إضافة مريض / حجز جديد</h3><button onclick="closeAllModals()" class="p-1 hover:bg-white/20 rounded-full"><span class="material-symbols-outlined">close</span></button></div>
            <form class="p-4 space-y-4" onsubmit="saveNewPatient(event)">
                <div class="grid grid-cols-2 gap-3">
                    <div class="col-span-2"><label class="block text-sm font-bold mb-1 dark:text-gray-300">اسم المريض</label><input type="text" id="newPatientName" required class="w-full p-2 bg-gray-100 dark:bg-gray-700 border rounded-xl dark:text-gray-100 dark:border-gray-600"></div>
                    <div><label class="block text-sm font-bold mb-1 dark:text-gray-300">رقم الهاتف</label><input type="text" id="newPatientPhone" required class="w-full p-2 bg-gray-100 dark:bg-gray-700 border rounded-xl dark:text-gray-100 dark:border-gray-600"></div>
                    <div><label class="block text-sm font-bold mb-1 dark:text-gray-300">العمر</label><input type="number" id="newPatientAge" required class="w-full p-2 bg-gray-100 dark:bg-gray-700 border rounded-xl dark:text-gray-100 dark:border-gray-600"></div>
                    <div class="col-span-2"><label class="block text-sm font-bold mb-1 dark:text-gray-300">الطبيب المشرف</label><select id="newPatientDoc" class="w-full p-2 bg-gray-100 dark:bg-gray-700 border rounded-xl dark:text-gray-100 dark:border-gray-600">${docOptions}</select></div>
                    
                    <div><label class="block text-sm font-bold mb-1 dark:text-gray-300">يوم الحجز</label><select id="newPatientDay" class="w-full p-2 bg-gray-100 dark:bg-gray-700 border rounded-xl dark:text-gray-100 dark:border-gray-600">
                        <option value="sun">الاحد / Sun</option><option value="mon">الاثنين / Mon</option><option value="tue">الثلاثاء / Tue</option><option value="wed">الأربعاء / Wed</option><option value="thu">الخميس / Thu</option><option value="fri">الجمعة / Fri</option><option value="sat">السبت / Sat</option>
                    </select></div>
                    <div><label class="block text-sm font-bold mb-1 dark:text-gray-300">ساعة الحجز</label><select id="newPatientHour" class="w-full p-2 bg-gray-100 dark:bg-gray-700 border rounded-xl dark:text-gray-100 dark:border-gray-600">
                        <option value="08:00">08:00</option><option value="09:00">09:00</option><option value="10:00">10:00</option><option value="11:00">11:00</option><option value="12:00">12:00</option><option value="13:00">13:00</option><option value="14:00">14:00</option><option value="15:00">15:00</option><option value="16:00">16:00</option>
                    </select></div>
                    
                    <div class="col-span-2"><label class="block text-sm font-bold mb-1 dark:text-gray-300">سعر العملية / الكشفية</label><input type="number" id="newPatientPrice" required class="w-full p-2 bg-gray-100 dark:bg-gray-700 border rounded-xl dark:text-gray-100 dark:border-gray-600" value="25000"></div>
                </div>
                <!-- Laser Section Container -->
                <div class="border-t pt-3" id="laserFieldsContainer">
                    <h4 class="font-bold mb-2 dark:text-gray-100">تفاصيل الليزر والتجميل (اختياري)</h4>
                    <div class="grid grid-cols-3 gap-2">
                        <input type="text" id="newPatientThickness" placeholder="سماكة الشعرة" class="p-2 bg-gray-100 dark:bg-gray-700 border rounded-xl dark:text-gray-100 dark:border-gray-600">
                        <input type="text" id="newPatientSkin" placeholder="لون البشرة" class="p-2 bg-gray-100 dark:bg-gray-700 border rounded-xl dark:text-gray-100 dark:border-gray-600">
                        <input type="text" id="newPatientLaser" placeholder="نوع الليزر" class="p-2 bg-gray-100 dark:bg-gray-700 border rounded-xl dark:text-gray-100 dark:border-gray-600">
                    </div>
                </div>
                <div class="flex justify-end gap-2"><button type="button" onclick="closeAllModals()" class="px-4 py-2 rounded-xl border dark:border-gray-600 dark:text-gray-300">إلغاء</button><button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-xl">حفظ وإضافة</button></div>
            </form>
        </div>`;
        document.getElementById('modal-overlay').insertAdjacentHTML('beforeend', modalHTML);
    } else {
        document.getElementById('newPatientDoc').innerHTML = docOptions;
    }
    openModal('addPatientModal');
    applyClinicTypeLayout();
}

function saveNewPatient(e) {
    e.preventDefault();
    const id = patientsData.length ? Math.max(...patientsData.map(p => p.id)) + 1 : 1;
    const name = document.getElementById('newPatientName').value;
    const phone = document.getElementById('newPatientPhone').value;
    const age = parseInt(document.getElementById('newPatientAge').value);
    const doctorId = parseInt(document.getElementById('newPatientDoc').value);
    const appointmentDay = document.getElementById('newPatientDay').value;
    const appointmentHour = document.getElementById('newPatientHour').value;
    const procedurePrice = parseInt(document.getElementById('newPatientPrice').value);
    
    const thicknessInput = document.getElementById('newPatientThickness');
    const skinInput = document.getElementById('newPatientSkin');
    const laserInput = document.getElementById('newPatientLaser');

    const laserThickness = thicknessInput ? thicknessInput.value || "—" : "—";
    const laserSkinTone = skinInput ? skinInput.value || "—" : "—";
    const laserType = laserInput ? laserInput.value || "—" : "—";

    const newPatient = {
        id, nameAr: name, nameEn: name, phone, age, doctorId, status: "pending",
        arrivedAt: null, waitingSince: null, withDoctorSince: null, completedAt: null,
        paymentStatus: "pending", confirmed: true, laserThickness, laserSkinTone, laserType,
        doctorNotes: "", appointmentDay, appointmentHour, procedurePrice
    };

    patientsData.push(newPatient);
    
    clinicData.notifications.unshift({
        id: Date.now(),
        key: "notif1",
        timeKey: "notifNow",
        type: "info"
    });

    saveState();
    closeAllModals();
    showPatients();
    renderNotifications();
}

function openEditDoctor(id){
    const d=doctorsData.find(d=>d.id===id);if(!d)return;
    document.getElementById('editDoctorId').value=d.id;
    document.getElementById('editDoctorName').value=dn(d);document.getElementById('editDoctorSpecialty').value=ds(d);
    document.getElementById('editDoctorPhone').value=d.phone;document.getElementById('editDoctorStatus').value=d.status;
    document.getElementById('editHasIncentive').checked=d.hasIncentive;document.getElementById('editHasSalary').checked=d.hasSalary;
    toggleEditIncentiveFields();toggleEditSalaryField();
    if(d.hasIncentive){document.getElementById('editIncentiveRate').value=d.incentiveRate;document.getElementById('editPatientsCount').value=d.patientsCount;}
    if(d.hasSalary){document.getElementById('editDoctorSalary').value=d.salary;document.getElementById('editPaymentCycle').value=d.paymentCycle;}
    openModal('editDoctorModal');
}
function closeEditDoctorModal(){closeModal('editDoctorModal');}
function toggleEditIncentiveFields(){document.getElementById('editIncentiveFields').classList.toggle('hidden',!document.getElementById('editHasIncentive').checked);}
function toggleEditSalaryField(){document.getElementById('editSalaryField').classList.toggle('hidden',!document.getElementById('editHasSalary').checked);}
function toggleNewIncentiveFields(){document.getElementById('newIncentiveFields').classList.toggle('hidden',!document.getElementById('newHasIncentive').checked);}
function toggleNewSalaryField(){document.getElementById('newSalaryField').classList.toggle('hidden',!document.getElementById('newHasSalary').checked);}

function saveDoctorChanges(e){
    e.preventDefault();
    const d=doctorsData.find(d=>d.id===+document.getElementById('editDoctorId').value);
    if(d){
        if(L==='ar'){d.nameAr=document.getElementById('editDoctorName').value;d.specialtyAr=document.getElementById('editDoctorSpecialty').value;}
        else{d.nameEn=document.getElementById('editDoctorName').value;d.specialtyEn=document.getElementById('editDoctorSpecialty').value;}
        d.phone=document.getElementById('editDoctorPhone').value;d.status=document.getElementById('editDoctorStatus').value;
        d.hasIncentive=document.getElementById('editHasIncentive').checked;d.hasSalary=document.getElementById('editHasSalary').checked;
        if(d.hasIncentive){d.incentiveRate=+document.getElementById('editIncentiveRate').value||0;d.patientsCount=+document.getElementById('editPatientsCount').value||0;}
        if(d.hasSalary){d.salary=+document.getElementById('editDoctorSalary').value||0;d.paymentCycle=document.getElementById('editPaymentCycle').value;}
    }
    saveState();
    closeEditDoctorModal();
    showDoctors();
}
function openAddDoctorModal(){openModal('addDoctorModal');}
function closeAddDoctorModal(){closeModal('addDoctorModal');}
function saveNewDoctor(e){
    e.preventDefault();
    const name=document.getElementById('newDoctorName').value,specialty=document.getElementById('newDoctorSpecialty').value,phone=document.getElementById('newDoctorPhone').value;
    const email=document.getElementById('newDoctorEmail').value,password=document.getElementById('newDoctorPassword').value;
    const hasIncentive=document.getElementById('newHasIncentive').checked,hasSalary=document.getElementById('newHasSalary').checked;
    const id=doctorsData.length?Math.max(...doctorsData.map(d=>d.id))+1:1;
    const nd={id,nameAr:name,nameEn:name,specialtyAr:specialty,specialtyEn:specialty,phone,status:'على رأس العمل',hasIncentive,hasSalary,incentiveRate:0,patientsCount:0,pendingIncentive:0,salary:0,paymentCycle:'monthly',lastPaymentDate:null,paymentHistory:[]};
    if(hasIncentive){nd.incentiveRate=+document.getElementById('newIncentiveRate').value||0;nd.patientsCount=+document.getElementById('newPatientsCount').value||0;}
    if(hasSalary){nd.salary=+document.getElementById('newDoctorSalary').value||0;nd.paymentCycle=document.getElementById('newPaymentCycle').value;}
    nd.email=email;nd.password=password;
    doctorsData.push(nd);
    clinicData.notifications.unshift({id:Date.now(),key:'notifDoctorAdded',timeKey:'notifNow',type:'info'});
    
    saveState();
    renderNotifications();
    closeAddDoctorModal();
    showDoctors();
}
async function deleteDoctor(id){if(await confirmAction(t('confirmDelete'))){doctorsData.splice(doctorsData.findIndex(d=>d.id===id),1);saveState();showDoctors();}}

function openEditEmployee(id){
    const e=employeesData.find(e=>e.id===id);if(!e)return;
    document.getElementById('editEmployeeId').value=e.id;
    document.getElementById('editEmployeeName').value=en(e);document.getElementById('editEmployeePosition').value=ep(e);
    document.getElementById('editEmployeeDepartment').value=ed(e);
    document.getElementById('editEmployeeStatus').value=e.status||'نشط';
    openModal('editEmployeeModal');
}
function closeEditEmployeeModal(){closeModal('editEmployeeModal');}
function saveEmployeeChanges(e){
    e.preventDefault();
    const emp=employeesData.find(e=>e.id===+document.getElementById('editEmployeeId').value);
    if(emp){
        if(L==='ar'){emp.nameAr=document.getElementById('editEmployeeName').value;emp.positionAr=document.getElementById('editEmployeePosition').value;emp.departmentAr=document.getElementById('editEmployeeDepartment').value;}
        else{emp.nameEn=document.getElementById('editEmployeeName').value;emp.positionEn=document.getElementById('editEmployeePosition').value;emp.departmentEn=document.getElementById('editEmployeeDepartment').value;}
        emp.status=document.getElementById('editEmployeeStatus').value;
    }
    saveState();
    closeEditEmployeeModal();
    showEmployees();
}
function openAddEmployeeModal(){openModal('addEmployeeModal');}
function closeAddEmployeeModal(){closeModal('addEmployeeModal');}
function saveNewEmployee(e){
    e.preventDefault();
    const name=document.getElementById('newEmployeeName').value,position=document.getElementById('newEmployeePosition').value,department=document.getElementById('newEmployeeDepartment').value;
    const status=document.getElementById('newEmployeeStatus').value;
    const id=employeesData.length?Math.max(...employeesData.map(e=>e.id))+1:1;
    employeesData.push({id,nameAr:name,nameEn:name,positionAr:position,positionEn:position,departmentAr:department,departmentEn:department,status,salary:0,salaryPaid:false});
    
    saveState();
    closeAddEmployeeModal();
    showEmployees();
}
async function deleteEmployee(id){if(await confirmAction(t('confirmDelete'))){employeesData.splice(employeesData.findIndex(e=>e.id===id),1);saveState();showEmployees();}}

function updateSalary(id,value){
    const emp=employeesData.find(e=>e.id===id);
    if(emp)emp.salary=Math.max(0,+value);
    saveState();
    showFinance();
}
async function toggleSalaryPaid(id){
    if(await confirmAction(t('confirmTogglePaid'))){
        const emp=employeesData.find(e=>e.id===id);
        if(emp)emp.salaryPaid=!emp.salaryPaid;
        saveState();
        showFinance();
    }
}

let confirmResolve=null;
function confirmAction(message){return new Promise(resolve=>{document.getElementById('confirmMsg').textContent=message;openModal('confirmModal');confirmResolve=resolve;});}
function closeConfirmModal(result){closeModal('confirmModal');if(confirmResolve){const r=confirmResolve;confirmResolve=null;r(result);}}

let promptResolve=null;
function resolvePrompt(value){closeModal('promptModal');if(promptResolve){const r=promptResolve;promptResolve=null;r(value);}}

(function init(){
    const st=localStorage.getItem('theme');if(st==='dark')document.body.classList.add('dark-mode');
    document.getElementById('dark-mode-icon').innerText=document.body.classList.contains('dark-mode')?'light_mode':'dark_mode';
    const sl=localStorage.getItem('lang');
    if(sl==='en'){L='en';document.documentElement.lang='en';document.documentElement.dir='ltr';document.body.classList.remove('rtl');}
    else{L='ar';document.documentElement.lang='ar';document.documentElement.dir='rtl';document.body.classList.add('rtl');}
    document.getElementById('lang-btn').innerText=L==='ar'?'EN':'AR';
    applyAllTranslations();renderNotifications();showHome();
    applyClinicTypeLayout();
})();