'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiRequest } from '@/lib/api';

interface PhaseProjectView {
  project: {
    title: string;
    prompt: string;
    kind: 'WRITING' | 'SPEAKING';
    rubric: string;
  } | null;
}

export function PhaseProjectForm({ courseId }: { courseId: string }) {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState<'WRITING' | 'SPEAKING'>('WRITING');
  const [rubric, setRubric] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void apiRequest<PhaseProjectView>(`/courses/${courseId}/project`)
      .then((view) => {
        if (!view.project) {
          return;
        }
        setTitle(view.project.title);
        setPrompt(view.project.prompt);
        setKind(view.project.kind);
        setRubric(view.project.rubric);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : 'Could not load the phase project.');
      });
  }, [courseId]);

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await apiRequest(`/courses/${courseId}/project`, {
        method: 'PUT',
        body: JSON.stringify({
          title: title.trim(),
          prompt: prompt.trim(),
          kind,
          rubric: rubric.trim(),
        }),
      });
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save the phase project.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phase project</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-3" onSubmit={(event) => void save(event)}>
          <p className="text-sm text-muted-foreground">
            Students submit this after every lesson is complete. Speaking answers are a transcript you can score for the report.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-title">Title</Label>
            <Input id="project-title" value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <label className="flex flex-col gap-2 text-sm">
            Kind
            <select
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={kind}
              onChange={(event) => setKind(event.target.value === 'SPEAKING' ? 'SPEAKING' : 'WRITING')}
            >
              <option value="WRITING">Writing</option>
              <option value="SPEAKING">Speaking</option>
            </select>
          </label>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-prompt">Prompt</Label>
            <Textarea id="project-prompt" value={prompt} maxLength={4000} onChange={(event) => setPrompt(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-rubric">Rubric</Label>
            <Textarea id="project-rubric" value={rubric} maxLength={2000} onChange={(event) => setRubric(event.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={pending}>
            {pending ? 'Saving…' : 'Save project'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
