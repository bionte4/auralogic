'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ApiError, apiRequest } from '@/lib/api';
import { formatIdr } from '@/lib/course-draft';
import type { LearningPhase, PublicCourseCard } from '@/lib/courses';
import { LEARNING_PHASES, phaseLabel } from '@/lib/learning-phase';

export function CourseRow() {
  const [courses, setCourses] = useState<PublicCourseCard[] | null>(null);
  const [phase, setPhase] = useState<LearningPhase | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    void apiRequest<PublicCourseCard[]>('/courses/catalog')
      .then(setCourses)
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : 'Could not load courses.');
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

  const visible = (courses ?? []).filter((course) => !phase || course.phase === phase);
  const openCourse = visible.find((course) => course.id === openId) ?? null;

  return (
    <section id="catalog" className="mx-auto flex max-w-6xl scroll-mt-24 flex-col gap-5 px-4 py-16 sm:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Courses</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a course to read what you will learn. Payment stays on the course page.
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <PhaseChip active={phase === ''} onClick={() => setPhase('')}>
            All phases
          </PhaseChip>
          {LEARNING_PHASES.map((item) => (
            <PhaseChip key={item.value} active={phase === item.value} onClick={() => setPhase(item.value)}>
              {`Fase ${item.value}`}
            </PhaseChip>
          ))}
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {courses === null && !error ? <p className="text-sm text-muted-foreground">Loading courses…</p> : null}
      {courses && visible.length === 0 ? <p className="text-sm text-muted-foreground">No published courses in this phase yet.</p> : null}
      {visible.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
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
  const phase = phaseLabel(course.phase);
  const cardRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={cardRef}
      type="button"
      data-course-card={course.id}
      aria-expanded={open}
      className={`w-72 shrink-0 rounded-xl border bg-card text-left ${open ? 'border-foreground' : 'border-border'}`}
      onClick={onOpen}
      onMouseEnter={onOpen}
      onMouseLeave={onLeave}
      onFocus={onOpen}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Element && next.closest('[role="dialog"]')) {
          return;
        }
        onLeave();
      }}
    >
      <div className="aspect-video overflow-hidden rounded-t-xl bg-muted">
        {course.coverImageUrl ? (
          <img src={course.coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-end bg-zinc-900 p-4 text-sm font-medium text-white">{phase ?? course.level}</div>
        )}
      </div>
      <div className="flex flex-col gap-2 p-4">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{course.title}</p>
        <p className="text-xs text-muted-foreground">{course.instructor.name}</p>
        <p className="pt-2 text-sm font-medium">{formatIdr(course.price)}</p>
      </div>
    </button>
  );
}

function CoursePreview({ course, onHold, onLeave }: { course: PublicCourseCard; onHold: () => void; onLeave: () => void }) {
  const titleId = useId();
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const phase = phaseLabel(course.phase);
  const facts = [course.durationMinutes > 0 ? `${course.durationMinutes} min` : null, course.level, phase].filter(
    (item): item is string => Boolean(item),
  );

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
      className="fixed z-40 w-80 rounded-xl border border-border bg-card p-4"
      style={{ top: box.top, left: box.left }}
      onMouseEnter={onHold}
      onMouseLeave={onLeave}
    >
      <h3 id={titleId} className="text-base font-semibold leading-snug">
        {course.title}
      </h3>
      {course.publishedAt ? (
        <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">Updated {formatMonth(course.publishedAt)}</p>
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
        <Link href={`/courses/${course.id}`}>View course</Link>
      </Button>
    </aside>,
    document.body,
  );
}

function formatMonth(value: string): string {
  return new Date(value).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

function PhaseChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      className={`h-9 shrink-0 rounded-full border px-3 text-sm ${active ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
