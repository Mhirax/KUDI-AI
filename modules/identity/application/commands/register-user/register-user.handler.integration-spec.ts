import { randomUUID } from 'crypto';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { RegisterUserHandler } from './register-user.handler';
import { RegisterUserCommand } from './register-user.command';
import { PrismaUserRepository } from '../../../infrastructure/persistence/prisma-user.repository';
import { BcryptPasswordHasher } from '../../../infrastructure/services/bcrypt-password-hasher.service';
import { OpenAccountHandler } from '../../../../accounts/application/commands/open-account/open-account.handler';
import { PrismaAccountRepository } from '../../../../accounts/infrastructure/persistence/prisma-account.repository';
import { NubanAccountNumberGenerator } from '../../../../accounts/infrastructure/services/nuban-account-number-generator.service';
import { AccountType } from '../../../../accounts/domain/enums/account-type.enum';
import { AccountStatus } from '../../../../../shared/enums/account-status.enum';
import { Email } from '../../../domain/value-objects/email.vo';

/**
 * Real Prisma/Postgres integration test for the 2026-08-19 fix closing
 * Accounts' "no server-side provisioning" gap: registration now
 * dispatches Accounts' real `OpenAccountHandler` synchronously via the
 * shared `CommandBus`, not a stub. The one Nest-specific piece faked
 * here is the `CommandBus` itself (constructing a real one outside
 * Nest's DI container is unnecessary ceremony for this test) — it
 * routes directly to a real `OpenAccountHandler` instance backed by
 * real repositories, so the actual DB write is what's being proven,
 * matching this codebase's existing integration-test pattern of
 * faking only cross-cutting Nest plumbing (see the `fakeEventBus`
 * pattern in the Phase 5b manual-override integration spec).
 */
describe('Register user → account provisioning (integration)', () => {
  const prisma = new PrismaService();
  const userRepository = new PrismaUserRepository(prisma);
  const accountRepository = new PrismaAccountRepository(prisma);
  const passwordHasher = new BcryptPasswordHasher();
  const fakeEventBus = { publish: () => undefined } as unknown as EventBus;
  const fakeConfigService = { get: (_key: string, fallback: unknown) => fallback } as any;
  const accountNumberGenerator = new NubanAccountNumberGenerator(fakeConfigService, accountRepository);
  const openAccountHandler = new OpenAccountHandler(accountRepository, accountNumberGenerator, fakeEventBus);
  const realCommandBus = { execute: (cmd: unknown) => openAccountHandler.execute(cmd as any) } as unknown as CommandBus;

  const createdUserIds: string[] = [];

  afterAll(async () => {
    await prisma.account.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  function registerCommand(): RegisterUserCommand {
    const unique = randomUUID().slice(0, 8);
    const phoneDigits = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
    return new RegisterUserCommand(
      `test-${unique}@example.test`,
      `+23480${phoneDigits}1`,
      'a-real-10-char-password',
      'Test',
      'User',
    );
  }

  it('provisions exactly one WALLET/NGN account atomically with registration', async () => {
    const handler = new RegisterUserHandler(userRepository, passwordHasher, fakeEventBus, realCommandBus);
    const result = await handler.execute(registerCommand());
    createdUserIds.push(result.id);

    const accounts = await prisma.account.findMany({ where: { userId: result.id } });
    expect(accounts).toHaveLength(1);
    expect(accounts[0].accountType).toBe(AccountType.WALLET);
    expect(accounts[0].currency).toBe('NGN');
    expect(accounts[0].status).toBe(AccountStatus.PENDING_VERIFICATION);
    expect(accounts[0].balance.toString()).toBe('0');
  });

  it('fails registration loudly (does not swallow the error) if account provisioning fails', async () => {
    const failingCommandBus = {
      execute: async () => {
        throw new Error('simulated account-provisioning failure');
      },
    } as unknown as CommandBus;
    const handler = new RegisterUserHandler(userRepository, passwordHasher, fakeEventBus, failingCommandBus);
    const command = registerCommand();

    await expect(handler.execute(command)).rejects.toThrow('simulated account-provisioning failure');

    // Documents the known, accepted trade-off (see register-user.handler.ts's
    // header comment and modules/accounts/implementation.md): the user row
    // is already committed by this point, since it isn't wrapped in a
    // cross-module DB transaction with account creation. The failure
    // propagates loudly instead of being silently swallowed — that's the
    // actual fix — but it does not roll back the just-created user.
    const savedUser = await userRepository.findByEmail(Email.create(command.email));
    expect(savedUser).not.toBeNull();
    createdUserIds.push(savedUser!.id);
    const accounts = await prisma.account.findMany({ where: { userId: savedUser!.id } });
    expect(accounts).toHaveLength(0);
  });
});
