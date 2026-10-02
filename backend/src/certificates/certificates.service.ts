import { ForbiddenException, Inject, Injectable, NotFoundException, Optional, StreamableFile } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { readAppEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { formatCompletionDate, renderCertificateHtml } from './certificate-template';
import { HTML_PDF_ENGINE, PuppeteerPdfEngine, type HtmlPdfEngine } from './html-pdf';

export interface CertificateSummary {
  id: string;
  courseId: string;
  courseTitle: string;
  issuedAt: Date;
}

export interface CertificateVerification {
  valid: true;
  certificateId: string;
  studentName: string;
  courseTitle: string;
  issuedAt: Date;
}

export type CertificateDisposition = 'inline' | 'attachment';

interface CertificateRow {
  id: string;
  userId: string;
  issuedAt: Date;
  pdfBytes: Uint8Array | null;
  user: { name: string };
  course: { title: string };
}

@Injectable()
export class CertificatesService {
  private readonly engine: HtmlPdfEngine;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(HTML_PDF_ENGINE) engine?: HtmlPdfEngine,
  ) {
    this.engine = engine ?? new PuppeteerPdfEngine();
  }

  async listForStudent(userId: string): Promise<CertificateSummary[]> {
    const rows = await this.prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      select: { id: true, courseId: true, issuedAt: true, course: { select: { title: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      courseId: row.courseId,
      courseTitle: row.course.title,
      issuedAt: row.issuedAt,
    }));
  }

  async verify(certificateId: string): Promise<CertificateVerification> {
    const row = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      select: {
        id: true,
        issuedAt: true,
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
    });
    if (!row) {
      throw new NotFoundException('Certificate not found.');
    }
    return {
      valid: true,
      certificateId: row.id,
      studentName: row.user.name,
      courseTitle: row.course.title,
      issuedAt: row.issuedAt,
    };
  }

  async materialize(certificateId: string): Promise<void> {
    const row = await this.findRow(certificateId);
    await this.ensurePdf(row);
  }

  async open(user: AuthenticatedUser, certificateId: string, disposition: CertificateDisposition): Promise<StreamableFile> {
    const row = await this.findRow(certificateId);
    if (user.role !== Role.SUPER_ADMIN && user.id !== row.userId) {
      throw new ForbiddenException('You can only download your own certificates.');
    }
    const pdf = await this.ensurePdf(row);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `${disposition}; filename="fluentis-${row.id}.pdf"`,
    });
  }

  private async ensurePdf(row: CertificateRow): Promise<Buffer> {
    if (row.pdfBytes && row.pdfBytes.byteLength > 0) {
      return Buffer.from(row.pdfBytes);
    }
    const verifyUrl = `${readAppEnv().frontendOrigin}/verify/${row.id}`;
    const html = await renderCertificateHtml({
      studentName: row.user.name,
      courseName: row.course.title,
      completionDate: formatCompletionDate(row.issuedAt),
      certificateId: row.id,
      verifyUrl,
    });
    const pdf = await this.engine.render(html);
    const stored = new Uint8Array(pdf.byteLength);
    stored.set(pdf);
    await this.prisma.certificate.update({
      where: { id: row.id },
      data: { pdfBytes: stored },
    });
    return Buffer.from(stored);
  }

  private async findRow(certificateId: string): Promise<CertificateRow> {
    const row = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      select: {
        id: true,
        userId: true,
        issuedAt: true,
        pdfBytes: true,
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
    });
    if (!row) {
      throw new NotFoundException('Certificate not found.');
    }
    return row;
  }
}
