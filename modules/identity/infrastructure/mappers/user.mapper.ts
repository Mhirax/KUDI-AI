import { User as PrismaUser } from '@prisma/client';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { PhoneNumber } from '../../domain/value-objects/phone-number.vo';
import { HashedPassword } from '../../domain/value-objects/password.vo';
import { UserRole } from '../../domain/enums/user-role.enum';
import { UserStatus } from '../../domain/enums/user-status.enum';

/**
 * Translates between the Prisma persistence model and the domain's
 * `User` aggregate, keeping the domain layer completely unaware that
 * Prisma (or PostgreSQL) exists — per Clean Architecture's dependency
 * rule, this mapper lives in infrastructure, not domain.
 */
export class UserMapper {
  static toDomain(record: PrismaUser): User {
    return User.reconstitute({
      id: record.id,
      email: Email.create(record.email),
      phoneNumber: PhoneNumber.create(record.phoneNumber),
      passwordHash: HashedPassword.fromHash(record.passwordHash),
      firstName: record.firstName,
      lastName: record.lastName,
      role: record.role as UserRole,
      status: record.status as UserStatus,
      failedLoginAttempts: record.failedLoginAttempts,
      lockedUntil: record.lockedUntil,
      lastLoginAt: record.lastLoginAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(user: User): Omit<PrismaUser, 'createdAt' | 'updatedAt'> & {
    createdAt: Date;
    updatedAt: Date;
  } {
    const props = user.toProps();
    return {
      id: props.id,
      email: props.email.getValue(),
      phoneNumber: props.phoneNumber.getValue(),
      passwordHash: props.passwordHash.getValue(),
      firstName: props.firstName,
      lastName: props.lastName,
      role: props.role,
      status: props.status,
      failedLoginAttempts: props.failedLoginAttempts,
      lockedUntil: props.lockedUntil,
      lastLoginAt: props.lastLoginAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}
