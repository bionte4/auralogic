import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CacheService, courseStructureKey, progressKey } from '../cache/cache.service';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import { enrollmentAccessDenial } from '../progress/enrollment-access';
import type { CreatePlacementQuestionDto, SubmitPlacementDto } from './dto/placement.dto';

export interface PlacementChoiceView {
  id: string;
  text: string;
  targetOrderIndex: number | null;
}

export interface PlacementQuestionView {
  id: string;
  prompt: string;
  choices: PlacementChoiceView[];
}

export interface PlacementView {
  startOrderIndex: number | null;
  questions: PlacementQuestionView[];
}

export function placementStart(targets: readonly number[], maxOrder: number): number {
  const sum = targets.reduce((total, value) => total + value, 0);
  const rounded = Math.round(sum / targets.length);
  return Math.min(maxOrder, Math.max(1, rounded));
}

@Injectable()
export class PlacementService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(CacheService) private readonly cache?: CacheService,
  ) {}

  async get(user: AuthenticatedUser, courseId: string): Promise<PlacementView> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, status: true, instructorId: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found.');
    }
    if (course.status !== 'PUBLISHED' && user.role !== Role.SUPER_ADMIN && user.id !== course.instructorId) {
      throw new NotFoundException('Course not found.');
    }

    const [placement, questions] = await Promise.all([
      this.prisma.coursePlacement.findUnique({
        where: { userId_courseId: { userId: user.id, courseId } },
        select: { startOrderIndex: true },
      }),
      this.prisma.placementQuestion.findMany({
        where: { courseId },
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          prompt: true,
          choices: {
            orderBy: { orderIndex: 'asc' },
            select: { id: true, text: true, targetOrderIndex: true },
          },
        },
      }),
    ]);

    const revealTargets = user.role !== Role.STUDENT;
    return {
      startOrderIndex: placement?.startOrderIndex ?? null,
      questions: questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        choices: question.choices.map((choice) => ({
          id: choice.id,
          text: choice.text,
          targetOrderIndex: revealTargets ? choice.targetOrderIndex : null,
        })),
      })),
    };
  }

  async addQuestion(
    user: AuthenticatedUser,
    courseId: string,
    dto: CreatePlacementQuestionDto,
  ): Promise<{ id: string }> {
    await this.requireManagedCourse(user, courseId);
    const orderIndex = await this.nextQuestionOrder(courseId);
    const created = await this.prisma.placementQuestion.create({
      data: {
        courseId,
        prompt: dto.prompt.trim(),
        orderIndex,
        choices: {
          create: dto.choices.map((choice, index) => ({
            text: choice.text.trim(),
            targetOrderIndex: choice.targetOrderIndex,
            orderIndex: index + 1,
          })),
        },
      },
      select: { id: true },
    });
    await this.cache?.delete(courseStructureKey(courseId));
    return created;
  }

  async submit(user: AuthenticatedUser, courseId: string, dto: SubmitPlacementDto): Promise<{ startOrderIndex: number }> {
    if (user.role !== Role.STUDENT) {
      throw new ForbiddenException('Only students can take the placement check.');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      select: {
        status: true,
        paymentStatus: true,
        accessStartsAt: true,
        accessEndsAt: true,
      },
    });
    const denial = enrollmentAccessDenial(enrollment, new Date());
    if (denial) {
      throw new ForbiddenException(denial);
    }

    const existing = await this.prisma.coursePlacement.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      select: { startOrderIndex: true },
    });
    if (existing) {
      return { startOrderIndex: existing.startOrderIndex };
    }

    const questions = await this.prisma.placementQuestion.findMany({
      where: { courseId },
      select: {
        id: true,
        choices: { select: { id: true, targetOrderIndex: true } },
      },
    });
    if (questions.length === 0) {
      throw new ConflictException('This course has no placement check.');
    }

    const answered = new Set(dto.answers.map((answer) => answer.questionId));
    if (answered.size !== dto.answers.length || questions.some((question) => !answered.has(question.id))) {
      throw new UnprocessableEntityException('Answer every placement question once.');
    }

    const targets: number[] = [];
    for (const answer of dto.answers) {
      const question = questions.find((item) => item.id === answer.questionId);
      const choice = question?.choices.find((item) => item.id === answer.choiceId);
      if (!choice) {
        throw new UnprocessableEntityException('Each answer must match a placement choice.');
      }
      targets.push(choice.targetOrderIndex);
    }

    const highest = await this.prisma.module.aggregate({
      where: { courseId },
      _max: { orderIndex: true },
    });
    const maxOrder = highest._max.orderIndex;
    if (!maxOrder) {
      throw new ConflictException('This course has no levels yet.');
    }

    const startOrderIndex = placementStart(targets, maxOrder);
    await this.prisma.coursePlacement.create({
      data: { userId: user.id, courseId, startOrderIndex },
    });
    await this.cache?.delete(progressKey(user.id, courseId));
    return { startOrderIndex };
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

  private async nextQuestionOrder(courseId: string): Promise<number> {
    const highest = await this.prisma.placementQuestion.aggregate({
      where: { courseId },
      _max: { orderIndex: true },
    });
    return (highest._max.orderIndex ?? 0) + 1;
  }
}
