import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateLearningTrackDto, UpdateLearningTrackDto } from './dto/track.dto';
import { TracksService, type LearningTrackView } from './tracks.service';

@Controller('admin/tracks')
@Roles(Role.SUPER_ADMIN)
export class AdminTracksController {
  constructor(private readonly tracks: TracksService) {}

  @Get()
  list(): Promise<LearningTrackView[]> {
    return this.tracks.listAdmin();
  }

  @Post()
  create(@Body() dto: CreateLearningTrackDto): Promise<LearningTrackView> {
    return this.tracks.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLearningTrackDto,
  ): Promise<LearningTrackView> {
    return this.tracks.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tracks.remove(id);
  }
}
