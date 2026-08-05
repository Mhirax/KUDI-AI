import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { CreateSavingsGoalDto } from '../../application/dto/create-savings-goal.dto';
import { SavingsTransactionDto } from '../../application/dto/savings-transaction.dto';
import { CloseSavingsGoalDto } from '../../application/dto/close-savings-goal.dto';
import { SavingsGoalResponseDto } from '../../application/dto/savings-goal-response.dto';
import { CreateSavingsGoalCommand } from '../../application/commands/create-savings-goal/create-savings-goal.command';
import { DepositToSavingsCommand } from '../../application/commands/deposit-to-savings/deposit-to-savings.command';
import { WithdrawFromSavingsCommand } from '../../application/commands/withdraw-from-savings/withdraw-from-savings.command';
import { CloseSavingsGoalCommand } from '../../application/commands/close-savings-goal/close-savings-goal.command';
import { ListMySavingsGoalsQuery } from '../../application/queries/list-my-savings-goals/list-my-savings-goals.query';
import { GetSavingsGoalByIdQuery } from '../../application/queries/get-savings-goal-by-id/get-savings-goal-by-id.query';
import { AccessTokenPayload } from '../../../identity/application/ports/token.service.interface';
import { UserRole } from '../../../identity/domain/enums/user-role.enum';

const ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT_AGENT];

/**
 * Savings-goal endpoints. All require authentication (global
 * JwtAuthGuard). Each goal is backed by its own dedicated
 * SAVINGS-type Account — see CreateSavingsGoalHandler.
 */
@ApiTags('savings')
@ApiBearerAuth('access-token')
@Controller('savings')
export class SavingsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new savings goal' })
  async create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateSavingsGoalDto,
  ): Promise<SavingsGoalResponseDto> {
    return this.commandBus.execute(
      new CreateSavingsGoalCommand(user.sub, dto.sourceAccountId, dto.name, dto.targetAmount),
    );
  }

  @Get()
  @ApiOperation({ summary: "List the caller's savings goals" })
  async list(@CurrentUser() user: AccessTokenPayload): Promise<SavingsGoalResponseDto[]> {
    return this.queryBus.execute(new ListMySavingsGoalsQuery(user.sub));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one savings goal by id' })
  async getById(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<SavingsGoalResponseDto> {
    return this.queryBus.execute(
      new GetSavingsGoalByIdQuery(id, user.sub, ADMIN_ROLES.includes(user.role as UserRole)),
    );
  }

  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deposit from the source wallet into a savings goal' })
  async deposit(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: SavingsTransactionDto,
  ): Promise<SavingsGoalResponseDto> {
    return this.commandBus.execute(
      new DepositToSavingsCommand(user.sub, dto.savingsGoalId, dto.amount),
    );
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw from a savings goal back into its source wallet' })
  async withdraw(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: SavingsTransactionDto,
  ): Promise<SavingsGoalResponseDto> {
    return this.commandBus.execute(
      new WithdrawFromSavingsCommand(user.sub, dto.savingsGoalId, dto.amount),
    );
  }

  @Post('close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Close a savings goal, sweeping any remaining balance back to its source wallet',
  })
  async close(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CloseSavingsGoalDto,
  ): Promise<SavingsGoalResponseDto> {
    return this.commandBus.execute(new CloseSavingsGoalCommand(user.sub, dto.savingsGoalId));
  }
}
