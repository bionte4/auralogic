import type { CourseSummary, LearningPhase } from '@/lib/courses';

export type PriceBand = '' | 'under-100k' | '100k-500k' | 'over-500k';

export function matchesPriceBand(price: string, band: PriceBand): boolean {
  if (!band) {
    return true;
  }
  const amount = Number(price);
  if (!Number.isFinite(amount)) {
    return false;
  }
  if (band === 'under-100k') {
    return amount < 100_000;
  }
  if (band === '100k-500k') {
    return amount >= 100_000 && amount <= 500_000;
  }
  return amount > 500_000;
}

export function filterCatalog(
  courses: readonly CourseSummary[],
  filters: { phase: LearningPhase | ''; level: CourseSummary['level'] | ''; price: PriceBand },
): CourseSummary[] {
  return courses.filter((course) => {
    if (filters.phase && course.phase !== filters.phase) {
      return false;
    }
    if (filters.level && course.level !== filters.level) {
      return false;
    }
    return matchesPriceBand(course.price, filters.price);
  });
}
