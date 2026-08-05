export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number; // seconds
}

/**
 * Port abstracting JWT issuance/verification away from the application
 * layer. Concrete implementation lives in infrastructure/services and
 * wraps @nestjs/jwt.
 */
export interface ITokenService {
  signAccessToken(payload: AccessTokenPayload): Promise<{ token: string; expiresIn: number }>;
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;
  generateOpaqueRefreshToken(): string;
  hashRefreshToken(token: string): string;
}

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');
