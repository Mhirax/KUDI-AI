import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../../gateway/guards/roles.guard';
import { OpenAccountDto } from '../../application/dto/open-account.dto';
import { CreditAccountDto } from '../../application/dto/credit-account.dto';
import { DebitAccountDto } from '../../application/dto/debit-account.dto';
import { FreezeAccountDto } from '../../application/dto/freeze-account.dto';
import { AccountResponseDto } from '../../application/dto/account-response.dto';
import { OpenAccountCommand } from '../../application/commands/open-account/open-account.command';
import { CreditAccountCommand } from '../../application/commands/credit-account/credit-account.command';
import { DebitAccountCommand } from '../../application/commands/debit-account/debit-account.command';
import { FreezeAccountCommand } from '../../application/commands/freeze-account/freeze-account.command';
import { UnfreezeAccountCommand } from '../../application/commands/unfreeze-account/unfreeze-account.command';
import { CloseAccountCommand } from '../../application/commands/close-account/close-account.command';
import { GetAccountByIdQuery } from '../../application/queries/get-account-by-id/get-account-by-id.query';
import { ListMyAccountsQuery } from '../../application/queries/list-my-accounts/list-my-accounts.query';
import { AccessTokenPayload } from '../../../identity/application/ports/token.service.interface';
import { UserRole } from '../../../identity/domain/enums/user-role.enum';
import { Currency } from '../../../../shared/enums/currency.enum';

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

/**
 * All endpoints require authentication (global `JwtAuthGuard`); this
 * controller adds resource- and role-level authorization on top.
 * Credit/debit are deliberately admin-only here — real customer-facing
 * money movement (funding, transfers) is dispatched internally by the
 * Transfers/Funding module in a later phase, not called directly over
 * HTTP by end users.
 */
@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // Opening an account consumes a real account number from a finite
  // generator and writes a standing row every downstream query scans —
  // cheap individually, not cheap to have hammered.
  @Throttle({ sustained: { ttl: 60000, limit: 10 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async open(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: OpenAccountDto,
  ): Promise<AccountResponseDto> {
    return this.commandBus.execute(
      new OpenAccountCommand(user.sub, dto.accountType, dto.currency ?? Currency.NGN),
    );
  }

  @Get('me')
  async listMine(@CurrentUser() user: AccessTokenPayload): Promise<AccountResponseDto[]> {
    return this.queryBus.execute(new ListMyAccountsQuery(user.sub));
  }

  @Get(':accountId')
  async getById(
    @CurrentUser() user: AccessTokenPayload,
    @Param('accountId') accountId: string,
  ): Promise<AccountResponseDto> {
    return this.queryBus.execute(
      new GetAccountByIdQuery(accountId, user.sub, ADMIN_ROLES.includes(user.role as UserRole)),
    );
  }

  @Post(':accountId/credit')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  async credit(
    @Param('accountId') accountId: string,
    @Body() dto: CreditAccountDto,
  ): Promise<AccountResponseDto> {
    return this.commandBus.execute(
      new CreditAccountCommand(accountId, dto.amount, dto.currency ?? Currency.NGN, dto.reference),
    );
  }

  @Post(':accountId/debit')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  async debit(
    @Param('accountId') accountId: string,
    @Body() dto: DebitAccountDto,
  ): Promise<AccountResponseDto> {
    return this.commandBus.execute(
      new DebitAccountCommand(accountId, dto.amount, dto.currency ?? Currency.NGN, dto.reference),
    );
  }

  @Post(':accountId/freeze')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async freeze(
    @Param('accountId') accountId: string,
    @Body() dto: FreezeAccountDto,
  ): Promise<AccountResponseDto> {
    return this.commandBus.execute(new FreezeAccountCommand(accountId, dto.reason));
  }

  @Post(':accountId/unfreeze')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  async unfreeze(@Param('accountId') accountId: string): Promise<AccountResponseDto> {
    return this.commandBus.execute(new UnfreezeAccountCommand(accountId));
  }

  /**
   * Closing is allowed for the account owner too (not admin-only): a
   * customer can always close their own zero-balance account.
   * Ownership is enforced by first fetching via GetAccountByIdQuery's
   * authorization, then dispatching the close command — kept as two
   * steps so the authorization rule lives in one place (the query
   * handler) rather than being duplicated here.
   */
  @Post(':accountId/close')
  async close(
    @CurrentUser() user: AccessTokenPayload,
    @Param('accountId') accountId: string,
  ): Promise<AccountResponseDto> {
    await this.queryBus.execute(
      new GetAccountByIdQuery(accountId, user.sub, ADMIN_ROLES.includes(user.role as UserRole)),
    );
    return this.commandBus.execute(new CloseAccountCommand(accountId));
  }
}
