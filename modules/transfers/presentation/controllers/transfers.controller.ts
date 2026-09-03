import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { InitiateInternalTransferDto } from '../../application/dto/initiate-internal-transfer.dto';
import { InitiateExternalTransferDto } from '../../application/dto/initiate-external-transfer.dto';
import { TransferResponseDto } from '../../application/dto/transfer-response.dto';
import { PaginationDto } from '../../../../shared/dto/pagination.dto';
import { PaginatedResponseDto } from '../../../../shared/dto/paginated-response.dto';
import { InitiateInternalTransferCommand } from '../../application/commands/initiate-internal-transfer/initiate-internal-transfer.command';
import { InitiateExternalTransferCommand } from '../../application/commands/initiate-external-transfer/initiate-external-transfer.command';
import { GetTransferByReferenceQuery } from '../../application/queries/get-transfer-by-reference/get-transfer-by-reference.query';
import { ListMyTransfersQuery } from '../../application/queries/list-my-transfers/list-my-transfers.query';
import { AccessTokenPayload } from '../../../identity/application/ports/token.service.interface';
import { UserRole } from '../../../identity/domain/enums/user-role.enum';

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

@Controller('transfers')
export class TransfersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('internal')
  @HttpCode(HttpStatus.CREATED)
  async initiateInternal(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: InitiateInternalTransferDto,
  ): Promise<TransferResponseDto> {
    return this.commandBus.execute(
      new InitiateInternalTransferCommand(
        user.sub,
        dto.sourceAccountId,
        dto.destinationAccountId,
        dto.amount,
        dto.narration,
      ),
    );
  }

  @Post('external')
  @HttpCode(HttpStatus.CREATED)
  async initiateExternal(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: InitiateExternalTransferDto,
  ): Promise<TransferResponseDto> {
    return this.commandBus.execute(
      new InitiateExternalTransferCommand(
        user.sub,
        dto.sourceAccountId,
        dto.bankCode,
        dto.recipientAccountNumber,
        dto.recipientAccountName,
        dto.amount,
        dto.narration,
      ),
    );
  }

  /**
   * The caller's own transfers, newest first.
   *
   * Paginated (`?page=1&limit=20`, limit capped at 100). It previously
   * returned every transfer the user had ever made in one array, which
   * would degrade steadily with account age and cannot be scrolled
   * incrementally by a client.
   */
  @Get('me')
  async listMine(
    @CurrentUser() user: AccessTokenPayload,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<TransferResponseDto>> {
    return this.queryBus.execute(
      new ListMyTransfersQuery(user.sub, pagination.page, pagination.limit),
    );
  }

  @Get(':reference')
  async getByReference(
    @CurrentUser() user: AccessTokenPayload,
    @Param('reference') reference: string,
  ): Promise<TransferResponseDto> {
    return this.queryBus.execute(
      new GetTransferByReferenceQuery(
        reference,
        user.sub,
        ADMIN_ROLES.includes(user.role as UserRole),
      ),
    );
  }
}
