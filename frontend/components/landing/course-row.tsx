'use client';

import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/locale-provider';
import { ApiError, apiRequest } from '@/lib/api';
import { formatIdr } from '@/lib/course-draft';
import type { PublicCourseCard } from '@/lib/courses';
import { isTrackSlug, listPublicTracks, trackName, trackSlugLabel, type LearningTrackRecord } from '@/lib/learning-tracks';

export function CourseRow() {
  const { m, locale } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const scroller = useRef<HTMLDivElement>(null);
  const [courses, setCourses] = useState<PublicCourseCard[] | null>(null);
  const [tracks, setTracks] = useState<LearningTrackRecord[]>([]);
  const [error, setError] = useState<'load' | string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);
  const query = params.get('q')?.trim() ?? '';
  const trackParam = params.get('track');
  const track = trackParam && isTrackSlug(trackParam) ? trackParam : '';
  const uiLocale = locale === 'en' ? 'EN' : 'ID';

  function selectTrack(next: string): void {
    const search = new URLSearchParams(params.toString());
    if (next) {
      search.set('track', next);
    } else {
      search.delete('track');
    }
    const text = search.toString();
    router.replace(text ? `/?${text}#catalog` : '/#catalog', { scroll: false });
    setOpenId(null);
  }

  function scrollRow(direction: -1 | 1): void {
    scroller.current?.scrollBy({ left: direction * 320, behavior: 'smooth' });
  }

  useEffect(() => {
    void listPublicTracks().then(setTracks).catch(() => setTracks([]));
  }, []);

  useEffect(() => {
    void apiRequest<PublicCourseCard[]>('/courses/catalog')
      .then(setCourses)
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : 'load');
      });
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!openId) {
      return undefined;
    }
    function onPointer(event: PointerEvent): void {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (target.closest('[data-course-card]') || target.closest('[role="dialog"]')) {
        return;
      }
      setOpenId(null);
    }
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [openId]);

  function holdOpen(courseId: string): void {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpenId(courseId);
  }

  function scheduleClose(): void {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
    }
    closeTimer.current = window.setTimeout(() => setOpenId(null), 140);
  }

  const visible = (courses ?? []).filter((course) => {
    if (track && course.track !== track) {
      return false;
    }
    if (!query) {
      return true;
    }
    const haystack = `${course.title} ${course.description} ${course.outcome ?? ''} ${course.instructor.name}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  const openCourse = visible.find((course) => course.id === openId) ?? null;

  return (
    <section id="catalog" className="mx-auto flex max-w-7xl scroll-mt-24 flex-col gap-3 px-4 py-8 sm:px-6 sm:py-10">
      <div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{query ? `“${query}”` : m.home.skillsTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{m.home.skillsLead}</p>
      </div>
      <div className="flex gap-6 overflow-x-auto border-b border-border" role="tablist" aria-label={m.catalog.track}>
        <Tab active={track === ''} onClick={() => selectTrack('')}>
          {m.catalog.allTracks}
        </Tab>
        {tracks.map((item) => (
          <Tab key={item.slug} active={track === item.slug} onClick={() => selectTrack(item.slug)}>
            {trackName(item, uiLocale)}
          </Tab>
        ))}
      </div>
      {error ? <p className="text-sm text-destructive">{error === 'load' ? m.catalog.loadError : error}</p> : null}
      {courses === null && !error ? <p className="text-sm text-muted-foreground">{m.catalog.loading}</p> : null}
      {courses && visible.length === 0 ? <p className="text-sm text-muted-foreground">{m.catalog.noMatch}</p> : null}
      {visible.length > 0 ? (
        <div className="relative">
          <button
            type="button"
            className="absolute left-0 top-16 z-10 hidden h-12 w-12 items-center justify-center rounded-full border border-border bg-background md:flex"
            aria-label={m.home.prev}
            onClick={() => scrollRow(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div ref={scroller} className="flex snap-x gap-3 overflow-x-auto scroll-smooth px-1 pb-2 pt-1 md:px-10">
            {visible.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                open={openCourse?.id === course.id}
                onOpen={() => holdOpen(course.id)}
                onLeave={scheduleClose}
              />
            ))}
          </div>
          <button
            type="button"
            className="absolute right-0 top-16 z-10 hidden h-12 w-12 items-center justify-center rounded-full border border-border bg-background md:flex"
            aria-label={m.home.next}
            onClick={() => scrollRow(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}
      {openCourse ? <CoursePreview course={openCourse} onHold={() => holdOpen(openCourse.id)} onLeave={scheduleClose} /> : null}
    </section>
  );
}

function CourseCard({
  course,
  open,
  onOpen,
  onLeave,
}: {
  course: PublicCourseCard;
  open: boolean;
  onOpen: () => void;
  onLeave: () => void;
}) {
  const { m } = useI18n();

  return (
    <div
      data-course-card={course.id}
      className={`w-64 shrink-0 snap-start ${open ? 'relative z-20' : ''}`}
      onMouseEnter={onOpen}
      onMouseLeave={onLeave}
    >
      <Link
        href={`/courses/${course.id}`}
        className="block overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        onFocus={onOpen}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Element && next.closest('[role="dialog"]')) {
            return;
          }
          onLeave();
        }}
      >
        <div className="aspect-video overflow-hidden bg-zinc-950">
          {course.coverImageUrl ? (
            <img src={course.coverImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-end bg-zinc-900 p-3 text-sm font-semibold text-white">{trackSlugLabel(course.track, m.tracks)}</div>
          )}
        </div>
        <div className="flex flex-col gap-1 p-3">
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">{course.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {course.instructor.name} · {m.bands[course.level]}
          </p>
          <p className="text-sm font-semibold">{formatIdr(course.price)}</p>
        </div>
      </Link>
    </div>
  );
}

function CoursePreview({ course, onHold, onLeave }: { course: PublicCourseCard; onHold: () => void; onLeave: () => void }) {
  const titleId = useId();
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const { locale, m } = useI18n();
  const facts = [
    course.durationMinutes > 0 ? `${course.durationMinutes} ${m.catalog.minutes}` : null,
    m.bands[course.level],
    trackSlugLabel(course.track, m.tracks),
    m.languages[course.contentLocale],
  ].filter((item): item is string => Boolean(item));

  useEffect(() => {
    const card = document.querySelector(`[data-course-card="${course.id}"]`);
    if (!(card instanceof HTMLElement)) {
      return undefined;
    }
    function place(): void {
      if (!(card instanceof HTMLElement)) {
        return;
      }
      const rect = card.getBoundingClientRect();
      const width = 320;
      const gap = 12;
      let left = rect.right + gap;
      if (left + width > window.innerWidth - 16) {
        left = rect.left - gap - width;
      }
      if (left < 16) {
        left = 16;
      }
      const top = Math.min(Math.max(16, rect.top), Math.max(16, window.innerHeight - 420));
      setBox({ top, left });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [course.id]);

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onLeave();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onLeave]);

  if (!box || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <aside
      role="dialog"
      aria-labelledby={titleId}
      className="fixed z-40 w-80 rounded-2xl border border-border bg-card p-5 shadow-2xl"
      style={{ top: box.top, left: box.left }}
      onMouseEnter={onHold}
      onMouseLeave={onLeave}
    >
      <h3 id={titleId} className="text-base font-semibold leading-snug">
        {course.title}
      </h3>
      {course.publishedAt ? (
        <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          {m.catalog.updated} {formatMonth(course.publishedAt, locale)}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">{facts.join(' · ')}</p>
      <p className="mt-3 text-sm leading-6">{course.outcome ?? course.description}</p>
      {course.highlights.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {course.highlights.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-5">
              <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <Button asChild className="mt-4 min-h-11 w-full">
        <Link href={`/courses/${course.id}`}>{m.catalog.view}</Link>
      </Button>
    </aside>,
    document.body,
  );
}

function formatMonth(value: string, locale: 'id' | 'en'): string {
  return new Date(value).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`h-11 shrink-0 border-b-2 text-sm font-bold ${active ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
