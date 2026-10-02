import { BadGatewayException } from '@nestjs/common';
import jwt from 'jsonwebtoken';

const CUSTOMER_CODE_PATTERN = /^[a-z0-9]+$/i;
const ASSET_ID_PATTERN = /^[a-z0-9]+$/i;

export interface CloudflarePlaybackInput {
  assetId: string;
  customerCode: string;
  keyId: string;
  privateKeyPem: string;
  expiresInSeconds: number;
}

export function signCloudflareManifest(input: CloudflarePlaybackInput): string {
  if (!CUSTOMER_CODE_PATTERN.test(input.customerCode) || !ASSET_ID_PATTERN.test(input.assetId)) {
    throw new BadGatewayException('Cloudflare Stream playback is not configured.');
  }

  let token: string;
  try {
    token = jwt.sign(
      { sub: input.assetId, kid: input.keyId, downloadable: false },
      input.privateKeyPem,
      {
        algorithm: 'RS256',
        expiresIn: input.expiresInSeconds,
        header: { alg: 'RS256', kid: input.keyId },
      },
    );
  } catch {
    throw new BadGatewayException('Cloudflare Stream playback is not configured.');
  }

  return `https://customer-${input.customerCode}.cloudflarestream.com/${token}/manifest/video.m3u8`;
}
