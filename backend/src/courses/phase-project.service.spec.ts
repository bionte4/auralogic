import { lessonsAreComplete } from './phase-project.service';

describe('lessonsAreComplete', () => {
  it('requires every lesson and rejects an empty course', () => {
    expect(lessonsAreComplete(3, 3)).toBe(true);
    expect(lessonsAreComplete(2, 3)).toBe(false);
    expect(lessonsAreComplete(0, 0)).toBe(false);
  });
});
