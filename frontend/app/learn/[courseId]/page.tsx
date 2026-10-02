import { Suspense } from 'react';
import { CoursePlayer } from '@/components/learn/course-player';

export default async function LearnCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return (
    <Suspense fallback={<p className="px-6 py-10 text-sm text-muted-foreground">Loading course…</p>}>
      <CoursePlayer courseId={courseId} />
    </Suspense>
  );
}
