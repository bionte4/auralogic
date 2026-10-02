import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { LessonPrerequisiteGuard } from '../progress/guards/lesson-prerequisite.guard';
import { CreateQuizQuestionDto, SubmitQuizDto } from './dto/quiz.dto';
import { QuizService, type PublicQuiz, type QuizGrade } from './quiz.service';

@Controller('lessons')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post(':lessonId/questions')
  @Roles(Role.INSTRUCTOR, Role.SUPER_ADMIN)
  createQuestion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: CreateQuizQuestionDto,
  ): Promise<{ id: string }> {
    return this.quizService.createQuestion(user, lessonId, dto);
  }

  @Get(':lessonId/quiz')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.SUPER_ADMIN)
  @UseGuards(LessonPrerequisiteGuard)
  quiz(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<PublicQuiz> {
    return this.quizService.publicQuiz(lessonId);
  }

  @Post(':lessonId/quiz/attempts')
  @Roles(Role.STUDENT)
  @UseGuards(LessonPrerequisiteGuard)
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: SubmitQuizDto,
  ): Promise<QuizGrade> {
    return this.quizService.submit(user, lessonId, dto);
  }
}
