'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, apiRequest } from '@/lib/api';
import { formatIdr } from '@/lib/course-draft';
import type { CourseSummary } from '@/lib/courses';

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
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No published courses yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const access = enrolled.get(course.id);
            return (
              <Card key={course.id} className="flex h-full flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Badge>{course.level}</Badge>
                    <p className="text-sm font-medium">{formatIdr(course.price)}</p>
                  </div>
                  <CardTitle className="text-lg leading-snug">{course.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{course.description}</p>
                  <p className="text-xs text-muted-foreground">{course.instructor.name}</p>
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
