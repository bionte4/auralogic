import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateModuleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  outcome?: string;
}

export class UpdateModuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  outcome?: string | null;
}
