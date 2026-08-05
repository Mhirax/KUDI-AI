import { VirtualAccount as PrismaVirtualAccount } from '@prisma/client';
import { VirtualAccount } from '../../domain/entities/virtual-account.entity';

export class VirtualAccountMapper {
  static toDomain(record: PrismaVirtualAccount): VirtualAccount {
    return VirtualAccount.reconstitute({
      id: record.id,
      userId: record.userId,
      accountId: record.accountId,
      virtualAccountNumber: record.virtualAccountNumber,
      bankName: record.bankName,
      providerReference: record.providerReference,
      isActive: record.isActive,
      createdAt: record.createdAt,
    });
  }

  static toPersistence(virtualAccount: VirtualAccount): PrismaVirtualAccount {
    const props = virtualAccount.toProps();
    return {
      id: props.id,
      userId: props.userId,
      accountId: props.accountId,
      virtualAccountNumber: props.virtualAccountNumber,
      bankName: props.bankName,
      providerReference: props.providerReference,
      isActive: props.isActive,
      createdAt: props.createdAt,
    };
  }
}
