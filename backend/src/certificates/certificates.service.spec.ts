import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import type { PrismaService } from '../prisma/prisma.service';
import { CertificatesService } from './certificates.service';
import type { HtmlPdfEngine } from './html-pdf';

const owner: AuthenticatedUser = {
  id: 'student-1',
  email: 'alya@fluentis.test',
  name: 'Alya',
  role: Role.STUDENT,
  locale: 'ID',
};

const row = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: owner.id,
  issuedAt: new Date('2026-10-02T00:00:00.000Z'),
  pdfBytes: null,
  user: { name: 'Alya' },
  course: { title: 'Business English' },
};

describe('CertificatesService', () => {
  const engine: HtmlPdfEngine = { render: jest.fn(async () => Buffer.from('%PDF-1.4')) };
  const prisma = { certificate: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() } };
  const service = new CertificatesService(prisma as unknown as PrismaService, engine);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
    process.env.JWT_SECRET = 'test-jwt-secret-with-32-characters';
    process.env.DATABASE_URL = 'postgresql://fluentis:fluentis@localhost:5432/fluentis';
    process.env.PAYMENT_PROVIDER = 'midtrans';
    process.env.MIDTRANS_SERVER_KEY = 'midtrans-server-key';
  });

  it('returns a public verification without the student email', async () => {
    prisma.certificate.findUnique.mockResolvedValue(row);

    await expect(service.verify(row.id)).resolves.toEqual({
      valid: true,
      certificateId: row.id,
      studentName: 'Alya',
      courseTitle: 'Business English',
      issuedAt: row.issuedAt,
    });
  });

  it('rejects a missing certificate', async () => {
    prisma.certificate.findUnique.mockResolvedValue(null);
    await expect(service.verify(row.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('renders the HTML template into a PDF for the owner and stores it', async () => {
    prisma.certificate.findUnique.mockResolvedValue(row);
    const file = await service.open(owner, row.id, 'attachment');

    expect(file.getHeaders().type).toBe('application/pdf');
    expect(file.getHeaders().disposition).toBe(`attachment; filename="auralogic-${row.id}.pdf"`);
    expect(engine.render).toHaveBeenCalledTimes(1);
    const html = (engine.render as jest.Mock).mock.calls[0]?.[0];
    expect(html).toContain('Alya');
    expect(html).toContain('Business English');
    expect(html).toContain(`http://localhost:3000/verify/${row.id}`);
    expect(html).toContain('data:image/png;base64,');
    expect(prisma.certificate.update).toHaveBeenCalledWith({
      where: { id: row.id },
      data: { pdfBytes: Uint8Array.from(Buffer.from('%PDF-1.4')) },
    });

    await expect(service.open({ ...owner, id: 'student-2' }, row.id, 'inline')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('serves a stored PDF inline without rendering again', async () => {
    prisma.certificate.findUnique.mockResolvedValue({ ...row, pdfBytes: Buffer.from('%PDF-stored') });
    const file = await service.open(owner, row.id, 'inline');
    expect(file.getHeaders().disposition).toContain('inline;');
    expect(engine.render).not.toHaveBeenCalled();
  });
});
