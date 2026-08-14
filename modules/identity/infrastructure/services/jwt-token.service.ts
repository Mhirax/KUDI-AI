import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import {
  AccessTokenPayload,
  ITokenService,
} from '../../application/ports/token.service.interface';

/**
 * JWT-backed implementation of `ITokenService`.
 *
 * Access tokens are short-lived, signed JWTs (stateless verification).
 * Refresh tokens are opaque, cryptographically random strings — never
 * JWTs — so that revocation is a simple database lookup rather than
 * requiring a JWT deny-list; only their SHA-256 hash is ever persisted
 * or transmitted internally.
 */
@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signAccessToken(
    payload: AccessTokenPayload,
  ): Promise<{ token: string; expiresIn: number }> {
    const expiresIn = this.configService.get<string>('jwt.accessExpiresIn', '15m');
    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn,
      issuer: this.configService.get<string>('jwt.issuer'),
    });

    return { token, expiresIn: this.parseExpiresInSeconds(expiresIn) };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        issuer: this.configService.get<string>('jwt.issuer'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  generateOpaqueRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseExpiresInSeconds(expiresIn: string): number {
    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    if (!match) return 900; // fallback: 15 minutes
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * multipliers[unit];
  }
}
