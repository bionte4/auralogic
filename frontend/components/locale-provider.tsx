'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { apiRequest } from '@/lib/api';
import { fromUiLocale, resolveLocale, toUiLocale, writeLocaleCookie, type Locale } from '@/lib/locale';
import { messagesFor, type Messages } from '@/lib/messages';
import { readSession } from '@/lib/session';

interface LocaleContextValue {
  locale: Locale;
  m: Messages;
  setLocale: (locale: Locale) => Promise<void>;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState(initialLocale);

  async function setLocale(next: Locale): Promise<void> {
    writeLocaleCookie(next);
    setLocaleState(next);
    if (!readSession()) {
      return;
    }
    try {
      await apiRequest('/auth/locale', {
        method: 'PATCH',
        body: JSON.stringify({ locale: toUiLocale(next) }),
      });
    } catch {
      // The cookie still drives the interface when the session has expired.
    }
  }

  return <LocaleContext.Provider value={{ locale, m: messagesFor(locale), setLocale }}>{children}</LocaleContext.Provider>;
}

export function useI18n(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    return { locale: 'id', m: messagesFor('id'), setLocale: async () => undefined };
  }
  return value;
}

export function localeFromUser(value: string | null | undefined): Locale {
  return fromUiLocale(value) ?? resolveLocale(value);
}
