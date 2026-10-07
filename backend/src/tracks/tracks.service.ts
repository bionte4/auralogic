import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_LEARNING_TRACKS } from './track.defaults';
import type { CreateLearningTrackDto, UpdateLearningTrackDto } from './dto/track.dto';

export interface LearningTrackView {
  id: string;
  slug: string;
  nameId: string;
  nameEn: string;
  blurbId: string;
  blurbEn: string;
  iconKey: string;
  sortOrder: number;
  active: boolean;
}

const select = {
  id: true,
  slug: true,
  nameId: true,
  nameEn: true,
  blurbId: true,
  blurbEn: true,
  iconKey: true,
  sortOrder: true,
  active: true,
} as const;

@Injectable()
export class TracksService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(): Promise<LearningTrackView[]> {
    await this.ensureDefaults();
    return this.prisma.learningTrack.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
      select,
    });
  }

  async listAdmin(): Promise<LearningTrackView[]> {
    await this.ensureDefaults();
    return this.prisma.learningTrack.findMany({
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
      select,
    });
  }

  async create(dto: CreateLearningTrackDto): Promise<LearningTrackView> {
    const slug = dto.slug.trim().toUpperCase();
    const existing = await this.prisma.learningTrack.findUnique({ where: { slug }, select: { id: true } });
    if (existing) {
      throw new ConflictException('A track with that slug already exists.');
    }
    return this.prisma.learningTrack.create({
      data: {
        slug,
        nameId: dto.nameId.trim(),
        nameEn: dto.nameEn.trim(),
        blurbId: dto.blurbId.trim(),
        blurbEn: dto.blurbEn.trim(),
        iconKey: dto.iconKey,
        sortOrder: dto.sortOrder ?? 100,
        active: dto.active ?? true,
      },
      select,
    });
  }

  async update(id: string, dto: UpdateLearningTrackDto): Promise<LearningTrackView> {
    await this.requireTrack(id);
    return this.prisma.learningTrack.update({
      where: { id },
      data: {
        ...(dto.nameId !== undefined ? { nameId: dto.nameId.trim() } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn.trim() } : {}),
        ...(dto.blurbId !== undefined ? { blurbId: dto.blurbId.trim() } : {}),
        ...(dto.blurbEn !== undefined ? { blurbEn: dto.blurbEn.trim() } : {}),
        ...(dto.iconKey !== undefined ? { iconKey: dto.iconKey } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
      select,
    });
  }

  async remove(id: string): Promise<void> {
    const track = await this.requireTrack(id);
    const courses = await this.prisma.course.count({ where: { track: track.slug } });
    if (courses > 0) {
      throw new BadRequestException('Deactivate the track instead. Courses still use this slug.');
    }
    await this.prisma.learningTrack.delete({ where: { id } });
  }

  async assertTrackAssignable(slug: string): Promise<void> {
    const track = await this.prisma.learningTrack.findUnique({
      where: { slug },
      select: { active: true },
    });
    if (!track) {
      throw new BadRequestException('Unknown learning track.');
    }
    if (!track.active) {
      throw new BadRequestException('That learning track is inactive.');
    }
  }

  async ensureDefaults(): Promise<void> {
    const count = await this.prisma.learningTrack.count();
    if (count > 0) {
      return;
    }
    await this.prisma.learningTrack.createMany({
      data: DEFAULT_LEARNING_TRACKS.map((item) => ({ ...item })),
      skipDuplicates: true,
    });
  }

  private async requireTrack(id: string): Promise<{ id: string; slug: string }> {
    const track = await this.prisma.learningTrack.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!track) {
      throw new NotFoundException('Learning track not found.');
    }
    return track;
  }
}
