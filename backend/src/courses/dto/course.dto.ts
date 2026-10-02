import { CefrLevel, CourseStatus, LearningPhase } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateCourseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase words separated by hyphens.' })
  slug?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  description!: string;

  @IsEnum(CefrLevel)
  level!: CefrLevel;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  price!: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(500)
  @Matches(/^https:\/\/\S+$/, { message: 'coverImageUrl must be an https URL.' })
  coverImageUrl?: string | null;

  @IsOptional()
  @IsEnum(LearningPhase)
  phase?: LearningPhase | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  outcome?: string | null;
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase words separated by hyphens.' })
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsEnum(CefrLevel)
  level?: CefrLevel;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  price?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(500)
  @Matches(/^https:\/\/\S+$/, { message: 'coverImageUrl must be an https URL.' })
  coverImageUrl?: string | null;

  @IsOptional()
  @IsEnum(LearningPhase)
  phase?: LearningPhase | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  outcome?: string | null;
}

export class ListCoursesQueryDto {
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @IsEnum(CefrLevel)
  level?: CefrLevel;
}
