// ==========================================
// 1. إدارة البيانات وحفظ الحالة الثابتة (LocalStorage)
// ==========================================

const initialClinics = [
    { id: 1, name: "عيادة المنصور لطب الأسنان", category: "أسنان", type: "DENTAL", manager: "أ. أحمد الرواد", phone: "9647700000000", plan: "شهري", status: "نشط", expiry: "2026-08-15", bookings: 1240, extendedThisYear: false },
    { id: 2, name: "مركز الشفاء للجلدية والليزر", category: "جلدية وليزر", type: "DERMA_LASER", manager: "د. سارة علي", phone: "9647800000000", plan: "سنوي", status: "فترة السماح", expiry: "2026-06-28", bookings: 2150, extendedThisYear: false },
    { id: 3, name: "عيادة الرشيد للأطفال", category: "أطفال", type: "PEDIATRICS", manager: "د. أحمد التميمي", phone: "9647500000000", plan: "نصف سنوي", status: "متوقف", expiry: "2026-06-20", bookings: 430, extendedThisYear: false }
];

const initialTickets = [
    { id: 101, clinicName: "عيادة المنصور لطب الأسنان", type: "مشكلة فنية", text: "لا تظهر أسماء الموظفين في طباعة الوصل التلقائي للعيادة.", priority: "عالية" },
    { id: 102, clinicName: "مركز الشفاء للجلدية والليزر", type: "طلب إضافة ميزة", text: "نود إضافة تخصص فرعي لليزر الكربوني في لوحة تخصصاتنا.", priority: "متوسطة" }
];

const initialLogs = [
    { time: "19:30:15", text: "قام مدير النظام الأعلى بتسجيل الدخول بأمان." },
    { time: "17:45:10", text: "أرسلت عيادة المنصور تذكرة دعم فني جديدة برقم #101" }
];

function getStorage(key, defaultVal) {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
}

let clinics = getStorage('super_clinics', initialClinics);
let supportTickets = getStorage('super_tickets', initialTickets);
let auditLogs = getStorage('super_logs', initialLogs);

function saveSuperState() {
    localStorage.setItem('super_clinics', JSON.stringify(clinics));
    localStorage.setItem('super_tickets', JSON.stringify(supportTickets));
    localStorage.setItem('super_logs', JSON.stringify(auditLogs));
}

let currentCategory = "الكل"; 
let currentTargetClinicId = null;

// ==========================================
// 2. دالة تهيئة وعرض البيانات
// ==========================================
function initDashboard() {
    updateDynamicStats();
    renderClinicsTable();
    renderTicketsTable();
    renderTopClinics();
    renderAuditLogs();
}

function updateDynamicStats() {
    let activeClinics = clinics.filter(c => c.status === "نشط").length;
    
    let totalRev = clinics.reduce((acc, c) => {
        let val = c.plan === "سنوي" ? 1200000 : c.plan === "نصف سنوي" ? 650000 : c.plan === "3 أشهر" ? 350000 : 120000;
        return acc + val;
    }, 0);

    if (document.getElementById('totalRevenue')) document.getElementById('totalRevenue').textContent = totalRev.toLocaleString() + " د.ع";
    if (document.getElementById('forecastedRevenue')) document.getElementById('forecastedRevenue').textContent = (clinics.length * 150000).toLocaleString() + " د.ع";
    if (document.getElementById('todayBookings')) document.getElementById('todayBookings').textContent = clinics.reduce((acc, c) => acc + (c.status === "نشط" ? 15 : 0), 5) + " حجزاً";
    if (document.getElementById('newPatients')) document.getElementById('newPatients').textContent = (clinics.length * 45) + " مريضاً";
    if (document.getElementById('activeStaff')) document.getElementById('activeStaff').textContent = (clinics.length + activeClinics * 3) + " موظفاً";
}

