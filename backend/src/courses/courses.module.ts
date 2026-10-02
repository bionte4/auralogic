import { Module } from '@nestjs/common';
import { CourseClassService } from './course-class.service';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { PhaseProjectService } from './phase-project.service';
import { PlacementService } from './placement.service';

@Module({
  controllers: [CoursesController],
  providers: [CoursesService, PlacementService, PhaseProjectService, CourseClassService],
})
export class CoursesModule {}
