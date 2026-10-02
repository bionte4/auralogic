'use client';

import { Check, ChevronDown, Lock, Menu, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { SecureVideoPlayer, type SecurePlayerControls } from '@/components/player/SecureVideoPlayer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiRequest } from '@/lib/api';
import { downloadLessonMaterial } from '@/lib/lesson-materials';
import type { CourseSummary } from '@/lib/courses';
import {
  adjacentOpenLesson,
  completeProgressBody,
  completedLessonCount,
  newlyUnlockedModuleIds,
  resolveLessonId,
  type LessonProgress,
  type ModuleProgress,
} from '@/lib/learn-progress';
import { collapsedModulesKey, lessonNoteKey, outlineScrollKey, parseCollapsedModuleIds, parseScrollTop, toggleCollapsed } from '@/lib/outline-memory';
import { playerKeyAction } from '@/lib/player-keys';
import { readSession } from '@/lib/session';

const PRACTICE_PROMPTS = [
  'Summarize this lesson in three sentences.',
  'List five phrases I should practice aloud.',
  'Write one question I still cannot answer.',
];

interface CourseProgress {
  courseId: string;
  enrollmentActive: boolean;
  modules: ModuleProgress[];
}

interface LessonMaterial {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

interface LessonDetail {
  id: string;
  title: string;
  description: string | null;
  type: LessonProgress['type'];
  passingScore: number | null;
  attachments?: LessonMaterial[];
}

interface PlaybackGrant {
  manifestUrl: string;
  watermark: { userId: string; email: string };
}

interface QuizQuestionView {
  id: string;
  prompt: string;
  choices: Array<{ id: string; text: string }>;
}

interface PublicQuiz {
  lessonId: string;
  passingScore: number;
  questions: QuizQuestionView[];
}

interface QuizGrade {
  score: number;
  passed: boolean;
  passingScore: number;
  correct: number;
  total: number;
}

export function CoursePlayer({ courseId }: { courseId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedLessonId = searchParams.get('lesson');
  const [course, setCourse] = useState<CourseSummary | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [detail, setDetail] = useState<LessonDetail | null>(null);
  const [playback, setPlayback] = useState<PlaybackGrant | null>(null);
  const [score, setScore] = useState('');
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [curriculumOpen, setCurriculumOpen] = useState(true);
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);
  const [freshModuleIds, setFreshModuleIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const outlineId = useId();
  const outlineButtonRef = useRef<HTMLButtonElement>(null);
  const outlinePanelRef = useRef<HTMLElement>(null);
  const bindDrawer = useCallback((node: HTMLElement | null) => {
    outlinePanelRef.current = node;
    if (node) {
      node.scrollTop = parseScrollTop(window.sessionStorage.getItem(outlineScrollKey(courseId)));
    }
  }, [courseId]);
  const bindDesktopOutline = useCallback((node: HTMLElement | null) => {
    if (node) {
      node.scrollTop = parseScrollTop(window.sessionStorage.getItem(outlineScrollKey(courseId)));
    }
  }, [courseId]);
  const controlsRef = useRef<SecurePlayerControls | null>(null);
  const desktopRef = useRef(false);
  const selectedIdRef = useRef<string | null>(null);
  const selectLessonRef = useRef<(lesson: LessonProgress) => void>(() => undefined);

  const loadOutline = useCallback(async () => {
    const [nextCourse, nextProgress] = await Promise.all([
      apiRequest<CourseSummary>(`/courses/${courseId}`),
      apiRequest<CourseProgress>(`/courses/${courseId}/progress`),
    ]);
    setCourse(nextCourse);
    setProgress(nextProgress);
    return nextProgress;
  }, [courseId]);

  const openLesson = useCallback(async (lessonId: string, modules: ModuleProgress[]) => {
    const lesson = modules.flatMap((module) => module.lessons).find((item) => item.id === lessonId);
    if (!lesson || lesson.locked) {
      setDetail(null);
      setPlayback(null);
      setQuiz(null);
      return;
    }
    const nextDetail = await apiRequest<LessonDetail>(`/lessons/${lessonId}`);
    setDetail(nextDetail);
    setAnswers({});
    if (nextDetail.type === 'VIDEO') {
      setPlayback(await apiRequest<PlaybackGrant>(`/lessons/${lessonId}/playback`));
      setQuiz(null);
    } else if (nextDetail.type === 'QUIZ') {
      setPlayback(null);
      setQuiz(await apiRequest<PublicQuiz>(`/lessons/${lessonId}/quiz`));
    } else {
      setPlayback(null);
      setQuiz(null);
    }
  }, []);

  useEffect(() => {
    const session = readSession();
    if (!session || session.role !== 'STUDENT') {
      router.replace('/student/login');
      return;
    }
    void loadOutline().catch((caught: unknown) => {
      setError(caught instanceof ApiError ? caught.message : 'Could not open this course.');
    });
  }, [loadOutline, router]);

  useEffect(() => {
    if (!progress) {
      return;
    }
    const lessonId = resolveLessonId(progress.modules, requestedLessonId);
    if (!lessonId) {
      setDetail(null);
      setPlayback(null);
      return;
    }
    void openLesson(lessonId, progress.modules).catch((caught: unknown) => {
      setError(caught instanceof ApiError ? caught.message : 'Could not open this lesson.');
    });
  }, [openLesson, progress, requestedLessonId]);

  useEffect(() => {
    if (!outlineOpen) {
      return undefined;
    }
    const panel = outlinePanelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel?.querySelector<HTMLElement>('button')?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOutlineOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !panel) {
        return;
      }
      const focusable = [...panel.querySelectorAll<HTMLElement>('button, [href], input, select, textarea')].filter(
        (element) => !element.hasAttribute('disabled'),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      outlineButtonRef.current?.focus();
    };
  }, [outlineOpen]);

  useEffect(() => {
    setCollapsedIds(parseCollapsedModuleIds(window.sessionStorage.getItem(collapsedModulesKey(courseId))));
    setCurriculumOpen(window.sessionStorage.getItem('fluentis.curriculum.open') !== '0');
  }, [courseId]);

  useEffect(() => {
    if (freshModuleIds.length === 0) {
      return undefined;
    }
    const timer = window.setTimeout(() => setFreshModuleIds([]), 1600);
    return () => window.clearTimeout(timer);
  }, [freshModuleIds]);

  useEffect(() => {
    if (!detail) {
      return;
    }
    setNote(window.sessionStorage.getItem(lessonNoteKey(detail.id)) ?? '');
  }, [detail]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    function sync() {
      desktopRef.current = media.matches;
    }
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const action = playerKeyAction({
        key: event.key,
        desktop: desktopRef.current,
        targetTag: target?.tagName ?? '',
        editable: target?.isContentEditable ?? false,
      });
      if (!action) {
        return;
      }
      if (action.type === 'toggle-play') {
        if (!controlsRef.current) {
          return;
        }
        event.preventDefault();
        controlsRef.current.togglePlay();
        return;
      }
      if (action.type === 'seek' && controlsRef.current) {
        event.preventDefault();
        controlsRef.current.seekBy(action.delta);
        return;
      }
      const direction: -1 | 1 = action.type === 'shift-lesson' ? action.direction : action.delta < 0 ? -1 : 1;
      const currentId = selectedIdRef.current;
      if (!progress || !currentId) {
        return;
      }
      const next = adjacentOpenLesson(progress.modules, currentId, direction);
      if (!next) {
        return;
      }
      event.preventDefault();
      selectLessonRef.current(next);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [progress]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    function closeOnDesktop() {
      if (media.matches) {
        setOutlineOpen(false);
      }
    }
    media.addEventListener('change', closeOnDesktop);
    return () => media.removeEventListener('change', closeOnDesktop);
  }, []);

  function selectLesson(lesson: LessonProgress) {
    if (lesson.locked) {
      return;
    }
    setError(null);
    setNotice(null);
    setScore('');
    setQuiz(null);
    setAnswers({});
    const params = new URLSearchParams(searchParams.toString());
    params.set('lesson', lesson.id);
    setOutlineOpen(false);
    router.replace(`/learn/${courseId}?${params.toString()}`);
  }
  selectLessonRef.current = selectLesson;

  function describeUnlock(previous: ModuleProgress[], next: CourseProgress, fallback: string): string {
    const unlocked = newlyUnlockedModuleIds(previous, next.modules);
    setFreshModuleIds(unlocked);
    if (unlocked.length > 0) {
      setCollapsedIds((current) => {
        const opened = current.filter((id) => !unlocked.includes(id));
        window.sessionStorage.setItem(collapsedModulesKey(courseId), JSON.stringify(opened));
        return opened;
      });
      const first = unlocked[0];
      if (first) {
        window.requestAnimationFrame(() => {
          const nodes = document.querySelectorAll<HTMLElement>(`[data-module-id="${CSS.escape(first)}"]`);
          const visible = [...nodes].find((node) => node.getClientRects().length > 0);
          visible?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
      }
    }
    const unlockedTitles = next.modules
      .filter((module) => unlocked.includes(module.id))
      .map((module) => `Level ${module.orderIndex}`);
    if (unlockedTitles.length === 0) {
      return fallback;
    }
    return unlockedTitles.length === 1
      ? `${unlockedTitles[0]} is now open.`
      : `${unlockedTitles.join(' and ')} are now open.`;
  }

  function toggleCurriculum() {
    setCurriculumOpen((current) => {
      const next = !current;
      window.sessionStorage.setItem('fluentis.curriculum.open', next ? '1' : '0');
      return next;
    });
  }

  function toggleModule(moduleId: string) {
    setCollapsedIds((current) => {
      const next = toggleCollapsed(current, moduleId);
      window.sessionStorage.setItem(collapsedModulesKey(courseId), JSON.stringify(next));
      return next;
    });
  }

  function rememberOutlineScroll(event: { currentTarget: HTMLElement }) {
    window.sessionStorage.setItem(outlineScrollKey(courseId), String(Math.round(event.currentTarget.scrollTop)));
  }

  function restoreOutlineScroll(node: HTMLElement | null) {
    if (!node) {
      return;
    }
    node.scrollTop = parseScrollTop(window.sessionStorage.getItem(outlineScrollKey(courseId)));
  }

  function saveNote(value: string) {
    const stored = value.slice(0, 4000);
    setNote(stored);
    if (detail) {
      window.sessionStorage.setItem(lessonNoteKey(detail.id), stored);
    }
  }

  async function markComplete() {
    if (!detail || !progress) {
      return;
    }
    const body = completeProgressBody(detail.type, score);
    if (typeof body === 'string') {
      setError(body);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await apiRequest(`/lessons/${detail.id}/progress`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const nextProgress = await loadOutline();
      setNotice(describeUnlock(progress.modules, nextProgress, 'Lesson marked complete.'));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save progress.');
    } finally {
      setPending(false);
    }
  }

  async function submitQuiz() {
    if (!detail || !progress || !quiz || quiz.questions.length === 0) {
      return;
    }
    const payload = quiz.questions.map((question) => ({
      questionId: question.id,
      choiceId: answers[question.id] ?? '',
    }));
    if (payload.some((answer) => answer.choiceId.length === 0)) {
      setError('Answer every question.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const grade = await apiRequest<QuizGrade>(`/lessons/${detail.id}/quiz/attempts`, {
        method: 'POST',
        body: JSON.stringify({ answers: payload }),
      });
      const nextProgress = await loadOutline();
      setNotice(
        grade.passed
          ? describeUnlock(
              progress.modules,
              nextProgress,
              `Passed with ${grade.score}. ${grade.correct} of ${grade.total} correct.`,
            )
          : `Score ${grade.score}. Pass mark is ${grade.passingScore}.`,
      );
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not submit this quiz.');
    } finally {
      setPending(false);
    }
  }

  const selected = progress?.modules.flatMap((module) => module.lessons).find((lesson) => lesson.id === detail?.id) ?? null;
  selectedIdRef.current = selected?.id ?? null;

  if (!course || !progress) {
    return <p className="px-6 py-10 text-sm text-muted-foreground">{error ?? 'Loading course…'}</p>;
  }

  const outlineProps = {
    course,
    modules: progress.modules,
    selectedId: selected?.id ?? null,
    collapsedIds,
    freshModuleIds,
    onToggle: toggleModule,
    onSelect: selectLesson,
  };

  const study = (idPrefix: string) => (
    <StudyPanel
      idPrefix={idPrefix}
      detail={detail}
      selected={selected}
      quiz={quiz}
      answers={answers}
      score={score}
      note={note}
      pending={pending}
      onScore={setScore}
      onAnswer={(questionId, choiceId) => setAnswers({ ...answers, [questionId]: choiceId })}
      onNote={saveNote}
      onSubmit={() => void submitQuiz()}
      onComplete={() => void markComplete()}
    />
  );

  return (
    <div
      className={`mx-auto grid w-full max-w-[96rem] grid-cols-1 ${curriculumOpen ? 'md:grid-cols-[minmax(16rem,18rem)_minmax(0,1fr)] lg:grid-cols-[minmax(16rem,18rem)_minmax(0,1fr)_minmax(16rem,20rem)]' : 'lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]'}`}
    >
      <aside
        ref={bindDesktopOutline}
        onScroll={rememberOutlineScroll}
        className={`sticky top-16 hidden max-h-[calc(100vh-4rem)] overflow-y-auto border-r border-border ${curriculumOpen ? 'md:block' : ''}`}
      >
        <CourseOutline {...outlineProps} />
      </aside>

      {outlineOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Close lesson list" onClick={() => setOutlineOpen(false)} />
          <aside
            ref={bindDrawer}
            id={outlineId}
            role="dialog"
            aria-modal="true"
            aria-label="Course lessons"
            onScroll={rememberOutlineScroll}
            className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col overflow-y-auto bg-background shadow-xl"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background px-4 py-3">
              <p className="text-sm font-medium">Lessons</p>
              <Button type="button" variant="ghost" className="min-h-11 min-w-11" aria-label="Close lesson list" onClick={() => setOutlineOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <CourseOutline {...outlineProps} />
          </aside>
        </div>
      ) : null}

      <section className="flex min-w-0 flex-col gap-5 px-4 py-4 md:px-6 md:py-6 lg:px-8">
        <div className="hidden md:flex">
          <Button type="button" variant="outline" className="min-h-11" aria-expanded={curriculumOpen} onClick={toggleCurriculum}>
            {curriculumOpen ? 'Hide curriculum' : 'Show curriculum'}
          </Button>
        </div>
        <div className="sticky top-16 z-10 -mx-4 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur md:hidden">
          <Button
            ref={outlineButtonRef}
            type="button"
            variant="outline"
            className="min-h-11 shrink-0"
            aria-expanded={outlineOpen}
            aria-controls={outlineId}
            onClick={() => setOutlineOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            Lessons
          </Button>
          <p className="truncate text-sm font-medium">{course.title}</p>
        </div>
        {!progress.enrollmentActive ? (
          <p className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            This course stays locked until the enrollment is active and the payment is verified.
          </p>
        ) : null}
        {notice ? <p className="text-sm text-success">{notice}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {selected && detail ? (
          <>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Level {progress.modules.find((module) => module.lessons.some((lesson) => lesson.id === selected.id))?.orderIndex} · Lesson {selected.orderIndex}
              </p>
              <h2 className="mt-1 text-[clamp(1.35rem,4vw,1.75rem)] font-semibold leading-tight">{detail.title}</h2>
              {detail.description ? <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{detail.description}</p> : null}
            </div>
            {detail.type === 'VIDEO' && playback ? (
              <SecureVideoPlayer
                manifestUrl={playback.manifestUrl}
                watermark={playback.watermark}
                onControls={(controls) => {
                  controlsRef.current = controls;
                }}
              />
            ) : null}
            {detail.type === 'VIDEO' && !playback ? (
              <p className="text-sm text-muted-foreground">This video lesson does not have an HLS stream yet.</p>
            ) : null}
            <LessonResources lessonId={detail.id} materials={detail.attachments ?? []} onError={setError} />
            {selected.status === 'COMPLETED' && detail.type !== 'QUIZ' ? (
              <p className="text-sm text-success transition-opacity">Completed</p>
            ) : null}
            {selected.status !== 'COMPLETED' && detail.type !== 'QUIZ' ? (
              <Button type="button" className="min-h-11 w-full transition-colors sm:w-auto" onClick={() => void markComplete()} disabled={pending || selected.locked}>
                {pending ? 'Saving…' : 'Mark as complete'}
              </Button>
            ) : null}
            <p className="hidden text-xs text-muted-foreground lg:block">Space plays or pauses. Left and right seek 5 seconds. Up and down open the next lesson.</p>
            <div className="rounded-xl border border-border bg-card lg:hidden">{study('narrow')}</div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Choose an open lesson. Locked lessons stay closed until the previous level is complete.</p>
        )}
      </section>
      <aside className="sticky top-16 hidden max-h-[calc(100vh-4rem)] overflow-y-auto border-l border-border bg-card lg:block">
        {study('wide')}
      </aside>
    </div>
  );
}

function CourseOutline({
  course,
  modules,
  selectedId,
  collapsedIds,
  freshModuleIds,
  onToggle,
  onSelect,
}: {
  course: CourseSummary;
  modules: ModuleProgress[];
  selectedId: string | null;
  collapsedIds: readonly string[];
  freshModuleIds: readonly string[];
  onToggle: (moduleId: string) => void;
  onSelect: (lesson: LessonProgress) => void;
}) {
  const { completed, total } = completedLessonCount(modules);
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div>
      <div className="px-4 py-5">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{course.level}</p>
        <h1 className="mt-1 text-[clamp(1.05rem,2.5vw,1.25rem)] font-semibold leading-snug">{course.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {completed} of {total} lessons complete
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-success transition-[width] duration-700" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <nav className="flex flex-col pb-6" aria-label="Modules and lessons">
        {modules.map((module) => {
          const collapsed = collapsedIds.includes(module.id);
          const fresh = freshModuleIds.includes(module.id);
          return (
            <section
              key={module.id}
              data-module-id={module.id}
              className={`px-2 transition-colors duration-700 ${fresh ? 'rounded-md bg-success/10' : ''}`}
            >
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
                aria-expanded={!collapsed}
                onClick={() => onToggle(module.id)}
              >
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`} aria-hidden="true" />
                {module.locked ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                {module.completed ? <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" /> : null}
                <span>
                  Level {module.orderIndex} · {module.title}
                </span>
              </button>
              {collapsed ? null : (
                <ul className="flex flex-col">
                  {module.lessons.map((lesson) => {
                    const active = lesson.id === selectedId;
                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          disabled={lesson.locked}
                          aria-current={active ? 'true' : undefined}
                          onClick={() => onSelect(lesson)}
                          className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-base transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${active ? 'bg-secondary ring-1 ring-success/70' : 'hover:bg-secondary/60'}`}
                        >
                          <LessonStatusIcon lesson={lesson} active={active} />
                          <span>
                            {lesson.orderIndex}. {lesson.title}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </nav>
    </div>
  );
}

function StudyPanel({
  idPrefix,
  detail,
  selected,
  quiz,
  answers,
  score,
  note,
  pending,
  onScore,
  onAnswer,
  onNote,
  onSubmit,
  onComplete,
}: {
  idPrefix: string;
  detail: LessonDetail | null;
  selected: LessonProgress | null;
  quiz: PublicQuiz | null;
  answers: Record<string, string>;
  score: string;
  note: string;
  pending: boolean;
  onScore: (value: string) => void;
  onAnswer: (questionId: string, choiceId: string) => void;
  onNote: (value: string) => void;
  onSubmit: () => void;
  onComplete: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      {detail?.type === 'QUIZ' && selected ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Quiz</h2>
          {selected.status === 'COMPLETED' ? (
            <p className="text-sm text-success transition-opacity">
              Completed{selected.score !== null ? ` · score ${selected.score}` : ''}
            </p>
          ) : quiz && quiz.questions.length > 0 ? (
            <form
              className="flex flex-col gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
              }}
            >
              <p className="text-sm text-muted-foreground">Pass mark {quiz.passingScore}</p>
              {quiz.questions.map((question, index) => (
                <fieldset key={question.id} className="flex flex-col gap-2">
                  <legend className="text-sm font-medium">
                    {index + 1}. {question.prompt}
                  </legend>
                  {question.choices.map((choice) => (
                    <label key={choice.id} className="flex min-h-11 items-center gap-3 text-base">
                      <input
                        type="radio"
                        className="h-4 w-4"
                        name={`${idPrefix}-${question.id}`}
                        value={choice.id}
                        checked={answers[question.id] === choice.id}
                        onChange={() => onAnswer(question.id, choice.id)}
                      />
                      {choice.text}
                    </label>
                  ))}
                </fieldset>
              ))}
              <Button type="submit" disabled={pending || selected.locked} className="min-h-11 w-full">
                {pending ? 'Saving…' : 'Submit answers'}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <Label htmlFor={`${idPrefix}-quiz-score`}>Score {detail.passingScore !== null ? `(pass ${detail.passingScore})` : ''}</Label>
              <Input
                id={`${idPrefix}-quiz-score`}
                inputMode="numeric"
                className="w-32"
                value={score}
                onChange={(event) => onScore(event.target.value)}
              />
              <Button type="button" className="min-h-11 w-full" onClick={onComplete} disabled={pending || selected.locked}>
                {pending ? 'Saving…' : 'Mark as complete'}
              </Button>
            </div>
          )}
        </div>
      ) : null}
      {detail ? (
      <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-note`}>Notes</Label>
        <Textarea
          id={`${idPrefix}-note`}
          value={note}
          maxLength={4000}
          placeholder="Keep a note for this lesson"
          onChange={(event) => onNote(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Practice prompts</p>
        {PRACTICE_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            className="min-h-11 h-auto whitespace-normal px-3 py-2 text-left"
            onClick={() => onNote(note.length === 0 ? prompt : `${note}\n${prompt}`)}
          >
            {prompt}
          </Button>
        ))}
      </div>
      </>
      ) : (
        <p className="text-sm text-muted-foreground">Open a lesson to keep notes and practice prompts.</p>
      )}
    </div>
  );
}

function LessonResources({
  lessonId,
  materials,
  onError,
}: {
  lessonId: string;
  materials: LessonMaterial[];
  onError: (message: string | null) => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function download(material: LessonMaterial) {
    setPendingId(material.id);
    onError(null);
    try {
      await downloadLessonMaterial(lessonId, material);
    } catch (caught) {
      onError(caught instanceof ApiError ? caught.message : 'Could not download this material.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card px-4 py-4">
      <h3 className="text-sm font-semibold">Lesson resources</h3>
      {materials.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">This lesson has no downloadable materials.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {materials.map((material) => (
            <li key={material.id} className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm">
                {material.fileName}
                <span className="ml-2 text-muted-foreground">{formatMaterialSize(material.sizeBytes)}</span>
              </span>
              <Button type="button" variant="outline" className="min-h-11" disabled={pendingId === material.id} onClick={() => void download(material)}>
                {pendingId === material.id ? 'Downloading…' : 'Download'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatMaterialSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function LessonStatusIcon({ lesson, active }: { lesson: LessonProgress; active: boolean }) {
  if (lesson.locked) {
    return <Lock className="h-4 w-4 shrink-0" aria-label="Locked" />;
  }
  if (lesson.status === 'COMPLETED') {
    return <Check className="h-4 w-4 shrink-0 text-success" aria-label="Completed" />;
  }
  if (active) {
    return <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-success" aria-hidden="true" />;
  }
  return <span className="h-4 w-4 shrink-0" />;
}
