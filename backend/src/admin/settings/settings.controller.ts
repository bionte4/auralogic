import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AiSettingDto, CloudflareSettingDto, PaymentSettingDto, SaveSettingDto, SmtpSettingDto } from './dto/settings.dto';
import { SettingsService } from './settings.service';
import type { ConnectionTestResult, SettingResponse } from './settings.types';

@Controller('admin/settings')
@Roles(Role.SUPER_ADMIN)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Post()
  save(@Body() dto: SaveSettingDto): Promise<SettingResponse> {
    return this.settings.save(dto);
  }

  @Get(':key')
  get(@Param('key') key: string): Promise<SettingResponse> {
    return this.settings.get(key);
  }

  @Post('test-smtp')
  testSmtp(@Body() dto: SmtpSettingDto): Promise<ConnectionTestResult> {
    return this.settings.testSmtp(dto);
  }

  @Post('test-ai')
  testAi(@Body() dto: AiSettingDto): Promise<ConnectionTestResult> {
    return this.settings.testAi(dto);
  }

  @Post('test-cloudflare')
  testCloudflare(@Body() dto: CloudflareSettingDto): Promise<ConnectionTestResult> {
    return this.settings.testCloudflare(dto);
  }

  @Post('test-payment')
  testPayment(@Body() dto: PaymentSettingDto): Promise<ConnectionTestResult> {
    return this.settings.testPayment(dto);
  }
}
