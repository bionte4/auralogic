'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ClassRoster } from '@/components/instructor/class-roster';
import { CourseProfileForm } from '@/components/instructor/course-profile-form';
import { PhaseProjectForm } from '@/components/instructor/phase-project-form';
import { PlacementEditor } from '@/components/instructor/placement-editor';
import { LessonMaterials } from '@/components/instructor/lesson-materials';
import { LessonUploader } from '@/components/instructor/lesson-uploader';
import { useI18n } from '@/components/locale-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiRequest } from '@/lib/api';
import { formatIdr, LESSON_TYPES, validateLessonDraft, validateModuleTitle, type LessonDraft } from '@/lib/course-draft';
import type { CourseDetail, CourseRoster, CreatedLesson, CreatedModule, LessonSummary } from '@/lib/courses';
import { trackSlugLabel } from '@/lib/learning-tracks';
import { readSession } from '@/lib/session';

type StudioTab = 'outline' | 'video' | 'students';

export function CourseStudio({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { m } = useI18n();
  const searchParams = useSearchParams();
  const setup = searchParams.get('setup') === '1';
  const [tab, setTab] = useState<StudioTab>('outline');
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [roster, setRoster] = useState<CourseRoster | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [nextCourse, nextRoster] = await Promise.all([
      apiRequest<CourseDetail>(`/courses/${courseId}`),
      apiRequest<CourseRoster>(`/courses/${courseId}/roster`),
    ]);
    setCourse(nextCourse);
    setRoster(nextRoster);
  }, [courseId]);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace('/instructor/login');
      return;
    }
    void load().catch((caught: unknown) => {
      setError(caught instanceof ApiError ? caught.message : 'Could not load this course.');
    });
  }, [load, router]);

  async function publish() {
    setError(null);
    try {
      await apiRequest(`/courses/${courseId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not publish the course.');
    }
  }

  if (!course) {
    return <p className="text-sm text-muted-foreground">{error ?? 'Loading course…'}</p>;
  }

  const videoLessons = course.modules.flatMap((module) =>
    module.lessons.filter((lesson) => lesson.type === 'VIDEO').map((lesson) => ({ ...lesson, level: module.orderIndex })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {m.bands[course.level]} · {trackSlugLabel(course.track, m.tracks)} · {m.languages[course.contentLocale]} · {formatIdr(course.price)}
          </p>
          <h1 className="mt-1 text-3xl font-semibold">{course.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{course.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{course.status}</Badge>
          {course.status === 'DRAFT' ? (
            <Button type="button" onClick={() => void publish()}>
              Publish
            </Button>
          ) : null}
        </div>
      </div>

      {setup ? (
        <p className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Step 2 adds modules in level order. Step 3 adds lessons inside each module. The server assigns orderIndex.
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <TabButton active={tab === 'outline'} onClick={() => setTab('outline')}>
          Outline
        </TabButton>
        <TabButton active={tab === 'video'} onClick={() => setTab('video')}>
          Video
        </TabButton>
        <TabButton active={tab === 'students'} onClick={() => setTab('students')}>
          Students
        </TabButton>
      </div>

      {tab === 'outline' ? (
        <Outline
          course={course}
          canDelete={readSession()?.role === 'SUPER_ADMIN'}
          onChange={async () => {
            await load();
          }}
          onError={setError}
        />
      ) : null}
      {tab === 'video' ? (
        <div className="grid gap-4">
          {videoLessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add a VIDEO lesson in the outline before uploading.</p>
          ) : (
            videoLessons.map((lesson) => (
              <LessonUploader
                key={lesson.id}
                lessonId={lesson.id}
                lessonTitle={`Level ${lesson.level} · ${lesson.title}`}
                orderIndex={lesson.orderIndex}
                hasStream={lesson.hasStream}
                onUploaded={async () => {
                  await load();
                }}
              />
            ))
          )}
        </div>
      ) : null}
      {tab === 'students' ? (
        <ClassRoster
          courseId={course.id}
          roster={roster}
          onChange={async () => {
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function Outline({
  course,
  canDelete,
  onChange,
  onError,
}: {
  course: CourseDetail;
  canDelete: boolean;
  onChange: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleOutcome, setModuleOutcome] = useState('');
  const [lessonByModule, setLessonByModule] = useState<Record<string, LessonDraft>>({});

  async function addModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateModuleTitle(moduleTitle);
    if (validation) {
      onError(validation);
      return;
    }
    onError(null);
    try {
      await apiRequest<CreatedModule>(`/courses/${course.id}/modules`, {
        method: 'POST',
        body: JSON.stringify({
          title: moduleTitle.trim(),
          ...(moduleOutcome.trim() ? { outcome: moduleOutcome.trim() } : {}),
        }),
      });
      setModuleTitle('');
      setModuleOutcome('');
      await onChange();
    } catch (caught) {
      onError(caught instanceof ApiError ? caught.message : 'Could not add the module.');
    }
  }

  async function addLesson(moduleId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = lessonByModule[moduleId] ?? { title: '', type: 'VIDEO', passingScore: '80' };
    const validation = validateLessonDraft(draft);
    if (validation) {
      onError(validation);
      return;
    }
    onError(null);
    try {
      await apiRequest<CreatedLesson>(`/courses/${course.id}/modules/${moduleId}/lessons`, {
        method: 'POST',
        body: JSON.stringify({
          title: draft.title.trim(),
          type: draft.type,
          ...(draft.type === 'QUIZ' ? { passingScore: Number(draft.passingScore) } : {}),
        }),
      });
      setLessonByModule({ ...lessonByModule, [moduleId]: { title: '', type: 'VIDEO', passingScore: '80' } });
      await onChange();
    } catch (caught) {
      onError(caught instanceof ApiError ? caught.message : 'Could not add the lesson.');
    }
  }

  const { m } = useI18n();
  const editable = course.status === 'DRAFT';

  return (
    <div className="flex flex-col gap-4">
      {editable ? <p className="text-sm text-muted-foreground">{m.studio.draftHint}</p> : null}
      {canDelete ? <p className="text-sm text-muted-foreground">{m.studio.adminDeleteHint}</p> : null}
      <CourseProfileForm course={course} onSaved={onChange} onError={onError} />
      <PlacementEditor courseId={course.id} levelCount={Math.max(1, course.modules.length)} />
      <PhaseProjectForm courseId={course.id} />
      <Card>
        <CardHeader>
          <CardTitle>Add a module</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={(event) => void addModule(event)}>
            <Label className="sr-only" htmlFor="module-title">
              Module title
            </Label>
            <Input
              id="module-title"
              placeholder="Level title"
              value={moduleTitle}
              onChange={(event) => setModuleTitle(event.target.value)}
            />
            <Input
              aria-label="Level learning outcome"
              placeholder="Learning outcome for this level"
              value={moduleOutcome}
              onChange={(event) => setModuleOutcome(event.target.value)}
            />
            <Button type="submit" className="min-h-11 sm:w-fit">
              Add level
            </Button>
          </form>
        </CardContent>
      </Card>

      {course.modules.map((module) => {
        const draft = lessonByModule[module.id] ?? { title: '', type: 'VIDEO' as const, passingScore: '80' };
        return (
          <Card key={module.id}>
            <CardHeader>
              <CardTitle>
                Level {module.orderIndex} · {module.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ModuleEditor
                courseId={course.id}
                moduleId={module.id}
                title={module.title}
                outcome={module.outcome}
                editable={editable}
                canDelete={canDelete}
                onChange={onChange}
                onError={onError}
              />
              <ol className="flex flex-col gap-2">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id} className="flex flex-col gap-3 text-sm">
                    <LessonEditor
                      courseId={course.id}
                      moduleId={module.id}
                      lesson={lesson}
                      editable={editable}
                      canDelete={canDelete}
                      onChange={onChange}
                      onError={onError}
                    />
                    {lesson.type === 'QUIZ' ? <QuizBankForm lessonId={lesson.id} onError={onError} /> : null}
                    <LessonMaterials lessonId={lesson.id} canDelete={canDelete} onError={onError} />
                  </li>
                ))}
              </ol>
              <form className="grid gap-3 sm:grid-cols-[1fr_8rem_6rem_auto]" onSubmit={(event) => void addLesson(module.id, event)}>
                <Input
                  aria-label={`Lesson title for level ${module.orderIndex}`}
                  placeholder="Lesson title"
                  value={draft.title}
                  onChange={(event) =>
                    setLessonByModule({ ...lessonByModule, [module.id]: { ...draft, title: event.target.value } })
                  }
                />
                <select
                  aria-label={`Lesson type for level ${module.orderIndex}`}
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={draft.type}
                  onChange={(event) =>
                    setLessonByModule({
                      ...lessonByModule,
                      [module.id]: { ...draft, type: event.target.value as LessonDraft['type'] },
                    })
                  }
                >
                  {LESSON_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {draft.type === 'QUIZ' ? (
                  <Input
                    aria-label={`Passing score for level ${module.orderIndex}`}
                    inputMode="numeric"
                    value={draft.passingScore}
                    onChange={(event) =>
                      setLessonByModule({
                        ...lessonByModule,
                        [module.id]: { ...draft, passingScore: event.target.value },
                      })
                    }
                  />
                ) : (
                  <span />
                )}
                <Button type="submit">Add lesson</Button>
              </form>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ModuleEditor({
  courseId,
  moduleId,
  title,
  outcome,
  editable,
  canDelete,
  onChange,
  onError,
}: {
  courseId: string;
  moduleId: string;
  title: string;
  outcome: string | null;
  editable: boolean;
  canDelete: boolean;
  onChange: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const { m } = useI18n();
  const [open, setOpen] = useState(false);
  const [nextTitle, setNextTitle] = useState(title);
  const [nextOutcome, setNextOutcome] = useState(outcome ?? '');
  const [pending, setPending] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateModuleTitle(nextTitle);
    if (validation) {
      onError(validation);
      return;
    }
    setPending(true);
    onError(null);
    try {
      await apiRequest(`/courses/${courseId}/modules/${moduleId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: nextTitle.trim(), outcome: nextOutcome.trim() || null }),
      });
      setOpen(false);
      await onChange();
    } catch (caught) {
      onError(caught instanceof ApiError ? caught.message : m.studio.moduleSaveError);
    } finally {
      setPending(false);
    }
  }

  async function remove(): Promise<void> {
    if (!window.confirm(m.studio.deleteModuleConfirm)) {
      return;
    }
    setPending(true);
    onError(null);
    try {
      await apiRequest(`/courses/${courseId}/modules/${moduleId}`, { method: 'DELETE' });
      await onChange();
    } catch (caught) {
      onError(caught instanceof ApiError ? caught.message : m.studio.moduleDeleteError);
    } finally {
      setPending(false);
    }
  }

  const actions = (
    <div className="flex gap-2">
      {editable ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setNextTitle(title);
            setNextOutcome(outcome ?? '');
            setOpen(true);
          }}
        >
          {m.studio.edit}
        </Button>
      ) : null}
      {canDelete ? (
        <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => void remove()}>
          {pending ? m.studio.deleting : m.studio.delete}
        </Button>
      ) : null}
    </div>
  );

  if (!editable && !canDelete) {
    return outcome ? <p className="text-sm text-muted-foreground">{outcome}</p> : null;
  }
  if (!open) {
    return (
      <div className="flex flex-wrap items-start justify-between gap-3">
        {outcome ? <p className="text-sm text-muted-foreground">{outcome}</p> : <span />}
        {actions}
      </div>
    );
  }
  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => void save(event)}>
      <Label htmlFor={`module-edit-${moduleId}`}>{m.studio.moduleTitle}</Label>
      <Input id={`module-edit-${moduleId}`} value={nextTitle} onChange={(event) => setNextTitle(event.target.value)} />
      <Label htmlFor={`module-outcome-${moduleId}`}>{m.studio.moduleOutcome}</Label>
      <Input
        id={`module-outcome-${moduleId}`}
        value={nextOutcome}
        onChange={(event) => setNextOutcome(event.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? m.studio.saving : m.studio.save}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
          {m.studio.cancel}
        </Button>
      </div>
    </form>
  );
}

