import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { TRACK_ICON_KEYS } from '../track.icons';

export const TRACK_SLUG_PATTERN = /^[A-Z][A-Z0-9_]{0,31}$/;

export class CreateLearningTrackDto {
  @IsString()
  @Matches(TRACK_SLUG_PATTERN, { message: 'slug must be UPPER_SNAKE_CASE (A–Z, digits, underscore).' })
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nameId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nameEn!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  blurbId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  blurbEn!: string;

  @IsString()
  @IsIn([...TRACK_ICON_KEYS])
  iconKey!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateLearningTrackDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nameId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  blurbId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  blurbEn?: string;

  @IsOptional()
  @IsString()
  @IsIn([...TRACK_ICON_KEYS])
  iconKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
