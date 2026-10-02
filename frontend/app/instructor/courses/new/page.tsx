import { CourseCreateForm } from '@/components/instructor/course-create-form';

export default function NewCoursePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold">New course</h1>
      <CourseCreateForm />
    </div>
  );
}
