import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenPayload } from '../../application/ports/token.service.interface';

/**
 * Validates the JWT access token on every protected request and
 * attaches the decoded payload to `request.user`, consumed downstream
 * via the shared `@CurrentUser()` decorator. Wired to the platform's
 * global `JwtAuthGuard` (see /gateway/guards/jwt-auth.guard.ts).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
      issuer: configService.get<string>('jwt.issuer'),
    });
  }

  validate(payload: AccessTokenPayload): AccessTokenPayload {
    // Whatever is returned here becomes `request.user`.
    return payload;
  }
}
