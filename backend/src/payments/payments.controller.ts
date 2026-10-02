import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentChannel, Role } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { readAppEnv } from '../config/env';
import { CheckoutService, type EnrollmentCourse, type EnrollmentView } from './checkout.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { verifyMidtransNotification } from './gateways/midtrans-notification';
import { verifyXenditQrisNotification } from './gateways/xendit-qris-notification';
import { verifyXenditNotification } from './gateways/xendit-notification';
import { PaymentFollowUpService } from './payment-follow-up.service';
import { PaymentSettlementService } from './payment-settlement.service';
import type { CheckoutResult, WebhookAck } from './payment.types';

@Controller()
export class PaymentsController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly settlement: PaymentSettlementService,
    private readonly followUp: PaymentFollowUpService,
  ) {}

  @Post('courses/:courseId/checkout')
  @Roles(Role.STUDENT)
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateCheckoutDto,
  ): Promise<CheckoutResult> {
    return this.checkoutService.checkout(user, courseId, dto.channel ?? PaymentChannel.REDIRECT);
  }

  @Get('me/enrollments')
  @Roles(Role.STUDENT)
  listEnrollments(@CurrentUser() user: AuthenticatedUser): Promise<EnrollmentCourse[]> {
    return this.checkoutService.listEnrollments(user);
  }

  @Get('courses/:courseId/enrollment')
  @Roles(Role.STUDENT)
  getEnrollment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<EnrollmentView> {
    return this.checkoutService.getEnrollment(user, courseId);
  }

  @Public()
  @SkipThrottle()
  @Post('payments/midtrans/notification')
  @HttpCode(HttpStatus.OK)
  async midtrans(@Req() request: RawBodyRequest<Request>): Promise<WebhookAck> {
    const env = readAppEnv();
    if (!env.midtransServerKey) {
      throw new UnauthorizedException('Invalid payment signature.');
    }
    const notice = verifyMidtransNotification(requireRawBody(request), env.midtransServerKey);
    await this.followUp.afterGrant(await this.settlement.apply(notice));
    return { received: true };
  }

  @Public()
  @SkipThrottle()
  @Post('payments/xendit/invoices')
  @HttpCode(HttpStatus.OK)
  async xendit(@Req() request: RawBodyRequest<Request>): Promise<WebhookAck> {
    const env = readAppEnv();
    if (!env.xenditWebhookToken) {
      throw new UnauthorizedException('Invalid payment signature.');
    }
    const notice = verifyXenditNotification(
      requireRawBody(request),
      request.header('x-callback-token'),
      env.xenditWebhookToken,
    );
    await this.followUp.afterGrant(await this.settlement.apply(notice));
    return { received: true };
  }

  @Public()
  @SkipThrottle()
  @Post('payments/xendit/qris')
  @HttpCode(HttpStatus.OK)
  async xenditQris(@Req() request: RawBodyRequest<Request>): Promise<WebhookAck> {
    const env = readAppEnv();
    if (!env.xenditWebhookToken) {
      throw new UnauthorizedException('Invalid payment signature.');
    }
    const notice = verifyXenditQrisNotification(
      requireRawBody(request),
      request.header('x-callback-token'),
      env.xenditWebhookToken,
    );
    await this.followUp.afterGrant(await this.settlement.apply(notice));
    return { received: true };
  }
}

function requireRawBody(request: RawBodyRequest<Request>): Buffer {
  if (!request.rawBody || request.rawBody.length === 0) {
    throw new BadRequestException('Invalid notification body.');
  }
  return request.rawBody;
}
