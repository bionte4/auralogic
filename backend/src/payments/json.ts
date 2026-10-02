export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readString(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Reads a JSON string field from the raw body so signature input keeps trailing zeros. */
export function readRawJsonString(raw: string, field: string): string | null {
  const match = new RegExp(`"${field}"\\s*:\\s*"([^"\\\\]*)"`).exec(raw);
  return match?.[1] && match[1].length > 0 ? match[1] : null;
}
