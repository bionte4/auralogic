'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiError, apiRequest } from '@/lib/api';

interface PlacementChoice {
  id: string;
  text: string;
  targetOrderIndex: number | null;
}

interface PlacementQuestion {
  id: string;
  prompt: string;
  choices: PlacementChoice[];
}

export function PlacementEditor({ courseId, levelCount }: { courseId: string; levelCount: number }) {
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [prompt, setPrompt] = useState('');
  const [choiceA, setChoiceA] = useState('');
  const [choiceB, setChoiceB] = useState('');
  const [levelA, setLevelA] = useState('1');
  const [levelB, setLevelB] = useState('1');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiRequest<{ questions: PlacementQuestion[] }>(`/courses/${courseId}/placement`)
      .then((view) => setQuestions(view.questions))
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : 'Could not load placement questions.');
      });
  }, [courseId]);

  async function addQuestion(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const startA = Number(levelA);
    const startB = Number(levelB);
    if (prompt.trim().length < 3 || !choiceA.trim() || !choiceB.trim()) {
      setError('Write a question and two choices.');
      return;
    }
    if (!Number.isInteger(startA) || !Number.isInteger(startB) || startA < 1 || startB < 1 || startA > levelCount || startB > levelCount) {
      setError('Each choice must point at a level in this course.');
      return;
    }
    setError(null);
    try {
      await apiRequest(`/courses/${courseId}/placement/questions`, {
        method: 'POST',
        body: JSON.stringify({
          prompt: prompt.trim(),
          choices: [
            { text: choiceA.trim(), targetOrderIndex: startA },
            { text: choiceB.trim(), targetOrderIndex: startB },
          ],
        }),
      });
      setPrompt('');
      setChoiceA('');
      setChoiceB('');
      const view = await apiRequest<{ questions: PlacementQuestion[] }>(`/courses/${courseId}/placement`);
      setQuestions(view.questions);
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not add the placement question.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Placement check</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Each choice names the level where that answer should start the student. The server averages the answers and
          still blocks every later level until the one before it is complete.
        </p>
        {questions.map((question) => (
          <div key={question.id} className="text-sm">
            <p className="font-medium">{question.prompt}</p>
            <ul className="mt-1 text-muted-foreground">
              {question.choices.map((choice) => (
                <li key={choice.id}>
                  {choice.text} · starts at level {choice.targetOrderIndex}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <form className="grid gap-2 sm:grid-cols-2" onSubmit={(event) => void addQuestion(event)}>
          <Input
            className="sm:col-span-2"
            aria-label="Placement question"
            placeholder="Question"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <Input aria-label="Choice A" placeholder="Choice A" value={choiceA} onChange={(event) => setChoiceA(event.target.value)} />
          <Input aria-label="Choice B" placeholder="Choice B" value={choiceB} onChange={(event) => setChoiceB(event.target.value)} />
          <Input aria-label="Level for choice A" type="number" min={1} max={Math.max(1, levelCount)} value={levelA} onChange={(event) => setLevelA(event.target.value)} />
          <Input aria-label="Level for choice B" type="number" min={1} max={Math.max(1, levelCount)} value={levelB} onChange={(event) => setLevelB(event.target.value)} />
          <Button type="submit" className="sm:col-span-2">
            Add placement question
          </Button>
        </form>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
