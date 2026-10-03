import { SkillBand } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class FinanceQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsEnum(SkillBand)
  level?: SkillBand;
}
