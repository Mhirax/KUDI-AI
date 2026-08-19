import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Throttle } from '@nestjs/throttler';
import { KYC_VERIFICATION_THROTTLE } from '../../../../infrastructure/config/throttler.config';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../../gateway/guards/roles.guard';
import { SubmitBvnVerificationDto } from '../../application/dto/submit-bvn-verification.dto';
import { SubmitNinVerificationDto } from '../../application/dto/submit-nin-verification.dto';
import { KycStatusResponseDto } from '../../application/dto/kyc-status-response.dto';
import { StaffKycLookupResponseDto } from '../../application/dto/staff-kyc-lookup-response.dto';
import { SubmitBvnVerificationCommand } from '../../application/commands/submit-bvn-verification/submit-bvn-verification.command';
import { SubmitNinVerificationCommand } from '../../application/commands/submit-nin-verification/submit-nin-verification.command';
import { GetMyKycStatusQuery } from '../../application/queries/get-my-kyc-status/get-my-kyc-status.query';
import { GetKycAuditHistoryQuery } from '../../application/queries/get-kyc-audit-history/get-kyc-audit-history.query';
import { AccessTokenPayload } from '../../../identity/application/ports/token.service.interface';
import { UserRole } from '../../../identity/domain/enums/user-role.enum';

const COMPLIANCE_ROLES = [UserRole.COMPLIANCE_OFFICER, UserRole.ADMIN, UserRole.SUPER_ADMIN];

@Controller('kyc')
export class KycController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('me')
  async getMyStatus(@CurrentUser() user: AccessTokenPayload): Promise<KycStatusResponseDto> {
    return this.queryBus.execute(new GetMyKycStatusQuery(user.sub));
  }

  /**
   * Phase 5a (modules/compliance/implementation.md): the staff-only
   * surface Phase 3b's audit-history query was built for — this is the
   * first thing that actually calls `GetKycAuditHistoryQuery` over
   * HTTP, gated behind the role check that query's own header comment
   * said it was relying on callers to provide.
   */
  @Get('staff/:userId')
  @UseGuards(RolesGuard)
  @Roles(...COMPLIANCE_ROLES)
  async getStaffLookup(@Param('userId') userId: string): Promise<StaffKycLookupResponseDto> {
    const [status, history] = await Promise.all([
      this.queryBus.execute(new GetMyKycStatusQuery(userId)),
      this.queryBus.execute(new GetKycAuditHistoryQuery(userId)),
    ]);
    return { status, history };
  }

  @Throttle(KYC_VERIFICATION_THROTTLE)
  @Post('verify-bvn')
  @HttpCode(HttpStatus.OK)
  async verifyBvn(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: SubmitBvnVerificationDto,
  ): Promise<KycStatusResponseDto> {
    return this.commandBus.execute(new SubmitBvnVerificationCommand(user.sub, dto.bvn));
  }

  @Throttle(KYC_VERIFICATION_THROTTLE)
  @Post('verify-nin')
  @HttpCode(HttpStatus.OK)
  async verifyNin(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: SubmitNinVerificationDto,
  ): Promise<KycStatusResponseDto> {
    return this.commandBus.execute(new SubmitNinVerificationCommand(user.sub, dto.nin));
  }
}
