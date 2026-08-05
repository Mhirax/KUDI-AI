import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { PaginationDto } from '../../../../shared/dto/pagination.dto';
import { PaginatedResponseDto } from '../../../../shared/dto/paginated-response.dto';
import { BillCategory } from '../../domain/enums/bill-category.enum';
import { InitiateBillPaymentDto } from '../../application/dto/initiate-bill-payment.dto';
import { ValidateBillCustomerDto } from '../../application/dto/validate-bill-customer.dto';
import { BillPaymentResponseDto } from '../../application/dto/bill-payment-response.dto';
import { BillerResponseDto } from '../../application/dto/biller-response.dto';
import { ValidatedCustomerResponseDto } from '../../application/dto/validated-customer-response.dto';
import { InitiateBillPaymentCommand } from '../../application/commands/initiate-bill-payment/initiate-bill-payment.command';
import { RefreshBillPaymentStatusCommand } from '../../application/commands/refresh-bill-payment-status/refresh-bill-payment-status.command';
import { ListBillersQuery } from '../../application/queries/list-billers/list-billers.query';
import { ValidateBillCustomerQuery } from '../../application/queries/validate-bill-customer/validate-bill-customer.query';
import { GetBillPaymentByReferenceQuery } from '../../application/queries/get-bill-payment-by-reference/get-bill-payment-by-reference.query';
import { ListMyBillPaymentsQuery } from '../../application/queries/list-my-bill-payments/list-my-bill-payments.query';
import { AccessTokenPayload } from '../../../identity/application/ports/token.service.interface';
import { UserRole } from '../../../identity/domain/enums/user-role.enum';

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT];

/**
 * Bill payment endpoints. All require authentication (global
 * JwtAuthGuard). Category is validated as a route param via the enum
 * pipe-style check in ListBillersQuery construction.
 */
@Controller('bills')
export class BillsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('billers')
  async listBillers(@Query('category') category: BillCategory): Promise<BillerResponseDto[]> {
    return this.queryBus.execute(new ListBillersQuery(category));
  }

  @Post('validate-customer')
  @HttpCode(HttpStatus.OK)
  async validateCustomer(
    @Body() dto: ValidateBillCustomerDto,
  ): Promise<ValidatedCustomerResponseDto> {
    return this.queryBus.execute(
      new ValidateBillCustomerQuery(dto.billerCode, dto.itemCode, dto.customerIdentifier),
    );
  }

  @Post('pay')
  @HttpCode(HttpStatus.CREATED)
  async pay(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: InitiateBillPaymentDto,
  ): Promise<BillPaymentResponseDto> {
    return this.commandBus.execute(
      new InitiateBillPaymentCommand(
        user.sub,
        dto.accountId,
        dto.category,
        dto.billerCode,
        dto.itemCode,
        dto.billerName,
        dto.customerIdentifier,
        dto.amount,
      ),
    );
  }

  @Get('me')
  async listMine(
    @CurrentUser() user: AccessTokenPayload,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<BillPaymentResponseDto>> {
    return this.queryBus.execute(
      new ListMyBillPaymentsQuery(user.sub, pagination.page, pagination.limit),
    );
  }

  @Get(':reference')
  async getByReference(
    @CurrentUser() user: AccessTokenPayload,
    @Param('reference') reference: string,
  ): Promise<BillPaymentResponseDto> {
    return this.queryBus.execute(
      new GetBillPaymentByReferenceQuery(
        reference,
        user.sub,
        ADMIN_ROLES.includes(user.role as UserRole),
      ),
    );
  }

  @Post(':reference/refresh-status')
  @HttpCode(HttpStatus.OK)
  async refreshStatus(
    @CurrentUser() user: AccessTokenPayload,
    @Param('reference') reference: string,
  ): Promise<BillPaymentResponseDto> {
    return this.commandBus.execute(
      new RefreshBillPaymentStatusCommand(
        reference,
        user.sub,
        ADMIN_ROLES.includes(user.role as UserRole),
      ),
    );
  }
}
