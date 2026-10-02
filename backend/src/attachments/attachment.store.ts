import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createReadStream, mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

export interface AttachmentStore {
  put(objectKey: string, body: Buffer, contentType: string): Promise<void>;
  read(objectKey: string): Promise<Readable>;
}

export class LocalAttachmentStore implements AttachmentStore {
  constructor(private readonly root: string) {
    mkdirSync(root, { recursive: true });
  }

  async put(objectKey: string, body: Buffer, _contentType: string): Promise<void> {
    const full = this.resolve(objectKey);
    await mkdir(path.dirname(full));
    await writeFile(full, body);
  }

  async read(objectKey: string): Promise<Readable> {
    const full = this.resolve(objectKey);
    await readFile(full);
    return createReadStream(full);
  }

  private resolve(objectKey: string): string {
    if (!/^lessons\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|ppt|pptx|docx)$/.test(objectKey)) {
      throw new Error('Invalid attachment key.');
    }
    const full = path.resolve(this.root, objectKey);
    const root = path.resolve(this.root);
    if (!full.startsWith(`${root}${path.sep}`)) {
      throw new Error('Invalid attachment key.');
    }
    return full;
  }
}

export class S3AttachmentStore implements AttachmentStore {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
    endpoint: string | null,
  ) {
    this.client = new S3Client({
      region,
      endpoint: endpoint ?? undefined,
      forcePathStyle: endpoint !== null,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async put(objectKey: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async read(objectKey: string): Promise<Readable> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }));
    if (!(result.Body instanceof Readable)) {
      throw new Error('Stored object has no readable body.');
    }
    return result.Body;
  }
}

export function createAttachmentStore(env: NodeJS.ProcessEnv = process.env): AttachmentStore {
  const mode = env.ATTACHMENT_STORAGE?.trim().toLowerCase() || 'local';
  if (mode === 'local') {
    const root = env.ATTACHMENT_LOCAL_DIR?.trim() || path.join(process.cwd(), 'storage', 'attachments');
    return new LocalAttachmentStore(root);
  }
  if (mode !== 's3') {
    throw new Error('ATTACHMENT_STORAGE must be local or s3.');
  }
  const bucket = required(env.AWS_S3_BUCKET, 'AWS_S3_BUCKET');
  const region = required(env.AWS_S3_REGION, 'AWS_S3_REGION');
  const accessKeyId = required(env.AWS_ACCESS_KEY_ID, 'AWS_ACCESS_KEY_ID');
  const secretAccessKey = required(env.AWS_SECRET_ACCESS_KEY, 'AWS_SECRET_ACCESS_KEY');
  const endpoint = env.AWS_S3_ENDPOINT?.trim() || null;
  return new S3AttachmentStore(bucket, region, accessKeyId, secretAccessKey, endpoint);
}

function required(value: string | undefined, name: string): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    throw new Error(`${name} is required when ATTACHMENT_STORAGE is s3.`);
  }
  return trimmed;
}

async function mkdir(dir: string): Promise<void> {
  mkdirSync(dir, { recursive: true });
}
