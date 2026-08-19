import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { LOGIN_THROTTLE } from '../../../../infrastructure/config/throttler.config';
import { Public } from '../../../../shared/decorators/public.decorator';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../gateway/guards/jwt-auth.guard';
import { RegisterUserDto } from '../../application/dto/register-user.dto';
import { LoginDto } from '../../application/dto/login.dto';
import { RefreshTokenDto } from '../../application/dto/refresh-token.dto';
import { ChangePasswordDto } from '../../application/dto/change-password.dto';
import { AuthResponseDto } from '../../application/dto/auth-response.dto';
import { UserResponseDto } from '../../application/dto/user-response.dto';
import { RegisterUserCommand } from '../../application/commands/register-user/register-user.command';
import { LoginCommand } from '../../application/commands/login/login.command';
import { RefreshAccessTokenCommand } from '../../application/commands/refresh-token/refresh-token.command';
import { LogoutCommand } from '../../application/commands/logout/logout.command';
import { ChangePasswordCommand } from '../../application/commands/change-password/change-password.command';
import { AccessTokenPayload } from '../../application/ports/token.service.interface';

/**
 * Authentication endpoints. Thin — every handler simply maps an HTTP
 * request onto a CQRS command and returns the result; all business
 * logic lives in the application/domain layers.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterUserDto): Promise<UserResponseDto> {
    return this.commandBus.execute(
      new RegisterUserCommand(dto.email, dto.phoneNumber, dto.password, dto.firstName, dto.lastName),
    );
  }

  @Public()
  @Throttle(LOGIN_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.commandBus.execute(
      new LoginCommand(dto.email, dto.password, req.ip ?? null, req.headers['user-agent'] ?? null),
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.commandBus.execute(
      new RefreshAccessTokenCommand(
        dto.refreshToken,
        req.ip ?? null,
        req.headers['user-agent'] ?? null,
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.commandBus.execute(new LogoutCommand(dto.refreshToken));
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new ChangePasswordCommand(user.sub, dto.currentPassword, dto.newPassword),
    );
  }
}
