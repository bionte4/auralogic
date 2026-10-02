import { LessonType } from '@prisma/client';
import { isDistinction, nextStreak, xpForCompletion } from './scoring.rules';

describe('scoring rules', () => {
  it('awards lesson XP plus a level bonus once the module is complete', () => {
    expect(xpForCompletion(LessonType.VIDEO, false)).toBe(10);
    expect(xpForCompletion(LessonType.QUIZ, true)).toBe(75);
  });

  it('treats 90 as distinction and continues a streak only across consecutive days', () => {
    expect(isDistinction(89)).toBe(false);
    expect(isDistinction(90)).toBe(true);
    expect(nextStreak('2026-10-01', 3, '2026-10-02')).toBe(4);
    expect(nextStreak('2026-10-02', 4, '2026-10-02')).toBe(4);
    expect(nextStreak('2026-09-01', 4, '2026-10-02')).toBe(1);
  });
});
