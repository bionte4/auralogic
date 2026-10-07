import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuthModule } from './auth/auth.module';
import { CsrfGuard } from './common/guards/csrf.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CacheModule } from './cache/cache.module';
import { CertificatesModule } from './certificates/certificates.module';
import { CoursesModule } from './courses/courses.module';
import { FinanceModule } from './finance/finance.module';
import { HealthController } from './health/health.controller';
import { LessonsModule } from './lessons/lessons.module';
import { ObservabilityModule } from './observability/observability.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgressModule } from './progress/progress.module';
import { QuizModule } from './quiz/quiz.module';
import { ScoringModule } from './scoring/scoring.module';
import { TracksModule } from './tracks/tracks.module';
import { VideoModule } from './video/video.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }] }),
    PrismaModule,
    CacheModule,
    ObservabilityModule,
    AdminModule,
    AuthModule,
    AttachmentsModule,
    CertificatesModule,
    CoursesModule,
    ProgressModule,
    QuizModule,
    FinanceModule,
    LessonsModule,
    PaymentsModule,
    ScoringModule,
    TracksModule,
    VideoModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
