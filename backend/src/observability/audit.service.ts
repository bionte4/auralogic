import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  actorId?: string | null;
  action: 'LOGIN' | 'LOGIN_FAILED' | 'PAYMENT_SUCCESS' | 'PREREQUISITE_DENIED' | 'ADMIN_WRITE';
  resource: string;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILURE';
  ip?: string | null;
  detail?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId ?? null,
          action: entry.action,
          resource: entry.resource.slice(0, 200),
          outcome: entry.outcome,
          ip: entry.ip ?? null,
          detail: entry.detail ? entry.detail.slice(0, 500) : null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Audit log write failed.';
      this.logger.error(message);
    }
  }
}
