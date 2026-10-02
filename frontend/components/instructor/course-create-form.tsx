'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiRequest } from '@/lib/api';
import { CEFR_LEVELS, validateCourseDraft, type CourseDraft } from '@/lib/course-draft';
import type { CourseSummary } from '@/lib/courses';
import { readSession } from '@/lib/session';

const emptyDraft: CourseDraft = { title: '', description: '', level: '', price: '' };

export function CourseCreateForm() {
  const router = useRouter();
  const [draft, setDraft] = useState<CourseDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCourseDraft(draft);
    if (validation) {
      setError(validation);
      return;
    }
    const session = readSession();
    if (!session) {
      router.replace('/instructor/login');
      return;
    }

    setPending(true);
    setError(null);
    try {
      const course = await apiRequest<CourseSummary>('/courses', {
        method: 'POST',
        body: JSON.stringify({
          title: draft.title.trim(),
          description: draft.description.trim(),
          level: draft.level,
          price: Number(draft.price),
        }),
      });
      router.push(`/instructor/courses/${course.id}?setup=1`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not create the course.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Step 1 of 3</p>
        <CardTitle>Course details</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Field label="Title" htmlFor="course-title">
            <Input
              id="course-title"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              maxLength={200}
              required
            />
          </Field>
          <Field label="Description" htmlFor="course-description">
            <Textarea
              id="course-description"
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              maxLength={10000}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CEFR level" htmlFor="course-level">
              <select
                id="course-level"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={draft.level}
                onChange={(event) => setDraft({ ...draft, level: event.target.value as CourseDraft['level'] })}
                required
              >
                <option value="">Select level</option>
                {CEFR_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Price (IDR)" htmlFor="course-price">
              <Input
                id="course-price"
                inputMode="numeric"
                value={draft.price}
                onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                required
              />
            </Field>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating…' : 'Continue to modules'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
