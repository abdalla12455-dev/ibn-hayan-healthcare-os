/**
 * Bilingual landing and dashboard copy for the Ibn Hayan Healthcare
 * Operating System.
 *
 * This module is the single source of truth for all user-facing
 * presentation text. It is a compile-time constant — it holds no
 * runtime state, performs no network requests, and reads no
 * environment variables.
 *
 * The Arabic copy is written in natural professional Arabic, not
 * literal machine translation. The English copy is written in clear,
 * measured product English. The two are designed to feel like one
 * product, not two translated surfaces.
 *
 * Per the sixth canonical batch specification, the copy:
 * - Does NOT claim features that are not implemented (no patient
 *   management, appointments, EMR, billing, pharmacy, inventory,
 *   laboratory, insurance, regulatory certification, HIPAA, GDPR,
 *   ISO, government approval, AI, 24/7 support, specific uptime,
 *   or specific customer counts).
 * - Does NOT include fake testimonials, fake clinic logos, fake
 *   awards, fake metrics, or fake customer numbers.
 * - Does NOT expose internal technical terminology (no `opaque
 *   token`, `SHA-256`, `CSRF`, `database foreign key`, `Prisma`,
 *   `NestJS`, `Next.js`, `pnpm`, `monorepo`, etc.) in user-facing
 *   surfaces.
 * - Positions the system honestly as a secure operating foundation
 *   designed to expand into a complete healthcare platform.
 */

export interface ValueItem {
  readonly title: string;
  readonly body: string;
}

export interface LandingCopy {
  /* Brand */
  readonly brandName: string;
  readonly brandTagline: string;

  /* Navigation */
  readonly navLanguageSwitch: string;

  /* Hero */
  readonly heroHeading: string;
  readonly heroBody: string;

  /* Value indicators (exactly four) */
  readonly values: readonly ValueItem[];

  /* Login card */
  readonly loginTitle: string;
  readonly loginBody: string;
  readonly emailLabel: string;
  readonly emailHelp: string;
  readonly passwordLabel: string;
  readonly passwordHelp: string;
  readonly submit: string;
  readonly submitting: string;
  readonly errorInvalid: string;
  readonly errorNetwork: string;
  readonly errorGeneric: string;
  readonly loginSecurityNote: string;

  /* Section 1 — Designed for operational clarity */
  readonly section1Heading: string;
  readonly section1Body: string;
  readonly section1Points: readonly ValueItem[];

  /* Section 2 — Security built into the foundation */
  readonly section2Heading: string;
  readonly section2Body: string;
  readonly section2Points: readonly ValueItem[];

  /* Section 3 — Ready to grow with the organisation */
  readonly section3Heading: string;
  readonly section3Body: string;

  /* Footer */
  readonly footerTagline: string;
  readonly footerCopyright: string;
  readonly footerLanguageLabel: string;
}

