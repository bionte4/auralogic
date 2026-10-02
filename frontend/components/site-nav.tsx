'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';

const LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/learn', label: 'Courses' },
  { href: '/instructor/login', label: 'Instructors' },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs text-primary-foreground">Fl</span>
          Fluentis
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Primary">
          {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeSwitcher />
          <Button variant="ghost" className="min-h-11" asChild>
            <Link href="/student/login">Login</Link>
          </Button>
          <Button className="min-h-11" asChild>
            <Link href="/learn/register">Register</Link>
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 min-w-11 md:hidden"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      {open ? (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden" aria-label="Mobile">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="flex min-h-11 items-center text-sm" onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <div className="py-2">
            <ThemeSwitcher />
          </div>
          <Link href="/student/login" className="flex min-h-11 items-center text-sm" onClick={() => setOpen(false)}>
            Login
          </Link>
          <Link href="/learn/register" className="flex min-h-11 items-center text-sm" onClick={() => setOpen(false)}>
            Register
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
