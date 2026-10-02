import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import {
  CertificatesService,
  type CertificateDisposition,
  type CertificateSummary,
  type CertificateVerification,
} from './certificates.service';

@Controller()
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get('me/certificates')
  @Roles(Role.STUDENT)
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<CertificateSummary[]> {
    return this.certificatesService.listForStudent(user.id);
  }

  @Public()
  @Get('certificates/:certificateId/verify')
  verify(@Param('certificateId', ParseUUIDPipe) certificateId: string): Promise<CertificateVerification> {
    return this.certificatesService.verify(certificateId);
  }

  @Get('certificates/:certificateId/file')
  @Roles(Role.STUDENT, Role.SUPER_ADMIN)
  file(
    @CurrentUser() user: AuthenticatedUser,
    @Param('certificateId', ParseUUIDPipe) certificateId: string,
    @Query('disposition') disposition?: string,
  ) {
    const mode: CertificateDisposition = disposition === 'inline' ? 'inline' : 'attachment';
    return this.certificatesService.open(user, certificateId, mode);
  }
}
