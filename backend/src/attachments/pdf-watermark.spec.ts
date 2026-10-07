import { PDFDocument } from 'pdf-lib';
import { watermarkPdf } from './pdf-watermark';

async function blankPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([400, 300]);
  return Buffer.from(await doc.save());
}

describe('watermarkPdf', () => {
  it('returns a valid PDF with a larger byte size than the input', async () => {
    const input = await blankPdf();
    const output = await watermarkPdf(input, {
      name: 'Siswa Demo',
      email: 'student@fluentis.test',
      userId: 'user-123',
    });
    expect(output.subarray(0, 4).toString('utf8')).toBe('%PDF');
    expect(output.length).toBeGreaterThan(input.length);
  });
});
