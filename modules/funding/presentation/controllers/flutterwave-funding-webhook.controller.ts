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
import { FlutterwaveChargeWebhookPayload } from '../../../../integrations/payment-gateway/flutterwave/funding/flutterwave-funding.dto';
import { ConfirmDepositCommand } from '../../application/commands/confirm-deposit/confirm-deposit.command';

/**
 * Public webhook receiver for Flutterwave's `charge.completed` events
 * (hosted-checkout payments and virtual-account credits alike). Same
 * security model as the transfers webhook: `@Public()` to bypass the
 * global JwtAuthGuard, authenticity via constant-time `verif-hash`
 * comparison, and the payload treated purely as a pointer — the
 * ConfirmDepositHandler re-verifies everything server-to-server before
 * any money moves.
 */
@Controller('webhooks/flutterwave/funding')
export class FlutterwaveFundingWebhookController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers('verif-hash') verifHash: string | undefined,
    @Body() payload: FlutterwaveChargeWebhookPayload,
  ): Promise<{ received: true }> {
    const configuredSecret = this.configService.get<string>('flutterwave.webhookSecretHash');

    if (!FlutterwaveWebhookVerifier.isValid(verifHash, configuredSecret)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (payload.event !== 'charge.completed' || !payload.data?.id) {
      // Acknowledge unrecognized events with 200 — retrying will not
      // make them recognizable.
      return { received: true };
    }

    await this.commandBus.execute(new ConfirmDepositCommand(String(payload.data.id)));

    return { received: true };
  }
}
