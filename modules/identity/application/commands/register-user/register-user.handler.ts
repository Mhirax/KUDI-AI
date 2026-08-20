import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { RegisterUserCommand } from './register-user.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import { PASSWORD_HASHER, IPasswordHasher } from '../../../domain/services/password-hasher.interface';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.vo';
import { PlainPassword, HashedPassword } from '../../../domain/value-objects/password.vo';
import { UserAlreadyExistsException } from '../../../domain/exceptions/user-already-exists.exception';
import { UserResponseDto } from '../../dto/user-response.dto';
import { OpenAccountCommand } from '../../../../accounts/application/commands/open-account/open-account.command';
import { AccountType } from '../../../../accounts/domain/enums/account-type.enum';
import { Currency } from '../../../../../shared/enums/currency.enum';

/**
 * Use case: register a new customer.
 *
 * Orchestrates domain objects and ports only — all business rules
 * (password strength, email format, uniqueness) live in the domain
 * layer or are enforced via the repository contract; this handler's
 * job is coordination, not decision-making.
 *
 * Deliberately couples directly to Accounts' `OpenAccountCommand`
 * (via the shared `CommandBus`, same singleton-bus mechanism proxied
 * elsewhere in `KycController`'s staff freeze/unfreeze routes) rather
 * than reacting to `UserRegisteredEvent` asynchronously. The event
 * path was considered and rejected: `@nestjs/cqrs`'s `EventBus.publish()`
 * is fire-and-forget, and a failed handler there would silently leave a
 * "registered but no account" user with no error surfaced anywhere —
 * the same failure mode already found and fixed for Compliance's audit
 * trail this session. A direct, awaited call fails registration itself
 * instead, which is the correct behavior for an invariant this
 * foundational ("every user has exactly one wallet account").
 */
@Injectable()
@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand, UserResponseDto> {
  private readonly logger = new Logger(RegisterUserHandler.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    private readonly eventBus: EventBus,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: RegisterUserCommand): Promise<UserResponseDto> {
    const email = Email.create(command.email);

    const alreadyExists = await this.userRepository.existsByEmail(email);
    if (alreadyExists) {
      throw new UserAlreadyExistsException(email.getValue());
    }

    const plainPassword = PlainPassword.create(command.password);
    const hash = await this.passwordHasher.hash(plainPassword.getValue());
    const passwordHash = HashedPassword.fromHash(hash);

    const user = User.register({
      email,
      phoneNumber: PhoneNumber.create(command.phoneNumber),
      passwordHash,
      firstName: command.firstName,
      lastName: command.lastName,
    });

    await this.userRepository.save(user);

    try {
      await this.commandBus.execute(
        new OpenAccountCommand(user.id, AccountType.WALLET, Currency.NGN),
      );
    } catch (error) {
      // The user row is already committed at this point — a failure here
      // leaves a real, registered user with no account, the exact state
      // this coupling exists to prevent. Logged loudly rather than
      // swallowed so it's actually noticed and followed up on, since
      // there's no automatic compensating action (deleting the just-created
      // user) for what should be a rare infrastructure failure, not a
      // routine one.
      this.logger.error(
        `Account provisioning failed for newly registered user ${user.id} — user exists with no account`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }

    user.pullDomainEvents().forEach((event) => this.eventBus.publish(event));

    return {
      id: user.id,
      email: user.email.getValue(),
      phoneNumber: user.phoneNumber.getValue(),
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      lastLoginAt: null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
