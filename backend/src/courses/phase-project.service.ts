import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProgressStatus, ProjectKind, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import { enrollmentAccessDenial } from '../progress/enrollment-access';
import type { SavePhaseProjectDto, ScorePhaseProjectDto, SubmitPhaseProjectDto } from './dto/phase-project.dto';

export const PHASE_PROJECT_LOCKED = 'Finish every lesson before submitting the phase project.';

export interface PhaseProjectView {
  project: {
    id: string;
    title: string;
    prompt: string;
    kind: ProjectKind;
    rubric: string;
  } | null;
  submission: {
    response: string;
    score: number | null;
    feedback: string | null;
    submittedAt: Date;
  } | null;
  lessonsComplete: boolean;
}

export function lessonsAreComplete(completedCount: number, lessonCount: number): boolean {
  return lessonCount > 0 && completedCount === lessonCount;
}

@Injectable()
export class PhaseProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async get(user: AuthenticatedUser, courseId: string): Promise<PhaseProjectView> {
    const course = await this.requireVisibleCourse(user, courseId);
    const project = await this.prisma.phaseProject.findUnique({
      where: { courseId },
      select: { id: true, title: true, prompt: true, kind: true, rubric: true },
    });
    const lessonCount = course.modules.reduce((total, module) => total + module.lessons.length, 0);
    const completedCount = await this.completedLessonCount(user.id, course.modules);
    const submission = project
      ? await this.prisma.phaseProjectSubmission.findUnique({
          where: { projectId_userId: { projectId: project.id, userId: user.id } },
          select: { response: true, score: true, feedback: true, submittedAt: true },
        })
      : null;
    return {
      project,
      submission: user.role === Role.STUDENT ? submission : null,
      lessonsComplete: lessonsAreComplete(completedCount, lessonCount),
    };
  }

  async save(user: AuthenticatedUser, courseId: string, dto: SavePhaseProjectDto): Promise<{ id: string }> {
    await this.requireManagedCourse(user, courseId);
    const saved = await this.prisma.phaseProject.upsert({
      where: { courseId },
      create: {
        courseId,
        title: dto.title.trim(),
        prompt: dto.prompt.trim(),
        kind: dto.kind,
        rubric: dto.rubric.trim(),
      },
      update: {
        title: dto.title.trim(),
        prompt: dto.prompt.trim(),
        kind: dto.kind,
        rubric: dto.rubric.trim(),
      },
      select: { id: true },
    });
    return saved;
  }

  async submit(user: AuthenticatedUser, courseId: string, dto: SubmitPhaseProjectDto): Promise<{ id: string }> {
    if (user.role !== Role.STUDENT) {
      throw new ForbiddenException('Only students can submit the phase project.');
    }
    await this.assertActiveEnrollment(user.id, courseId);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        phaseProject: { select: { id: true } },
        modules: { select: { lessons: { select: { id: true } } } },
      },
    });
    if (!course?.phaseProject) {
      throw new NotFoundException('This course has no phase project.');
    }
    const lessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
    const completedCount = await this.prisma.userProgress.count({
      where: { userId: user.id, status: ProgressStatus.COMPLETED, lessonId: { in: lessonIds } },
    });
    if (!lessonsAreComplete(completedCount, lessonIds.length)) {
      throw new ForbiddenException(PHASE_PROJECT_LOCKED);
    }

    const existing = await this.prisma.phaseProjectSubmission.findUnique({
      where: { projectId_userId: { projectId: course.phaseProject.id, userId: user.id } },
      select: { id: true, score: true },
    });
    if (existing?.score !== null && existing?.score !== undefined) {
      throw new ConflictException('A scored project cannot be replaced.');
    }

    const saved = await this.prisma.phaseProjectSubmission.upsert({
      where: { projectId_userId: { projectId: course.phaseProject.id, userId: user.id } },
      create: {
        projectId: course.phaseProject.id,
        userId: user.id,
        response: dto.response.trim(),
      },
      update: {
        response: dto.response.trim(),
        submittedAt: new Date(),
      },
      select: { id: true },
    });
    return saved;
  }

  async score(
    user: AuthenticatedUser,
    courseId: string,
    studentId: string,
    dto: ScorePhaseProjectDto,
  ): Promise<{ score: number }> {
    await this.requireManagedCourse(user, courseId);
    const project = await this.prisma.phaseProject.findUnique({
      where: { courseId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('This course has no phase project.');
    }
    const submission = await this.prisma.phaseProjectSubmission.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: studentId } },
      select: { id: true },
    });
    if (!submission) {
      throw new NotFoundException('This student has not submitted the phase project.');
    }
    await this.prisma.phaseProjectSubmission.update({
      where: { id: submission.id },
      data: {
        score: dto.score,
        feedback: dto.feedback?.trim() || null,
        scoredAt: new Date(),
      },
    });
    return { score: dto.score };
  }

  private async completedLessonCount(
    userId: string,
    modules: Array<{ lessons: Array<{ id: string }> }>,
  ): Promise<number> {
    const lessonIds = modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
    if (lessonIds.length === 0) {
      return 0;
    }
    return this.prisma.userProgress.count({
      where: { userId, status: ProgressStatus.COMPLETED, lessonId: { in: lessonIds } },
    });
  }

  private async assertActiveEnrollment(userId: string, courseId: string): Promise<void> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { status: true, paymentStatus: true, accessStartsAt: true, accessEndsAt: true },
    });
    const denial = enrollmentAccessDenial(enrollment, new Date());
    if (denial) {
      throw new ForbiddenException(denial);
    }
  }

  private async requireVisibleCourse(user: AuthenticatedUser, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        status: true,
        instructorId: true,
        modules: { select: { lessons: { select: { id: true } } } },
      },
    });
    if (!course) {
      throw new NotFoundException('Course not found.');
    }
    if (course.status !== 'PUBLISHED' && user.role !== Role.SUPER_ADMIN && user.id !== course.instructorId) {
      throw new NotFoundException('Course not found.');
    }
    return course;
  }

  private async requireManagedCourse(user: AuthenticatedUser, courseId: string): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found.');
    }
    if (user.role === Role.SUPER_ADMIN || user.id === course.instructorId) {
      return;
    }
    throw new ForbiddenException('You can only manage your own courses.');
  }
}
