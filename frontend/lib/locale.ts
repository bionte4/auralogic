export const LOCALES = ['id', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = 'locale';

export type UiLocaleCode = 'ID' | 'EN';

export function resolveLocale(value: string | null | undefined): Locale {
  return value === 'en' ? 'en' : 'id';
}

export function toUiLocale(locale: Locale): UiLocaleCode {
  return locale === 'en' ? 'EN' : 'ID';
}

export function fromUiLocale(value: string | null | undefined): Locale {
  return value === 'EN' ? 'en' : 'id';
}

export function writeLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.documentElement.lang = locale;
}
