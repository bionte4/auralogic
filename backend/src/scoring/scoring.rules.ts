import type { LessonType } from '@prisma/client';

export const LESSON_XP = 10;
export const QUIZ_XP = 25;
export const LEVEL_XP = 50;
export const DISTINCTION_SCORE = 90;

export function xpForCompletion(type: LessonType, levelCompleted: boolean): number {
  const base = type === 'QUIZ' ? QUIZ_XP : LESSON_XP;
  return base + (levelCompleted ? LEVEL_XP : 0);
}

export function isDistinction(score: number): boolean {
  return score >= DISTINCTION_SCORE;
}

export function jakartaDate(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(value);
}

export function nextStreak(previousDate: string | null, streak: number, today: string): number {
  if (previousDate === today) {
    return streak;
  }
  if (previousDate && shiftIsoDate(previousDate, 1) === today) {
    return streak + 1;
  }
  return 1;
}

function shiftIsoDate(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
