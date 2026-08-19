import { KycTierLimit as PrismaKycTierLimit } from '@prisma/client';
import { KycTierLimits } from '../../domain/policies/kyc-tier-limits.policy';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

export class KycTierLimitMapper {
  static toDomain(record: PrismaKycTierLimit): KycTierLimits {
    const currency = record.currency as Currency;
    return {
      perTransactionLimit:
        record.perTransactionLimit === null ? null : Money.fromMinorUnits(record.perTransactionLimit, currency),
      dailyTransferLimit:
        record.dailyTransferLimit === null ? null : Money.fromMinorUnits(record.dailyTransferLimit, currency),
      maxBalance: record.maxBalance === null ? null : Money.fromMinorUnits(record.maxBalance, currency),
    };
  }
}
