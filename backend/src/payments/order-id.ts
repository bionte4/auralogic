import { randomUUID } from 'crypto';

/** Gateway-safe id. Midtrans accepts up to 50 characters. */
export function createOrderId(): string {
  return `fls-${randomUUID().replace(/-/g, '')}`;
}
