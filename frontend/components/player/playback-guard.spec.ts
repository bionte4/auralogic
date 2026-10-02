import { isDownloadShortcut, isHlsManifest, preventPlayerEvent } from './playback-guard';

describe('playback guard', () => {
  it('accepts an https HLS manifest and rejects mp4 or insecure URLs', () => {
    expect(isHlsManifest('https://customer-abc.cloudflarestream.com/token/manifest/video.m3u8')).toBe(true);
    expect(isHlsManifest('https://cdn.example.com/lesson.mp4')).toBe(false);
    expect(isHlsManifest('http://cdn.example.com/index.m3u8')).toBe(false);
    expect(isHlsManifest('not-a-url')).toBe(false);
  });

  it('recognizes save shortcuts on both control and command', () => {
    expect(isDownloadShortcut({ key: 's', ctrlKey: true, metaKey: false })).toBe(true);
    expect(isDownloadShortcut({ key: 'S', ctrlKey: false, metaKey: true })).toBe(true);
    expect(isDownloadShortcut({ key: 's', ctrlKey: false, metaKey: false })).toBe(false);
  });

  it('cancels the browser event for right-click and drag', () => {
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    preventPlayerEvent({ preventDefault, stopPropagation });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });
});
