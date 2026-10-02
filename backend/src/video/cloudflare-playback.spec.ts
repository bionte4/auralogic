import { generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';
import { signCloudflareManifest } from './cloudflare-playback';

describe('signCloudflareManifest', () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const exported = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const privateKeyPem = typeof exported === 'string' ? exported : exported.toString('utf8');

  it('returns a short-lived HLS manifest and marks the token non-downloadable', () => {
    const assetId = 'ea95132c15732412d22c1476fa83f27a';
    const manifestUrl = signCloudflareManifest({
      assetId,
      customerCode: 'abc123',
      keyId: 'stream-key-1',
      privateKeyPem,
      expiresInSeconds: 300,
    });

    expect(manifestUrl.startsWith('https://customer-abc123.cloudflarestream.com/')).toBe(true);
    expect(manifestUrl.endsWith('/manifest/video.m3u8')).toBe(true);
    expect(manifestUrl.toLowerCase().includes('.mp4')).toBe(false);

    const token = new URL(manifestUrl).pathname.split('/')[1] ?? '';
    const payload = jwt.decode(token);
    expect(payload).toMatchObject({ sub: assetId, downloadable: false, kid: 'stream-key-1' });
  });
});
