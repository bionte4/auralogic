'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiRequest } from '@/lib/api';
import type { CourseDetail, LearningPhase } from '@/lib/courses';
import { LEARNING_PHASES } from '@/lib/learning-phase';

export function CourseProfileForm({
  course,
  onSaved,
  onError,
}: {
  course: CourseDetail;
  onSaved: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [coverImageUrl, setCoverImageUrl] = useState(course.coverImageUrl ?? '');
  const [phase, setPhase] = useState<LearningPhase | ''>(course.phase ?? '');
  const [outcome, setOutcome] = useState(course.outcome ?? '');
  const [pending, setPending] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedCover = coverImageUrl.trim();
    if (trimmedCover && !trimmedCover.startsWith('https://')) {
      onError('Cover image must be an https URL.');
      return;
    }
    setPending(true);
    onError(null);
    try {
      await apiRequest(`/courses/${course.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          coverImageUrl: trimmedCover || null,
          phase: phase || null,
          outcome: outcome.trim() || null,
        }),
      });
      await onSaved();
    } catch (caught) {
      onError(caught instanceof ApiError ? caught.message : 'Could not save the course profile.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catalog and curriculum</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-3" onSubmit={(event) => void save(event)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cover-url">Cover image URL</Label>
            <Input
              id="cover-url"
              placeholder="https://"
              value={coverImageUrl}
              onChange={(event) => setCoverImageUrl(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="course-phase">Kurikulum Merdeka phase</Label>
            <select
              id="course-phase"
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={phase}
              onChange={(event) => setPhase(event.target.value as LearningPhase | '')}
            >
              <option value="">No phase</option>
              {LEARNING_PHASES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="course-outcome">Learning outcome</Label>
            <Textarea
              id="course-outcome"
              maxLength={2000}
              value={outcome}
              onChange={(event) => setOutcome(event.target.value)}
              placeholder="What a student can do after this course"
            />
          </div>
          <Button type="submit" disabled={pending} className="min-h-11 w-full sm:w-auto">
            {pending ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
