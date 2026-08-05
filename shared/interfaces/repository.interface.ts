/**
 * Generic repository contract following the Repository Pattern.
 * Concrete Prisma-backed implementations live in each module's
 * infrastructure layer.
 */
export interface IRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
}
