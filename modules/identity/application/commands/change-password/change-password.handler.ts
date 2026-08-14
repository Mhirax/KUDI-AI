import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ChangePasswordCommand } from './change-password.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../../domain/repositories/refresh-token.repository.interface';
import { PASSWORD_HASHER, IPasswordHasher } from '../../../domain/services/password-hasher.interface';
import { PlainPassword, HashedPassword } from '../../../domain/value-objects/password.vo';
import { InvalidCredentialsException } from '../../../domain/exceptions/invalid-credentials.exception';

/**
 * Use case: change a user's password. On success, every refresh-token
 * family belonging to the user is revoked, forcing re-authentication
 * on all other devices/sessions — a standard security control after a
 * credential change.
 */
@Injectable()
@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand, void> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentMatches = await this.passwordHasher.compare(
      command.currentPassword,
      user.passwordHash.getValue(),
    );
    if (!currentMatches) {
      throw new InvalidCredentialsException();
    }

    const newPlainPassword = PlainPassword.create(command.newPassword);
    const newHash = await this.passwordHasher.hash(newPlainPassword.getValue());
    user.changePassword(HashedPassword.fromHash(newHash));

    await this.userRepository.save(user);
    // Force re-authentication on every other device/session after a
    // credential change — a standard security control.
    await this.refreshTokenRepository.revokeAllForUser(user.id);

    user.pullDomainEvents().forEach((event) => this.eventBus.publish(event));
  }
}
