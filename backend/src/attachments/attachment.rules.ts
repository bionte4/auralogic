export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export const MAX_ATTACHMENTS_PER_LESSON = 10;

const KINDS = {
  pdf: { extension: 'pdf', contentType: 'application/pdf' },
  ppt: { extension: 'ppt', contentType: 'application/vnd.ms-powerpoint' },
  pptx: { extension: 'pptx', contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  docx: { extension: 'docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
} as const;

type AttachmentKind = keyof typeof KINDS;

export interface AcceptedAttachment {
  fileName: string;
  extension: AttachmentKind;
  contentType: string;
}

export function inspectAttachment(originalName: string, bytes: Buffer): AcceptedAttachment {
  if (bytes.length === 0) {
    throw new Error('Choose a file that is not empty.');
  }
  if (bytes.length > MAX_ATTACHMENT_BYTES) {
    throw new Error('Materials must be 20 MB or smaller.');
  }
  const extension = extensionOf(originalName);
  if (!extension) {
    throw new Error('Upload a PPT, PPTX, PDF, or DOCX file.');
  }
  if (!signatureMatches(extension, bytes)) {
    throw new Error('The file contents do not match its extension.');
  }
  return {
    fileName: displayName(originalName, extension),
    extension,
    contentType: KINDS[extension].contentType,
  };
}

export function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^A-Za-z0-9._ -]/g, '_').slice(0, 180) || 'material';
  return `attachment; filename="${ascii}"`;
}

function extensionOf(originalName: string): AttachmentKind | null {
  const base = originalName.split(/[/\\]/).pop() ?? '';
  const match = /\.([A-Za-z0-9]+)$/.exec(base);
  const extension = match?.[1]?.toLowerCase();
  if (extension === 'pdf' || extension === 'ppt' || extension === 'pptx' || extension === 'docx') {
    return extension;
  }
  return null;
}

function displayName(originalName: string, extension: AttachmentKind): string {
  const base = (originalName.split(/[/\\]/).pop() ?? `material.${extension}`).replace(/[\r\n"]/g, '').trim();
  const clipped = base.slice(0, 180);
  return clipped.length > 0 ? clipped : `material.${extension}`;
}

function signatureMatches(extension: AttachmentKind, bytes: Buffer): boolean {
  if (extension === 'pdf') {
    return bytes.subarray(0, 4).toString('utf8') === '%PDF';
  }
  if (extension === 'ppt') {
    return bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  }
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}
