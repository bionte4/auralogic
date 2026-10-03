import type { CourseSummary } from '@/lib/courses';
import { filterCatalog, matchesPriceBand } from './catalog-filters';

const course = {
  id: 'course-1',
  title: 'Network Fondasi',
  slug: 'network-foundation',
  description: 'Subnetting',
  level: 'FOUNDATION',
  track: 'NETWORK',
  contentLocale: 'ID',
  status: 'PUBLISHED',
  publishedAt: null,
  price: '250000.00',
  coverImageUrl: null,
  outcome: null,
  instructor: { id: 'instructor-1', name: 'Local Instructor' },
  pairedCourse: null,
} satisfies CourseSummary;

describe('catalog filters', () => {
  it('keeps a price inside its band', () => {
    expect(matchesPriceBand('250000.00', '100k-500k')).toBe(true);
    expect(matchesPriceBand('99000.00', 'under-100k')).toBe(true);
    expect(matchesPriceBand('500001.00', 'over-500k')).toBe(true);
    expect(matchesPriceBand('250000.00', '')).toBe(true);
  });

  it('filters by track, band, language, and price together', () => {
    const other = {
      ...course,
      id: 'course-2',
      level: 'ADVANCED' as const,
      track: 'AI' as const,
      contentLocale: 'EN' as const,
      price: '50000.00',
    };
    expect(
      filterCatalog([course, other], { track: 'NETWORK', level: 'FOUNDATION', contentLocale: 'ID', price: '100k-500k' }).map(
        (item) => item.id,
      ),
    ).toEqual(['course-1']);
  });
});
