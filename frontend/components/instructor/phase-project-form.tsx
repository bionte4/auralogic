'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/components/locale-provider';
import { ApiError, apiRequest } from '@/lib/api';
import { PROJECT_KINDS } from '@/lib/course-draft';

interface PhaseProjectView {
  project: {
    title: string;
    prompt: string;
    kind: 'LAB_REPORT' | 'ANALYSIS' | 'DESIGN' | 'NOTEBOOK';
    rubric: string;
  } | null;
}

export function PhaseProjectForm({ courseId }: { courseId: string }) {
  const { m } = useI18n();
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState<(typeof PROJECT_KINDS)[number]>('LAB_REPORT');
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
        setError(caught instanceof ApiError ? caught.message : m.project.loadError);
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
      setError(caught instanceof ApiError ? caught.message : m.project.saveError);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.project.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-3" onSubmit={(event) => void save(event)}>
          <p className="text-sm text-muted-foreground">{m.project.lead}</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-title">{m.project.name}</Label>
            <Input id="project-title" value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <label className="flex flex-col gap-2 text-sm">
            {m.project.kind}
            <select
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={kind}
              onChange={(event) => setKind(event.target.value as (typeof PROJECT_KINDS)[number])}
            >
              {PROJECT_KINDS.map((item) => (
                <option key={item} value={item}>
                  {m.kinds[item]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-prompt">{m.project.prompt}</Label>
            <Textarea id="project-prompt" value={prompt} maxLength={4000} onChange={(event) => setPrompt(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-rubric">{m.project.rubric}</Label>
            <Textarea id="project-rubric" value={rubric} maxLength={2000} onChange={(event) => setRubric(event.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={pending}>
            {pending ? m.project.saving : m.project.save}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
