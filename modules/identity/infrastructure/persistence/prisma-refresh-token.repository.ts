import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IRefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.interface';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { RefreshTokenMapper } from '../mappers/refresh-token.mapper';

@Injectable()
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<RefreshToken | null> {
    const record = await this.prisma.refreshToken.findUnique({ where: { id } });
    return record ? RefreshTokenMapper.toDomain(record) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    return record ? RefreshTokenMapper.toDomain(record) : null;
  }

  async save(token: RefreshToken): Promise<void> {
    const data = RefreshTokenMapper.toPersistence(token);
    await this.prisma.refreshToken.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async revokeFamily(family: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
