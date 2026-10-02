import { API_URL, ApiError, apiRequest, readErrorMessage } from './api';

export interface LessonMaterial {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

const ACCEPT = '.ppt,.pptx,.pdf,.docx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const MATERIAL_ACCEPT = ACCEPT;

export function isLessonMaterial(value: unknown): value is LessonMaterial {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as { id?: unknown; fileName?: unknown; contentType?: unknown; sizeBytes?: unknown };
  return (
    typeof record.id === 'string' &&
    typeof record.fileName === 'string' &&
    typeof record.contentType === 'string' &&
    typeof record.sizeBytes === 'number'
  );
}

export function isLessonMaterialList(value: unknown): value is LessonMaterial[] {
  return Array.isArray(value) && value.every(isLessonMaterial);
}

export async function uploadLessonMaterial(lessonId: string, file: File): Promise<LessonMaterial> {
  const body = new FormData();
  body.append('file', file);
  const saved = await apiRequest<unknown>(`/instructor/lessons/${lessonId}/attachments`, { method: 'POST', body });
  if (!isLessonMaterial(saved)) {
    throw new ApiError('The upload returned an unexpected response.', 500);
  }
  return saved;
}

export async function downloadLessonMaterial(lessonId: string, material: LessonMaterial): Promise<void> {
  const response = await fetch(`${API_URL}/lessons/${lessonId}/attachments/${material.id}`, { credentials: 'include' });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(readErrorMessage(body) ?? `Download failed (${response.status}).`, response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = material.fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
