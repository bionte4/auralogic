import { ServiceUnavailableException } from '@nestjs/common';
import { MockHlsDelivery } from './mock-hls.delivery';

describe('MockHlsDelivery', () => {
  it('returns an https test manifest without calling Cloudflare', async () => {
    const delivery = new MockHlsDelivery({
      MOCK_HLS_MANIFEST_URL: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    });

    const playback = await delivery.signPlayback({ assetId: 'abc' });
    const upload = await delivery.createUpload({ durationSeconds: 60 });

    expect(playback.manifestUrl.endsWith('.m3u8')).toBe(true);
    expect(playback.manifestUrl.startsWith('https://')).toBe(true);
    expect(upload.uploadUrl.includes('.mp4')).toBe(false);
    expect(upload.method).toBe('POST');
  });

  it('refuses a mock manifest that is not HLS', async () => {
    const delivery = new MockHlsDelivery({
      MOCK_HLS_MANIFEST_URL: 'https://cdn.example.com/raw/video.mp4',
    });

    await expect(delivery.signPlayback({ assetId: 'abc' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
