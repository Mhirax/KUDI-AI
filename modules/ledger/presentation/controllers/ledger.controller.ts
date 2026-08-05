import { Controller, Get, Param, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { PaginatedResponseDto } from '../../../../shared/dto/paginated-response.dto';
import { ListLedgerEntriesDto } from '../../application/dto/list-ledger-entries.dto';
import { StatementPeriodDto } from '../../application/dto/statement-period.dto';
import { LedgerEntryResponseDto } from '../../application/dto/ledger-entry-response.dto';
import { AccountStatementResponseDto } from '../../application/dto/account-statement-response.dto';
import { GetAccountLedgerQuery } from '../../application/queries/get-account-ledger/get-account-ledger.query';
import { GetAccountStatementQuery } from '../../application/queries/get-account-statement/get-account-statement.query';
import { GetLedgerEntryByIdQuery } from '../../application/queries/get-ledger-entry-by-id/get-ledger-entry-by-id.query';
import { AccessTokenPayload } from '../../../identity/application/ports/token.service.interface';
import { UserRole } from '../../../identity/domain/enums/user-role.enum';

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT];

/**
 * Read-only by design: the ledger has no write endpoints because
 * ledger entries exist only as projections of Accounts' domain events
 * (see modules/ledger/README.md). All endpoints require authentication
 * (global JwtAuthGuard); resource-level ownership is enforced inside
 * the query handlers, mirroring the Accounts module. SUPPORT_AGENT is
 * included in the read-side admin roles — support staff resolving a
 * "where is my money?" ticket need history visibility, but they hold
 * no mutating privilege anywhere in the platform.
 */
@Controller('ledger')
export class LedgerController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('accounts/:accountId/entries')
  async listAccountEntries(
    @CurrentUser() user: AccessTokenPayload,
    @Param('accountId') accountId: string,
    @Query() query: ListLedgerEntriesDto,
  ): Promise<PaginatedResponseDto<LedgerEntryResponseDto>> {
    return this.queryBus.execute(
      new GetAccountLedgerQuery(
        accountId,
        user.sub,
        ADMIN_ROLES.includes(user.role as UserRole),
        query.page,
        query.limit,
        query.from ? new Date(query.from) : undefined,
        query.to ? new Date(query.to) : undefined,
      ),
    );
  }

  @Get('accounts/:accountId/statement')
  async getAccountStatement(
    @CurrentUser() user: AccessTokenPayload,
    @Param('accountId') accountId: string,
    @Query() query: StatementPeriodDto,
  ): Promise<AccountStatementResponseDto> {
    return this.queryBus.execute(
      new GetAccountStatementQuery(
        accountId,
        user.sub,
        ADMIN_ROLES.includes(user.role as UserRole),
        new Date(query.from),
        new Date(query.to),
      ),
    );
  }

  @Get('entries/:entryId')
  async getEntryById(
    @CurrentUser() user: AccessTokenPayload,
    @Param('entryId') entryId: string,
  ): Promise<LedgerEntryResponseDto> {
    return this.queryBus.execute(
      new GetLedgerEntryByIdQuery(entryId, user.sub, ADMIN_ROLES.includes(user.role as UserRole)),
    );
  }
}