function LessonEditor({
  courseId,
  moduleId,
  lesson,
  editable,
  canDelete,
  onChange,
  onError,
}: {
  courseId: string;
  moduleId: string;
  lesson: LessonSummary;
  editable: boolean;
  canDelete: boolean;
  onChange: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const { m } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LessonDraft>({
    title: lesson.title,
    type: lesson.type,
    passingScore: lesson.passingScore === null ? '80' : String(lesson.passingScore),
  });
  const [pending, setPending] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateLessonDraft(draft);
    if (validation) {
      onError(validation);
      return;
    }
    setPending(true);
    onError(null);
    try {
      await apiRequest(`/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: draft.title.trim(),
          type: draft.type,
          ...(draft.type === 'QUIZ' ? { passingScore: Number(draft.passingScore) } : {}),
        }),
      });
      setOpen(false);
      await onChange();
    } catch (caught) {
      onError(caught instanceof ApiError ? caught.message : m.studio.lessonSaveError);
    } finally {
      setPending(false);
    }
  }

  async function remove(): Promise<void> {
    if (!window.confirm(m.studio.deleteLessonConfirm)) {
      return;
    }
    setPending(true);
    onError(null);
    try {
      await apiRequest(`/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, { method: 'DELETE' });
      await onChange();
    } catch (caught) {
      onError(caught instanceof ApiError ? caught.message : m.studio.lessonDeleteError);
    } finally {
      setPending(false);
    }
  }

  const summary = (
    <div className="flex items-center justify-between gap-3">
      <span>
        Lesson {lesson.orderIndex} · {lesson.title}
      </span>
      <span className="flex items-center gap-2">
        <Badge>
          {lesson.type}
          {lesson.type === 'VIDEO' && lesson.hasStream ? ' · HLS' : ''}
          {lesson.passingScore !== null ? ` · ${lesson.passingScore}` : ''}
        </Badge>
        {editable ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setDraft({
                title: lesson.title,
                type: lesson.type,
                passingScore: lesson.passingScore === null ? '80' : String(lesson.passingScore),
              });
              setOpen(true);
            }}
          >
            {m.studio.edit}
          </Button>
        ) : null}
        {canDelete ? (
          <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => void remove()}>
            {pending ? m.studio.deleting : m.studio.delete}
          </Button>
        ) : null}
      </span>
    </div>
  );

  if (!open) {
    return summary;
  }
  return (
    <form className="grid gap-2 sm:grid-cols-[1fr_8rem_6rem_auto_auto]" onSubmit={(event) => void save(event)}>
      <Input
        aria-label={m.studio.lessonTitle}
        value={draft.title}
        onChange={(event) => setDraft({ ...draft, title: event.target.value })}
      />
      <select
        aria-label="Lesson type"
        className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
        value={draft.type}
        onChange={(event) => setDraft({ ...draft, type: event.target.value as LessonDraft['type'] })}
      >
        {LESSON_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      {draft.type === 'QUIZ' ? (
        <Input
          aria-label={m.studio.passingScore}
          inputMode="numeric"
          value={draft.passingScore}
          onChange={(event) => setDraft({ ...draft, passingScore: event.target.value })}
        />
      ) : (
        <span />
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? m.studio.saving : m.studio.save}
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
        {m.studio.cancel}
      </Button>
    </form>
  );
}

function QuizBankForm({ lessonId, onError }: { lessonId: string; onError: (message: string | null) => void }) {
  const [prompt, setPrompt] = useState('');
  const [choiceA, setChoiceA] = useState('');
  const [choiceB, setChoiceB] = useState('');
  const [correct, setCorrect] = useState<'A' | 'B'>('A');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (prompt.trim().length < 3 || choiceA.trim().length === 0 || choiceB.trim().length === 0) {
      onError('Add a prompt and two choices.');
      return;
    }
    onError(null);
    try {
      await apiRequest(`/lessons/${lessonId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          prompt: prompt.trim(),
          choices: [
            { text: choiceA.trim(), correct: correct === 'A' },
            { text: choiceB.trim(), correct: correct === 'B' },
          ],
        }),
      });
      setPrompt('');
      setChoiceA('');
      setChoiceB('');
    } catch (caught) {
      onError(caught instanceof ApiError ? caught.message : 'Could not add the question.');
    }
  }

  return (
    <form className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-2" onSubmit={(event) => void submit(event)}>
      <Input
        className="sm:col-span-2"
        aria-label="Question prompt"
        placeholder="Question"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
      />
      <Input aria-label="Choice A" placeholder="Choice A" value={choiceA} onChange={(event) => setChoiceA(event.target.value)} />
      <Input aria-label="Choice B" placeholder="Choice B" value={choiceB} onChange={(event) => setChoiceB(event.target.value)} />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Correct
        <select
          aria-label="Correct choice"
          className="h-10 rounded-md border border-input bg-transparent px-3 text-sm text-foreground"
          value={correct}
          onChange={(event) => setCorrect(event.target.value === 'B' ? 'B' : 'A')}
        >
          <option value="A">A</option>
          <option value="B">B</option>
        </select>
      </label>
      <Button type="submit">Add question</Button>
    </form>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <Button type="button" variant={active ? 'default' : 'outline'} size="sm" onClick={onClick}>
      {children}
    </Button>
  );
}
