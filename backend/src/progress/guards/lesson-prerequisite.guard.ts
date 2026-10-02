import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { readUuidParam } from '../../common/http/read-uuid-param';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { ProgressService } from '../progress.service';

/**
 * Runs after JWT authentication. Rejects lesson reads and progress writes
 * with 403 when level N - 1 is not fully completed.
 */
@Injectable()
export class LessonPrerequisiteGuard implements CanActivate {
  constructor(private readonly progressService: ProgressService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException();
    }

    const lessonId = readUuidParam(request.params.lessonId, 'lessonId');
    await this.progressService.assertLessonAccessible(request.user, lessonId);
    return true;
  }
}
