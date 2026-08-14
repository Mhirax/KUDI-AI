import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Validates and normalizes monetary input to prevent floating-point
 * precision issues in financial calculations (values are handled as
 * minor units / integers downstream in the ledger engine).
 */
@Injectable()
export class ParseMoneyPipe implements PipeTransform {
  transform(value: unknown, _metadata: ArgumentMetadata): number {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
      throw new BadRequestException('Invalid monetary value');
    }
    return Math.round(parsed * 100); // convert to minor units
  }
}
