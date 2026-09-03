import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { Account } from '../../domain/entities/account.entity';
import { AccountType } from '../../domain/enums/account-type.enum';
import { Currency } from '../../../../shared/enums/currency.enum';
import { AccountMapper } from '../../infrastructure/mappers/account.mapper';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../domain/repositories/account.repository.interface';
import {
  ACCOUNT_NUMBER_GENERATOR,
  IAccountNumberGenerator,
} from '../../domain/services/account-number-generator.interface';

/**
 * Provides Kudi's own accounts — the other side of every movement that
 * previously had only one side.
 *
 * Two problems this exists to fix. A confirmed deposit used to call
 * `account.credit()` with no matching debit, so money was created from
 * nothing and no trial balance was possible. A transfer fee was debited
 * from the sender and credited to no account at all, so it simply left the
 * books. Both are now posted against a real account here.
 *
 * The accounts are ordinary `Account` rows, deliberately: they then flow
 * through the same domain events, the same ledger projection and the same
 * optimistic-concurrency writes as a customer's account, rather than being
 * a parallel mechanism that could drift from it.
 *
 * They are owned by a single system user which cannot log in — its
 * password hash is random bytes that no input can produce, and its status
 * is DEACTIVATED. They are also excluded from customer account listings.
 *
 * SYSTEM_SETTLEMENT represents the float Kudi holds at its payment
 * provider, so it must be topped up as deposits draw it down. That is an
 * admin credit (`POST /accounts/:id/credit`), which remains the one
 * privileged operation that adds value to the books without a
 * counterparty — the equivalent of recording a capital injection.
 */
@Injectable()
export class SystemAccountService {
  private readonly logger = new Logger(SystemAccountService.name);

  private static readonly SYSTEM_USER_EMAIL = 'system@kudiaibank.internal';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(ACCOUNT_NUMBER_GENERATOR)
    private readonly accountNumbers: IAccountNumberGenerator,
  ) {}

  /**
   * The organization's settlement account for a currency, created on first
   * use. Deposits debit it; outbound payouts credit it.
   */
  async settlementAccount(currency: Currency): Promise<Account> {
    return this.findOrCreate(AccountType.SYSTEM_SETTLEMENT, currency);
  }

  /** The account transfer fees are credited to. */
  async feeRevenueAccount(currency: Currency): Promise<Account> {
    return this.findOrCreate(AccountType.SYSTEM_FEE_REVENUE, currency);
  }

  private async findOrCreate(accountType: AccountType, currency: Currency): Promise<Account> {
    const existing = await this.prisma.account.findFirst({
      where: { accountType, currency },
      orderBy: { createdAt: 'asc' },
    });

    if (existing) {
      return AccountMapper.toDomain(existing);
    }

    const userId = await this.systemUserId();
    const account = Account.open({
      userId,
      accountNumber: await this.accountNumbers.generate(),
      accountType,
      currency,
    });

    // System accounts must be postable immediately; a customer account
    // waits for KYC, but there is nobody to verify here.
    account.activate();
    account.pullDomainEvents();

    try {
      await this.accountRepository.save(account);
      this.logger.log(`Provisioned ${accountType} account for ${currency}`);
      return account;
    } catch (error) {
      // Another request provisioned it between the read and the write.
      const raced = await this.prisma.account.findFirst({
        where: { accountType, currency },
        orderBy: { createdAt: 'asc' },
      });

      if (raced) {
        return AccountMapper.toDomain(raced);
      }

      throw error;
    }
  }

  private async systemUserId(): Promise<string> {
    const existing = await this.prisma.user.findUnique({
      where: { email: SystemAccountService.SYSTEM_USER_EMAIL },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    const created = await this.prisma.user.create({
      data: {
        email: SystemAccountService.SYSTEM_USER_EMAIL,
        phoneNumber: '+000000000000',
        // Random bytes rather than a hash of a known string: no password
        // input can ever produce this, so the account is unusable for login
        // even if its status were changed.
        passwordHash: randomBytes(48).toString('hex'),
        firstName: 'Kudi',
        lastName: 'System',
        role: 'SUPER_ADMIN',
        status: 'DEACTIVATED',
      },
      select: { id: true },
    });

    this.logger.warn('Created the Kudi system user that owns internal accounts');

    return created.id;
  }
}
