import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { LocalAttachmentStore } from './attachment.store';

const KEY = 'lessons/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf';

describe('local attachment store', () => {
  let root = '';

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'fluentis-attachments-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes and reads a private object key', async () => {
    const store = new LocalAttachmentStore(root);
    await store.put(KEY, Buffer.from('%PDF-1.7'), 'application/pdf');
    const stream = await store.read(KEY);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    expect(Buffer.concat(chunks).toString('utf8')).toBe('%PDF-1.7');
  });

  it('rejects a key that leaves the storage directory', async () => {
    const store = new LocalAttachmentStore(root);
    await expect(store.put('../secret.pdf', Buffer.from('%PDF'), 'application/pdf')).rejects.toThrow('Invalid attachment key.');
  });
});