// ==========================================
// 3. التبديل الفعلي والفلترة للأقسام (Tabs)
// ==========================================
function switchCategory(categoryName) {
    currentCategory = categoryName;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-indigo-600', 'text-indigo-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    const targetTab = document.getElementById(`tab-${categoryName}`);
    if (targetTab) {
        targetTab.classList.remove('border-transparent', 'text-gray-500');
        targetTab.classList.add('border-indigo-600', 'text-indigo-600');
    }

    renderClinicsTable();
}

// ==========================================
// 4. بناء وعرض الجداول والقوائم ديناميكياً
// ==========================================
function renderClinicsTable() {
    const tableBody = document.getElementById('clinicsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = ""; 

    const filteredClinics = currentCategory === "الكل" 
        ? clinics 
        : clinics.filter(c => c.category === currentCategory || (currentCategory === "مختبر" && c.type === "LAB"));

    if (filteredClinics.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400 font-medium">لا توجد عيادات مسجلة في هذا القسم حالياً.</td></tr>`;
        return;
    }

    filteredClinics.forEach(clinic => {
        let statusBadge = "";
        let actionButtons = "";

        let whatsappMessage = `مرحباً ${clinic.manager}، نود تذكيركم بأن خطة ${clinic.name} في نظام ابن حيان الطبي تحتاج للتجديد.`;
        let encodedMessage = encodeURIComponent(whatsappMessage);
        let whatsappLink = `https://wa.me/${clinic.phone}?text=${encodedMessage}`;

        if (clinic.status === "نشط") {
            statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>نشط</span>`;
        } else if (clinic.status === "فترة السماح") {
            statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200"><span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>فترة السماح</span>`;
        } else {
            statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200"><span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>متوقف</span>`;
        }

        actionButtons = `
            <div class="flex gap-2 justify-center flex-wrap">
                <button onclick="loginToClinic(${clinic.id}, '${clinic.type}')" class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 text-xs transition shadow-sm">
                    👁️ دخول اللوحة
                </button>
                <button onclick="openPlanModal(${clinic.id})" class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg hover:bg-indigo-100 text-xs transition">
                    إعدادات وخطة
                </button>
                <a href="${whatsappLink}" target="_blank" class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg hover:bg-emerald-100 text-xs transition">واتساب</a>
                <button onclick="extendClinicTime(${clinic.id})" class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-700 font-bold rounded-lg hover:bg-amber-100 text-xs transition">تمديد المهلة</button>
                <button onclick="deleteClinic(${clinic.id})" class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 text-xs transition">حذف</button>
            </div>`;

        let catText = clinic.category;
        if (clinic.category === "أسنان") catText = "طب الأسنان";
        else if (clinic.category === "جلدية وليزر") catText = "الجلدية والليزر";
        else if (clinic.category === "أطفال") catText = "طب الأطفال";
        else if (clinic.category === "عام وباطنية") catText = "الطب العام والباطنية";
        else if (clinic.type === "LAB") catText = "مختبر تحليلات";

        let typeText = "عيادة عامة";
        if (clinic.type === "DERMA_LASER") typeText = "تجميل وليزر";
        else if (clinic.type === "DENTAL") typeText = "طب أسنان تخصصي";
        else if (clinic.type === "PEDIATRICS") typeText = "طب أطفال عام";
        else if (clinic.type === "INTERNAL") typeText = "باطنية واستشارية";
        else if (clinic.type === "LAB") typeText = "مختبر تحليلات مرضية";

        tableBody.innerHTML += `
            <tr class="hover:bg-gray-50/80 transition border-b border-gray-100">
                <td class="p-4 font-bold text-gray-900">${clinic.name}</td>
                <td class="p-4 text-gray-500 font-medium">${catText} <br><span class="text-[10px] text-indigo-500 font-mono">[${typeText}]</span></td>
                <td class="p-4 text-gray-600 font-semibold">${clinic.plan}</td>
                <td class="p-4">${statusBadge}</td>
                <td class="p-4 font-mono text-gray-500">${clinic.expiry}</td>
                <td class="p-4 text-center">${actionButtons}</td>
            </tr>`;
    });
}

function renderTicketsTable() {
    const tableBody = document.getElementById('ticketsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (supportTickets.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-400 font-medium">لا توجد شكاوى معلقة حالياً. 🎉</td></tr>`;
        return;
    }
    supportTickets.forEach(ticket => {
        let priorityBadge = ticket.priority === "عالية" 
            ? `<span class="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-200">عالية</span>`
            : `<span class="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200">متوسطة</span>`;
        tableBody.innerHTML += `
            <tr class="hover:bg-gray-50/80 transition border-b border-gray-100">
                <td class="p-4 font-bold text-gray-900">${ticket.clinicName}</td>
                <td class="p-4 text-gray-500 font-semibold">${ticket.type}</td>
                <td class="p-4 text-gray-600 max-w-xs truncate">${ticket.text}</td>
                <td class="p-4">${priorityBadge}</td>
                <td class="p-4 text-center">
                    <button onclick="resolveTicket(${ticket.id})" class="px-2.5 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-bold text-[11px] transition">تم الحل</button>
                </td>
            </tr>`;
    });
}

function renderTopClinics() {
    const container = document.getElementById('topClinicsList');
    if (!container) return;
    container.innerHTML = "";
    let sorted = [...clinics].sort((a,b) => b.bookings - a.bookings);
    sorted.forEach((c, index) => {
        container.innerHTML += `
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div class="flex items-center gap-3">
                    <span class="text-xs font-bold text-gray-400 font-mono">0${index+1}</span>
                    <span class="text-xs font-bold text-gray-800">${c.name}</span>
                </div>
                <span class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">${c.bookings} حجزاً</span>
            </div>`;
    });
}

function renderAuditLogs() {
    const container = document.getElementById('logsList');
    if (!container) return;
    container.innerHTML = "";
    auditLogs.slice().reverse().forEach(log => {
        container.innerHTML += `
            <div class="border-b border-gray-100 pb-1.5 flex gap-2 items-start text-xs">
                <span class="text-gray-400 shrink-0 font-mono">[${log.time}]</span>
                <span class="text-gray-700 font-medium">${log.text}</span>
            </div>`;
    });
}

// ==========================================
// 5. إدارة النوافذ والعمليات التفاعلية (Modals & Actions)
// ==========================================
function openPlanModal(id) {
    let clinic = clinics.find(c => c.id === id);
    if (clinic) {
        currentTargetClinicId = id;
        document.getElementById('modalTitle').textContent = `تعديل خطة الاشتراك لـ - ${clinic.name}`;
        document.getElementById('planSelect').value = clinic.plan;
        if (document.getElementById('clinicTypeSelect')) {
            document.getElementById('clinicTypeSelect').value = clinic.type || "GENERAL";
        }
        document.getElementById('planModal').style.display = 'flex'; 
    }
}

function closeModal() {
    document.getElementById('planModal').style.display = 'none';
    currentTargetClinicId = null;
}

async function savePlanChanges() {
    let clinic = clinics.find(c => c.id === currentTargetClinicId);
    if (clinic) {
        let newPlan = document.getElementById('planSelect').value;
        let newType = document.getElementById('clinicTypeSelect').value;
        
        let confirmed = await showSystemConfirm("تغيير باقة الاشتراك", `تأكيد تغيير باقة ونوع نظام عيادة (${clinic.name})؟`);
        if (!confirmed) return;

        clinic.plan = newPlan;
        clinic.type = newType;

        localStorage.setItem('clinicType', JSON.stringify(newType));

        let today = new Date();
        if (newPlan === "شهري") today.setDate(today.getDate() + 30);
        else if (newPlan === "3 أشهر") today.setDate(today.getDate() + 90);
        else if (newPlan === "نصف سنوي") today.setDate(today.getDate() + 180);
        else if (newPlan === "سنوي") today.setDate(today.getDate() + 365);
        clinic.expiry = today.toISOString().split('T')[0];

        logAction(`تم تحديث خطة ونوع منظومة (${clinic.name}) إلى الباقة [${newPlan}] والنوع [${newType}].`);
        saveSuperState();
        closeModal();
        initDashboard();
    }
}

function openAddClinicModal() {
    document.getElementById('addClinicForm').reset();
    document.getElementById('addClinicModal').style.display = 'flex';
}

function closeAddClinicModal() {
    document.getElementById('addClinicModal').style.display = 'none';
}

async function saveNewClinic(event) {
    event.preventDefault();

    const name = document.getElementById('newClinicName').value;
    const category = document.getElementById('newClinicCategory').value;
    const type = document.getElementById('newClinicType').value;
    const manager = document.getElementById('newClinicManager').value;
    const phone = document.getElementById('newClinicPhone').value;
    const plan = document.getElementById('newClinicPlan').value;
    const status = document.getElementById('newClinicStatus').value;

    let confirmed = await showSystemConfirm(
        "تأكيد عقد الاشتراك",
        `هل تريد إضافة المنشأة الجديدة (${name}) وتثبيت رخصتها البرمجية بالمنظومة؟`
    );

    if (confirmed) {
        let today = new Date();
        if (plan === "3 أشهر") today.setDate(today.getDate() + 90);
        else if (plan === "نصف سنوي") today.setDate(today.getDate() + 180);
        else if (plan === "سنوي") today.setDate(today.getDate() + 365);
        else today.setDate(today.getDate() + 30);

        const newClinic = {
            id: (clinics.length > 0 ? Math.max(...clinics.map(c => c.id)) + 1 : 1),
            name: name,
            category: category,
            type: type,
            manager: manager,
            phone: phone,
            plan: plan,
            status: status,
            expiry: today.toISOString().split('T')[0],
            bookings: 0,
            extendedThisYear: false
        };

        clinics.push(newClinic);
        localStorage.setItem('clinicType', JSON.stringify(type));

        logAction(`تم تسجيل رخصة منشأة جديدة باسم (${name}) بنجاح بنوع نظام [${type}].`);
        saveSuperState();
        closeAddClinicModal();
        initDashboard();
    }
}

async function extendClinicTime(id) {
    let clinic = clinics.find(c => c.id === id);
    if (clinic) {
        if (clinic.extendedThisYear) {
            logAction(`⚠️ محاولة تمديد مرفوضة: المنشأة (${clinic.name}) استهلكت التمديد السنوي.`);
            await showSystemConfirm(
                "إجراء غير مسموح به", 
                `عذراً، المنشأة (${clinic.name}) حصلت على التمديد المتاح لها لهذا العام بالفعل.`,
                true
            );
            return;
        }

        let confirmed = await showSystemConfirm(
            "تأكيد تمديد المهلة (مرة واحدة في السنة)", 
            `هل أنت متأكد من تمديد المهلة لـ (${clinic.name}) لمدة أسبوع؟`
        );
        
        if (confirmed) {
            clinic.status = "فترة السماح";
            let currentExpiry = new Date(clinic.expiry);
            let today = new Date();
            let baseDate = (currentExpiry > today) ? currentExpiry : today;
            
            baseDate.setDate(baseDate.getDate() + 7);
            clinic.expiry = baseDate.toISOString().split('T')[0]; 
            clinic.extendedThisYear = true;
            
            logAction(`✅ تم تمديد المهلة السنوية لـ (${clinic.name}). التاريخ الجديد: ${clinic.expiry}`);
            saveSuperState();
            initDashboard();
        }
    }
}

async function deleteClinic(id) {
    let clinic = clinics.find(c => c.id === id);
    if (clinic) {
        let confirmed = await showSystemConfirm("حذف منشأة", `هل أنت متأكد من حذف حساب (${clinic.name}) نهائياً؟`);
        if (confirmed) {
            clinics = clinics.filter(c => c.id !== id);
            logAction(`❌ تم حذف (${clinic.name}) من النظام.`);
            saveSuperState();
            initDashboard();
        }
    }
}

async function resolveTicket(id) {
    let ticket = supportTickets.find(t => t.id === id);
    if (ticket) {
        let confirmed = await showSystemConfirm("تأكيد حل الشكوى", `هل أنت متأكد من إغلاق التذكرة الخاصة بـ (${ticket.clinicName})؟`);
        if (confirmed) {
            logAction(`تم إغلاق تذكرة الدعم الفني لـ (${ticket.clinicName}).`);
            supportTickets = supportTickets.filter(t => t.id !== id);
            saveSuperState();
            initDashboard();
        }
    }
}

function logAction(text) {
    let now = new Date();
    let timeStr = now.toTimeString().split(' ')[0];
    auditLogs.push({ time: timeStr, text: text });
    saveSuperState();
    renderAuditLogs();
}

// التوجيه الفوري والذكي لملفات العيادات المظلمة دون التعرض لحظر المتصفحات
function loginToClinic(id, type) {
    let clinic = clinics.find(c => c.id === id);
    let finalType = type;
    
    // فحص ذكي: إذا كانت العيادة مسجلة بنوع قديم بالمتصفح، يتم تصحيح مسارها فوراً بناءً على القسم الفعلي لها
    if ((type === "GENERAL" || !type) && clinic) {
        if (clinic.category === "أسنان") finalType = "DENTAL";
        else if (clinic.category === "أطفال") finalType = "PEDIATRICS";
        else if (clinic.category === "عام وباطنية") finalType = "INTERNAL";
        else if (clinic.category === "جلدية وليزر") finalType = "DERMA_LASER";
    }
    
    localStorage.setItem('clinicType', JSON.stringify(finalType));
    logAction(`قام السوبر أدمن بالدخول المباشر إلى المنشأة معرف رقم #${id}.`);
    
    // التحويل الفوري في نفس التبويب لضمان تخطي جدار حظر الـ Popups الكودية بالمتصفح
    if (finalType === "DERMA_LASER") {
        window.location.href = 'clinic-admin.html';
    } else if (finalType === "DENTAL") {
        window.location.href = 'clinic-dental.html';
    } else if (finalType === "PEDIATRICS") {
        window.location.href = 'clinic-pediatrics.html';
    } else if (finalType === "INTERNAL") {
        window.location.href = 'clinic-internal.html';
    } else if (finalType === "LAB") {
        window.location.href = 'clinic-lab.html';
    } else {
        window.location.href = 'clinic-admin.html';
    }
}

// ==========================================
// 6. نظام رسائل التأكيد المخصصة بالتطبيق
// ==========================================
function showSystemConfirm(title, message, isAlertOnly = false) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        const box = document.getElementById('confirmBox');
        const cancelBtn = document.getElementById('confirmCancelBtn');
        const successBtn = document.getElementById('confirmSuccessBtn');
        
        if (document.getElementById('confirmTitle')) document.getElementById('confirmTitle').textContent = title;
        if (document.getElementById('confirmMessage')) document.getElementById('confirmMessage').textContent = message;
        
        if (cancelBtn) cancelBtn.style.display = isAlertOnly ? 'none' : 'inline-block';

        if (modal) modal.style.display = 'flex';
        setTimeout(() => {
            if (box) {
                box.classList.remove('scale-95', 'opacity-0');
                box.classList.add('scale-100', 'opacity-100');
            }
        }, 10);

        const handleConfirm = () => { cleanup(); resolve(true); };
        const handleCancel = () => { cleanup(); resolve(false); };
        
        const cleanup = () => {
            if (box) {
                box.classList.remove('scale-100', 'opacity-100');
                box.classList.add('scale-95', 'opacity-0');
            }
            setTimeout(() => { if (modal) modal.style.display = 'none'; }, 200);
            if (successBtn) successBtn.removeEventListener('click', handleConfirm);
            if (cancelBtn) cancelBtn.removeEventListener('click', handleCancel);
        };

        if (successBtn) successBtn.addEventListener('click', handleConfirm, { once: true });
        if (cancelBtn) cancelBtn.addEventListener('click', handleCancel, { once: true });
    });
}

// تشغيل النظام تلقائياً
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboard);
} else {
    initDashboard();
}