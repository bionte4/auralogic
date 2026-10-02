import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { FinanceQueryDto } from './dto/finance-query.dto';
import { FinanceService, type FinanceTransaction } from './finance.service';
import type { FinanceSummary } from './finance.rules';

@Controller('admin/finance')
@Roles(Role.SUPER_ADMIN)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  summary(@Query() query: FinanceQueryDto): Promise<FinanceSummary> {
    return this.financeService.summary(query);
  }

  @Get('transactions')
  transactions(@Query() query: FinanceQueryDto): Promise<FinanceTransaction[]> {
    return this.financeService.transactions(query);
  }
}
