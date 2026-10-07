'use client';

import { BarChart3, Server, ShieldCheck, Sparkles, Waypoints } from 'lucide-react';
import Link from 'next/link';
import { Suspense, useId } from 'react';
import { BrandLockup } from '@/components/brand-mark';
import { CourseRow } from '@/components/landing/course-row';
import { useI18n } from '@/components/locale-provider';
import { SiteNav } from '@/components/site-nav';
import { TRACKS } from '@/lib/course-draft';
import type { LearningTrack } from '@/lib/courses';

const TRACK_ICONS = {
  NETWORK: Waypoints,
  CYBERSECURITY: ShieldCheck,
  DATA_SCIENCE: BarChart3,
  AI: Sparkles,
  DATACENTER: Server,
} as const satisfies Record<LearningTrack, typeof Waypoints>;

export default function HomePage() {
  return <Home />;
}

function Home() {
  const { m } = useI18n();
  const searchId = useId();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(15,118,110,0.18),transparent_52%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,32rem)_1fr] lg:py-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">{m.home.eyebrow}</p>
              <h1 className="mt-2 max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{m.home.title}</h1>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">{m.home.lead}</p>
              <form action="/" role="search" className="mt-5">
                <label className="sr-only" htmlFor={searchId}>
                  {m.nav.search}
                </label>
                <input
                  id={searchId}
                  name="q"
                  type="search"
                  placeholder={m.nav.searchPlaceholder}
                  className="h-12 w-full rounded-full border border-border bg-card px-5 text-sm text-foreground shadow-sm outline-none ring-teal-700/30 placeholder:text-muted-foreground focus:ring-2"
                />
              </form>
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
              {TRACKS.map((track) => {
                const Icon = TRACK_ICONS[track];
                return (
                  <Link
                    key={track}
                    href={`/?track=${track}#catalog`}
                    className="flex w-40 shrink-0 items-start gap-2 rounded-xl border border-border bg-card p-3 transition hover:border-teal-700/40 sm:w-auto"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{m.tracks[track]}</span>
                      <span className="mt-0.5 hidden text-xs leading-5 text-muted-foreground sm:block">{m.home.trackBlurbs[track]}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <Suspense fallback={<p className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground sm:px-6">Auralogic</p>}>
          <CourseRow />
        </Suspense>

        <section id="topics" className="border-t border-border">
          <div className="mx-auto max-w-7xl scroll-mt-24 px-4 py-8 sm:px-6 sm:py-10">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{m.home.topicsTitle}</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {TRACKS.map((track) => {
                const Icon = TRACK_ICONS[track];
                return (
                  <Link key={track} href={`/?track=${track}#catalog`} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-teal-700/40">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-semibold">{m.tracks[track]}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{m.home.trackBlurbs[track]}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-border">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 py-8 sm:px-6 sm:py-10 md:grid-cols-3">
            {m.home.features.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold">{feature.title}</h2>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <BrandLockup />
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/student/login" className="hover:text-foreground">
              {m.nav.login}
            </Link>
            <Link href="/learn/register" className="hover:text-foreground">
              {m.nav.register}
            </Link>
            <Link href="/instructor/login" className="hover:text-foreground">
              {m.nav.instructors}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
