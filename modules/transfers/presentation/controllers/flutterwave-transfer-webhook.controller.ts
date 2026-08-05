import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { Public } from '../../../../shared/decorators/public.decorator';
import { FlutterwaveWebhookVerifier } from '../../../../integrations/payment-gateway/flutterwave/webhooks/flutterwave-webhook-verifier.util';
import { FlutterwaveTransferMapper } from '../../../../integrations/payment-gateway/flutterwave/transfers/flutterwave-transfer.mapper';
import { FlutterwaveTransferWebhookPayload } from '../../../../integrations/payment-gateway/flutterwave/transfers/flutterwave-transfer.dto';
import { ConfirmExternalTransferCommand } from '../../application/commands/confirm-external-transfer/confirm-external-transfer.command';

/**
 * Public webhook receiver for Flutterwave's asynchronous transfer
 * completion callbacks. Marked `@Public()` to bypass the global
 * `JwtAuthGuard` (Flutterwave cannot present a Kudi-issued JWT) —
 * authenticity is instead established via the `verif-hash` header,
 * checked with a constant-time comparison
 * (`FlutterwaveWebhookVerifier`) before any command is dispatched.
 */
@Controller('webhooks/flutterwave/transfers')
export class FlutterwaveTransferWebhookController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers('verif-hash') verifHash: string | undefined,
    @Body() payload: FlutterwaveTransferWebhookPayload,
  ): Promise<{ received: true }> {
    const configuredSecret = this.configService.get<string>('flutterwave.webhookSecretHash');

    if (!FlutterwaveWebhookVerifier.isValid(verifHash, configuredSecret)) {
      // Deliberately generic: never tell a caller *why* verification
      // failed, to avoid helping an attacker iterate toward a valid hash.
      throw new BadRequestException('Invalid webhook signature');
    }

    if (payload.event !== 'transfer.completed' || !payload.data) {
      // Acknowledge with 200 anyway — Flutterwave retries on non-2xx,
      // and an unrecognized event type is not something retrying fixes.
      return { received: true };
    }

    const providerReference = FlutterwaveTransferMapper.extractProviderReference(payload.data);
    const isSuccessful = FlutterwaveTransferMapper.isTerminalSuccess(payload.data);
    const isFailed = FlutterwaveTransferMapper.isTerminalFailure(payload.data);

    if (isSuccessful || isFailed) {
      await this.commandBus.execute(
        new ConfirmExternalTransferCommand(
          providerReference,
          isSuccessful,
          isFailed ? payload.data.complete_message : null,
        ),
      );
    }
    // Non-terminal statuses (NEW/PENDING) require no action — the
    // transfer already sits in PROCESSING from initiation.

    return { received: true };
  }
}
