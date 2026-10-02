import { BadGatewayException, Injectable } from '@nestjs/common';
import { assertHlsManifestUrl } from './hls';
import { CloudflareStreamClient } from './cloudflare-stream.client';
import { PLAYBACK_TTL_SECONDS, type SignedPlayback, type UploadTarget, type VideoDelivery } from './video.types';

@Injectable()
export class CloudflareDelivery implements VideoDelivery {
  constructor(private readonly cloudflare: CloudflareStreamClient) {}

  createUpload(input: { durationSeconds: number }): Promise<UploadTarget> {
    return this.cloudflare.createDirectUpload(input.durationSeconds);
  }

  async signPlayback(input: { assetId: string }): Promise<SignedPlayback> {
    const manifestUrl = this.cloudflare.signPlayback(input.assetId);
    try {
      assertHlsManifestUrl(manifestUrl);
    } catch {
      throw new BadGatewayException('Playback URL is not an HLS manifest.');
    }
    return {
      manifestUrl,
      expiresAt: new Date(Date.now() + PLAYBACK_TTL_SECONDS * 1000),
    };
  }
}
