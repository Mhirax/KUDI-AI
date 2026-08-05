import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { CreateVirtualCardDto } from '../../application/dto/create-virtual-card.dto';
import { RequestPhysicalCardDto } from '../../application/dto/request-physical-card.dto';
import { CardIdDto } from '../../application/dto/card-id.dto';
import { FundCardDto } from '../../application/dto/fund-card.dto';
import { CardResponseDto } from '../../application/dto/card-response.dto';
import { CreateVirtualCardCommand } from '../../application/commands/create-virtual-card/create-virtual-card.command';
import { RequestPhysicalCardCommand } from '../../application/commands/request-physical-card/request-physical-card.command';
import { FreezeCardCommand } from '../../application/commands/freeze-card/freeze-card.command';
import { UnfreezeCardCommand } from '../../application/commands/unfreeze-card/unfreeze-card.command';
import { FundCardCommand } from '../../application/commands/fund-card/fund-card.command';
import { TerminateCardCommand } from '../../application/commands/terminate-card/terminate-card.command';
import { ListMyCardsQuery } from '../../application/queries/list-my-cards/list-my-cards.query';
import { GetCardByIdQuery } from '../../application/queries/get-card-by-id/get-card-by-id.query';
import { AccessTokenPayload } from '../../../identity/application/ports/token.service.interface';
import { UserRole } from '../../../identity/domain/enums/user-role.enum';

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT];

/**
 * Card endpoints (virtual & physical). All require authentication
 * (global JwtAuthGuard). Virtual issuance is synchronous against
 * Flutterwave's Issuing API; physical requests stay PENDING for
 * offline fulfillment (see module README). Freeze/unfreeze/terminate
 * are allowed for the card's own owner as well as staff — a customer
 * can always lock down their own compromised card without waiting on
 * support.
 */
@ApiTags('cards')
@ApiBearerAuth('access-token')
@Controller('cards')
export class CardsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('create-virtual')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Issue a new virtual card against one of your accounts' })
  async createVirtual(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateVirtualCardDto,
  ): Promise<CardResponseDto> {
    return this.commandBus.execute(new CreateVirtualCardCommand(user.sub, dto.accountId));
  }

  @Post('request-physical')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request a physical card against one of your accounts' })
  async requestPhysical(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: RequestPhysicalCardDto,
  ): Promise<CardResponseDto> {
    return this.commandBus.execute(new RequestPhysicalCardCommand(user.sub, dto.accountId));
  }

  @Get()
  @ApiOperation({ summary: "List the caller's cards" })
  async list(@CurrentUser() user: AccessTokenPayload): Promise<CardResponseDto[]> {
    return this.queryBus.execute(new ListMyCardsQuery(user.sub));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one card by id' })
  async getById(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<CardResponseDto> {
    const isAdmin = ADMIN_ROLES.includes(user.role as UserRole);
    return this.queryBus.execute(new GetCardByIdQuery(id, user.sub, isAdmin));
  }

  @Post('freeze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Freeze a card, blocking further spend' })
  async freeze(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CardIdDto,
  ): Promise<CardResponseDto> {
    const isAdmin = ADMIN_ROLES.includes(user.role as UserRole);
    return this.commandBus.execute(new FreezeCardCommand(user.sub, dto.cardId, isAdmin));
  }

  @Post('unfreeze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfreeze a previously frozen card' })
  async unfreeze(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CardIdDto,
  ): Promise<CardResponseDto> {
    const isAdmin = ADMIN_ROLES.includes(user.role as UserRole);
    return this.commandBus.execute(new UnfreezeCardCommand(user.sub, dto.cardId, isAdmin));
  }

  @Post('fund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fund a card from its linked account' })
  async fund(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: FundCardDto,
  ): Promise<CardResponseDto> {
    return this.commandBus.execute(new FundCardCommand(user.sub, dto.cardId, dto.amount));
  }

  @Post('terminate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Permanently terminate a card, sweeping any remaining balance back to its account',
  })
  async terminate(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CardIdDto,
  ): Promise<CardResponseDto> {
    const isAdmin = ADMIN_ROLES.includes(user.role as UserRole);
    return this.commandBus.execute(new TerminateCardCommand(user.sub, dto.cardId, isAdmin));
  }
}
