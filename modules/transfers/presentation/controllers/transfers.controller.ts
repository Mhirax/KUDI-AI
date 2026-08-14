import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { InitiateInternalTransferDto } from '../../application/dto/initiate-internal-transfer.dto';
import { InitiateExternalTransferDto } from '../../application/dto/initiate-external-transfer.dto';
import { TransferResponseDto } from '../../application/dto/transfer-response.dto';
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

  @Get('me')
  async listMine(@CurrentUser() user: AccessTokenPayload): Promise<TransferResponseDto[]> {
    return this.queryBus.execute(new ListMyTransfersQuery(user.sub));
  }

  @Get(':reference')
  async getByReference(
    @CurrentUser() user: AccessTokenPayload,
    @Param('reference') reference: string,
  ): Promise<TransferResponseDto> {
    return this.queryBus.execute(
      new GetTransferByReferenceQuery(reference, user.sub, ADMIN_ROLES.includes(user.role as UserRole)),
    );
  }
}
