import { BadRequestException } from '@nestjs/common';

export function assertHlsManifestUrl(value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new BadRequestException('Playback URL is not a valid HLS manifest.');
  }
  const path = url.pathname.toLowerCase();
  if (url.protocol !== 'https:' || path.includes('.mp4') || !path.endsWith('.m3u8')) {
    throw new BadRequestException('Playback URL must be an https HLS manifest.');
  }
}
