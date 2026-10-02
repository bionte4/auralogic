import { contentDisposition, inspectAttachment } from './attachment.rules';

describe('lesson attachment rules', () => {
  it('accepts a PDF whose bytes start with the PDF signature', () => {
    const accepted = inspectAttachment('../notes.pdf', Buffer.from('%PDF-1.7'));
    expect(accepted.fileName).toBe('notes.pdf');
    expect(accepted.contentType).toBe('application/pdf');
  });

  it('rejects a renamed executable', () => {
    expect(() => inspectAttachment('slides.pdf', Buffer.from('MZ executable'))).toThrow('do not match');
  });

  it('rejects an extension outside the lesson materials list', () => {
    expect(() => inspectAttachment('video.mp4', Buffer.from('%PDF'))).toThrow('PPT, PPTX, PDF, or DOCX');
  });

  it('builds a header-safe download name', () => {
    expect(contentDisposition('bab 1.pdf')).toBe('attachment; filename="bab 1.pdf"');
    expect(contentDisposition('a"\r\n.pdf')).toContain('filename="');
  });
});
