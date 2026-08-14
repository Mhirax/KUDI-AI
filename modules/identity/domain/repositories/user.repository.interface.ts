import { User } from '../entities/user.entity';
import { Email } from '../value-objects/email.vo';

/**
 * Port for User persistence. The concrete Prisma-backed adapter lives
 * in infrastructure/persistence, per the Repository Pattern and
 * Clean Architecture's dependency-inversion rule.
 */
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  save(user: User): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
