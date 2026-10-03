import type { CefrLevel, CourseStatus, EnrollmentStatus, LearningPhase, LessonType, PaymentStatus } from '@prisma/client';

export interface InstructorSummary {
  id: string;
  name: string;
}

export interface LessonSummary {
  id: string;
  title: string;
  description: string | null;
  type: LessonType;
  orderIndex: number;
  passingScore: number | null;
  hasStream: boolean;
}

export interface ModuleSummary {
  id: string;
  title: string;
  description: string | null;
  outcome: string | null;
  orderIndex: number;
  lessons: LessonSummary[];
}

export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  level: CefrLevel;
  status: CourseStatus;
  publishedAt: Date | null;
  price: string;
  coverImageUrl: string | null;
  phase: LearningPhase | null;
  outcome: string | null;
  instructor: InstructorSummary;
}

export interface CourseDetail extends CourseSummary {
  modules: ModuleSummary[];
}

export interface PublicCourseCard extends CourseSummary {
  lessonCount: number;
  durationMinutes: number;
  updatedAt: Date;
  highlights: string[];
}

export interface CreatedModule {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  outcome: string | null;
  orderIndex: number;
}

export interface CreatedLesson {
  id: string;
  moduleId: string;
  title: string;
  description: string | null;
  type: LessonType;
  orderIndex: number;
  passingScore: number | null;
}

export interface RosterStudent {
  id: string;
  name: string;
  email: string;
}

export interface RosterEntry {
  enrollmentId: string;
  orderId: string;
  student: RosterStudent;
  status: EnrollmentStatus;
  paymentStatus: PaymentStatus;
  amount: string;
  currency: string;
  paidAt: Date | null;
  completedLessons: number;
  lessonCount: number;
  progressPercent: number;
  startOrderIndex: number | null;
  classIds: string[];
  projectSubmitted: boolean;
  projectScore: number | null;
}

export interface CourseClassSummary {
  id: string;
  name: string;
}

export interface CourseRoster {
  courseId: string;
  lessonCount: number;
  classes: CourseClassSummary[];
  enrollments: RosterEntry[];
}
