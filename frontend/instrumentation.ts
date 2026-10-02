export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
): Promise<void> {
  const { reportServerError } = await import('./lib/error-monitor');
  reportServerError(error, { method: request.method, path: request.path, status: 500 });
}
