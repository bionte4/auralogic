export interface InstructorSummary {
  id: string;
  name: string;
}

export interface LessonSummary {
  id: string;
  title: string;
  type: 'VIDEO' | 'READING' | 'QUIZ';
  orderIndex: number;
  passingScore: number | null;
  hasStream: boolean;
}

export interface ModuleSummary {
  id: string;
  title: string;
  description: string | null;
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
  instructor: InstructorSummary;
}

export interface CourseDetail extends CourseSummary {
  modules: ModuleSummary[];
}

export interface CreatedModule {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
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
}

export interface CourseRoster {
  courseId: string;
  lessonCount: number;
  enrollments: RosterEntry[];
}
