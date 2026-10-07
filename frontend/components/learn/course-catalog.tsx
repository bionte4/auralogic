'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/components/locale-provider';
import { ApiError, apiRequest } from '@/lib/api';
import { filterCatalog, type PriceBand } from '@/lib/catalog-filters';
import { CONTENT_LOCALES, SKILL_BANDS, formatIdr } from '@/lib/course-draft';
import type { ContentLocale, CourseSummary, LearningTrack, SkillBand } from '@/lib/courses';
import { listPublicTracks, trackName, trackSlugLabel, type LearningTrackRecord } from '@/lib/learning-tracks';

interface CheckoutResult {
  checkoutUrl: string | null;
}

interface EnrollmentMark {
  courseId: string;
  accessGranted: boolean;
}

export function CourseCatalog({
  courses,
  enrollments,
}: {
  courses: CourseSummary[];
  enrollments: EnrollmentMark[];
}) {
  const { m, locale } = useI18n();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<LearningTrackRecord[]>([]);
  const [track, setTrack] = useState<LearningTrack | ''>('');
  const [level, setLevel] = useState<SkillBand | ''>('');
  const [contentLocale, setContentLocale] = useState<ContentLocale | ''>('');
  const [price, setPrice] = useState<PriceBand>('');
  const visible = filterCatalog(courses, { track, level, contentLocale, price });
  const enrolled = new Map(enrollments.map((item) => [item.courseId, item.accessGranted]));
  const uiLocale = locale === 'en' ? 'EN' : 'ID';

  useEffect(() => {
    void listPublicTracks().then(setTracks).catch(() => setTracks([]));
  }, []);

  async function choose(courseId: string): Promise<void> {
    setPendingId(courseId);
    setError(null);
    try {
      const result = await apiRequest<CheckoutResult>(`/courses/${courseId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ channel: 'REDIRECT' }),
      });
      if (!result.checkoutUrl) {
        setError(m.catalog.checkoutMissing);
        return;
      }
      window.location.assign(result.checkoutUrl);
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : m.catalog.checkoutError);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{m.catalog.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{m.catalog.lead}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {m.catalog.track}
          <select
            className="h-11 rounded-md border border-input bg-transparent px-3 text-sm text-foreground"
            value={track}
            onChange={(event) => setTrack(event.target.value as LearningTrack | '')}
          >
            <option value="">{m.catalog.allTracks}</option>
            {tracks.map((item) => (
              <option key={item.slug} value={item.slug}>
                {trackName(item, uiLocale)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {m.catalog.band}
          <select
            className="h-11 rounded-md border border-input bg-transparent px-3 text-sm text-foreground"
            value={level}
            onChange={(event) => setLevel(event.target.value as SkillBand | '')}
          >
            <option value="">{m.catalog.allBands}</option>
            {SKILL_BANDS.map((item) => (
              <option key={item} value={item}>
                {m.bands[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {m.catalog.language}
          <select
            className="h-11 rounded-md border border-input bg-transparent px-3 text-sm text-foreground"
            value={contentLocale}
            onChange={(event) => setContentLocale(event.target.value as ContentLocale | '')}
          >
            <option value="">{m.catalog.allLanguages}</option>
            {CONTENT_LOCALES.map((item) => (
              <option key={item} value={item}>
                {m.languages[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          {m.catalog.price}
          <select
            className="h-11 rounded-md border border-input bg-transparent px-3 text-sm text-foreground"
            value={price}
            onChange={(event) => setPrice(event.target.value as PriceBand)}
          >
            <option value="">{m.catalog.anyPrice}</option>
            <option value="under-100k">{m.catalog.under100}</option>
            <option value="100k-500k">{m.catalog.mid}</option>
            <option value="over-500k">{m.catalog.over}</option>
          </select>
        </label>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">{m.catalog.empty}</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">{m.catalog.noMatch}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((course) => {
            const access = enrolled.get(course.id);
            return (
              <Card key={course.id} className="flex h-full flex-col overflow-hidden">
                <Link href={`/learn/courses/${course.id}`} className="block aspect-video bg-muted">
                  {course.coverImageUrl ? (
                    <img src={course.coverImageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-end bg-gradient-to-br from-zinc-800 to-zinc-950 p-4 text-sm font-medium text-white">
                      {trackSlugLabel(course.track, m.tracks)}
                    </div>
                  )}
                </Link>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Badge>{m.bands[course.level]}</Badge>
                    <p className="text-sm font-medium">{formatIdr(course.price)}</p>
                  </div>
                  <CardTitle className="text-lg leading-snug">
                    <Link href={`/learn/courses/${course.id}`}>{course.title}</Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{course.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {course.instructor.name} · {trackSlugLabel(course.track, m.tracks)} · {m.languages[course.contentLocale]}
                  </p>
                  <div className="mt-auto">
                    {access === true ? (
                      <Button asChild className="min-h-11 w-full">
                        <Link href={`/learn/${course.id}`}>{m.catalog.continue}</Link>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="min-h-11 w-full"
                        disabled={pendingId === course.id}
                        onClick={() => void choose(course.id)}
                      >
                        {pendingId === course.id ? m.catalog.opening : access === false ? m.catalog.finishPayment : m.catalog.choose}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
