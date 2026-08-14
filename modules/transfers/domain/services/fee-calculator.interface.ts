import { Money } from '../../../../shared/value-objects/money.vo';
import { TransferType } from '../enums/transfer-type.enum';

/**
 * Port abstracting fee computation away from the application layer.
 * The Phase 2 implementation (infrastructure/services) is a simple
 * flat/percentage rule; this is intentionally where the Rust
 * `fee-engine` (see /rust/fee-engine) will be plugged in — via gRPC —
 * once that integration contract is finalized, without any change to
 * callers of this port.
 */
export interface IFeeCalculator {
  calculate(amount: Money, transferType: TransferType): Promise<Money>;
}

export const FEE_CALCULATOR = Symbol('FEE_CALCULATOR');
