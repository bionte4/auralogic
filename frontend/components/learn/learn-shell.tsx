'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { BrandLockup } from '@/components/brand-mark';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/locale-provider';
import { apiRequest } from '@/lib/api';
import { clearSession, readSession, saveSession, type AuthUser, type Session } from '@/lib/session';

export function LearnShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const { m } = useI18n();

  useEffect(() => {
    const cached = readSession();
    if (cached?.role === 'STUDENT') {
      setSession(cached);
      return;
    }
    void apiRequest<AuthUser>('/auth/me')
      .then((user) => {
        const next = saveSession(user);
        if (next.role !== 'STUDENT') {
          clearSession();
          router.replace('/student/login');
          return;
        }
        setSession(next);
      })
      .catch(() => router.replace('/student/login'));
  }, [pathname, router]);

  if (!session) {
    return <p className="px-6 py-10 text-sm text-muted-foreground">{m.nav.checking}</p>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
          <Link href="/learn" className="flex min-w-0 items-center gap-3">
            <BrandLockup className="min-w-0 truncate text-sm" />
            <span className="hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden="true" />
            <span className="truncate text-sm text-muted-foreground">{session.email}</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" className="min-h-11" asChild>
              <Link href="/learn">{m.nav.myCourses}</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => {
                void apiRequest('/auth/logout', { method: 'POST' }).finally(() => {
                  clearSession();
                  router.replace('/student/login');
                });
              }}
            >
              {m.nav.signOut}
            </Button>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
