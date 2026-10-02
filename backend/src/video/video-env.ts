import { ServiceUnavailableException } from '@nestjs/common';
import { readAppEnv } from '../config/env';
import { assertHlsManifestUrl } from './hls';

export type VideoMode = 'mock' | 'cloudflare';

const DEFAULT_MOCK_MANIFEST = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  customerCode: string;
  keyId: string;
  privateKeyPem: string;
  allowedOrigin: string;
}

export function readVideoMode(source: NodeJS.ProcessEnv = process.env): VideoMode {
  const raw = source.VIDEO_MODE?.trim().toLowerCase() || 'cloudflare';
  if (raw === 'mock' || raw === 'cloudflare') {
    return raw;
  }
  throw new ServiceUnavailableException('VIDEO_MODE must be mock or cloudflare.');
}

export function readMockManifestUrl(source: NodeJS.ProcessEnv = process.env): string {
  const value = source.MOCK_HLS_MANIFEST_URL?.trim() || DEFAULT_MOCK_MANIFEST;
  try {
    assertHlsManifestUrl(value);
  } catch {
    throw new ServiceUnavailableException('MOCK_HLS_MANIFEST_URL must be an https HLS manifest.');
  }
  return value;
}

export function readCloudflareConfig(source: NodeJS.ProcessEnv = process.env): CloudflareConfig {
  const accountId = source.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = source.CLOUDFLARE_API_TOKEN?.trim();
  const customerCode = source.CLOUDFLARE_STREAM_CUSTOMER_CODE?.trim();
  const keyId = source.CLOUDFLARE_STREAM_KEY_ID?.trim();
  const privateKeyPem = source.CLOUDFLARE_STREAM_PRIVATE_KEY?.trim().replace(/\\n/g, '\n');
  if (!accountId || !apiToken || !customerCode || !keyId || !privateKeyPem) {
    throw new ServiceUnavailableException('Cloudflare Stream is not configured.');
  }
  return {
    accountId,
    apiToken,
    customerCode,
    keyId,
    privateKeyPem,
    allowedOrigin: readAppEnv(source).frontendOrigin,
  };
}
