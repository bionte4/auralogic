'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/components/locale-provider';
import { ApiError, apiRequest } from '@/lib/api';
import { CONTENT_LOCALES, SKILL_BANDS, validateCourseDraft, type CourseDraft } from '@/lib/course-draft';
import type { CourseSummary } from '@/lib/courses';
import { listPublicTracks, trackName, type LearningTrackRecord } from '@/lib/learning-tracks';
import { readSession } from '@/lib/session';

const emptyDraft: CourseDraft = { title: '', description: '', level: '', track: '', contentLocale: 'ID', price: '' };

export function CourseCreateForm() {
  const router = useRouter();
  const { m, locale } = useI18n();
  const [draft, setDraft] = useState<CourseDraft>(emptyDraft);
  const [tracks, setTracks] = useState<LearningTrackRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const uiLocale = locale === 'en' ? 'EN' : 'ID';

  useEffect(() => {
    void listPublicTracks().then(setTracks).catch(() => setTracks([]));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCourseDraft(draft);
    if (validation) {
      setError(m.draft[validation === 'price-range' ? 'priceRange' : validation]);
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
          track: draft.track,
          contentLocale: draft.contentLocale,
          price: Number(draft.price),
        }),
      });
      router.push(`/instructor/courses/${course.id}?setup=1`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : m.studio.createError);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{m.studio.step}</p>
        <CardTitle>{m.studio.details}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Field label={m.studio.title} htmlFor="course-title">
            <Input
              id="course-title"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              maxLength={200}
              required
            />
          </Field>
          <Field label={m.studio.description} htmlFor="course-description">
            <Textarea
              id="course-description"
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              maxLength={10000}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={m.studio.track} htmlFor="course-track">
              <select
                id="course-track"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={draft.track}
                onChange={(event) => setDraft({ ...draft, track: event.target.value as CourseDraft['track'] })}
                required
              >
                <option value="">{m.studio.selectTrack}</option>
                {tracks.map((track) => (
                  <option key={track.slug} value={track.slug}>
                    {trackName(track, uiLocale)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={m.studio.materialLanguage} htmlFor="course-locale">
              <select
                id="course-locale"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={draft.contentLocale}
                onChange={(event) => setDraft({ ...draft, contentLocale: event.target.value as CourseDraft['contentLocale'] })}
                required
              >
                {CONTENT_LOCALES.map((locale) => (
                  <option key={locale} value={locale}>
                    {m.languages[locale]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={m.studio.band} htmlFor="course-level">
              <select
                id="course-level"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={draft.level}
                onChange={(event) => setDraft({ ...draft, level: event.target.value as CourseDraft['level'] })}
                required
              >
                <option value="">{m.studio.selectBand}</option>
                {SKILL_BANDS.map((level) => (
                  <option key={level} value={level}>
                    {m.bands[level]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={m.studio.price} htmlFor="course-price">
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
            {pending ? m.studio.creating : m.studio.continueModules}
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
