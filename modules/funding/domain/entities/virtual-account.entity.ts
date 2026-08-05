import { randomUUID } from 'crypto';
import { DomainEvent } from '../../../../shared/events/domain-event.base';
import { VirtualAccountCreatedEvent } from '../events/virtual-account-created.event';

export interface VirtualAccountProps {
  id: string;
  userId: string;
  /** The Kudi wallet account this virtual account funds. */
  accountId: string;
  /** The Flutterwave-issued NUBAN customers send transfers to. */
  virtualAccountNumber: string;
  bankName: string;
  /**
   * The `tx_ref`/`order_ref` we registered with Flutterwave at
   * creation time — echoed back in every credit webhook for this
   * virtual account, and how we route an inbound transfer to the right
   * wallet.
   */
  providerReference: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * VirtualAccount Aggregate Root — a customer's dedicated inbound
 * account number at the provider. One active virtual account per Kudi
 * wallet account (enforced at the persistence layer). Deliberately
 * minimal: it is routing metadata, not money — balances live on the
 * `Account` aggregate and history in the Ledger.
 */
export class VirtualAccount {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(private readonly props: VirtualAccountProps) {}

  static create(params: {
    userId: string;
    accountId: string;
    virtualAccountNumber: string;
    bankName: string;
    providerReference: string;
  }): VirtualAccount {
    const virtualAccount = new VirtualAccount({
      id: randomUUID(),
      userId: params.userId,
      accountId: params.accountId,
      virtualAccountNumber: params.virtualAccountNumber,
      bankName: params.bankName,
      providerReference: params.providerReference,
      isActive: true,
      createdAt: new Date(),
    });

    virtualAccount.domainEvents.push(
      new VirtualAccountCreatedEvent(
        virtualAccount.props.id,
        virtualAccount.props.userId,
        virtualAccount.props.accountId,
        virtualAccount.props.virtualAccountNumber,
        virtualAccount.props.bankName,
      ),
    );

    return virtualAccount;
  }

  static reconstitute(props: VirtualAccountProps): VirtualAccount {
    return new VirtualAccount(props);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get accountId(): string {
    return this.props.accountId;
  }
  get virtualAccountNumber(): string {
    return this.props.virtualAccountNumber;
  }
  get bankName(): string {
    return this.props.bankName;
  }
  get providerReference(): string {
    return this.props.providerReference;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<VirtualAccountProps> {
    return { ...this.props };
  }
}
