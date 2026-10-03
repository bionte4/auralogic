import { UiLocale } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateLocaleDto {
  @IsEnum(UiLocale)
  locale!: UiLocale;
}
