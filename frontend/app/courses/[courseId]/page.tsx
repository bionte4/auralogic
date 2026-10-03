'use client';

import { useParams } from 'next/navigation';
import { PublicCourse } from '@/components/landing/public-course';

export default function PublicCoursePage() {
  const params = useParams<{ courseId: string }>();
  return <PublicCourse courseId={params.courseId} />;
}
