import { readFileSync } from 'fs';
import { join } from 'path';
import QRCode from 'qrcode';

export interface CertificateTemplateInput {
  studentName: string;
  courseName: string;
  completionDate: string;
  certificateId: string;
  verifyUrl: string;
}

const PLACEHOLDERS = ['studentName', 'courseName', 'completionDate', 'certificateId', 'verifyUrl', 'qrCode'] as const;

export function certificateTemplatePath(): string {
  return join(__dirname, '..', 'assets', 'certificate-template.html');
}

export async function renderCertificateHtml(input: CertificateTemplateInput): Promise<string> {
  const qrCode = await QRCode.toDataURL(input.verifyUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 512,
  });
  const fields: Record<(typeof PLACEHOLDERS)[number], string> = {
    studentName: escapeHtml(input.studentName),
    courseName: escapeHtml(input.courseName),
    completionDate: escapeHtml(input.completionDate),
    certificateId: escapeHtml(input.certificateId),
    verifyUrl: escapeHtml(input.verifyUrl),
    qrCode,
  };
  const template = readFileSync(certificateTemplatePath(), 'utf8');
  return template.replace(/\{\{(studentName|courseName|completionDate|certificateId|verifyUrl|qrCode)\}\}/g, (token, key: (typeof PLACEHOLDERS)[number]) => fields[key] ?? token);
}

export function formatCompletionDate(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
