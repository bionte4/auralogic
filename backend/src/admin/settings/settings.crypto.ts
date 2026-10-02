import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const PREFIX = 'enc:v1:';

export function sealSecret(plain: string, material: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(material), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function openSecret(sealed: string, material: string): string {
  if (!sealed.startsWith(PREFIX)) {
    throw new Error('Stored secret is not sealed.');
  }
  const [ivPart, tagPart, dataPart] = sealed.slice(PREFIX.length).split('.');
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error('Stored secret is not sealed.');
  }
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(material), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  const plain = Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64url')), decipher.final()]);
  return plain.toString('utf8');
}

export function isSealedSecret(value: string): boolean {
  return value.startsWith(PREFIX);
}

function deriveKey(material: string): Buffer {
  return scryptSync(material, 'fluentis-settings', 32);
}
