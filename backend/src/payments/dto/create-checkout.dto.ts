import { PaymentChannel } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class CreateCheckoutDto {
  @IsOptional()
  @IsEnum(PaymentChannel)
  channel?: PaymentChannel;
}
