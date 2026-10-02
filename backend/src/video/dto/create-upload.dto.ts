import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class CreateUploadDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60 * 60 * 6)
  durationSeconds!: number;
}
