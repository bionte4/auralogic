import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LessonType, ProgressStatus, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import type { CreateQuizQuestionDto, SubmitQuizDto } from './dto/quiz.dto';
import { quizPassed, scoreAttempt, shuffle, type GradedQuestion } from './quiz.rules';

export interface PublicQuiz {
  lessonId: string;
  passingScore: number;
  questions: Array<{ id: string; prompt: string; choices: Array<{ id: string; text: string }> }>;
}

export interface QuizGrade {
  score: number;
  passed: boolean;
  passingScore: number;
  correct: number;
  total: number;
}

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}

  async createQuestion(user: AuthenticatedUser, lessonId: string, dto: CreateQuizQuestionDto): Promise<{ id: string }> {
    const lesson = await this.requireQuiz(lessonId);
    if (user.role !== Role.SUPER_ADMIN && lesson.instructorId !== user.id) {
      throw new ForbiddenException('You can only edit quizzes in your own courses.');
    }
    const correct = dto.choices.filter((choice) => choice.correct);
    if (correct.length !== 1) {
      throw new BadRequestException('Mark exactly one correct choice.');
    }
    const orderIndex = (await this.prisma.quizQuestion.count({ where: { lessonId } })) + 1;
    const question = await this.prisma.quizQuestion.create({
      data: {
        lessonId,
        prompt: dto.prompt.trim(),
        orderIndex,
        choices: {
          create: dto.choices.map((choice, index) => ({
            text: choice.text.trim(),
            correct: choice.correct,
            orderIndex: index + 1,
          })),
        },
      },
      select: { id: true },
    });
    return question;
  }

  async publicQuiz(lessonId: string): Promise<PublicQuiz> {
    const lesson = await this.requireQuiz(lessonId);
    const questions = await this.prisma.quizQuestion.findMany({
      where: { lessonId },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, prompt: true, choices: { orderBy: { orderIndex: 'asc' }, select: { id: true, text: true } } },
    });
    return {
      lessonId,
      passingScore: lesson.passingScore,
      questions: shuffle(questions).map((question) => ({
        id: question.id,
        prompt: question.prompt,
        choices: shuffle(question.choices),
      })),
    };
  }

  async submit(user: AuthenticatedUser, lessonId: string, dto: SubmitQuizDto): Promise<QuizGrade> {
    const lesson = await this.requireQuiz(lessonId);
    const questions = await this.prisma.quizQuestion.findMany({
      where: { lessonId },
      select: { id: true, choices: { select: { id: true, correct: true } } },
    });
    if (questions.length === 0) {
      throw new ConflictException('This quiz has no questions yet.');
    }
    const graded: GradedQuestion[] = questions.map((question) => {
      const correct = question.choices.find((choice) => choice.correct);
      if (!correct) {
        throw new ConflictException('This quiz has a question without a correct choice.');
      }
      return { id: question.id, correctChoiceId: correct.id, choiceIds: question.choices.map((choice) => choice.id) };
    });
    let result: { correct: number; score: number };
    try {
      result = scoreAttempt(graded, dto.answers);
    } catch {
      throw new UnprocessableEntityException('Answer every question once.');
    }
    const passed = quizPassed(result.score, lesson.passingScore);
    await this.progress.recordProgress(
      user,
      lessonId,
      { status: passed ? ProgressStatus.COMPLETED : ProgressStatus.IN_PROGRESS, score: result.score },
      'quiz',
    );
    return {
      score: result.score,
      passed,
      passingScore: lesson.passingScore,
      correct: result.correct,
      total: questions.length,
    };
  }

  private async requireQuiz(lessonId: string): Promise<{ passingScore: number; instructorId: string }> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        type: true,
        passingScore: true,
        module: { select: { course: { select: { instructorId: true } } } },
      },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }
    if (lesson.type !== LessonType.QUIZ || lesson.passingScore === null) {
      throw new ConflictException('Quiz lesson is missing a passing score.');
    }
    return { passingScore: lesson.passingScore, instructorId: lesson.module.course.instructorId };
  }
}
