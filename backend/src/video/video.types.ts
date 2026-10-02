import type { StreamProvider, VideoEncryption } from '@prisma/client';

export const UPLOAD_TTL_SECONDS = 15 * 60;
export const PLAYBACK_TTL_SECONDS = 5 * 60;

export interface UploadTarget {
  uploadUrl: string;
  assetId: string;
  method: 'POST';
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface SignedPlayback {
  manifestUrl: string;
  expiresAt: Date;
}

export interface VideoDelivery {
  createUpload(input: { durationSeconds: number }): Promise<UploadTarget>;
  signPlayback(input: { assetId: string }): Promise<SignedPlayback>;
}

export interface UploadGrant {
  provider: StreamProvider;
  assetId: string;
  uploadUrl: string;
  method: 'POST';
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface PlaybackGrant {
  protocol: 'HLS';
  encryption: typeof VideoEncryption.AES_128;
  manifestUrl: string;
  expiresAt: Date;
  watermark: {
    userId: string;
    email: string;
  };
}

export const VIDEO_DELIVERY = Symbol('VIDEO_DELIVERY');
