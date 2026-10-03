const COURSE_PATH = /^\/courses\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function courseReturnPath(value: string | null): string | null {
  if (!value || !COURSE_PATH.test(value)) {
    return null;
  }
  return value;
}
