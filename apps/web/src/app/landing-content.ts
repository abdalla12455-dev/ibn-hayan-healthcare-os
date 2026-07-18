/**
 * Static landing-page content for the Ibn Hayan Healthcare Operating System.
 *
 * This module contains presentation-only constants. It holds no business
 * logic, performs no network requests, and reads no environment variables.
 * The canonical implementation label is enforced as a constant so that it
 * cannot drift between the English and Arabic surfaces.
 */

export const CANONICAL_IMPLEMENTATION_LABEL_EN =
  "Canonical implementation" as const;

export const CANONICAL_IMPLEMENTATION_LABEL_AR =
  "التنفيذ المرجعي" as const;

export interface LandingCopyEntry {
  readonly lang: "en" | "ar";
  readonly dir: "ltr" | "rtl";
  readonly systemName: string;
  readonly implementationStatusLabel: string;
  readonly foundationStatusHeading: string;
  readonly foundationStatusBody: string;
  readonly canonicalNoteHeading: string;
  readonly canonicalNoteBody: string;
  readonly prototypeNote: string;
}

export const LANDING_COPY: readonly LandingCopyEntry[] = [
  {
    lang: "en",
    dir: "ltr",
    systemName: "Ibn Hayan Healthcare Operating System",
    implementationStatusLabel: CANONICAL_IMPLEMENTATION_LABEL_EN,
    foundationStatusHeading: "Implementation foundation operational",
    foundationStatusBody:
      "The pnpm monorepo, the Next.js thin web client, the NestJS backend, and the ratified shared-package structure have been scaffolded. The first vertical slice is not yet implemented.",
    canonicalNoteHeading: "This is the canonical implementation",
    canonicalNoteBody:
      "This page belongs to the canonical Ibn Hayan Healthcare Operating System. The earlier MediFlow prototypes remain in the repository as reference material only; they are not part of the canonical implementation and their source is not ported here.",
    prototypeNote:
      "MediFlow and MediFlow Pro are reference-only prototypes and are not used by this surface.",
  },
  {
    lang: "ar",
    dir: "rtl",
    systemName: "نظام ابن حيان التشغيلي للرعاية الصحية",
    implementationStatusLabel: CANONICAL_IMPLEMENTATION_LABEL_AR,
    foundationStatusHeading: "أساس التنفيذ التشغيلي جاهز",
    foundationStatusBody:
      "تمت تهيئة مستودع pnpm المتعدد الحزم، وعميل الويب الرفيع المستند إلى Next.js، والخادم المستند إلى NestJS، وهيكل الحزم المشتركة المعتمد. لم يُنفَّذ الشريحة الرأسية الأولى بعد.",
    canonicalNoteHeading: "هذا هو التنفيذ المرجعي",
    canonicalNoteBody:
      "تنتمي هذه الصفحة إلى نظام ابن حيان التشغيلي المرجعي للرعاية الصحية. تظل نماذج MediFlow السابقة في المستودع كمراجع فقط، ولا تُعد جزءًا من التنفيذ المرجعي، ولم يُنقل كودها إلى هنا.",
    prototypeNote:
      "نماذج MediFlow و MediFlow Pro هي نماذج مرجعية فقط ولا تُستخدم في هذه الواجهة.",
  },
] as const;
