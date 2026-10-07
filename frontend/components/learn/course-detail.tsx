'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SecureVideoPlayer } from '@/components/player/SecureVideoPlayer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/locale-provider';
import { ApiError, apiRequest } from '@/lib/api';
import { formatIdr } from '@/lib/course-draft';
import type { CourseDetail } from '@/lib/courses';
import { trackSlugLabel } from '@/lib/learning-tracks';
import { readSession } from '@/lib/session';

interface EnrollmentMark {
  courseId: string;
  accessGranted: boolean;
}

interface PlaybackGrant {
  manifestUrl: string;
  watermark: { userId: string; email: string };
}

export function CourseDetailView({ courseId }: { courseId: string }) {
  const { m } = useI18n();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [access, setAccess] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [playback, setPlayback] = useState<PlaybackGrant | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      return;
    }
    void Promise.all([
      apiRequest<CourseDetail>(`/courses/${courseId}`),
      apiRequest<EnrollmentMark[]>('/me/enrollments'),
    ])
      .then(([nextCourse, enrollments]) => {
        setCourse(nextCourse);
        const mark = enrollments.find((item) => item.courseId === courseId);
        setAccess(mark ? mark.accessGranted : null);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : 'Could not open this course.');
      });
  }, [courseId]);

  async function choose(): Promise<void> {
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

  async function playPreview(lessonId: string): Promise<void> {
    setPending(true);
    setError(null);
    try {
      setPlayback(await apiRequest<PlaybackGrant>(`/lessons/${lessonId}/playback`));
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not play the preview.');
    } finally {
      setPending(false);
    }
  }

  if (error && !course) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!course) {
    return <p className="text-sm text-muted-foreground">Loading course…</p>;
  }

  const band = m.bands[course.level];
  const track = trackSlugLabel(course.track, m.tracks);
  const opening = course.modules[0]?.lessons[0] ?? null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="aspect-[21/9] bg-muted">
          {course.coverImageUrl ? (
            <img src={course.coverImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-end bg-gradient-to-br from-zinc-800 to-zinc-950 p-6 text-lg font-medium text-white">
              {track}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{band}</Badge>
            <Badge>{track}</Badge>
            <Badge>{m.languages[course.contentLocale]}</Badge>
            <p className="text-sm font-medium">{formatIdr(course.price)}</p>
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{course.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{course.instructor.name}</p>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{course.description}</p>
          {course.pairedCourse?.status === 'PUBLISHED' ? (
            <p className="text-sm">
              <Link href={`/learn/courses/${course.pairedCourse.id}`} className="underline">
                {m.languages[course.pairedCourse.contentLocale]} · {course.pairedCourse.title}
              </Link>
            </p>
          ) : null}
          {course.outcome ? (
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{m.catalog.outcome}</p>
              <p className="mt-1 text-sm leading-6">{course.outcome}</p>
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div>
            {access === true ? (
              <Button asChild className="min-h-11">
                <Link href={`/learn/${course.id}`}>Continue</Link>
              </Button>
            ) : (
              <Button type="button" className="min-h-11" disabled={pending} onClick={() => void choose()}>
                {pending ? 'Opening checkout…' : access === false ? 'Finish payment' : 'Choose course'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {opening ? (
        <section className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Free preview</p>
          <h2 className="mt-1 text-xl font-semibold">
            Lesson {opening.orderIndex}. {opening.title}
          </h2>
          {opening.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{opening.description}</p> : null}
          {opening.type === 'VIDEO' && access !== true ? (
            <div className="mt-4">
              {playback ? (
                <SecureVideoPlayer manifestUrl={playback.manifestUrl} watermark={playback.watermark} />
              ) : (
                <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => void playPreview(opening.id)}>
                  Play preview
                </Button>
              )}
            </div>
          ) : null}
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
            <ol className="mt-3 flex flex-col gap-1 text-sm">
              {module.lessons.map((lesson) => (
                <li key={lesson.id} className="text-muted-foreground">
                  {lesson.orderIndex}. {lesson.title}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </section>
    </div>
  );
}
