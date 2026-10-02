import type { CourseSummary } from '@/lib/courses';
import { filterCatalog, matchesPriceBand } from './catalog-filters';

const course = {
  id: 'course-1',
  title: 'Workplace English',
  slug: 'workplace-english',
  description: 'Meetings',
  level: 'B1',
  status: 'PUBLISHED',
  publishedAt: null,
  price: '250000.00',
  coverImageUrl: null,
  phase: 'D',
  outcome: null,
  instructor: { id: 'instructor-1', name: 'Local Instructor' },
} satisfies CourseSummary;

describe('catalog filters', () => {
  it('keeps a price inside its band', () => {
    expect(matchesPriceBand('250000.00', '100k-500k')).toBe(true);
    expect(matchesPriceBand('99000.00', 'under-100k')).toBe(true);
    expect(matchesPriceBand('500001.00', 'over-500k')).toBe(true);
    expect(matchesPriceBand('250000.00', '')).toBe(true);
  });

  it('filters by phase, level, and price together', () => {
    const other = { ...course, id: 'course-2', level: 'A1' as const, phase: 'A' as const, price: '50000.00' };
    expect(filterCatalog([course, other], { phase: 'D', level: 'B1', price: '100k-500k' }).map((item) => item.id)).toEqual(['course-1']);
  });
});
