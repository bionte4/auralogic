export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export const LESSON_TYPES = ['VIDEO', 'READING', 'QUIZ'] as const;

export type CefrLevel = (typeof CEFR_LEVELS)[number];
export type LessonType = (typeof LESSON_TYPES)[number];

export interface CourseDraft {
  title: string;
  description: string;
  level: CefrLevel | '';
  price: string;
}

export interface LessonDraft {
  title: string;
  type: LessonType;
  passingScore: string;
}

export function validateCourseDraft(draft: CourseDraft): string | null {
  if (draft.title.trim().length < 3) {
    return 'Course title must be at least 3 characters.';
  }
  if (draft.description.trim().length < 1) {
    return 'Course description is required.';
  }
  if (!CEFR_LEVELS.some((level) => level === draft.level)) {
    return 'Choose a CEFR level.';
  }
  if (!/^\d+$/.test(draft.price.trim())) {
    return 'Price must be a whole IDR amount.';
  }
  const price = Number(draft.price);
  if (price < 1 || price > 100_000_000) {
    return 'Price must be between 1 and 100,000,000 IDR.';
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
