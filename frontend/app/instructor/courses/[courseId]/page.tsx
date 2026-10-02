import { Suspense } from 'react';
import { CourseStudio } from '@/components/instructor/course-studio';

export default async function CourseStudioPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading course…</p>}>
      <CourseStudio courseId={courseId} />
    </Suspense>
  );
}
