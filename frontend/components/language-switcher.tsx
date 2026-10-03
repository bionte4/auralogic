'use client';

import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/locale-provider';
import type { Locale } from '@/lib/locale';

export function LanguageSwitcher() {
  const router = useRouter();
  const { locale, setLocale, m } = useI18n();

  return (
    <label className="flex items-center">
      <span className="sr-only">{m.locale.label}</span>
      <select
        aria-label={m.locale.label}
        className="h-11 rounded-md border border-border bg-background px-2 text-sm text-foreground"
        value={locale}
        onChange={(event) => {
          const next: Locale = event.target.value === 'en' ? 'en' : 'id';
          void setLocale(next).then(() => router.refresh());
        }}
      >
        <option value="id">Indonesia</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
