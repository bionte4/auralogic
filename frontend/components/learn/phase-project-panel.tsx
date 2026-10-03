'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/components/locale-provider';
import { ApiError, apiRequest } from '@/lib/api';

interface PhaseProjectView {
  project: {
    id: string;
    title: string;
    prompt: string;
    kind: 'LAB_REPORT' | 'ANALYSIS' | 'DESIGN' | 'NOTEBOOK';
    rubric: string;
  } | null;
  submission: {
    response: string;
    score: number | null;
    feedback: string | null;
  } | null;
  lessonsComplete: boolean;
}

export function PhaseProjectPanel({ courseId }: { courseId: string }) {
  const { m } = useI18n();
  const [view, setView] = useState<PhaseProjectView | null>(null);
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void apiRequest<PhaseProjectView>(`/courses/${courseId}/project`)
      .then((next) => {
        setView(next);
        setResponse(next.submission?.response ?? '');
      })
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : m.project.loadError);
      });
  }, [courseId]);

  if (!view?.project) {
    return error ? <p className="text-sm text-destructive">{error}</p> : null;
  }

  const scored = view.submission?.score !== null && view.submission?.score !== undefined;

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiRequest(`/courses/${courseId}/project/submission`, {
        method: 'POST',
        body: JSON.stringify({ response: response.trim() }),
      });
      const next = await apiRequest<PhaseProjectView>(`/courses/${courseId}/project`);
      setView(next);
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : m.project.submitError);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {m.project.title} · {m.kinds[view.project.kind]}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div>
          <p className="font-medium">{view.project.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{view.project.prompt}</p>
        </div>
        <p className="text-sm">
          <span className="font-medium">{m.project.rubric}. </span>
          {view.project.rubric}
        </p>
        {scored ? (
          <p className="text-sm">
            {m.project.score} {view.submission?.score}
            {view.submission?.feedback ? ` · ${view.submission.feedback}` : ''}
          </p>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
            <Textarea
              aria-label={m.project.response}
              value={response}
              maxLength={8000}
              onChange={(event) => setResponse(event.target.value)}
              placeholder={m.project.placeholder}
              disabled={!view.lessonsComplete}
            />
            {view.lessonsComplete ? null : (
              <p className="text-sm text-muted-foreground">{m.project.locked}</p>
            )}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={pending || !view.lessonsComplete || response.trim().length === 0}>
              {pending ? 'Submitting…' : view.submission ? 'Update submission' : 'Submit project'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
