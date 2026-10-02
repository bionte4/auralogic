'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, apiRequest } from '@/lib/api';
import { filterCatalog, type PriceBand } from '@/lib/catalog-filters';
import { CEFR_LEVELS, formatIdr } from '@/lib/course-draft';
import type { CourseSummary, LearningPhase } from '@/lib/courses';
import { LEARNING_PHASES, phaseLabel } from '@/lib/learning-phase';

interface CheckoutResult {
  checkoutUrl: string | null;
}

interface EnrollmentMark {
  courseId: string;
  accessGranted: boolean;
}

export function CourseCatalog({
  courses,
  enrollments,
}: {
  courses: CourseSummary[];
  enrollments: EnrollmentMark[];
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<LearningPhase | ''>('');
  const [level, setLevel] = useState<CourseSummary['level'] | ''>('');
  const [price, setPrice] = useState<PriceBand>('');
  const visible = filterCatalog(courses, { phase, level, price });
  const enrolled = new Map(enrollments.map((item) => [item.courseId, item.accessGranted]));

  async function choose(courseId: string): Promise<void> {
    setPendingId(courseId);
    setError(null);
    try {
      const result = await apiRequest<CheckoutResult>(`/courses/${courseId}/checkout`, {
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
      setPendingId(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Course catalog</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a course yourself. Lessons open after the payment notification is verified.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Phase
          <select
            className="h-11 rounded-md border border-input bg-transparent px-3 text-sm text-foreground"
            value={phase}
            onChange={(event) => setPhase(event.target.value as LearningPhase | '')}
          >
            <option value="">All phases</option>
            {LEARNING_PHASES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Level
          <select
            className="h-11 rounded-md border border-input bg-transparent px-3 text-sm text-foreground"
            value={level}
            onChange={(event) => setLevel(event.target.value as CourseSummary['level'] | '')}
          >
            <option value="">All levels</option>
            {CEFR_LEVELS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Price
          <select
            className="h-11 rounded-md border border-input bg-transparent px-3 text-sm text-foreground"
            value={price}
            onChange={(event) => setPrice(event.target.value as PriceBand)}
          >
            <option value="">Any price</option>
            <option value="under-100k">Under Rp 100.000</option>
            <option value="100k-500k">Rp 100.000 – Rp 500.000</option>
            <option value="over-500k">Over Rp 500.000</option>
          </select>
        </label>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No published courses yet.</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses match these filters.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((course) => {
            const access = enrolled.get(course.id);
            const phase = phaseLabel(course.phase);
            return (
              <Card key={course.id} className="flex h-full flex-col overflow-hidden">
                <Link href={`/learn/courses/${course.id}`} className="block aspect-video bg-muted">
                  {course.coverImageUrl ? (
                    <img src={course.coverImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-end bg-gradient-to-br from-zinc-800 to-zinc-950 p-4 text-sm font-medium text-white">
                      {phase ?? course.level}
                    </div>
                  )}
                </Link>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Badge>{course.level}</Badge>
                    <p className="text-sm font-medium">{formatIdr(course.price)}</p>
                  </div>
                  <CardTitle className="text-lg leading-snug">
                    <Link href={`/learn/courses/${course.id}`}>{course.title}</Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{course.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {course.instructor.name}
                    {phase ? ` · ${phase}` : ''}
                  </p>
                  <div className="mt-auto">
                    {access === true ? (
                      <Button asChild className="min-h-11 w-full">
                        <Link href={`/learn/${course.id}`}>Continue</Link>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="min-h-11 w-full"
                        disabled={pendingId === course.id}
                        onClick={() => void choose(course.id)}
                      >
                        {pendingId === course.id ? 'Opening checkout…' : access === false ? 'Finish payment' : 'Choose course'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
