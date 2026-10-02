import { isCourseComplete } from './course-complete';

describe('isCourseComplete', () => {
  it('stays false for an empty course or a course with an unfinished lesson', () => {
    expect(isCourseComplete([])).toBe(false);
    expect(isCourseComplete([1, 0])).toBe(false);
  });

  it('is true only when every lesson has a completion', () => {
    expect(isCourseComplete([1, 2, 1])).toBe(true);
  });
});
