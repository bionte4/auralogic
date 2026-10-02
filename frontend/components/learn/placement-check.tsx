'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError, apiRequest } from '@/lib/api';

interface PlacementChoice {
  id: string;
  text: string;
}

interface PlacementQuestion {
  id: string;
  prompt: string;
  choices: PlacementChoice[];
}

interface PlacementView {
  startOrderIndex: number | null;
  questions: PlacementQuestion[];
}

export function PlacementCheck({
  courseId,
  placed,
  onPlaced,
}: {
  courseId: string;
  placed: boolean;
  onPlaced: (startOrderIndex: number) => void;
}) {
  const [view, setView] = useState<PlacementView | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void apiRequest<PlacementView>(`/courses/${courseId}/placement`)
      .then(setView)
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : 'Could not load the placement check.');
      });
  }, [courseId]);

  if (!view || view.questions.length === 0) {
    return error ? <p className="text-sm text-destructive">{error}</p> : null;
  }

  if (placed || view.startOrderIndex !== null) {
    return (
      <p className="text-sm text-muted-foreground">
        Your placement check starts you at level {view.startOrderIndex ?? 1}. Earlier levels stay open for review.
      </p>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!view) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await apiRequest<{ startOrderIndex: number }>(`/courses/${courseId}/placement/attempts`, {
        method: 'POST',
        body: JSON.stringify({
          answers: view.questions.map((question) => ({
            questionId: question.id,
            choiceId: answers[question.id] ?? '',
          })),
        }),
      });
      setView({ ...view, startOrderIndex: result.startOrderIndex });
      onPlaced(result.startOrderIndex);
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save the placement check.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Placement check</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
          <p className="text-sm text-muted-foreground">
            Answer these questions so the course can open at the right level. Lessons stay closed until this is saved.
          </p>
          {view.questions.map((question) => (
            <fieldset key={question.id} className="flex flex-col gap-2">
              <legend className="text-sm font-medium">{question.prompt}</legend>
              {question.choices.map((choice) => (
                <label key={choice.id} className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={question.id}
                    value={choice.id}
                    checked={answers[question.id] === choice.id}
                    onChange={() => setAnswers({ ...answers, [question.id]: choice.id })}
                    required
                  />
                  {choice.text}
                </label>
              ))}
            </fieldset>
          ))}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={pending}>
            {pending ? 'Saving…' : 'Save placement'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
