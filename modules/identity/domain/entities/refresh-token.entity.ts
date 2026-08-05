import { randomUUID } from 'crypto';

export interface RefreshTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  family: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

/**
 * RefreshToken Entity.
 *
 * Tokens are never stored in plaintext (only a SHA-256 hash of the
 * token is persisted). Implements rotation: each use invalidates the
 * token and issues a replacement within the same `family`, so token
 * reuse (a strong signal of theft) can be detected and the entire
 * family revoked.
 */
export class RefreshToken {
  private constructor(private props: RefreshTokenProps) {}

  static issue(params: {
    userId: string;
    tokenHash: string;
    family?: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }): RefreshToken {
    return new RefreshToken({
      id: randomUUID(),
      userId: params.userId,
      tokenHash: params.tokenHash,
      family: params.family ?? randomUUID(),
      expiresAt: params.expiresAt,
      revokedAt: null,
      replacedByTokenId: null,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: RefreshTokenProps): RefreshToken {
    return new RefreshToken(props);
  }

  isExpired(): boolean {
    return this.props.expiresAt.getTime() <= Date.now();
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  isActive(): boolean {
    return !this.isExpired() && !this.isRevoked();
  }

  revoke(replacedByTokenId?: string): void {
    this.props.revokedAt = new Date();
    if (replacedByTokenId) {
      this.props.replacedByTokenId = replacedByTokenId;
    }
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get family(): string {
    return this.props.family;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  toProps(): Readonly<RefreshTokenProps> {
    return { ...this.props };
  }
}
