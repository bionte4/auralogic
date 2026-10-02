'use client';

import { FileUp } from 'lucide-react';
import { useEffect, useState, type DragEvent } from 'react';
import { ApiError, apiRequest } from '@/lib/api';
import { isLessonMaterialList, MATERIAL_ACCEPT, uploadLessonMaterial, type LessonMaterial } from '@/lib/lesson-materials';

export function LessonMaterials({ lessonId, onError }: { lessonId: string; onError: (message: string | null) => void }) {
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [pending, setPending] = useState(false);
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
            <li key={material.id}>
              {material.fileName} · {formatSize(material.sizeBytes)}
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
