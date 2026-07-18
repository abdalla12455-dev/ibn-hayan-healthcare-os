/* ==========================================================================
   MediFlow — i18n
   Bilingual (English / Arabic) translation dictionary with RTL handling.
   ========================================================================== */
(function (global) {
  'use strict';

  const translations = {
    en: {
      // App
      'app.name': 'MediFlow',
      'app.tagline': 'Clinic Management Platform',
      'app.super_admin': 'Super Admin Console',

      // Nav - Overview
      'nav.overview': 'Overview',
      'nav.analytics': 'Analytics',
      'nav.activity': 'Activity Log',

      // Nav - Management
      'nav.management': 'Management',
      'nav.clinics': 'Clinics',
      'nav.subscriptions': 'Subscriptions',
      'nav.plans': 'Plans & Pricing',
      'nav.billing': 'Billing',

      // Nav - System
      'nav.system': 'System',
      'nav.settings': 'Settings',
      'nav.team': 'Team Members',
      'nav.integrations': 'Integrations',

      // Common
      'common.search': 'Search...',
      'common.search_global': 'Search clinics, patients, settings...',
      'common.actions': 'Actions',
      'common.status': 'Status',
      'common.type': 'Type',
      'common.plan': 'Plan',
      'common.owner': 'Owner',
      'common.location': 'Location',
      'common.created': 'Created',
      'common.last_active': 'Last active',
      'common.patients': 'Patients',
      'common.staff': 'Staff',
      'common.revenue': 'Revenue',
      'common.mrr': 'MRR',
      'common.storage': 'Storage',
      'common.name': 'Name',
      'common.email': 'Email',
      'common.phone': 'Phone',
      'common.country': 'Country',
      'common.city': 'City',
      'common.address': 'Address',
      'common.specialty': 'Specialty',
      'common.id': 'ID',
      'common.date': 'Date',
      'common.amount': 'Amount',
      'common.clinic': 'Clinic',
      'common.all': 'All',
      'common.view_all': 'View all',
      'common.view_details': 'View details',
      'common.add_new': 'Add new',
      'common.create': 'Create',
      'common.save': 'Save changes',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.archive': 'Archive',
      'common.restore': 'Restore',
      'common.export': 'Export',
      'common.import': 'Import',
      'common.filter': 'Filter',
      'common.sort': 'Sort',
      'common.prev': 'Previous',
      'common.next': 'Next',
      'common.page': 'Page',
      'common.of': 'of',
      'common.results': 'results',
      'common.no_results': 'No results found',
      'common.no_data': 'No data available',
      'common.loading': 'Loading...',
      'common.confirm': 'Confirm',
      'common.yes': 'Yes',
      'common.no': 'No',
      'common.active': 'Active',
      'common.suspended': 'Suspended',
      'common.trial': 'Trial',
      'common.expired': 'Expired',
      'common.popular': 'Most popular',
      'common.per_month': '/mo',
      'common.upgrade': 'Upgrade',
      'common.downgrade': 'Downgrade',
      'common.renew': 'Renew',
      'common.cancel_sub': 'Cancel subscription',
      'common.view_plans': 'View plans',
      'common.contact_sales': 'Contact sales',
      'common.start_trial': 'Start free trial',
      'common.choose_plan': 'Choose plan',
      'common.current_plan': 'Current plan',
      'common.months_free': 'months free',

      // Status
      'status.active': 'Active',
      'status.suspended': 'Suspended',
      'status.trial': 'Trial',
      'status.expired': 'Expired',
      'status.pending': 'Pending',
      'status.cancelled': 'Cancelled',

      // Overview page
      'overview.title': 'Overview',
      'overview.subtitle': "Welcome back. Here's what's happening across your clinics today.",
      'overview.total_clinics': 'Total Clinics',
      'overview.active_clinics': 'Active Clinics',
      'overview.total_patients': 'Total Patients',
      'overview.total_revenue': 'Monthly Recurring Revenue',
      'overview.revenue_chart': 'Revenue Growth',
      'overview.revenue_chart_subtitle': 'Monthly recurring revenue over the last 12 months',
      'overview.clinic_distribution': 'Clinics by Specialty',
      'overview.clinic_distribution_subtitle': 'Patient distribution across specialties',
      'overview.recent_activity': 'Recent Activity',
      'overview.top_clinics': 'Top Performing Clinics',
      'overview.top_clinics_subtitle': 'Ranked by patient volume',
      'overview.storage_usage': 'Storage Usage',
      'overview.storage_usage_subtitle': 'Aggregated storage across all clinics',
      'overview.system_health': 'System Health',
      'overview.uptime': 'Uptime',
      'overview.api_response': 'API Response',
      'overview.active_sessions': 'Active Sessions',
      'overview.pending_alerts': 'Pending Alerts',

      // Clinics page
      'clinics.title': 'Clinics',
      'clinics.subtitle': 'Manage all clinics on the MediFlow platform',
      'clinics.add_clinic': 'Add Clinic',
      'clinics.search_placeholder': 'Search by name, owner, or city...',
      'clinics.filter_status': 'All statuses',
      'clinics.filter_type': 'All types',
      'clinics.filter_plan': 'All plans',
      'clinics.empty_title': 'No clinics found',
      'clinics.empty_text': 'Try adjusting your filters or add a new clinic to get started.',
      'clinics.add_modal_title': 'Register New Clinic',
      'clinics.edit_modal_title': 'Edit Clinic',
      'clinics.delete_confirm': 'Are you sure you want to delete this clinic? This action cannot be undone.',
      'clinics.view_portal': 'Open Clinic Portal',
      'clinics.suspend': 'Suspend',
      'clinics.activate': 'Activate',
      'clinics.selected': 'selected',
      'clinics.bulk_suspend': 'Suspend selected',
      'clinics.bulk_activate': 'Activate selected',
      'clinics.bulk_delete': 'Delete selected',

      // Specialty types
      'type.dental': 'Dental',
      'type.laser': 'Derma / Laser',
      'type.lab': 'Laboratory',
      'type.pediatrics': 'Pediatrics',
      'type.internal': 'Internal Medicine',

      // Plans
      'plans.title': 'Plans & Pricing',
      'plans.subtitle': 'Define subscription tiers available to clinics',
      'plans.add_plan': 'Add Plan',
      'plans.starter': 'Starter',
      'plans.pro': 'Professional',
      'plans.enterprise': 'Enterprise',
      'plans.subscribers': 'subscribers',
      'plans.features': 'Features',
      'plans.limits': 'Limits',

      // Subscriptions
      'subs.title': 'Subscriptions',
      'subs.subtitle': 'View and manage all clinic subscriptions',
      'subs.current_mrr': 'Current MRR',
      'subs.active_subs': 'Active Subscriptions',
      'subs.trial_subs': 'On Trial',
      'subs.churned': 'Churned (30d)',
      'subs.search_placeholder': 'Search by clinic or owner...',

      // Analytics
      'analytics.title': 'Analytics',
      'analytics.subtitle': 'Deep insights into platform performance',
      'analytics.revenue_trend': 'Revenue Trend',
      'analytics.patient_growth': 'Patient Growth',
      'analytics.clinic_growth': 'Clinic Acquisition',
      'analytics.by_country': 'Clinics by Country',
      'analytics.by_specialty': 'Revenue by Specialty',
      'analytics.usage_metrics': 'Usage Metrics',
      'analytics.avg_session': 'Avg. Session Duration',
      'analytics.appointments': 'Appointments (30d)',
      'analytics.prescriptions': 'Prescriptions (30d)',
      'analytics.lab_tests': 'Lab Tests (30d)',

      // Activity
      'activity.title': 'Activity Log',
      'activity.subtitle': 'Audit trail of all platform events',
      'activity.all_events': 'All events',
      'activity.clinic_events': 'Clinic events',
      'activity.billing_events': 'Billing events',
      'activity.system_events': 'System events',
      'activity.actor': 'Actor',
      'activity.event': 'Event',
      'activity.timestamp': 'Timestamp',

      // Settings
      'settings.title': 'Settings',
      'settings.subtitle': 'Configure your Super Admin console',
      'settings.general': 'General',
      'settings.profile': 'Profile',
      'settings.security': 'Security',
      'settings.notifications': 'Notifications',
      'settings.appearance': 'Appearance',
      'settings.language': 'Language',
      'settings.theme': 'Theme',
      'settings.theme_light': 'Light',
      'settings.theme_dark': 'Dark',
      'settings.timezone': 'Timezone',
      'settings.full_name': 'Full name',
      'settings.email_address': 'Email address',
      'settings.role': 'Role',
      'settings.change_password': 'Change password',
      'settings.two_factor': 'Two-factor authentication',
      'settings.two_factor_desc': 'Add an extra layer of security to your account',
      'settings.save_changes': 'Save changes',

      // Toast messages
      'toast.clinic_created': 'Clinic registered successfully',
      'toast.clinic_updated': 'Clinic updated successfully',
      'toast.clinic_deleted': 'Clinic deleted',
      'toast.clinic_suspended': 'Clinic has been suspended',
      'toast.clinic_activated': 'Clinic has been activated',
      'toast.plan_updated': 'Plan updated successfully',
      'toast.settings_saved': 'Settings saved',
      'toast.error': 'Something went wrong. Please try again.',

      // Time
      'time.just_now': 'just now',
      'time.minutes_ago': 'minutes ago',
      'time.hours_ago': 'hours ago',
      'time.days_ago': 'days ago',
      'time.weeks_ago': 'weeks ago',
      'time.months_ago': 'months ago'
    },

    ar: {
      // App
      'app.name': 'ميدي فلو',
      'app.tagline': 'منصة إدارة العيادات',
      'app.super_admin': 'لوحة تحكم المسؤول',

      // Nav - Overview
      'nav.overview': 'نظرة عامة',
      'nav.analytics': 'التحليلات',
      'nav.activity': 'سجل النشاط',

      // Nav - Management
      'nav.management': 'الإدارة',
      'nav.clinics': 'العيادات',
      'nav.subscriptions': 'الاشتراكات',
      'nav.plans': 'الباقات والأسعار',
      'nav.billing': 'الفوترة',

      // Nav - System
      'nav.system': 'النظام',
      'nav.settings': 'الإعدادات',
      'nav.team': 'أعضاء الفريق',
      'nav.integrations': 'التكاملات',

      // Common
      'common.search': 'بحث...',
      'common.search_global': 'ابحث في العيادات والمرضى والإعدادات...',
      'common.actions': 'إجراءات',
      'common.status': 'الحالة',
      'common.type': 'النوع',
      'common.plan': 'الباقة',
      'common.owner': 'المالك',
      'common.location': 'الموقع',
      'common.created': 'تاريخ الإنشاء',
      'common.last_active': 'آخر نشاط',
      'common.patients': 'المرضى',
      'common.staff': 'الموظفون',
      'common.revenue': 'الإيرادات',
      'common.mrr': 'الإيراد الشهري المتكرر',
      'common.storage': 'التخزين',
      'common.name': 'الاسم',
      'common.email': 'البريد الإلكتروني',
      'common.phone': 'الهاتف',
      'common.country': 'الدولة',
      'common.city': 'المدينة',
      'common.address': 'العنوان',
      'common.specialty': 'التخصص',
      'common.id': 'المعرف',
      'common.date': 'التاريخ',
      'common.amount': 'المبلغ',
      'common.clinic': 'العيادة',
      'common.all': 'الكل',
      'common.view_all': 'عرض الكل',
      'common.view_details': 'عرض التفاصيل',
      'common.add_new': 'إضافة جديد',
      'common.create': 'إنشاء',
      'common.save': 'حفظ التغييرات',
      'common.cancel': 'إلغاء',
      'common.delete': 'حذف',
      'common.edit': 'تعديل',
      'common.archive': 'أرشفة',
      'common.restore': 'استعادة',
      'common.export': 'تصدير',
      'common.import': 'استيراد',
      'common.filter': 'تصفية',
      'common.sort': 'ترتيب',
      'common.prev': 'السابق',
      'common.next': 'التالي',
      'common.page': 'صفحة',
      'common.of': 'من',
      'common.results': 'نتيجة',
      'common.no_results': 'لا توجد نتائج',
      'common.no_data': 'لا توجد بيانات',
      'common.loading': 'جارٍ التحميل...',
      'common.confirm': 'تأكيد',
      'common.yes': 'نعم',
      'common.no': 'لا',
      'common.active': 'نشط',
      'common.suspended': 'معلق',
      'common.trial': 'تجريبي',
      'common.expired': 'منتهي',
      'common.popular': 'الأكثر شيوعاً',
      'common.per_month': '/شهر',
      'common.upgrade': 'ترقية',
      'common.downgrade': 'تخفيض',
      'common.renew': 'تجديد',
      'common.cancel_sub': 'إلغاء الاشتراك',
      'common.view_plans': 'عرض الباقات',
      'common.contact_sales': 'تواصل مع المبيعات',
      'common.start_trial': 'ابدأ تجربة مجانية',
      'common.choose_plan': 'اختر باقة',
      'common.current_plan': 'الباقة الحالية',
      'common.months_free': 'أشهر مجانية',

      // Status
      'status.active': 'نشط',
      'status.suspended': 'معلق',
      'status.trial': 'تجريبي',
      'status.expired': 'منتهي',
      'status.pending': 'قيد الانتظار',
      'status.cancelled': 'ملغى',

      // Overview page
      'overview.title': 'نظرة عامة',
      'overview.subtitle': 'مرحباً بعودتك. إليك ما يحدث في عياداتك اليوم.',
      'overview.total_clinics': 'إجمالي العيادات',
      'overview.active_clinics': 'العيادات النشطة',
      'overview.total_patients': 'إجمالي المرضى',
      'overview.total_revenue': 'الإيراد الشهري المتكرر',
      'overview.revenue_chart': 'نمو الإيرادات',
      'overview.revenue_chart_subtitle': 'الإيراد الشهري المتكرر خلال آخر 12 شهراً',
      'overview.clinic_distribution': 'العيادات حسب التخصص',
      'overview.clinic_distribution_subtitle': 'توزيع المرضى عبر التخصصات',
      'overview.recent_activity': 'النشاط الأخير',
      'overview.top_clinics': 'أفضل العيادات أداءً',
      'overview.top_clinics_subtitle': 'مرتبة حسب عدد المرضى',
      'overview.storage_usage': 'استخدام التخزين',
      'overview.storage_usage_subtitle': 'إجمالي التخزين عبر جميع العيادات',
      'overview.system_health': 'صحة النظام',
      'overview.uptime': 'وقت التشغيل',
      'overview.api_response': 'استجابة API',
      'overview.active_sessions': 'الجلسات النشطة',
      'overview.pending_alerts': 'تنبيهات معلقة',

      // Clinics page
      'clinics.title': 'العيادات',
      'clinics.subtitle': 'إدارة جميع العيادات على منصة ميدي فلو',
      'clinics.add_clinic': 'إضافة عيادة',
      'clinics.search_placeholder': 'ابحث بالاسم أو المالك أو المدينة...',
      'clinics.filter_status': 'جميع الحالات',
      'clinics.filter_type': 'جميع الأنواع',
      'clinics.filter_plan': 'جميع الباقات',
      'clinics.empty_title': 'لا توجد عيادات',
      'clinics.empty_text': 'حاول تعديل عوامل التصفية أو أضف عيادة جديدة للبدء.',
      'clinics.add_modal_title': 'تسجيل عيادة جديدة',
      'clinics.edit_modal_title': 'تعديل العيادة',
      'clinics.delete_confirm': 'هل أنت متأكد من حذف هذه العيادة؟ لا يمكن التراجع عن هذا الإجراء.',
      'clinics.view_portal': 'فتح بوابة العيادة',
      'clinics.suspend': 'تعليق',
      'clinics.activate': 'تنشيط',
      'clinics.selected': 'محدد',
      'clinics.bulk_suspend': 'تعليق المحدد',
      'clinics.bulk_activate': 'تنشيط المحدد',
      'clinics.bulk_delete': 'حذف المحدد',

      // Specialty types
      'type.dental': 'أسنان',
      'type.laser': 'جلدية وليزر',
      'type.lab': 'مختبر',
      'type.pediatrics': 'أطفال',
      'type.internal': 'باطنة',

      // Plans
      'plans.title': 'الباقات والأسعار',
      'plans.subtitle': 'تحديد باقات الاشتراك المتاحة للعيادات',
      'plans.add_plan': 'إضافة باقة',
      'plans.starter': 'المبتدئة',
      'plans.pro': 'الاحترافية',
      'plans.enterprise': 'المؤسسات',
      'plans.subscribers': 'مشترك',
      'plans.features': 'المميزات',
      'plans.limits': 'الحدود',

      // Subscriptions
      'subs.title': 'الاشتراكات',
      'subs.subtitle': 'عرض وإدارة جميع اشتراكات العيادات',
      'subs.current_mrr': 'الإيراد الحالي',
      'subs.active_subs': 'الاشتراكات النشطة',
      'subs.trial_subs': 'في الفترة التجريبية',
      'subs.churned': 'متسربة (30 يوم)',
      'subs.search_placeholder': 'ابحث بالعيادة أو المالك...',

      // Analytics
      'analytics.title': 'التحليلات',
      'analytics.subtitle': 'رؤى معمقة حول أداء المنصة',
      'analytics.revenue_trend': 'اتجاه الإيرادات',
      'analytics.patient_growth': 'نمو المرضى',
      'analytics.clinic_growth': 'اكتساب العيادات',
      'analytics.by_country': 'العيادات حسب الدولة',
      'analytics.by_specialty': 'الإيرادات حسب التخصص',
      'analytics.usage_metrics': 'مقاييس الاستخدام',
      'analytics.avg_session': 'متوسط مدة الجلسة',
      'analytics.appointments': 'المواعيد (30 يوم)',
      'analytics.prescriptions': 'الوصفات الطبية (30 يوم)',
      'analytics.lab_tests': 'تحاليل المختبر (30 يوم)',

      // Activity
      'activity.title': 'سجل النشاط',
      'activity.subtitle': 'مسجل تدقيق لجميع أحداث المنصة',
      'activity.all_events': 'جميع الأحداث',
      'activity.clinic_events': 'أحداث العيادات',
      'activity.billing_events': 'أحداث الفوترة',
      'activity.system_events': 'أحداث النظام',
      'activity.actor': 'المُنفِّذ',
      'activity.event': 'الحدث',
      'activity.timestamp': 'الطابع الزمني',

      // Settings
      'settings.title': 'الإعدادات',
      'settings.subtitle': 'تكوين لوحة تحكم المسؤول',
      'settings.general': 'عام',
      'settings.profile': 'الملف الشخصي',
      'settings.security': 'الأمان',
      'settings.notifications': 'الإشعارات',
      'settings.appearance': 'المظهر',
      'settings.language': 'اللغة',
      'settings.theme': 'السمة',
      'settings.theme_light': 'فاتح',
      'settings.theme_dark': 'داكن',
      'settings.timezone': 'المنطقة الزمنية',
      'settings.full_name': 'الاسم الكامل',
      'settings.email_address': 'البريد الإلكتروني',
      'settings.role': 'الدور',
      'settings.change_password': 'تغيير كلمة المرور',
      'settings.two_factor': 'المصادقة الثنائية',
      'settings.two_factor_desc': 'أضف طبقة أمان إضافية لحسابك',
      'settings.save_changes': 'حفظ التغييرات',

      // Toast messages
      'toast.clinic_created': 'تم تسجيل العيادة بنجاح',
      'toast.clinic_updated': 'تم تحديث العيادة بنجاح',
      'toast.clinic_deleted': 'تم حذف العيادة',
      'toast.clinic_suspended': 'تم تعليق العيادة',
      'toast.clinic_activated': 'تم تنشيط العيادة',
      'toast.plan_updated': 'تم تحديث الباقة بنجاح',
      'toast.settings_saved': 'تم حفظ الإعدادات',
      'toast.error': 'حدث خطأ ما. حاول مرة أخرى.',

      // Time
      'time.just_now': 'الآن',
      'time.minutes_ago': 'دقيقة مضت',
      'time.hours_ago': 'ساعة مضت',
      'time.days_ago': 'يوم مضى',
      'time.weeks_ago': 'أسبوع مضى',
      'time.months_ago': 'شهر مضى'
    }
  };

  class I18n {
    constructor() {
      this._lang = DataService.getLang();
      this._applyDir();
    }

    t(key, fallback) {
      const dict = translations[this._lang] || translations.en;
      return dict[key] || translations.en[key] || fallback || key;
    }

    setLang(lang) {
      this._lang = lang;
      DataService.setLang(lang);
      this._applyDir();
      this._updateDOM();
    }

    getLang() {
      return this._lang;
    }

    isRTL() {
      return this._lang === 'ar';
    }

    _applyDir() {
      document.documentElement.setAttribute('lang', this._lang);
      document.documentElement.setAttribute('dir', this.isRTL() ? 'rtl' : 'ltr');
    }

    _updateDOM() {
      // Update all elements with data-i18n attribute
      document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = this.t(el.getAttribute('data-i18n'));
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.setAttribute('placeholder', this.t(el.getAttribute('data-i18n-placeholder')));
      });
      document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.setAttribute('title', this.t(el.getAttribute('data-i18n-title')));
      });
    }

    // Format relative time
    timeAgo(dateStr) {
      const date = new Date(dateStr);
      const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
      const intervals = [
        { secs: 31536000, key: 'time.months_ago', val: v => Math.floor(v) },
        { secs: 604800, key: 'time.weeks_ago', val: v => Math.floor(v) },
        { secs: 86400, key: 'time.days_ago', val: v => Math.floor(v) },
        { secs: 3600, key: 'time.hours_ago', val: v => Math.floor(v) },
        { secs: 60, key: 'time.minutes_ago', val: v => Math.floor(v) }
      ];
      for (const interval of intervals) {
        const v = seconds / interval.secs;
        if (v >= 1) {
          return `${interval.val(v)} ${this.t(interval.key)}`;
        }
      }
      return this.t('time.just_now');
    }

    formatCurrency(amount) {
      const symbol = '$';
      return `${symbol}${amount.toLocaleString('en-US')}`;
    }

    formatNumber(n) {
      return n.toLocaleString('en-US');
    }
  }

  global.I18n = new I18n();
})(window);
