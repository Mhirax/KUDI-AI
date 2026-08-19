import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Throttle } from '@nestjs/throttler';
import { KYC_VERIFICATION_THROTTLE } from '../../../../infrastructure/config/throttler.config';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../../gateway/guards/roles.guard';
import { SubmitBvnVerificationDto } from '../../application/dto/submit-bvn-verification.dto';
import { SubmitNinVerificationDto } from '../../application/dto/submit-nin-verification.dto';
import { ManualBvnOverrideDto } from '../../application/dto/manual-bvn-override.dto';
import { ManualNinOverrideDto } from '../../application/dto/manual-nin-override.dto';
import { ClearSanctionsFlagDto } from '../../application/dto/clear-sanctions-flag.dto';
import { KycStatusResponseDto } from '../../application/dto/kyc-status-response.dto';
import { StaffKycLookupResponseDto } from '../../application/dto/staff-kyc-lookup-response.dto';
import { FlaggedSanctionsProfileResponseDto } from '../../application/dto/flagged-sanctions-profile-response.dto';
import { SubmitBvnVerificationCommand } from '../../application/commands/submit-bvn-verification/submit-bvn-verification.command';
import { SubmitNinVerificationCommand } from '../../application/commands/submit-nin-verification/submit-nin-verification.command';
import { ManuallyVerifyBvnCommand } from '../../application/commands/manually-verify-bvn/manually-verify-bvn.command';
import { ManuallyVerifyNinCommand } from '../../application/commands/manually-verify-nin/manually-verify-nin.command';
import { ClearSanctionsFlagCommand } from '../../application/commands/clear-sanctions-flag/clear-sanctions-flag.command';
import { GetMyKycStatusQuery } from '../../application/queries/get-my-kyc-status/get-my-kyc-status.query';
import { GetKycAuditHistoryQuery } from '../../application/queries/get-kyc-audit-history/get-kyc-audit-history.query';
import { GetFlaggedSanctionsProfilesQuery } from '../../application/queries/get-flagged-sanctions-profiles/get-flagged-sanctions-profiles.query';
import { AccessTokenPayload } from '../../../identity/application/ports/token.service.interface';
import { UserRole } from '../../../identity/domain/enums/user-role.enum';

// Cross-module: reuses Accounts' existing commands/DTOs/response shape
// directly via the shared CommandBus (verified empirically that
// @nestjs/cqrs's CommandBus/QueryBus/EventBus are singletons shared
// across every module that imports CqrsModule, not one bus per
// module) rather than adding a duplicate command+handler pair here.
// See this controller's freeze/unfreeze methods below and
// modules/compliance/implementation.md, Phase 5b.
import { FreezeAccountCommand } from '../../../accounts/application/commands/freeze-account/freeze-account.command';
import { UnfreezeAccountCommand } from '../../../accounts/application/commands/unfreeze-account/unfreeze-account.command';
import { FreezeAccountDto } from '../../../accounts/application/dto/freeze-account.dto';
import { AccountResponseDto } from '../../../accounts/application/dto/account-response.dto';

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

  /**
   * Phase 4b (modules/compliance/implementation.md): the sanctions
   * review queue — every profile with an open flag, oldest first.
   * Deliberately returns `FlaggedSanctionsProfileResponseDto`, not
   * `KycStatusResponseDto` (the shape `GET /kyc/me` also uses) — see
   * that DTO's header comment for why the flag must never leak into a
   * customer-facing response.
   */
  @Get('staff/sanctions/flagged')
  @UseGuards(RolesGuard)
  @Roles(...COMPLIANCE_ROLES)
  async getFlaggedSanctionsProfiles(): Promise<FlaggedSanctionsProfileResponseDto[]> {
    return this.queryBus.execute(new GetFlaggedSanctionsProfilesQuery());
  }

  /**
   * Phase 4b: resolves an open sanctions flag. Throws if the target
   * has no open flag — see `ClearSanctionsFlagHandler`'s doc comment.
   */
  @Post('staff/:userId/sanctions/clear')
  @UseGuards(RolesGuard)
  @Roles(...COMPLIANCE_ROLES)
  @HttpCode(HttpStatus.OK)
  async clearSanctionsFlag(
    @CurrentUser() staff: AccessTokenPayload,
    @Param('userId') userId: string,
    @Body() dto: ClearSanctionsFlagDto,
  ): Promise<KycStatusResponseDto> {
    return this.commandBus.execute(new ClearSanctionsFlagCommand(staff.sub, userId, dto.reason));
  }

  /**
   * Phase 5b (modules/compliance/implementation.md): clears a failed
   * automated BVN name-match by re-running the real provider lookup
   * and skipping only that gate — see `ManuallyVerifyBvnHandler`'s
   * header comment for the full rationale. `reason` is mandatory and
   * becomes part of the durable audit record, not just a UI label.
   */
  @Post('staff/:userId/verify-bvn')
  @UseGuards(RolesGuard)
  @Roles(...COMPLIANCE_ROLES)
  @HttpCode(HttpStatus.OK)
  async manuallyVerifyBvn(
    @CurrentUser() staff: AccessTokenPayload,
    @Param('userId') userId: string,
    @Body() dto: ManualBvnOverrideDto,
  ): Promise<KycStatusResponseDto> {
    return this.commandBus.execute(
      new ManuallyVerifyBvnCommand(staff.sub, userId, dto.bvn, dto.reason),
    );
  }

  /** Mirrors `manuallyVerifyBvn` for NIN — see that handler's doc comment. */
  @Post('staff/:userId/verify-nin')
  @UseGuards(RolesGuard)
  @Roles(...COMPLIANCE_ROLES)
  @HttpCode(HttpStatus.OK)
  async manuallyVerifyNin(
    @CurrentUser() staff: AccessTokenPayload,
    @Param('userId') userId: string,
    @Body() dto: ManualNinOverrideDto,
  ): Promise<KycStatusResponseDto> {
    return this.commandBus.execute(
      new ManuallyVerifyNinCommand(staff.sub, userId, dto.nin, dto.reason),
    );
  }

  /**
   * Phase 5b (modules/compliance/implementation.md): staff already
   * investigating a user's KYC issue can freeze/unfreeze the account
   * without leaving this surface. Thin proxies to Accounts' existing
   * `FreezeAccountCommand`/`UnfreezeAccountCommand` — same commands
   * `AccountsController`'s own `/accounts/:id/freeze`/`unfreeze`
   * dispatch, just reachable here too. Unlike that controller (whose
   * `unfreeze` is `ADMIN`/`SUPER_ADMIN` only), both actions here use
   * the same `COMPLIANCE_ROLES` as the rest of this staff surface —
   * a compliance officer who can freeze an account during an
   * investigation shouldn't need to escalate to an admin just to
   * reverse their own action once it's resolved.
   */
  @Post('staff/accounts/:accountId/freeze')
  @UseGuards(RolesGuard)
  @Roles(...COMPLIANCE_ROLES)
  async freezeAccount(
    @Param('accountId') accountId: string,
    @Body() dto: FreezeAccountDto,
  ): Promise<AccountResponseDto> {
    return this.commandBus.execute(new FreezeAccountCommand(accountId, dto.reason));
  }

  /** See `freezeAccount`'s doc comment. */
  @Post('staff/accounts/:accountId/unfreeze')
  @UseGuards(RolesGuard)
  @Roles(...COMPLIANCE_ROLES)
  async unfreezeAccount(@Param('accountId') accountId: string): Promise<AccountResponseDto> {
    return this.commandBus.execute(new UnfreezeAccountCommand(accountId));
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
