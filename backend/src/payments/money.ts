import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function wholeIdr(value: Prisma.Decimal): number {
  if (!value.isInteger()) {
    throw new BadRequestException('Course price must be a whole IDR amount.');
  }
  const amount = value.toNumber();
  if (!Number.isSafeInteger(amount) || amount < 1) {
    throw new BadRequestException('Course price must be a positive IDR amount.');
  }
  return amount;
}
