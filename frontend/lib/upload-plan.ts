const MAX_DURATION_SECONDS = 60 * 60 * 6;

export function clampDurationSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 1) {
    throw new Error('Video duration must be at least 1 second.');
  }
  const rounded = Math.ceil(seconds);
  if (rounded > MAX_DURATION_SECONDS) {
    throw new Error('Video must be 6 hours or shorter.');
  }
  return rounded;
}

export function isLocalMockUpload(uploadUrl: string): boolean {
  try {
    return new URL(uploadUrl).hostname === 'mock.local.fluentis';
  } catch {
    return false;
  }
}

export async function deliverLessonFile(
  uploadUrl: string,
  file: Blob,
  fetchImpl: typeof fetch = fetch,
): Promise<'mock' | 'uploaded'> {
  let url: URL;
  try {
    url = new URL(uploadUrl);
  } catch {
    throw new Error('Upload URL is not valid.');
  }
  if (url.protocol !== 'https:') {
    throw new Error('Upload URL must be https.');
  }
  if (isLocalMockUpload(uploadUrl)) {
    return 'mock';
  }

  const body = new FormData();
  body.append('file', file);
  const response = await fetchImpl(uploadUrl, { method: 'POST', body });
  if (!response.ok) {
    throw new Error('Cloudflare Stream rejected the file.');
  }
  return 'uploaded';
}
