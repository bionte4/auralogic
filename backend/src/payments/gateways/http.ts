export interface HttpPostResult {
  status: number;
  body: unknown;
}

export type HttpPost = (url: string, headers: Record<string, string>, body: unknown) => Promise<HttpPostResult>;

export const postJson: HttpPost = async (url, headers, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  if (text.length === 0) {
    return { status: response.status, body: null };
  }
  try {
    return { status: response.status, body: JSON.parse(text) as unknown };
  } catch {
    return { status: response.status, body: null };
  }
};

export function basicAuth(secret: string): string {
  return `Basic ${Buffer.from(`${secret}:`).toString('base64')}`;
}
