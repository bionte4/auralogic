import { ProgressStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsIn([ProgressStatus.IN_PROGRESS, ProgressStatus.COMPLETED])
  status!: ProgressStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;
}
