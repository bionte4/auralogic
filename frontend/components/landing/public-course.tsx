'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SiteNav } from '@/components/site-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/locale-provider';
import { ApiError, apiRequest } from '@/lib/api';
import { formatIdr } from '@/lib/course-draft';
import type { CourseDetail } from '@/lib/courses';
import { readSession } from '@/lib/session';

export function PublicCourse({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { m } = useI18n();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void apiRequest<CourseDetail>(`/courses/catalog/${courseId}`)
      .then(setCourse)
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : m.catalog.loadError);
      });
  }, [courseId]);

  async function choose(): Promise<void> {
    const session = readSession();
    if (!session || session.role !== 'STUDENT') {
      router.push(`/student/login?next=/courses/${courseId}`);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await apiRequest<{ checkoutUrl: string | null }>(`/courses/${courseId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ channel: 'REDIRECT' }),
      });
      if (!result.checkoutUrl) {
        setError(m.catalog.checkoutMissing);
        return;
      }
      window.location.assign(result.checkoutUrl);
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : m.catalog.checkoutError);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
        <Link href="/#catalog" className="text-sm text-muted-foreground hover:text-foreground">
          {m.catalog.courses}
        </Link>
        {error && !course ? <p className="text-sm text-destructive">{error}</p> : null}
        {!course && !error ? <p className="text-sm text-muted-foreground">{m.catalog.loading}</p> : null}
        {course ? <CourseBody course={course} pending={pending} error={error} onChoose={() => void choose()} /> : null}
      </main>
    </div>
  );
}

function CourseBody({
  course,
  pending,
  error,
  onChoose,
}: {
  course: CourseDetail;
  pending: boolean;
  error: string | null;
  onChoose: () => void;
}) {
  const { m } = useI18n();
  const band = m.bands[course.level];
  const track = m.tracks[course.track];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="h-36 bg-zinc-950 sm:h-44">
            {course.coverImageUrl ? (
              <img src={course.coverImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-end bg-zinc-900 p-4 text-sm font-medium text-white">{track}</div>
            )}
          </div>
          <div className="flex flex-col gap-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{band}</Badge>
              <Badge>{track}</Badge>
              <Badge>{m.languages[course.contentLocale]}</Badge>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{course.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{course.instructor.name}</p>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{course.description}</p>
            {course.pairedCourse?.status === 'PUBLISHED' ? (
              <p className="text-sm">
                <Link href={`/courses/${course.pairedCourse.id}`} className="underline">
                  {m.languages[course.pairedCourse.contentLocale]} · {course.pairedCourse.title}
                </Link>
              </p>
            ) : null}
            {course.outcome ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{m.catalog.outcome}</p>
                <p className="mt-1 text-sm leading-6">{course.outcome}</p>
              </div>
            ) : null}
          </div>
        </div>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{m.catalog.curriculum}</h2>
          {course.modules.map((module) => (
            <article key={module.id} className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">
                {m.catalog.module} {module.orderIndex} · {module.title}
              </h3>
              {module.outcome ? <p className="mt-1 text-sm text-muted-foreground">{module.outcome}</p> : null}
              <ol className="mt-2 flex flex-col gap-2 text-sm">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <p>
                      {lesson.orderIndex}. {lesson.title}
                    </p>
                    {lesson.description ? <p className="text-muted-foreground">{lesson.description}</p> : null}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </section>
      </div>
      <aside className="rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-20">
        <p className="text-xl font-semibold tracking-tight">{formatIdr(course.price)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {band} · {track}
        </p>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" className="min-h-11 w-full" disabled={pending} onClick={onChoose}>
            {pending ? m.catalog.opening : m.catalog.choose}
          </Button>
          <Button variant="outline" className="min-h-11 w-full" asChild>
            <Link href={`/learn/register?next=/courses/${course.id}`}>{m.nav.register}</Link>
          </Button>
        </div>
      </aside>
    </div>
  );
}
