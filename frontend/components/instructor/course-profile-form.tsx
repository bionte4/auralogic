'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/components/locale-provider';
import { ApiError, apiRequest } from '@/lib/api';
import { CONTENT_LOCALES, TRACKS } from '@/lib/course-draft';
import type { ContentLocale, CourseDetail, CourseSummary, LearningTrack } from '@/lib/courses';

export function CourseProfileForm({
  course,
  onSaved,
  onError,
}: {
  course: CourseDetail;
  onSaved: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const { m } = useI18n();
  const [coverImageUrl, setCoverImageUrl] = useState(course.coverImageUrl ?? '');
  const [track, setTrack] = useState<LearningTrack>(course.track);
  const [contentLocale, setContentLocale] = useState<ContentLocale>(course.contentLocale);
  const [pairedCourseId, setPairedCourseId] = useState(course.pairedCourse?.id ?? '');
  const [options, setOptions] = useState<CourseSummary[]>([]);
  const [outcome, setOutcome] = useState(course.outcome ?? '');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void apiRequest<CourseSummary[]>('/courses')
      .then((rows) => setOptions(rows.filter((item) => item.id !== course.id)))
      .catch(() => setOptions([]));
  }, [course.id]);

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedCover = coverImageUrl.trim();
    if (trimmedCover && !trimmedCover.startsWith('https://')) {
      onError(m.studio.coverError);
      return;
    }
    setPending(true);
    onError(null);
    try {
      await apiRequest(`/courses/${course.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          coverImageUrl: trimmedCover || null,
          track,
          contentLocale,
          pairedCourseId: pairedCourseId || null,
          outcome: outcome.trim() || null,
        }),
      });
      await onSaved();
    } catch (caught) {
      onError(caught instanceof ApiError ? caught.message : m.studio.profileError);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.studio.profile}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-3" onSubmit={(event) => void save(event)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cover-url">{m.studio.cover}</Label>
            <Input
              id="cover-url"
              placeholder="https://"
              value={coverImageUrl}
              onChange={(event) => setCoverImageUrl(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="course-track">{m.studio.track}</Label>
            <select
              id="course-track"
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={track}
              onChange={(event) => setTrack(event.target.value as LearningTrack)}
            >
              {TRACKS.map((item) => (
                <option key={item} value={item}>
                  {m.tracks[item]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="course-locale">{m.studio.materialLanguage}</Label>
            <select
              id="course-locale"
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={contentLocale}
              onChange={(event) => setContentLocale(event.target.value as ContentLocale)}
            >
              {CONTENT_LOCALES.map((item) => (
                <option key={item} value={item}>
                  {m.languages[item]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="course-pair">{m.studio.pair}</Label>
            <select
              id="course-pair"
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={pairedCourseId}
              onChange={(event) => setPairedCourseId(event.target.value)}
            >
              <option value="">{m.studio.noPair}</option>
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {m.languages[item.contentLocale]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="course-outcome">{m.studio.outcome}</Label>
            <Textarea
              id="course-outcome"
              maxLength={2000}
              value={outcome}
              onChange={(event) => setOutcome(event.target.value)}
              placeholder={m.studio.outcomeHint}
            />
          </div>
          <Button type="submit" disabled={pending} className="min-h-11 w-full sm:w-auto">
            {pending ? m.studio.saving : m.studio.saveProfile}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
