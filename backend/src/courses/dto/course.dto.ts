import { ContentLocale, CourseStatus, SkillBand } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { TRACK_SLUG_PATTERN } from '../../tracks/dto/track.dto';

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

  @IsEnum(SkillBand)
  level!: SkillBand;

  @IsString()
  @Matches(TRACK_SLUG_PATTERN, { message: 'track must be an UPPER_SNAKE_CASE learning-track slug.' })
  track!: string;

  @IsEnum(ContentLocale)
  contentLocale!: ContentLocale;

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
  @IsEnum(SkillBand)
  level?: SkillBand;

  @IsOptional()
  @IsString()
  @Matches(TRACK_SLUG_PATTERN, { message: 'track must be an UPPER_SNAKE_CASE learning-track slug.' })
  track?: string;

  @IsOptional()
  @IsEnum(ContentLocale)
  contentLocale?: ContentLocale;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  pairedCourseId?: string | null;

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
  @IsString()
  @MaxLength(2000)
  outcome?: string | null;
}

export class ListCoursesQueryDto {
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @IsEnum(SkillBand)
  level?: SkillBand;

  @IsOptional()
  @IsString()
  @Matches(TRACK_SLUG_PATTERN, { message: 'track must be an UPPER_SNAKE_CASE learning-track slug.' })
  track?: string;

  @IsOptional()
  @IsEnum(ContentLocale)
  contentLocale?: ContentLocale;
}
