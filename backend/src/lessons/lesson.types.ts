import type { LessonType, StreamProvider, VideoEncryption } from '@prisma/client';

export interface LessonPlayback {
  protocol: 'HLS';
  encryption: typeof VideoEncryption.AES_128;
  provider: StreamProvider;
  durationSeconds: number;
  watermark: {
    userId: string;
    email: string;
  };
}

export interface LessonMaterial {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface LessonDetail {
  id: string;
  title: string;
  description: string | null;
  type: LessonType;
  orderIndex: number;
  passingScore: number | null;
  module: {
    id: string;
    title: string;
    orderIndex: number;
    courseId: string;
  };
  playback: LessonPlayback | null;
  attachments: LessonMaterial[];
}
