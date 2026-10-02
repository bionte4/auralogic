import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { SETTING_KEYS, type SettingKey } from '../settings.types';

export class SmtpSettingDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9.-]{1,253}$/)
  host!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  username!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  password?: string;

  @IsEmail()
  @MaxLength(200)
  fromEmail!: string;
}

export class AiSettingDto {
  @IsIn(['openai', 'anthropic'])
  provider!: 'openai' | 'anthropic';

  @IsOptional()
  @IsString()
  @MaxLength(400)
  apiKey?: string;

  @IsString()
  @Matches(/^[A-Za-z0-9._:-]{2,80}$/)
  model!: string;
}

export class CloudflareSettingDto {
  @IsString()
  @Matches(/^[a-fA-F0-9]{16,64}$/)
  accountId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  apiToken?: string;
}

export class PaymentSettingDto {
  @IsIn(['midtrans', 'xendit'])
  provider!: 'midtrans' | 'xendit';

  @IsOptional()
  @IsString()
  @MaxLength(400)
  serverKey?: string;

  @IsBoolean()
  production!: boolean;

  @IsBoolean()
  qris!: boolean;

  @IsBoolean()
  virtualAccount!: boolean;

  @IsBoolean()
  creditCard!: boolean;
}

export class SaveSettingDto {
  @IsIn(SETTING_KEYS)
  key!: SettingKey;

  @IsOptional()
  @ValidateNested()
  @Type(() => SmtpSettingDto)
  smtp?: SmtpSettingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiSettingDto)
  ai?: AiSettingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CloudflareSettingDto)
  cloudflare?: CloudflareSettingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentSettingDto)
  payment?: PaymentSettingDto;
}
