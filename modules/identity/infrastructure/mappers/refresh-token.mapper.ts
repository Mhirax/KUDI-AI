import { RefreshToken as PrismaRefreshToken } from '@prisma/client';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';

export class RefreshTokenMapper {
  static toDomain(record: PrismaRefreshToken): RefreshToken {
    return RefreshToken.reconstitute({
      id: record.id,
      userId: record.userId,
      tokenHash: record.tokenHash,
      family: record.family,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      replacedByTokenId: record.replacedByTokenId,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      createdAt: record.createdAt,
    });
  }

  static toPersistence(token: RefreshToken): PrismaRefreshToken {
    return { ...token.toProps() };
  }
}
