'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SiteNav } from '@/components/site-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApiError, apiRequest } from '@/lib/api';
import { formatIdr } from '@/lib/course-draft';
import type { CourseDetail } from '@/lib/courses';
import { phaseLabel } from '@/lib/learning-phase';
import { readSession } from '@/lib/session';

export function PublicCourse({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void apiRequest<CourseDetail>(`/courses/catalog/${courseId}`)
      .then(setCourse)
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : 'Could not open this course.');
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
        setError('The payment page is not ready yet. Try again in a moment.');
        return;
      }
      window.location.assign(result.checkoutUrl);
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not start checkout.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
        <Link href="/#catalog" className="text-sm text-muted-foreground">
          Back to courses
        </Link>
        {error && !course ? <p className="text-sm text-destructive">{error}</p> : null}
        {!course && !error ? <p className="text-sm text-muted-foreground">Loading course…</p> : null}
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
  const phase = phaseLabel(course.phase);
  const opening = course.modules[0]?.lessons[0] ?? null;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="aspect-[21/9] bg-muted">
          {course.coverImageUrl ? (
            <img src={course.coverImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-end bg-zinc-900 p-6 text-lg font-medium text-white">{phase ?? course.level}</div>
          )}
        </div>
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{course.level}</Badge>
            {phase ? <Badge>{phase}</Badge> : null}
            <p className="text-sm font-medium">{formatIdr(course.price)}</p>
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{course.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{course.instructor.name}</p>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{course.description}</p>
          {course.outcome ? (
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Learning outcome</p>
              <p className="mt-1 text-sm leading-6">{course.outcome}</p>
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" className="min-h-11" disabled={pending} onClick={onChoose}>
              {pending ? 'Opening checkout…' : 'Choose course'}
            </Button>
            <Button variant="outline" className="min-h-11" asChild>
              <Link href={`/learn/register?next=/courses/${course.id}`}>Create an account</Link>
            </Button>
          </div>
        </div>
      </div>
      {opening?.description ? (
        <section className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Opening lesson</p>
          <h2 className="mt-1 text-xl font-semibold">
            {opening.orderIndex}. {opening.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{opening.description}</p>
        </section>
      ) : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Curriculum</h2>
        {course.modules.map((module) => (
          <article key={module.id} className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-medium">
              Level {module.orderIndex} · {module.title}
            </h3>
            {module.outcome ? <p className="mt-1 text-sm text-muted-foreground">{module.outcome}</p> : null}
            <ol className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
              {module.lessons.map((lesson) => (
                <li key={lesson.id}>
                  {lesson.orderIndex}. {lesson.title}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </section>
    </>
  );
}
