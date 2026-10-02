import { ProjectKind } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SavePhaseProjectDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  prompt!: string;

  @IsEnum(ProjectKind)
  kind!: ProjectKind;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  rubric!: string;
}

export class SubmitPhaseProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  response!: string;
}

export class ScorePhaseProjectDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
