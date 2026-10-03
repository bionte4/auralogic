import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { LocaleProvider } from '@/components/locale-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { LOCALE_COOKIE, resolveLocale } from '@/lib/locale';
import { messagesFor } from '@/lib/messages';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const copy = messagesFor(resolveLocale(jar.get(LOCALE_COOKIE)?.value));
  return {
    title: 'Auralogic',
    description: copy.home.lead,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const locale = resolveLocale(jar.get(LOCALE_COOKIE)?.value);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
