'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useI18n } from '@/components/locale-provider';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import { clearSession, readSession, saveSession, type AuthUser, type Session } from '@/lib/session';

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const { m } = useI18n();

  useEffect(() => {
    const cached = readSession();
    if (cached?.role === 'SUPER_ADMIN') {
      setSession(cached);
      return;
    }
    void apiRequest<AuthUser>('/auth/me')
      .then((user) => {
        const next = saveSession(user);
        if (next.role !== 'SUPER_ADMIN') {
          router.replace(next.role === 'INSTRUCTOR' ? '/instructor' : '/instructor/login');
          return;
        }
        setSession(next);
      })
      .catch(() => router.replace('/instructor/login'));
  }, [router, pathname]);

  if (!session) {
    return <p className="px-6 py-10 text-sm text-muted-foreground">{m.nav.checking}</p>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Auralogic admin</p>
            <p className="text-sm font-medium">{session.email}</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/users">Users</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/tracks">Tracks</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/finance">Finance</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/settings">Settings</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/instructor">Courses</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void apiRequest('/auth/logout', { method: 'POST' }).finally(() => {
                  clearSession();
                  router.replace('/instructor/login');
                });
              }}
            >
              {m.nav.signOut}
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">{children}</main>
    </div>
  );
}
