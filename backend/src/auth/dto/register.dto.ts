import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { UiLocale } from '@prisma/client';

export class RegisterDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Password must include a letter and a number.',
  })
  password!: string;

  @IsOptional()
  @IsEnum(UiLocale)
  locale?: UiLocale;
}
