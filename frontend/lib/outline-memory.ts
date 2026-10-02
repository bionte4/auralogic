export function collapsedModulesKey(courseId: string): string {
  return `fluentis.outline.collapsed.${courseId}`;
}

export function outlineScrollKey(courseId: string): string {
  return `fluentis.outline.scroll.${courseId}`;
}

export function lessonNoteKey(lessonId: string): string {
  return `fluentis.note.${lessonId}`;
}

export function parseCollapsedModuleIds(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function toggleCollapsed(ids: readonly string[], moduleId: string): string[] {
  return ids.includes(moduleId) ? ids.filter((id) => id !== moduleId) : [...ids, moduleId];
}

export function parseScrollTop(raw: string | null): number {
  if (!raw) {
    return 0;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.round(value);
}
