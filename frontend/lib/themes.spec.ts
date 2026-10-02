import { isThemeId, THEMES } from './themes';

describe('theme ids', () => {
  it('accepts the three saved preferences', () => {
    expect(THEMES.map((theme) => theme.id)).toEqual(['dark', 'light', 'navy']);
    expect(isThemeId('navy')).toBe(true);
    expect(isThemeId('sepia')).toBe(false);
  });
});
