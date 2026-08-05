import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../../gateway/guards/roles.guard';
import { PaginationDto } from '../../../../shared/dto/pagination.dto';
import { PaginatedResponseDto } from '../../../../shared/dto/paginated-response.dto';
import { ApplyForLoanDto } from '../../application/dto/apply-for-loan.dto';
import { ApproveLoanDto, LoanApprovalDecision } from '../../application/dto/approve-loan.dto';
import { DisburseLoanDto } from '../../application/dto/disburse-loan.dto';
import { RepayLoanDto } from '../../application/dto/repay-loan.dto';
import { LoanResponseDto } from '../../application/dto/loan-response.dto';
import { ApplyForLoanCommand } from '../../application/commands/apply-for-loan/apply-for-loan.command';
import { ApproveLoanCommand } from '../../application/commands/approve-loan/approve-loan.command';
import { DisburseLoanCommand } from '../../application/commands/disburse-loan/disburse-loan.command';
import { RepayLoanCommand } from '../../application/commands/repay-loan/repay-loan.command';
import { ListLoansQuery } from '../../application/queries/list-loans/list-loans.query';
import { GetLoanByIdQuery } from '../../application/queries/get-loan-by-id/get-loan-by-id.query';
import { AccessTokenPayload } from '../../../identity/application/ports/token.service.interface';
import { UserRole } from '../../../identity/domain/enums/user-role.enum';

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT];

/**
 * Loan endpoints. All require authentication (global JwtAuthGuard).
 * Apply/repay are customer-facing; approve/disburse are deliberately
 * staff-gated (RolesGuard) — no automated approval in this phase (see
 * module README). GET /loans is role-aware: staff see the full review
 * queue, customers see only their own loans.
 */
@ApiTags('loans')
@ApiBearerAuth('access-token')
@Controller('loans')
export class LoansController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('apply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Apply for a loan against one of your accounts' })
  async apply(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: ApplyForLoanDto,
  ): Promise<LoanResponseDto> {
    return this.commandBus.execute(
      new ApplyForLoanCommand(user.sub, dto.accountId, dto.amount, dto.tenorDays),
    );
  }

  @Get()
  @ApiOperation({ summary: 'List loans — staff see all, customers see only their own' })
  async list(
    @CurrentUser() user: AccessTokenPayload,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<LoanResponseDto>> {
    const isAdmin = ADMIN_ROLES.includes(user.role as UserRole);
    return this.queryBus.execute(
      new ListLoansQuery(user.sub, isAdmin, pagination.page ?? 1, pagination.limit ?? 20),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one loan by id' })
  async getById(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<LoanResponseDto> {
    const isAdmin = ADMIN_ROLES.includes(user.role as UserRole);
    return this.queryBus.execute(new GetLoanByIdQuery(id, user.sub, isAdmin));
  }

  @Post('approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Approve or reject a pending loan application (staff only)' })
  async approve(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: ApproveLoanDto,
  ): Promise<LoanResponseDto> {
    return this.commandBus.execute(
      new ApproveLoanCommand(
        dto.loanId,
        user.sub,
        dto.decision === LoanApprovalDecision.APPROVE,
        dto.reason,
      ),
    );
  }

  @Post('disburse')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Disburse an approved loan into the borrower’s wallet (staff only)' })
  async disburse(@Body() dto: DisburseLoanDto): Promise<LoanResponseDto> {
    return this.commandBus.execute(new DisburseLoanCommand(dto.loanId));
  }

  @Post('repay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Make a repayment toward your loan' })
  async repay(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: RepayLoanDto,
  ): Promise<LoanResponseDto> {
    return this.commandBus.execute(new RepayLoanCommand(user.sub, dto.loanId, dto.amount));
  }
}
