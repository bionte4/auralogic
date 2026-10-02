import { adjacentOpenLesson, completeProgressBody, completedLessonCount, continueTarget, firstOpenLesson, newlyUnlockedModuleIds, overallProgress, resolveLessonId, type ModuleProgress } from './learn-progress';

const modules: ModuleProgress[] = [
  {
    id: 'level-1',
    title: 'Introductions',
    orderIndex: 1,
    locked: false,
    completed: true,
    lessons: [
      { id: 'lesson-1', title: 'Hello', type: 'VIDEO', orderIndex: 1, locked: false, status: 'COMPLETED', score: null },
    ],
  },
  {
    id: 'level-2',
    title: 'Meetings',
    orderIndex: 2,
    locked: true,
    completed: false,
    lessons: [
      { id: 'lesson-2', title: 'Agenda', type: 'READING', orderIndex: 1, locked: true, status: 'NOT_STARTED', score: null },
    ],
  },
];

describe('course player progress', () => {
  it('opens the first unfinished lesson and ignores a locked id', () => {
    expect(firstOpenLesson(modules)?.id).toBe('lesson-1');
    expect(resolveLessonId(modules, 'lesson-2')).toBe('lesson-1');
    expect(resolveLessonId(modules, 'lesson-1')).toBe('lesson-1');
  });

  it('detects the module that a completion just unlocked', () => {
    const after = modules.map((module) => (module.id === 'level-2' ? { ...module, locked: false, lessons: module.lessons.map((lesson) => ({ ...lesson, locked: false })) } : module));
    expect(newlyUnlockedModuleIds(modules, after)).toEqual(['level-2']);
  });

  it('moves between open lessons and skips locked ones', () => {
    expect(adjacentOpenLesson(modules, 'lesson-1', 1)).toBeNull();
    const opened = modules.map((module) =>
      module.id === 'level-2' ? { ...module, locked: false, lessons: module.lessons.map((lesson) => ({ ...lesson, locked: false })) } : module,
    );
    expect(adjacentOpenLesson(opened, 'lesson-1', 1)?.id).toBe('lesson-2');
    expect(adjacentOpenLesson(opened, 'lesson-2', -1)?.id).toBe('lesson-1');
  });

  it('averages active courses and points continue learning at the next open lesson', () => {
    expect(overallProgress([{ accessGranted: true, progressPercent: 40 }, { accessGranted: false, progressPercent: 0 }])).toBe(40);
    const target = continueTarget(
      [{ courseId: 'course-1', title: 'Workplace English', accessGranted: true, progressPercent: 0 }],
      () => modules,
    );
    expect(target?.lesson.id).toBe('lesson-1');
    expect(target?.course.title).toBe('Workplace English');
  });

  it('counts completed lessons for the outline progress bar', () => {
    expect(completedLessonCount(modules)).toEqual({ completed: 1, total: 2 });
  });

  it('sends a quiz score and omits it for video lessons', () => {
    expect(completeProgressBody('VIDEO', '')).toEqual({ status: 'COMPLETED' });
    expect(completeProgressBody('QUIZ', '80')).toEqual({ status: 'COMPLETED', score: 80 });
    expect(completeProgressBody('QUIZ', '')).toMatch(/score/);
  });
});
