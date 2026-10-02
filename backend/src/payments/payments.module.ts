import { Module } from '@nestjs/common';
import { readAppEnv } from '../config/env';
import { MidtransGateway } from './gateways/midtrans.gateway';
import { XenditGateway } from './gateways/xendit.gateway';
import { postJson } from './gateways/http';
import { CheckoutService } from './checkout.service';
import { PAYMENT_GATEWAY } from './payment.types';
import { PaymentFollowUpService } from './payment-follow-up.service';
import { PaymentSettlementService } from './payment-settlement.service';
import { PaymentsController } from './payments.controller';

@Module({
  controllers: [PaymentsController],
  providers: [
    CheckoutService,
    PaymentSettlementService,
    PaymentFollowUpService,
    {
      provide: PAYMENT_GATEWAY,
      useFactory: () => {
        const env = readAppEnv();
        return env.paymentProvider === 'xendit' ? new XenditGateway(env, postJson) : new MidtransGateway(env, postJson);
      },
    },
  ],
})
export class PaymentsModule {}
