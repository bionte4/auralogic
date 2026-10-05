'use client';

import { FileUp } from 'lucide-react';
import { useEffect, useState, type DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/locale-provider';
import { ApiError, apiRequest } from '@/lib/api';
import { isLessonMaterialList, MATERIAL_ACCEPT, uploadLessonMaterial, type LessonMaterial } from '@/lib/lesson-materials';

export function LessonMaterials({
  lessonId,
  canDelete = false,
  onError,
}: {
  lessonId: string;
  canDelete?: boolean;
  onError: (message: string | null) => void;
}) {
  const { m } = useI18n();
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let current = true;
    void apiRequest<unknown>(`/instructor/lessons/${lessonId}/attachments`)
      .then((body) => {
        if (current && isLessonMaterialList(body)) {
          setMaterials(body);
        }
      })
      .catch((caught: unknown) => {
        if (current) {
          onError(caught instanceof ApiError ? caught.message : 'Could not load lesson materials.');
        }
      });
    return () => {
      current = false;
    };
  }, [lessonId, onError]);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    setPending(true);
    onError(null);
    try {
      const saved: LessonMaterial[] = [];
      for (const file of Array.from(files)) {
        saved.push(await uploadLessonMaterial(lessonId, file));
      }
      setMaterials((current) => [...current, ...saved]);
    } catch (caught) {
      onError(caught instanceof ApiError ? caught.message : 'Could not upload the material.');
    } finally {
      setPending(false);
    }
  }

  async function remove(materialId: string): Promise<void> {
    if (!window.confirm(m.studio.deleteMaterialConfirm)) {
      return;
    }
    setBusyId(materialId);
    onError(null);
    try {
      await apiRequest(`/instructor/lessons/${lessonId}/attachments/${materialId}`, { method: 'DELETE' });
      setMaterials((current) => current.filter((item) => item.id !== materialId));
    } catch (caught) {
      onError(caught instanceof ApiError ? caught.message : m.studio.materialDeleteError);
    } finally {
      setBusyId(null);
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setActive(false);
    void upload(event.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-4 text-center text-sm ${active ? 'border-foreground bg-secondary' : 'border-border'}`}
        onDragOver={(event) => {
          event.preventDefault();
          setActive(true);
        }}
        onDragLeave={() => setActive(false)}
        onDrop={onDrop}
      >
        <FileUp className="h-4 w-4" aria-hidden="true" />
        <span>{pending ? 'Uploading…' : 'Drop PPT, PDF, or DOCX materials, or browse'}</span>
        <input
          className="sr-only"
          type="file"
          accept={MATERIAL_ACCEPT}
          multiple
          disabled={pending}
          onChange={(event) => {
            void upload(event.target.files);
            event.target.value = '';
          }}
        />
      </label>
      {materials.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
          {materials.map((material) => (
            <li key={material.id} className="flex items-center justify-between gap-3">
              <span>
                {material.fileName} · {formatSize(material.sizeBytes)}
              </span>
              {canDelete ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={busyId === material.id}
                  onClick={() => void remove(material.id)}
                >
                  {busyId === material.id ? m.studio.deleting : m.studio.delete}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
