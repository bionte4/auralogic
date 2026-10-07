import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { TracksService, type LearningTrackView } from './tracks.service';

@Controller('tracks')
export class TracksController {
  constructor(private readonly tracks: TracksService) {}

  @Public()
  @Get()
  list(): Promise<LearningTrackView[]> {
    return this.tracks.listPublic();
  }
}
