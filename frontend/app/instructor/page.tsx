'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, apiRequest } from '@/lib/api';
import { formatIdr } from '@/lib/course-draft';
import type { CourseSummary } from '@/lib/courses';
import { readSession } from '@/lib/session';

export default function InstructorHomePage() {
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      return;
    }
    void apiRequest<CourseSummary[]>('/courses')
      .then((rows) => {
        const visible =
          session.role === 'SUPER_ADMIN' ? rows : rows.filter((course) => course.instructor.id === session.userId);
        setCourses(visible);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : 'Could not load courses.');
      });
  }, []);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!courses) {
    return <p className="text-sm text-muted-foreground">Loading courses…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-semibold">Instructor dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Build levels in order, upload HLS video, and watch enrollment, payment, and progress.
        </p>
      </div>
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses yet. Create one to add modules and lessons.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((course) => (
            <Link key={course.id} href={`/instructor/courses/${course.id}`}>
              <Card className="h-full hover:bg-secondary/40">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{course.title}</CardTitle>
                    <Badge>{course.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {course.level} · {formatIdr(course.price)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
