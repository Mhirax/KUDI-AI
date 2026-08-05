import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { RegisterUserCommand } from './register-user.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import {
  PASSWORD_HASHER,
  IPasswordHasher,
} from '../../../domain/services/password-hasher.interface';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.vo';
import { PlainPassword, HashedPassword } from '../../../domain/value-objects/password.vo';
import { UserAlreadyExistsException } from '../../../domain/exceptions/user-already-exists.exception';
import { UserResponseDto } from '../../dto/user-response.dto';

/**
 * Use case: register a new customer.
 *
 * Orchestrates domain objects and ports only — all business rules
 * (password strength, email format, uniqueness) live in the domain
 * layer or are enforced via the repository contract; this handler's
 * job is coordination, not decision-making.
 */
@Injectable()
@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand, UserResponseDto> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    private readonly eventBus: EventBus,
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
