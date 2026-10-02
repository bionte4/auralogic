import { randomBytes } from 'node:crypto';
import { Injectable, Optional } from '@nestjs/common';
import { readMockManifestUrl } from './video-env';
import { PLAYBACK_TTL_SECONDS, UPLOAD_TTL_SECONDS, type SignedPlayback, type UploadTarget, type VideoDelivery } from './video.types';

@Injectable()
export class MockHlsDelivery implements VideoDelivery {
  private readonly source: NodeJS.ProcessEnv;

  constructor(@Optional() source?: NodeJS.ProcessEnv) {
    this.source = source ?? process.env;
  }

  createUpload(_input: { durationSeconds: number }): Promise<UploadTarget> {
    const assetId = randomBytes(16).toString('hex');
    return Promise.resolve({
      uploadUrl: `https://mock.local.fluentis/direct/${assetId}`,
      assetId,
      method: 'POST',
      headers: {},
      expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000),
    });
  }

  async signPlayback(_input: { assetId: string }): Promise<SignedPlayback> {
    return {
      manifestUrl: readMockManifestUrl(this.source),
      expiresAt: new Date(Date.now() + PLAYBACK_TTL_SECONDS * 1000),
    };
  }
}
