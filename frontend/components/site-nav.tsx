'use client';

import { Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';
import { BrandLockup } from '@/components/brand-mark';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useI18n } from '@/components/locale-provider';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const { m } = useI18n();
  const searchId = useId();
  const links = [
    { href: '/#catalog', label: m.nav.courses },
    { href: '/#topics', label: m.home.topicsTitle },
    { href: '/instructor/login', label: m.nav.instructors },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Link href="/" className="shrink-0 text-sm">
          <BrandLockup />
        </Link>
        <form action="/" role="search" className="relative hidden min-w-0 flex-1 md:block">
          <label className="sr-only" htmlFor={searchId}>
            {m.nav.search}
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id={searchId}
            name="q"
            type="search"
            placeholder={m.nav.searchPlaceholder}
            className="h-11 w-full rounded-full border border-border bg-muted/40 pl-10 pr-4 text-sm text-foreground outline-none ring-teal-700/30 focus:bg-background focus:ring-2"
          />
        </form>
        <nav className="hidden items-center gap-5 text-sm font-medium lg:flex" aria-label="Primary">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="whitespace-nowrap text-foreground hover:text-muted-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <ThemeSwitcher />
          <LanguageSwitcher />
          <Button variant="ghost" className="min-h-11" asChild>
            <Link href="/student/login">{m.nav.login}</Link>
          </Button>
          <Button className="min-h-11" asChild>
            <Link href="/learn/register">{m.nav.register}</Link>
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 min-w-11 md:hidden"
          aria-expanded={open}
          aria-label={open ? m.nav.closeMenu : m.nav.openMenu}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      {open ? (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden" aria-label="Mobile">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="flex min-h-11 items-center text-sm" onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <form action="/" role="search" className="py-2">
            <label className="sr-only" htmlFor={`${searchId}-mobile`}>
              {m.nav.search}
            </label>
            <input
              id={`${searchId}-mobile`}
              name="q"
              type="search"
              placeholder={m.nav.searchPlaceholder}
              className="h-11 w-full rounded-full border border-border bg-background px-4 text-sm"
            />
          </form>
          <div className="flex gap-2 py-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
          <Link href="/student/login" className="flex min-h-11 items-center text-sm" onClick={() => setOpen(false)}>
            {m.nav.login}
          </Link>
          <Link href="/learn/register" className="flex min-h-11 items-center text-sm" onClick={() => setOpen(false)}>
            {m.nav.register}
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
