import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../gateway/guards/jwt-auth.guard';
import { SelfOrAdminGuard } from '../guards/self-or-admin.guard';
import { GetUserProfileQuery } from '../../application/queries/get-user-profile/get-user-profile.query';
import { GetUserByIdQuery } from '../../application/queries/get-user-by-id/get-user-by-id.query';
import { UserResponseDto } from '../../application/dto/user-response.dto';
import { AccessTokenPayload } from '../../application/ports/token.service.interface';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly queryBus: QueryBus) {}

  /** Self-service: the authenticated caller's own profile. */
  @Get('me')
  async getMyProfile(@CurrentUser() user: AccessTokenPayload): Promise<UserResponseDto> {
    return this.queryBus.execute(new GetUserProfileQuery(user.sub));
  }

  /**
   * Lookup by ID. `SelfOrAdminGuard` allows the request through only if
   * the caller is requesting their own record or holds an
   * administrative role — a plain customer cannot browse other users'
   * records via this route, but can still fetch their own.
   */
  @Get(':userId')
  @UseGuards(SelfOrAdminGuard)
  async getUserById(@Param('userId') userId: string): Promise<UserResponseDto> {
    return this.queryBus.execute(new GetUserByIdQuery(userId));
  }
}
