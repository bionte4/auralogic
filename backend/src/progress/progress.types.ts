import type { LessonType, ProgressStatus } from '@prisma/client';

export interface LessonProgressView {
  id: string;
  title: string;
  type: LessonType;
  orderIndex: number;
  locked: boolean;
  status: ProgressStatus;
  score: number | null;
  completedAt: Date | null;
}

export interface ModuleProgressView {
  id: string;
  title: string;
  orderIndex: number;
  locked: boolean;
  completed: boolean;
  lessons: LessonProgressView[];
}

export interface CourseProgressView {
  courseId: string;
  enrollmentActive: boolean;
  startOrderIndex: number;
  placementRequired: boolean;
  modules: ModuleProgressView[];
}

export interface ProgressRecord {
  id: string;
  lessonId: string;
  status: ProgressStatus;
  score: number | null;
  attemptCount: number;
  completedAt: Date | null;
}
