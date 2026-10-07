import { degrees, PDFDocument, rgb } from 'pdf-lib';

export interface PdfWatermarkLabel {
  name: string;
  email: string;
  userId: string;
}

export async function watermarkPdf(input: Buffer, label: PdfWatermarkLabel): Promise<Buffer> {
  const doc = await PDFDocument.load(input, { ignoreEncryption: true });
  const pages = doc.getPages();
  const footer = `${sanitize(label.name)} · ${sanitize(label.email)} · ${label.userId}`;
  const diagonal = 'Auralogic · materi berlisensi untuk peserta';

  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawText(footer, {
      x: 36,
      y: 28,
      size: 8,
      color: rgb(0.35, 0.35, 0.35),
      opacity: 0.65,
    });
    page.drawText(diagonal, {
      x: width * 0.18,
      y: height * 0.52,
      size: 22,
      color: rgb(0.55, 0.55, 0.55),
      opacity: 0.12,
      rotate: degrees(35),
    });
  }

  return Buffer.from(await doc.save());
}

function sanitize(value: string): string {
  return value.replace(/[\r\n]/g, ' ').trim().slice(0, 120);
}
