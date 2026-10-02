import { Module } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module';
import { LessonPrerequisiteGuard } from './guards/lesson-prerequisite.guard';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({
  imports: [ScoringModule],
  controllers: [ProgressController],
  providers: [ProgressService, LessonPrerequisiteGuard],
  exports: [ProgressService, LessonPrerequisiteGuard],
})
export class ProgressModule {}
