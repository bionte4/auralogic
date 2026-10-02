import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [ProgressModule],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
