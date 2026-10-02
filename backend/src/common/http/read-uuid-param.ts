import { BadRequestException } from '@nestjs/common';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readUuidParam(
  value: string | readonly string[] | undefined,
  name: string,
): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !UUID_PATTERN.test(raw)) {
    throw new BadRequestException(`${name} must be a UUID.`);
  }
  return raw;
}
