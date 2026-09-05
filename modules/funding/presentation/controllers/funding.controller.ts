import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { PaginationDto } from '../../../../shared/dto/pagination.dto';
import { PaginatedResponseDto } from '../../../../shared/dto/paginated-response.dto';
import { CreateVirtualAccountDto } from '../../application/dto/create-virtual-account.dto';
import { InitiateCheckoutDepositDto } from '../../application/dto/initiate-checkout-deposit.dto';
import { DepositResponseDto } from '../../application/dto/deposit-response.dto';
import { CheckoutSessionResponseDto } from '../../application/dto/checkout-session-response.dto';
import { VirtualAccountResponseDto } from '../../application/dto/virtual-account-response.dto';
import { CreateVirtualAccountCommand } from '../../application/commands/create-virtual-account/create-virtual-account.command';
import { InitiateCheckoutDepositCommand } from '../../application/commands/initiate-checkout-deposit/initiate-checkout-deposit.command';
import { GetDepositByReferenceQuery } from '../../application/queries/get-deposit-by-reference/get-deposit-by-reference.query';
import { ListMyDepositsQuery } from '../../application/queries/list-my-deposits/list-my-deposits.query';
import { GetMyVirtualAccountsQuery } from '../../application/queries/get-my-virtual-accounts/get-my-virtual-accounts.query';
import { AccessTokenPayload } from '../../../identity/application/ports/token.service.interface';
import { UserRole } from '../../../identity/domain/enums/user-role.enum';

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT];

/**
 * Customer-facing money-in endpoints. All require authentication
 * (global JwtAuthGuard); settlement itself never flows through here —
 * it arrives exclusively via the Flutterwave webhook controller.
 */
@Controller('funding')
export class FundingController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // Calls a real, presumably billed, Flutterwave endpoint. Capped at
  // one per Kudi account already, but that only bites after the call —
  // this stops the call itself from being hammered.
  @Throttle({ sustained: { ttl: 60000, limit: 5 } })
  @Post('virtual-accounts')
  @HttpCode(HttpStatus.CREATED)
  async createVirtualAccount(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateVirtualAccountDto,
  ): Promise<VirtualAccountResponseDto> {
    return this.commandBus.execute(new CreateVirtualAccountCommand(user.sub, dto.accountId));
  }

  @Get('virtual-accounts/me')
  async listMyVirtualAccounts(
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<VirtualAccountResponseDto[]> {
    return this.queryBus.execute(new GetMyVirtualAccountsQuery(user.sub));
  }

  // Calls Flutterwave to open a checkout session — same reasoning as
  // virtual-account creation above.
  @Throttle({ sustained: { ttl: 60000, limit: 10 } })
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async initiateCheckout(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: InitiateCheckoutDepositDto,
  ): Promise<CheckoutSessionResponseDto> {
    return this.commandBus.execute(
      new InitiateCheckoutDepositCommand(user.sub, dto.accountId, dto.amount),
    );
  }

  @Get('deposits/me')
  async listMyDeposits(
    @CurrentUser() user: AccessTokenPayload,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<DepositResponseDto>> {
    return this.queryBus.execute(
      new ListMyDepositsQuery(user.sub, pagination.page, pagination.limit),
    );
  }

  @Get('deposits/:reference')
  async getDepositByReference(
    @CurrentUser() user: AccessTokenPayload,
    @Param('reference') reference: string,
  ): Promise<DepositResponseDto> {
    return this.queryBus.execute(
      new GetDepositByReferenceQuery(
        reference,
        user.sub,
        ADMIN_ROLES.includes(user.role as UserRole),
      ),
    );
  }
}
