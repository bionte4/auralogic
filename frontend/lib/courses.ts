export interface InstructorSummary {
  id: string;
  name: string;
}

export type LearningPhase = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface LessonSummary {
  id: string;
  title: string;
  description: string | null;
  type: 'VIDEO' | 'READING' | 'QUIZ';
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
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
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
  updatedAt: string;
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
  type: LessonSummary['type'];
  orderIndex: number;
  passingScore: number | null;
}

export interface UploadGrant {
  uploadUrl: string;
  assetId: string;
  method: 'POST';
  expiresAt: string;
}

export interface RosterEntry {
  enrollmentId: string;
  orderId: string;
  student: { id: string; name: string; email: string };
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  amount: string;
  currency: string;
  paidAt: string | null;
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
