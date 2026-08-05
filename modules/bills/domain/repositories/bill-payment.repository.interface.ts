import { BillPayment } from '../entities/bill-payment.entity';
import { BillReference } from '../value-objects/bill-reference.vo';

export interface BillPaymentPage {
  billPayments: BillPayment[];
  total: number;
}

/**
 * Port for BillPayment persistence. `save()` implementations must
 * perform an optimistic-concurrency check against `version`, mirroring
 * IAccountRepository/IDepositRepository — a bill settling twice while
 * the wallet was debited once is a money-integrity incident.
 */
export interface IBillPaymentRepository {
  findById(id: string): Promise<BillPayment | null>;
  findByReference(reference: BillReference): Promise<BillPayment | null>;
  findPageByUserId(params: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<BillPaymentPage>;
  save(billPayment: BillPayment): Promise<void>;
}

export const BILL_PAYMENT_REPOSITORY = Symbol('BILL_PAYMENT_REPOSITORY');
