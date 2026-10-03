import { readFileSync } from 'fs';
import { join } from 'path';
import QRCode from 'qrcode';

export interface CertificateTemplateInput {
  studentName: string;
  courseName: string;
  completionDate: string;
  certificateId: string;
  verifyUrl: string;
  locale: 'ID' | 'EN';
}

const PLACEHOLDERS = ['studentName', 'courseName', 'completionDate', 'certificateId', 'verifyUrl', 'qrCode', 'lang', 'heading', 'lead', 'bridge', 'idLabel'] as const;

const COPY = {
  ID: {
    lang: 'id',
    heading: 'Sertifikat Penyelesaian',
    lead: 'Menyatakan bahwa',
    bridge: 'telah menyelesaikan setiap modul',
    idLabel: 'ID sertifikat',
  },
  EN: {
    lang: 'en',
    heading: 'Certificate of Completion',
    lead: 'This certifies that',
    bridge: 'has completed every module of',
    idLabel: 'Certificate ID',
  },
} as const;

export function certificateTemplatePath(): string {
  return join(__dirname, '..', 'assets', 'certificate-template.html');
}

export async function renderCertificateHtml(input: CertificateTemplateInput): Promise<string> {
  const qrCode = await QRCode.toDataURL(input.verifyUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 512,
  });
  const copy = COPY[input.locale];
  const fields: Record<(typeof PLACEHOLDERS)[number], string> = {
    studentName: escapeHtml(input.studentName),
    courseName: escapeHtml(input.courseName),
    completionDate: escapeHtml(input.completionDate),
    certificateId: escapeHtml(input.certificateId),
    verifyUrl: escapeHtml(input.verifyUrl),
    qrCode,
    lang: copy.lang,
    heading: escapeHtml(copy.heading),
    lead: escapeHtml(copy.lead),
    bridge: escapeHtml(copy.bridge),
    idLabel: escapeHtml(copy.idLabel),
  };
  const template = readFileSync(certificateTemplatePath(), 'utf8');
  return template.replace(/\{\{(studentName|courseName|completionDate|certificateId|verifyUrl|qrCode|lang|heading|lead|bridge|idLabel)\}\}/g, (token, key: (typeof PLACEHOLDERS)[number]) => fields[key] ?? token);
}

export function formatCompletionDate(value: Date, locale: 'ID' | 'EN' = 'EN'): string {
  return new Intl.DateTimeFormat(locale === 'ID' ? 'id-ID' : 'en-GB', {
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
