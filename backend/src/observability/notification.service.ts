import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { readAppEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import {
  MAIL_TRANSPORT,
  ResendTransport,
  courseCompletedMessage,
  enrollmentGrantedMessage,
  passwordResetMessage,
  paymentActivatedMessage,
  type MailTransport,
  type OutboundMessage,
} from './mail';

export interface PaymentNotice {
  email: string;
  name: string;
  courseTitle: string;
  courseId: string;
  amount: string;
}

export interface EnrollmentNotice {
  email: string;
  name: string;
  courseTitle: string;
  courseId: string;
  temporaryPassword: string | null;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly transport: MailTransport;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(MAIL_TRANSPORT) transport?: MailTransport,
  ) {
    this.transport = transport ?? transportFromEnv();
  }

  async paymentActivated(notice: PaymentNotice): Promise<void> {
    const origin = safeOrigin();
    const message = paymentActivatedMessage({
      name: notice.name,
      courseTitle: notice.courseTitle,
      amount: notice.amount,
      courseUrl: `${origin}/learn/${notice.courseId}`,
    });
    await this.deliver({ ...message, to: notice.email });
  }

  async enrollmentGranted(notice: EnrollmentNotice): Promise<void> {
    const origin = safeOrigin();
    const message = enrollmentGrantedMessage({
      name: notice.name,
      courseTitle: notice.courseTitle,
      courseUrl: `${origin}/learn/${notice.courseId}`,
      temporaryPassword: notice.temporaryPassword,
    });
    await this.deliver({ ...message, to: notice.email });
  }

  async passwordReset(input: { email: string; name: string; resetUrl: string }): Promise<void> {
    const message = passwordResetMessage({ name: input.name, resetUrl: input.resetUrl });
    await this.deliver({ ...message, to: input.email });
  }

  async courseCompleted(certificateId: string): Promise<void> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      select: {
        id: true,
        user: { select: { email: true, name: true } },
        course: { select: { title: true } },
      },
    });
    if (!certificate) {
      return;
    }
    const origin = safeOrigin();
    const message = courseCompletedMessage({
      name: certificate.user.name,
      courseTitle: certificate.course.title,
      certificateUrl: `${origin}/verify/${certificate.id}`,
      dashboardUrl: `${origin}/learn`,
    });
    await this.deliver({ ...message, to: certificate.user.email });
  }

  private async deliver(message: OutboundMessage): Promise<void> {
    try {
      await this.transport.send(message);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Notification delivery failed.';
      this.logger.error(`${message.subject} to ${message.to} was not sent. ${reason}`);
    }
  }
}

function transportFromEnv(): MailTransport {
  try {
    const env = readAppEnv();
    if (env.mailProvider === 'resend' && env.resendApiKey && env.mailFrom) {
      return new ResendTransport(env.resendApiKey, env.mailFrom);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Mail configuration is unavailable.';
    new Logger(NotificationService.name).error(reason);
  }
  return {
    async send(message) {
      new Logger(NotificationService.name).log(`Mail queued locally for ${message.to}: ${message.subject}\n${message.text}`);
    },
  };
}

function safeOrigin(): string {
  try {
    return readAppEnv().frontendOrigin;
  } catch {
    return 'http://localhost:3000';
  }
}
