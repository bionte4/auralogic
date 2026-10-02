import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-request';
import { AdminUsersService, type AdminUserPage, type AdminUserRecord, type BatchEnrollmentResult } from './admin-users.service';
import { BatchEnrollDto, ListUsersQueryDto, UpdateAdminUserDto } from './dto/admin-user.dto';

@Controller('admin')
@Roles(Role.SUPER_ADMIN)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get('users')
  list(@Query() query: ListUsersQueryDto): Promise<AdminUserPage> {
    return this.adminUsersService.list(query);
  }

  @Patch('users/:userId')
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateAdminUserDto,
  ): Promise<AdminUserRecord> {
    return this.adminUsersService.update(actor, userId, dto);
  }

  @Post('enrollments/batch')
  batch(@Body() dto: BatchEnrollDto): Promise<BatchEnrollmentResult> {
    return this.adminUsersService.batchEnroll(dto);
  }
}
