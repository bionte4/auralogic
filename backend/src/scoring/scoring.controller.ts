import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { ScoringService, type RewardsView } from './scoring.service';

@Controller()
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Get('me/rewards')
  @Roles(Role.STUDENT)
  getRewards(@CurrentUser() user: AuthenticatedUser): Promise<RewardsView> {
    return this.scoringService.getRewards(user.id);
  }
}
