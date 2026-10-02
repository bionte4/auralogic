'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { LessonMaterials } from '@/components/instructor/lesson-materials';
import { LessonUploader } from '@/components/instructor/lesson-uploader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiRequest } from '@/lib/api';
import { formatIdr, LESSON_TYPES, validateLessonDraft, validateModuleTitle, type LessonDraft } from '@/lib/course-draft';
import type { CourseDetail, CourseRoster, CreatedLesson, CreatedModule } from '@/lib/courses';
import { readSession } from '@/lib/session';

type StudioTab = 'outline' | 'video' | 'students';

export function CourseStudio({ courseId }: { courseId: string }) {
  const router = useRouter();
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
            {course.level} · {formatIdr(course.price)}
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
      {tab === 'students' ? <RosterTable roster={roster} /> : null}
    </div>
  );
}

function Outline({
  course,
  onChange,
  onError,
}: {
  course: CourseDetail;
  onChange: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [moduleTitle, setModuleTitle] = useState('');
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
        body: JSON.stringify({ title: moduleTitle.trim() }),
      });
      setModuleTitle('');
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

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Add a module</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => void addModule(event)}>
            <Label className="sr-only" htmlFor="module-title">
              Module title
            </Label>
            <Input
              id="module-title"
              placeholder="Level title"
              value={moduleTitle}
              onChange={(event) => setModuleTitle(event.target.value)}
            />
            <Button type="submit">Add level</Button>
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
              <ol className="flex flex-col gap-2">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id} className="flex flex-col gap-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        Lesson {lesson.orderIndex} · {lesson.title}
                      </span>
                      <Badge>
                        {lesson.type}
                        {lesson.type === 'VIDEO' && lesson.hasStream ? ' · HLS' : ''}
                        {lesson.passingScore !== null ? ` · ${lesson.passingScore}` : ''}
                      </Badge>
                    </div>
                    {lesson.type === 'QUIZ' ? <QuizBankForm lessonId={lesson.id} onError={onError} /> : null}
                    <LessonMaterials lessonId={lesson.id} onError={onError} />
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

function RosterTable({ roster }: { roster: CourseRoster | null }) {
  if (!roster || roster.enrollments.length === 0) {
    return <p className="text-sm text-muted-foreground">No enrollments yet. Payment stays pending until a webhook verifies it.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Student</th>
            <th className="px-4 py-3 font-medium">Enrollment</th>
            <th className="px-4 py-3 font-medium">Payment</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Progress</th>
          </tr>
        </thead>
        <tbody>
          {roster.enrollments.map((entry) => (
            <tr key={entry.enrollmentId} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium">{entry.student.name}</p>
                <p className="text-muted-foreground">{entry.student.email}</p>
              </td>
              <td className="px-4 py-3">{entry.status}</td>
              <td className="px-4 py-3">
                {entry.paymentStatus}
                {entry.paidAt ? <span className="block text-xs text-muted-foreground">{entry.paidAt.slice(0, 10)}</span> : null}
              </td>
              <td className="px-4 py-3">{formatIdr(entry.amount)}</td>
              <td className="px-4 py-3">
                {entry.completedLessons}/{entry.lessonCount} · {entry.progressPercent}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <Button type="button" variant={active ? 'default' : 'outline'} size="sm" onClick={onClick}>
      {children}
    </Button>
  );
}
