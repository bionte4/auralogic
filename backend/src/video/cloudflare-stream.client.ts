import { BadGatewayException, Injectable } from '@nestjs/common';
import { isRecord } from '../payments/json';
import { signCloudflareManifest } from './cloudflare-playback';
import { readCloudflareConfig } from './video-env';
import { PLAYBACK_TTL_SECONDS, UPLOAD_TTL_SECONDS, type UploadTarget } from './video.types';

@Injectable()
export class CloudflareStreamClient {
  async createDirectUpload(durationSeconds: number): Promise<UploadTarget> {
    const config = readCloudflareConfig();
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: durationSeconds,
          requireSignedURLs: true,
          allowedOrigins: [config.allowedOrigin],
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    const body: unknown = await response.json().catch(() => null);
    const created = readDirectUpload(body, response.ok);
    return {
      uploadUrl: created.uploadURL,
      assetId: created.uid,
      method: 'POST',
      headers: {},
      expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000),
    };
  }

  signPlayback(assetId: string): string {
    const config = readCloudflareConfig();
    return signCloudflareManifest({
      assetId,
      customerCode: config.customerCode,
      keyId: config.keyId,
      privateKeyPem: config.privateKeyPem,
      expiresInSeconds: PLAYBACK_TTL_SECONDS,
    });
  }
}

function readDirectUpload(body: unknown, ok: boolean): { uploadURL: string; uid: string } {
  if (!ok || !isRecord(body) || body.success !== true || !isRecord(body.result)) {
    throw new BadGatewayException('Cloudflare Stream rejected the upload request.');
  }
  const uploadURL = body.result.uploadURL;
  const uid = body.result.uid;
  if (typeof uploadURL !== 'string' || !uploadURL.startsWith('https://') || uploadURL.toLowerCase().includes('.mp4')) {
    throw new BadGatewayException('Cloudflare Stream rejected the upload request.');
  }
  if (typeof uid !== 'string' || !/^[a-z0-9]+$/i.test(uid)) {
    throw new BadGatewayException('Cloudflare Stream rejected the upload request.');
  }
  return { uploadURL, uid };
}
