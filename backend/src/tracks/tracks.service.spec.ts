import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { TracksService } from './tracks.service';

describe('TracksService', () => {
  const prisma = {
    learningTrack: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    course: { count: jest.fn() },
  };
  const service = new TracksService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('seeds default tracks when the table is empty', async () => {
    prisma.learningTrack.count.mockResolvedValue(0);
    prisma.learningTrack.createMany.mockResolvedValue({ count: 5 });
    prisma.learningTrack.findMany.mockResolvedValue([{ slug: 'NETWORK', active: true }]);

    const rows = await service.listPublic();
    expect(prisma.learningTrack.createMany).toHaveBeenCalled();
    expect(rows[0]?.slug).toBe('NETWORK');
  });

  it('refuses a duplicate slug', async () => {
    prisma.learningTrack.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(
      service.create({
        slug: 'NETWORK',
        nameId: 'Network',
        nameEn: 'Network',
        blurbId: 'x',
        blurbEn: 'x',
        iconKey: 'waypoints',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses delete when courses still use the slug', async () => {
    prisma.learningTrack.findUnique.mockResolvedValue({ id: 't1', slug: 'NETWORK' });
    prisma.course.count.mockResolvedValue(2);
    await expect(service.remove('t1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.learningTrack.delete).not.toHaveBeenCalled();
  });
});
