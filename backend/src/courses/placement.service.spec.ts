import { placementStart } from './placement.service';

describe('placementStart', () => {
  it('rounds the mean and keeps it inside the course', () => {
    expect(placementStart([1, 2, 3], 6)).toBe(2);
    expect(placementStart([3, 4], 6)).toBe(4);
    expect(placementStart([5, 6], 3)).toBe(3);
    expect(placementStart([1], 4)).toBe(1);
  });
});
