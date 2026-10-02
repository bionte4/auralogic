import { BadRequestException } from '@nestjs/common';
import { assertHlsManifestUrl } from './hls';

describe('HLS manifest URLs', () => {
  it('accepts only https m3u8 playback URLs', () => {
    expect(() =>
      assertHlsManifestUrl('https://customer-abc.cloudflarestream.com/token/manifest/video.m3u8'),
    ).not.toThrow();
    expect(() => assertHlsManifestUrl('https://cdn.example.com/video.mp4')).toThrow(BadRequestException);
    expect(() => assertHlsManifestUrl('http://cdn.example.com/index.m3u8')).toThrow(BadRequestException);
  });
});
