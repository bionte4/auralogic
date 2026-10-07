export const SKILL_BANDS = ['FOUNDATION', 'PRACTITIONER', 'ADVANCED'] as const;
export const TRACKS = ['NETWORK', 'CYBERSECURITY', 'DATA_SCIENCE', 'AI', 'DATACENTER'] as const;
export const CONTENT_LOCALES = ['ID', 'EN'] as const;
export const PROJECT_KINDS = ['LAB_REPORT', 'ANALYSIS', 'DESIGN', 'NOTEBOOK'] as const;
export const LESSON_TYPES = ['VIDEO', 'READING', 'QUIZ'] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export type SkillBand = (typeof SKILL_BANDS)[number];
export type Track = (typeof TRACKS)[number];
export type ContentLocale = (typeof CONTENT_LOCALES)[number];
export type LessonType = (typeof LESSON_TYPES)[number];

export type CourseDraftError = 'title' | 'description' | 'band' | 'track' | 'locale' | 'price' | 'price-range';

export interface CourseDraft {
  title: string;
  description: string;
  level: SkillBand | '';
  track: Track | '';
  contentLocale: ContentLocale | '';
  price: string;
}

export interface LessonDraft {
  title: string;
  type: LessonType;
  passingScore: string;
}

export function validateCourseDraft(draft: CourseDraft): CourseDraftError | null {
  if (draft.title.trim().length < 3) {
    return 'title';
  }
  if (draft.description.trim().length < 1) {
    return 'description';
  }
  if (!SKILL_BANDS.some((level) => level === draft.level)) {
    return 'band';
  }
  if (!TRACKS.some((track) => track === draft.track)) {
    return 'track';
  }
  if (!CONTENT_LOCALES.some((locale) => locale === draft.contentLocale)) {
    return 'locale';
  }
  if (!/^\d+$/.test(draft.price.trim())) {
    return 'price';
  }
  const price = Number(draft.price);
  if (price < 1 || price > 100_000_000) {
    return 'price-range';
  }
  return null;
}

export function validateModuleTitle(title: string): string | null {
  if (title.trim().length < 1) {
    return 'Module title is required.';
  }
  return null;
}

export function validateLessonDraft(draft: LessonDraft): string | null {
  if (draft.title.trim().length < 1) {
    return 'Lesson title is required.';
  }
  if (draft.type === 'QUIZ') {
    if (!/^\d+$/.test(draft.passingScore.trim())) {
      return 'Quiz lessons need a passing score from 0 to 100.';
    }
    const score = Number(draft.passingScore);
    if (score < 0 || score > 100) {
      return 'Quiz lessons need a passing score from 0 to 100.';
    }
  }
  return null;
}

export function formatIdr(amount: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return amount;
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}
