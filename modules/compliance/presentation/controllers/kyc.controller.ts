import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Throttle } from '@nestjs/throttler';
import { KYC_VERIFICATION_THROTTLE } from '../../../../infrastructure/config/throttler.config';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { SubmitBvnVerificationDto } from '../../application/dto/submit-bvn-verification.dto';
import { SubmitNinVerificationDto } from '../../application/dto/submit-nin-verification.dto';
import { KycStatusResponseDto } from '../../application/dto/kyc-status-response.dto';
import { SubmitBvnVerificationCommand } from '../../application/commands/submit-bvn-verification/submit-bvn-verification.command';
import { SubmitNinVerificationCommand } from '../../application/commands/submit-nin-verification/submit-nin-verification.command';
import { GetMyKycStatusQuery } from '../../application/queries/get-my-kyc-status/get-my-kyc-status.query';
import { AccessTokenPayload } from '../../../identity/application/ports/token.service.interface';

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
