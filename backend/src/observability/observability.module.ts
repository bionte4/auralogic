import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';

@Global()
@Module({
  providers: [AuditService, NotificationService, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
  exports: [AuditService, NotificationService],
})
export class ObservabilityModule {}