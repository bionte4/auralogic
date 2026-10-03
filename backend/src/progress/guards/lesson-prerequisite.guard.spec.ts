import { BadRequestException, ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { PREVIOUS_LEVEL_INCOMPLETE } from '../enrollment-access';
import type { ProgressService } from '../progress.service';
import { LessonPrerequisiteGuard } from './lesson-prerequisite.guard';

const LESSON_ID = '11111111-1111-4111-8111-111111111111';

const student: AuthenticatedUser = {
  id: 'student-1',
  email: 'student@fluentis.test',
  name: 'Alya',
  role: Role.STUDENT,
  locale: 'ID',
};

function contextFor(user: AuthenticatedUser | undefined, lessonId: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        params: { lessonId },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('LessonPrerequisiteGuard', () => {
  const progressService = {
    assertLessonAccessible: jest.fn(),
  };
  const guard = new LessonPrerequisiteGuard(progressService as unknown as ProgressService);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows the request after the previous level is completed', async () => {
    progressService.assertLessonAccessible.mockResolvedValue(undefined);

    await expect(guard.canActivate(contextFor(student, LESSON_ID))).resolves.toBe(true);
    expect(progressService.assertLessonAccessible).toHaveBeenCalledWith(student, LESSON_ID, 'write');
  });

  it('propagates ForbiddenException when level N-1 is incomplete', async () => {
    progressService.assertLessonAccessible.mockRejectedValue(new ForbiddenException(PREVIOUS_LEVEL_INCOMPLETE));

    await expect(guard.canActivate(contextFor(student, LESSON_ID))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an unauthenticated request', async () => {
    await expect(guard.canActivate(contextFor(undefined, LESSON_ID))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(progressService.assertLessonAccessible).not.toHaveBeenCalled();
  });

  it('rejects a non-uuid lesson id before querying progress', async () => {
    await expect(guard.canActivate(contextFor(student, 'level-2'))).rejects.toBeInstanceOf(BadRequestException);
    expect(progressService.assertLessonAccessible).not.toHaveBeenCalled();
  });
});
