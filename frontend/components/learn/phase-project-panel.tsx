'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiRequest } from '@/lib/api';

interface PhaseProjectView {
  project: {
    id: string;
    title: string;
    prompt: string;
    kind: 'WRITING' | 'SPEAKING';
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
        setError(caught instanceof ApiError ? caught.message : 'Could not load the phase project.');
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
      setError(caught instanceof ApiError ? caught.message : 'Could not submit the phase project.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Phase project · {view.project.kind === 'SPEAKING' ? 'Speaking' : 'Writing'}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div>
          <p className="font-medium">{view.project.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{view.project.prompt}</p>
        </div>
        <p className="text-sm">
          <span className="font-medium">Rubric. </span>
          {view.project.rubric}
        </p>
        {scored ? (
          <p className="text-sm">
            Score {view.submission?.score}
            {view.submission?.feedback ? ` · ${view.submission.feedback}` : ''}
          </p>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
            <Textarea
              aria-label="Phase project response"
              value={response}
              maxLength={8000}
              onChange={(event) => setResponse(event.target.value)}
              placeholder={view.project.kind === 'SPEAKING' ? 'Write the transcript of what you said.' : 'Write your response.'}
              disabled={!view.lessonsComplete}
            />
            {view.lessonsComplete ? null : (
              <p className="text-sm text-muted-foreground">Finish every lesson before you submit this project.</p>
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
