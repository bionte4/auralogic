export interface LessonProgress {
  id: string;
  title: string;
  type: 'VIDEO' | 'READING' | 'QUIZ';
  orderIndex: number;
  locked: boolean;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  score: number | null;
}

export interface ModuleProgress {
  id: string;
  title: string;
  orderIndex: number;
  locked: boolean;
  completed: boolean;
  lessons: LessonProgress[];
}

export function overallProgress(courses: ReadonlyArray<{ accessGranted: boolean; progressPercent: number }>): number {
  const active = courses.filter((course) => course.accessGranted);
  if (active.length === 0) {
    return 0;
  }
  const total = active.reduce((sum, course) => sum + course.progressPercent, 0);
  return Math.round(total / active.length);
}

export function continueTarget<T extends { courseId: string; title: string; accessGranted: boolean; progressPercent: number }>(
  courses: readonly T[],
  modulesFor: (courseId: string) => ModuleProgress[] | undefined,
  startFor: (courseId: string) => number = () => 1,
): { course: T; lesson: LessonProgress } | null {
  const active = courses.filter((course) => course.accessGranted);
  const next = active.find((course) => course.progressPercent < 100) ?? active[0];
  if (!next) {
    return null;
  }
  const lesson = firstOpenLesson(modulesFor(next.courseId) ?? [], startFor(next.courseId));
  if (!lesson) {
    return null;
  }
  return { course: next, lesson };
}

export function firstOpenLesson(modules: ModuleProgress[], startOrderIndex = 1): LessonProgress | null {
  const ranked = modules.flatMap((module) => module.lessons.map((lesson) => ({ lesson, level: module.orderIndex })));
  const preferred = ranked.find(
    (item) => item.level >= startOrderIndex && !item.lesson.locked && item.lesson.status !== 'COMPLETED',
  );
  if (preferred) {
    return preferred.lesson;
  }
  const earlier = ranked.find((item) => !item.lesson.locked && item.lesson.status !== 'COMPLETED');
  return earlier?.lesson ?? ranked.find((item) => !item.lesson.locked)?.lesson ?? null;
}

export function resolveLessonId(
  modules: ModuleProgress[],
  requestedId: string | null,
  startOrderIndex = 1,
): string | null {
  if (requestedId) {
    const requested = modules.flatMap((module) => module.lessons).find((lesson) => lesson.id === requestedId);
    if (requested && !requested.locked) {
      return requested.id;
    }
  }
  return firstOpenLesson(modules, startOrderIndex)?.id ?? null;
}

export function completedLessonCount(modules: ModuleProgress[]): { completed: number; total: number } {
  const lessons = modules.flatMap((module) => module.lessons);
  return {
    completed: lessons.filter((lesson) => lesson.status === 'COMPLETED').length,
    total: lessons.length,
  };
}

export function adjacentOpenLesson(
  modules: ModuleProgress[],
  lessonId: string,
  direction: -1 | 1,
): LessonProgress | null {
  const open = modules.flatMap((module) => module.lessons).filter((lesson) => !lesson.locked);
  const index = open.findIndex((lesson) => lesson.id === lessonId);
  if (index < 0) {
    return null;
  }
  return open[index + direction] ?? null;
}

export function newlyUnlockedModuleIds(before: ModuleProgress[], after: ModuleProgress[]): string[] {
  const wasLocked = new Map(before.map((module) => [module.id, module.locked]));
  return after.filter((module) => wasLocked.get(module.id) === true && !module.locked).map((module) => module.id);
}

export function completeProgressBody(
  type: LessonProgress['type'],
  score: string,
): { status: 'COMPLETED'; score?: number } | string {
  if (type !== 'QUIZ') {
    return { status: 'COMPLETED' };
  }
  if (!/^\d+$/.test(score.trim())) {
    return 'Enter a score from 0 to 100.';
  }
  const value = Number(score);
  if (value < 0 || value > 100) {
    return 'Enter a score from 0 to 100.';
  }
  return { status: 'COMPLETED', score: value };
}
