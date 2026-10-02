export const THEME_STORAGE_KEY = 'fluentis.theme';

export const THEMES = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'navy', label: 'Deep navy' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export function isThemeId(value: string): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}
