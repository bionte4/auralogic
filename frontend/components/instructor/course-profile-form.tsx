'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/components/locale-provider';
import { ApiError, apiRequest } from '@/lib/api';
import { CONTENT_LOCALES, SKILL_BANDS, validateCourseDraft } from '@/lib/course-draft';
import type { ContentLocale, CourseDetail, CourseSummary, LearningTrack, SkillBand } from '@/lib/courses';
import { listPublicTracks, trackName, type LearningTrackRecord } from '@/lib/learning-tracks';

export function CourseProfileForm({
  course,
  onSaved,
  onError,
}: {
  course: CourseDetail;
  onSaved: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const { m, locale } = useI18n();
  const draft = course.status === 'DRAFT';
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [level, setLevel] = useState<SkillBand>(course.level);
  const [price, setPrice] = useState(String(Math.trunc(Number(course.price))));
  const [coverImageUrl, setCoverImageUrl] = useState(course.coverImageUrl ?? '');
  const [track, setTrack] = useState<LearningTrack>(course.track);
  const [contentLocale, setContentLocale] = useState<ContentLocale>(course.contentLocale);
  const [pairedCourseId, setPairedCourseId] = useState(course.pairedCourse?.id ?? '');
  const [options, setOptions] = useState<CourseSummary[]>([]);
  const [tracks, setTracks] = useState<LearningTrackRecord[]>([]);
  const [outcome, setOutcome] = useState(course.outcome ?? '');
  const [pending, setPending] = useState(false);
  const uiLocale = locale === 'en' ? 'EN' : 'ID';

  useEffect(() => {
    setTitle(course.title);
    setDescription(course.description);
    setLevel(course.level);
    setPrice(String(Math.trunc(Number(course.price))));
    setCoverImageUrl(course.coverImageUrl ?? '');
    setTrack(course.track);
    setContentLocale(course.contentLocale);
    setPairedCourseId(course.pairedCourse?.id ?? '');
    setOutcome(course.outcome ?? '');
  }, [course]);

  useEffect(() => {
    void apiRequest<CourseSummary[]>('/courses')
      .then((rows) => setOptions(rows.filter((item) => item.id !== course.id)))
      .catch(() => setOptions([]));
  }, [course.id]);

  useEffect(() => {
    void listPublicTracks()
      .then((rows) => {
        if (!rows.some((row) => row.slug === course.track)) {
          setTracks([
            ...rows,
            {
              id: `legacy-${course.track}`,
              slug: course.track,
              nameId: course.track,
              nameEn: course.track,
              blurbId: '',
              blurbEn: '',
              iconKey: 'waypoints',
              sortOrder: 9999,
              active: false,
            },
          ]);
          return;
        }
        setTracks(rows);
      })
      .catch(() => setTracks([]));
  }, [course.track]);

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedCover = coverImageUrl.trim();
    if (trimmedCover && !trimmedCover.startsWith('https://')) {
      onError(m.studio.coverError);
      return;
    }
    if (draft) {
      const validation = validateCourseDraft({
        title,
        description,
        level,
        track,
        contentLocale,
        price,
      });
      if (validation) {
        onError(m.draft[validation === 'price-range' ? 'priceRange' : validation]);
        return;
      }
    }
    setPending(true);
    onError(null);
    try {
      await apiRequest(`/courses/${course.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(draft
            ? {
                title: title.trim(),
                description: description.trim(),
                level,
                price: Number(price),
              }
            : {}),
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
          {draft ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="course-title">{m.studio.title}</Label>
                <Input id="course-title" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="course-description">{m.studio.description}</Label>
                <Textarea
                  id="course-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="course-band">{m.studio.band}</Label>
                <select
                  id="course-band"
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={level}
                  onChange={(event) => setLevel(event.target.value as SkillBand)}
                >
                  {SKILL_BANDS.map((item) => (
                    <option key={item} value={item}>
                      {m.bands[item]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="course-price">{m.studio.price}</Label>
                <Input
                  id="course-price"
                  inputMode="numeric"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </div>
            </>
          ) : null}
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
              {tracks.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {trackName(item, uiLocale)}
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
