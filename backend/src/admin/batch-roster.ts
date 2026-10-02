import { randomInt } from 'crypto';

export interface BatchStudent {
  email: string;
  name: string;
}

export interface BatchSkip {
  email: string;
  reason: string;
}

export interface ParsedBatch {
  students: BatchStudent[];
  skipped: BatchSkip[];
}

const MAX_BATCH = 100;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseBatchRoster(emails: readonly string[] | undefined, csv: string | undefined): ParsedBatch {
  const skipped: BatchSkip[] = [];
  const students: BatchStudent[] = [];
  const seen = new Set<string>();

  for (const entry of rowsFrom(emails, csv)) {
    if (students.length + skipped.length >= MAX_BATCH) {
      skipped.push({ email: entry.email || entry.raw, reason: 'Batch limit is 100 students.' });
      continue;
    }
    const email = entry.email.trim().toLowerCase();
    if (!EMAIL.test(email) || email.length > 200) {
      skipped.push({ email: entry.raw || email, reason: 'Email is not valid.' });
      continue;
    }
    if (seen.has(email)) {
      skipped.push({ email, reason: 'Duplicate email in this batch.' });
      continue;
    }
    seen.add(email);
    students.push({ email, name: displayName(entry.name, email) });
  }

  return { students, skipped };
}

export function temporaryPassword(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let value = '';
  for (let index = 0; index < 10; index += 1) {
    value += letters[randomIndex(letters.length)];
  }
  const digit = String(randomIndex(8) + 2);
  const at = randomIndex(value.length + 1);
  return `${value.slice(0, at)}${digit}${value.slice(at)}`;
}

function rowsFrom(emails: readonly string[] | undefined, csv: string | undefined): Array<{ raw: string; email: string; name: string }> {
  const rows: Array<{ raw: string; email: string; name: string }> = [];
  for (const value of emails ?? []) {
    for (const part of value.split(/[\s,;]+/)) {
      if (part.trim()) {
        rows.push({ raw: part.trim(), email: part.trim(), name: '' });
      }
    }
  }
  if (!csv?.trim()) {
    return rows;
  }
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const header = lines[0]?.split(/[,;]/).map((cell) => cell.trim().toLowerCase()) ?? [];
  const emailIndex = header.indexOf('email');
  const hasHeader = emailIndex >= 0;
  const nameIndex = header.indexOf('name');
  const body = hasHeader ? lines.slice(1) : lines;
  for (const line of body) {
    const cells = line.split(/[,;]/).map((cell) => cell.trim());
    if (hasHeader) {
      rows.push({ raw: line, email: cells[emailIndex] ?? '', name: nameIndex >= 0 ? (cells[nameIndex] ?? '') : '' });
    } else {
      rows.push({ raw: line, email: cells[0] ?? '', name: cells[1] ?? '' });
    }
  }
  return rows;
}

function displayName(name: string, email: string): string {
  const trimmed = name.trim().replace(/^["']|["']$/g, '');
  if (trimmed.length >= 2 && trimmed.length <= 120) {
    return trimmed;
  }
  const local = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim() ?? '';
  if (local.length >= 2 && local.length <= 120) {
    return local;
  }
  return 'Student';
}

function randomIndex(size: number): number {
  return randomInt(size);
}
