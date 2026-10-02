'use client';

import { useParams } from 'next/navigation';
import { CourseDetailView } from '@/components/learn/course-detail';

export default function CourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  return (
    <div className="px-4 py-8 sm:px-6">
      <CourseDetailView courseId={params.courseId} />
    </div>
  );
}
