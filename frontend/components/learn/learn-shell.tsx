'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import { clearSession, readSession, saveSession, type AuthUser, type Session } from '@/lib/session';

export function LearnShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);

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
    return <p className="px-6 py-10 text-sm text-muted-foreground">Checking your session…</p>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
          <Link href="/learn" className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground" aria-hidden="true">
              Fl
            </span>
            <span className="truncate text-sm font-semibold tracking-tight">Fluentis</span>
            <span className="hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden="true" />
            <span className="truncate text-sm text-muted-foreground">{session.email}</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            <ThemeSwitcher />
            <Button variant="ghost" size="sm" className="min-h-11" asChild>
              <Link href="/learn">My courses</Link>
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
              Sign out
            </Button>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
