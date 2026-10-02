'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CertificateGallery } from '@/components/learn/certificate-gallery';
import { CourseCatalog } from '@/components/learn/course-catalog';
import { RewardsPanel } from '@/components/learn/rewards-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, apiRequest } from '@/lib/api';
import { continueTarget, overallProgress, type ModuleProgress } from '@/lib/learn-progress';
import type { CourseSummary } from '@/lib/courses';
import { readSession } from '@/lib/session';

interface EnrollmentCourse {
  courseId: string;
  title: string;
  level: string;
  status: string;
  paymentStatus: string;
  accessGranted: boolean;
  progressPercent: number;
}

interface CourseProgress {
  modules: ModuleProgress[];
  startOrderIndex: number;
}

interface RewardBadge {
  code: 'LEVEL_COMPLETE' | 'DISTINCTION';
  courseId: string;
  label: string;
  awardedAt: string;
}

interface RewardsView {
  xp: number;
  streakCount: number;
  badges: RewardBadge[];
}

export default function LearnHomePage() {
  const [name, setName] = useState<string | null>(null);
  const [courses, setCourses] = useState<EnrollmentCourse[] | null>(null);
  const [catalog, setCatalog] = useState<CourseSummary[] | null>(null);
  const [rewards, setRewards] = useState<RewardsView | null>(null);
  const [modulesByCourse, setModulesByCourse] = useState<Record<string, ModuleProgress[]>>({});
  const [startByCourse, setStartByCourse] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const current = readSession();
    setName(current?.name ?? null);
    if (!current) {
      return;
    }
    void Promise.all([
      apiRequest<EnrollmentCourse[]>('/me/enrollments'),
      apiRequest<RewardsView>('/me/rewards'),
      apiRequest<CourseSummary[]>('/courses'),
    ])
      .then(async ([nextCourses, nextRewards, nextCatalog]) => {
        setCourses(nextCourses);
        setRewards(nextRewards);
        setCatalog(nextCatalog);
        const active = nextCourses.filter((course) => course.accessGranted);
        const entries = await Promise.all(
          active.map(async (course) => {
            const progress = await apiRequest<CourseProgress>(`/courses/${course.courseId}/progress`);
            return [course.courseId, progress] as const;
          }),
        );
        setModulesByCourse(Object.fromEntries(entries.map(([courseId, progress]) => [courseId, progress.modules])));
        setStartByCourse(Object.fromEntries(entries.map(([courseId, progress]) => [courseId, progress.startOrderIndex])));
      })
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : 'Could not load your courses.');
      });
  }, []);

  if (error) {
    return <p className="px-6 py-10 text-sm text-destructive">{error}</p>;
  }
  if (!courses || !rewards || !catalog) {
    return <p className="px-6 py-10 text-sm text-muted-foreground">Loading your courses…</p>;
  }

  const percent = overallProgress(courses);
  const activeCourses = courses.filter((course) => course.accessGranted);
  const lessonsReady = activeCourses.every((course) => modulesByCourse[course.courseId] !== undefined);
  const next = lessonsReady
    ? continueTarget(courses, (courseId) => modulesByCourse[courseId], (courseId) => startByCourse[courseId] ?? 1)
    : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-8 text-card-foreground">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/30 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 left-10 h-32 w-32 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Student portal</p>
          <h1 className="mt-2 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-tight">
            Welcome back{name ? `, ${name}` : ''}
          </h1>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">XP</dt>
              <dd className="mt-1 text-3xl font-semibold">{rewards.xp}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Streak</dt>
              <dd className="mt-1 text-3xl font-semibold">
                {rewards.streakCount} <span className="text-base font-medium text-muted-foreground">days</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Overall progress</dt>
              <dd className="mt-1 text-3xl font-semibold">{percent}%</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-col gap-3">
            {activeCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Active course progress appears here after enrollment is paid.</p>
            ) : (
              activeCourses.map((course) => (
                <div key={course.courseId}>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{course.title}</span>
                    <span>{course.progressPercent}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={course.progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`${course.title} progress`}>
                    <div className="h-full bg-success" style={{ width: `${Math.min(100, Math.max(0, course.progressPercent))}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <CourseCatalog courses={catalog} enrollments={courses} />

      <Card>
        <CardHeader>
          <CardTitle>Continue learning</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          {!lessonsReady ? (
            <p className="text-sm text-muted-foreground">Finding your next lesson…</p>
          ) : next ? (
            <>
              <p className="text-sm text-muted-foreground">
                {next.course.title} · Lesson {next.lesson.orderIndex}. {next.lesson.title}
              </p>
              <Button asChild className="min-h-11">
                <Link href={`/learn/${next.course.courseId}?lesson=${next.lesson.id}`}>Open lesson</Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Choose a course from the catalog. Lessons open after payment is verified.</p>
          )}
        </CardContent>
      </Card>

      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">You have not joined a course yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((course) => {
            const badges = rewards.badges.filter((badge) => badge.courseId === course.courseId);
            const card = (
              <Card className={`h-full ${course.accessGranted ? 'hover:bg-secondary/40' : 'opacity-70'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{course.title}</CardTitle>
                    <Badge>{course.accessGranted ? 'Active' : course.paymentStatus}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {course.level} · {course.accessGranted ? 'Active enrollment' : `${course.status} · ${course.paymentStatus}`}
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={course.progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`${course.title} progress`}>
                    <div className="h-full bg-success" style={{ width: `${Math.min(100, Math.max(0, course.progressPercent))}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{course.progressPercent}% complete</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {badges.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No badges yet</p>
                    ) : (
                      badges.map((badge) => <Badge key={`${badge.code}-${badge.awardedAt}`}>{badge.label}</Badge>)
                    )}
                  </div>
                </CardContent>
              </Card>
            );
            return course.accessGranted ? (
              <Link key={course.courseId} href={`/learn/${course.courseId}`}>
                {card}
              </Link>
            ) : (
              <div key={course.courseId}>{card}</div>
            );
          })}
        </div>
      )}

      <CertificateGallery />
      <RewardsPanel />
    </div>
  );
}
