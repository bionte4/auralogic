'use client';

import { useState, type DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError, apiRequest } from '@/lib/api';
import type { UploadGrant } from '@/lib/courses';
import { clampDurationSeconds, deliverLessonFile } from '@/lib/upload-plan';

export function LessonUploader({
  lessonId,
  lessonTitle,
  orderIndex,
  hasStream,
  onUploaded,
}: {
  lessonId: string;
  lessonTitle: string;
  orderIndex: number;
  hasStream: boolean;
  onUploaded: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(hasStream ? 'HLS asset is attached.' : null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [over, setOver] = useState(false);

  function takeFile(next: File | null) {
    setFile(next);
    setError(null);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setOver(false);
    takeFile(event.dataTransfer.files[0] ?? null);
  }

  async function upload() {
    if (!file) {
      setError('Choose a video file first.');
      return;
    }
    setPending(true);
    setError(null);
    setStatus('Reading duration…');
    try {
      const durationSeconds = await readVideoDuration(file);
      setStatus('Requesting a secure upload…');
      const grant = await apiRequest<UploadGrant>(`/lessons/${lessonId}/uploads`, {
        method: 'POST',
        body: JSON.stringify({ durationSeconds }),
      });
      setStatus('Sending the file…');
      const result = await deliverLessonFile(grant.uploadUrl, file);
      setStatus(
        result === 'mock'
          ? 'Upload registered for local playback. The file stays on this machine until VIDEO_MODE=cloudflare.'
          : 'Uploaded to Cloudflare Stream. Playback will use a signed HLS manifest.',
      );
      setFile(null);
      await onUploaded();
    } catch (caught) {
      setStatus(null);
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : 'Upload failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div>
        <p className="text-sm font-medium">
          Lesson {orderIndex} · {lessonTitle}
        </p>
        <p className="text-xs text-muted-foreground">Drop the source file. Fluentis stores encrypted HLS, not the raw file.</p>
      </div>
      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed px-4 py-8 text-sm ${over ? 'border-foreground bg-secondary' : 'border-border'}`}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <span>{file ? file.name : 'Drag a video here, or browse'}</span>
        <input
          className="sr-only"
          type="file"
          accept="video/*"
          onChange={(event) => takeFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <Button type="button" onClick={() => void upload()} disabled={pending || !file}>
        {pending ? 'Uploading…' : 'Upload to secure storage'}
      </Button>
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      try {
        resolve(clampDurationSeconds(video.duration));
      } catch (error) {
        reject(error);
      }
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the video duration.'));
    };
    video.src = url;
  });
}
