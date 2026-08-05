import { VirtualAccount } from '../../domain/entities/virtual-account.entity';

export class VirtualAccountResponseDto {
  id: string;
  accountId: string;
  virtualAccountNumber: string;
  bankName: string;
  isActive: boolean;
  createdAt: string;

  static fromDomain(virtualAccount: VirtualAccount): VirtualAccountResponseDto {
    const props = virtualAccount.toProps();
    return {
      id: props.id,
      accountId: props.accountId,
      virtualAccountNumber: props.virtualAccountNumber,
      bankName: props.bankName,
      isActive: props.isActive,
      createdAt: props.createdAt.toISOString(),
    };
  }
}
