import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { PaginationDto } from '../../../../shared/dto/pagination.dto';
import { PaginatedResponseDto } from '../../../../shared/dto/paginated-response.dto';
import { RedeemRewardsDto } from '../../application/dto/redeem-rewards.dto';
import { RedeemReferralDto } from '../../application/dto/redeem-referral.dto';
import { RewardSummaryResponseDto } from '../../application/dto/reward-summary-response.dto';
import { RewardTransactionResponseDto } from '../../application/dto/reward-transaction-response.dto';
import { RedeemRewardPointsCommand } from '../../application/commands/redeem-reward-points/redeem-reward-points.command';
import { RedeemReferralCodeCommand } from '../../application/commands/redeem-referral-code/redeem-referral-code.command';
import { GetMyRewardsQuery } from '../../application/queries/get-my-rewards/get-my-rewards.query';
import { GetMyRewardHistoryQuery } from '../../application/queries/get-my-reward-history/get-my-reward-history.query';
import { AccessTokenPayload } from '../../../identity/application/ports/token.service.interface';

/**
 * Rewards endpoints. All require authentication (global JwtAuthGuard).
 * Points are earned automatically off completed Transfers/Bills/Funding
 * activity (see application/event-handlers/) — there is no
 * "earn points" HTTP endpoint by design.
 */
@ApiTags('rewards')
@ApiBearerAuth('access-token')
@Controller('rewards')
export class RewardsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get the caller's points balance, totals, and referral code" })
  async getSummary(@CurrentUser() user: AccessTokenPayload): Promise<RewardSummaryResponseDto> {
    return this.queryBus.execute(new GetMyRewardsQuery(user.sub));
  }

  @Get('history')
  @ApiOperation({ summary: 'Paginated history of points earned/redeemed' })
  async getHistory(
    @CurrentUser() user: AccessTokenPayload,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<RewardTransactionResponseDto>> {
    return this.queryBus.execute(
      new GetMyRewardHistoryQuery(user.sub, pagination.page, pagination.limit),
    );
  }

  @Post('redeem')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem points for cashback, airtime, or data' })
  async redeem(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: RedeemRewardsDto,
  ): Promise<RewardSummaryResponseDto> {
    return this.commandBus.execute(
      new RedeemRewardPointsCommand(
        user.sub,
        dto.points,
        dto.redemptionType,
        dto.accountId,
        dto.billerCode,
        dto.itemCode,
        dto.billerName,
        dto.customerIdentifier,
      ),
    );
  }

  @Post('referral')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem a referral code, awarding bonus points to both parties' })
  async redeemReferral(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: RedeemReferralDto,
  ): Promise<RewardSummaryResponseDto> {
    return this.commandBus.execute(new RedeemReferralCodeCommand(user.sub, dto.referralCode));
  }
}
