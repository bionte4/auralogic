export function isCourseComplete(completedPerLesson: readonly number[]): boolean {
  return completedPerLesson.length > 0 && completedPerLesson.every((count) => count > 0);
}