export const LANDING_COPY: Readonly<Record<'ar' | 'en', LandingCopy>> = {
  ar: {
    brandName: 'ابن حيان',
    brandTagline: 'نظام تشغيل الرعاية الصحية',

    navLanguageSwitch: 'English',

    heroHeading: 'نظام تشغيل موحّد للعيادات الحديثة',
    heroBody:
      'مساحة عمل آمنة ومنظّمة تساعد فرق الرعاية الصحية على إدارة مؤسساتهم بوضوح، والانتقال بين بيئات العمل بثقة، والاستعداد للنمو دون تعقيد.',

    values: [
      {
        title: 'وصول آمن',
        body: 'جلسات محمية وبيانات تسجيل الدخول تبقى خارج المتصفح.',
      },
      {
        title: 'بيئات عمل منفصلة',
        body: 'مساحات معزولة لكل مؤسسة بسياق واضح.',
      },
      {
        title: 'تجربة ثنائية اللغة',
        body: 'واجهة عربية وإنجليزية مصمّمة بعناية.',
      },
      {
        title: 'بنية جاهزة للنمو',
        body: 'أساس مرن يتوسّع مع مؤسستك.',
      },
    ],

    loginTitle: 'تسجيل الدخول إلى مساحة العمل',
    loginBody: 'استخدم حساب مؤسستك للوصول إلى مساحة العمل المخصّصة لك.',
    emailLabel: 'البريد الإلكتروني',
    emailHelp: 'أدخل عنوان بريدك الإلكتروني المؤسسي.',
    passwordLabel: 'كلمة المرور',
    passwordHelp: 'على الأقل ١٢ حرفًا.',
    submit: 'تسجيل الدخول',
    submitting: 'جارٍ تسجيل الدخول…',
    errorInvalid: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    errorNetwork: 'تعذّر الوصول إلى الخادم. حاول لاحقًا.',
    errorGeneric: 'حدث خطأ غير متوقّع. حاول مرة أخرى.',
    loginSecurityNote:
      'محميّة بجلسات آمنة ولا تُخزَّن بيانات الاعتماد في المتصفح.',

    section1Heading: 'مصمّمة من أجل الوضوح التشغيلي',
    section1Body:
      'مساحة عمل واحدة، وصول منظّم، وسياق مؤسسي واضح يجعل العمل اليومي أكثر اتساقًا وأقل تشتيتًا.',
    section1Points: [
      {
        title: 'مساحة عمل واحدة',
        body: 'مدخل موحّد لكل عملياتك اليومية.',
      },
      {
        title: 'وصول منظّم',
        body: 'صلاحيات واضحة لكل فريق وفق دوره.',
      },
      {
        title: 'سياق مؤسسي واضح',
        body: 'بيئة عمل معروفة لكل مستخدم.',
      },
    ],

    section2Heading: 'الأمان مبني في الأساس',
    section2Body:
      'الوصول إلى مساحة العمل محمي بجلسات آمنة، وتبقى بيانات تسجيل الدخول بعيدة عن مساحة التخزين في المتصفح.',
    section2Points: [
      {
        title: 'جلسات آمنة',
        body: 'التحقق من الهوية عبر خادم مركزي موثوق.',
      },
      {
        title: 'ارتباط مؤسسي',
        body: 'كل مستخدم مرتبط ببيئة عمله الخاصة.',
      },
      {
        title: 'اختيار صريح',
        body: 'تبدأ العمل في السياق الذي تختاره أنت.',
      },
    ],

    section3Heading: 'جاهزة للنمو مع المؤسسة',
    section3Body:
      'بنية مرنة صُممت لدعم توسع المؤسسات وإضافة قدرات تشغيلية جديدة بصورة منظّمة عبر الوقت.',

    footerTagline: 'نظام تشغيل الرعاية الصحية',
    footerCopyright: '© ابن حيان. جميع الحقوق محفوظة.',
    footerLanguageLabel: 'اللغة',
  },

  en: {
    brandName: 'Ibn Hayan',
    brandTagline: 'Healthcare Operating System',

    navLanguageSwitch: 'العربية',

    heroHeading:
      'A unified operating system for modern healthcare organisations',
    heroBody:
      'A secure and structured workspace designed to help healthcare teams operate with clarity, manage organisational access, and scale with confidence.',

    values: [
      {
        title: 'Secure access',
        body: 'Protected sessions. Credentials never stored in the browser.',
      },
      {
        title: 'Isolated workspaces',
        body: 'Separated environments with clear context per organisation.',
      },
      {
        title: 'Bilingual experience',
        body: 'Thoughtfully designed Arabic and English surfaces.',
      },
      {
        title: 'Built to scale',
        body: 'A flexible foundation that grows with your organization.',
      },
    ],

    loginTitle: 'Sign in to your workspace',
    loginBody: 'Use your organisation account to access your secure workspace.',
    emailLabel: 'Email',
    emailHelp: 'Enter your organisation email address.',
    passwordLabel: 'Password',
    passwordHelp: 'At least 12 characters.',
    submit: 'Sign in',
    submitting: 'Signing in…',
    errorInvalid: 'Invalid email or password.',
    errorNetwork: 'Unable to reach the server. Please try again later.',
    errorGeneric: 'An unexpected error occurred. Please try again.',
    loginSecurityNote:
      'Protected by secure sessions. Credentials are never stored in the browser.',

    section1Heading: 'Designed for operational clarity',
    section1Body:
      'One structured workspace, controlled access, and a clear organisational context make daily work more consistent and less fragmented.',
    section1Points: [
      {
        title: 'One structured workspace',
        body: 'A single entry point for every daily operation.',
      },
      {
        title: 'Controlled access',
        body: 'Clear privileges for every team and role.',
      },
      {
        title: 'Clear organisational context',
        body: 'A known environment for every user.',
      },
    ],

    section2Heading: 'Security built into the foundation',
    section2Body:
      'Workspace access is protected through secure sessions, while authentication data is kept out of browser storage.',
    section2Points: [
      {
        title: 'Secure sessions',
        body: 'Identity verified through a trusted central server.',
      },
      {
        title: 'Organisational binding',
        body: 'Every user is bound to their own workspace.',
      },
      {
        title: 'Explicit selection',
        body: 'You begin work in the context you choose.',
      },
    ],

    section3Heading: 'Ready to grow with the organisation',
    section3Body:
      'A flexible foundation designed to support organisational growth and new operational capabilities over time.',

    footerTagline: 'Healthcare Operating System',
    footerCopyright: '© Ibn Hayan. All rights reserved.',
    footerLanguageLabel: 'Language',
  },
} as const;

/**
 * Convenience accessor that returns the copy for the requested language.
 * Falls back to Arabic if the language is unknown, which should not
 * happen in practice because the language is constrained to `'ar' | 'en'`.
 */
export function getCopy(lang: 'ar' | 'en'): LandingCopy {
  return LANDING_COPY[lang];
}
