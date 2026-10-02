import { readFileSync } from 'fs';
import { certificateTemplatePath, renderCertificateHtml } from './certificate-template';

const certificateId = '11111111-1111-4111-8111-111111111111';
const verifyUrl = `http://localhost:3000/verify/${certificateId}`;

describe('certificate template', () => {
  it('keeps the named placeholders in the backend asset', () => {
    const source = readFileSync(certificateTemplatePath(), 'utf8');
    expect(source).toContain('{{studentName}}');
    expect(source).toContain('{{courseName}}');
    expect(source).toContain('{{completionDate}}');
    expect(source).toContain('{{certificateId}}');
    expect(source).toContain('{{qrCode}}');
  });

  it('fills the template, escapes text, and embeds a QR image for the verify URL', async () => {
    const html = await renderCertificateHtml({
      studentName: 'Alya <script>',
      courseName: 'Business English',
      completionDate: '2 October 2026',
      certificateId,
      verifyUrl,
    });

    expect(html).toContain('Alya &lt;script&gt;');
    expect(html).not.toContain('{{studentName}}');
    expect(html).toContain('Business English');
    expect(html).toContain('2 October 2026');
    expect(html).toContain(certificateId);
    expect(html).toContain(verifyUrl);
    expect(html).toContain('data:image/png;base64,');
  });
});