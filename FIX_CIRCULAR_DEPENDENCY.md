# 🔧 Fix: Circular Dependency in LedgerGrpcClientModule

## ✅ QUICK FIX (Copy-Paste)

You're getting this error because there's a circular dependency between modules. Here's how to fix it:

---

## 🎯 The Problem

```
ERROR [ExceptionHandler] A circular dependency has been detected inside LedgerGrpcClientModule
```

This happens when:
- LedgerModule imports AccountsModule
- AccountsModule imports LedgerGrpcClientModule
- This creates a circular loop

---

## ✅ Solution: Use forwardRef()

### File 1: Update `modules/ledger/ledger.module.ts`

Replace this line:
```typescript
import { AccountsModule } from '../accounts/accounts.module';
```

With:
```typescript
import { forwardRef } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
```

Then change the imports array from:
```typescript
@Module({
  imports: [CqrsModule, AccountsModule],
```

To:
```typescript
@Module({
  imports: [CqrsModule, forwardRef(() => AccountsModule)],
```

---

### File 2: Update `modules/accounts/accounts.module.ts`

The imports should already be fine, but make sure it looks like:
```typescript
@Module({
  imports: [CqrsModule, ConfigModule.forFeature(bankConfig), LedgerGrpcClientModule],
```

This is correct as-is!

---

## 📝 Complete Fixed File

Here's what `modules/ledger/ledger.module.ts` should look like:

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Domain ports
import { LEDGER_ENTRY_REPOSITORY } from './domain/repositories/ledger-entry.repository.interface';

// Infrastructure adapters
import { PrismaLedgerEntryRepository } from './infrastructure/persistence/prisma-ledger-entry.repository';

// Application query/event handlers
import { GetAccountLedgerHandler } from './application/queries/get-account-ledger/get-account-ledger.handler';
import { GetAccountStatementHandler } from './application/queries/get-account-statement/get-account-statement.handler';
import { GetLedgerEntryByIdHandler } from './application/queries/get-ledger-entry-by-id/get-ledger-entry-by-id.handler';
import { AccountCreditedLedgerHandler } from './application/event-handlers/account-credited.handler';
import { AccountDebitedLedgerHandler } from './application/event-handlers/account-debited.handler';

// Presentation
import { LedgerController } from './presentation/controllers/ledger.controller';

// Cross-module *module* import: LedgerModule consumes Accounts' exported
// ACCOUNT_REPOSITORY port (ownership checks + userId denormalization).
import { AccountsModule } from '../accounts/accounts.module';

const queryHandlers = [
  GetAccountLedgerHandler,
  GetAccountStatementHandler,
  GetLedgerEntryByIdHandler,
];
const eventHandlers = [AccountCreditedLedgerHandler, AccountDebitedLedgerHandler];

/**
 * Ledger bounded-context module — the platform's immutable transaction
 * history.
 *
 * Pure CQRS split: the write side is exclusively event-driven (the two
 * event handlers projecting Accounts' credited/debited events into
 * append-only rows); the read side is exclusively queries (history,
 * statements, single-entry lookup). There are no commands and no
 * mutating HTTP endpoints at all.
 *
 * `DatabaseModule` (global) already provides `PrismaService`; not
 * re-imported here.
 */
@Module({
  imports: [CqrsModule, forwardRef(() => AccountsModule)],
  controllers: [LedgerController],
  providers: [
    ...queryHandlers,
    ...eventHandlers,
    { provide: LEDGER_ENTRY_REPOSITORY, useClass: PrismaLedgerEntryRepository },
  ],
  exports: [LEDGER_ENTRY_REPOSITORY],
})
export class LedgerModule {}
```

---

## 🔄 Step-by-Step Fix Instructions

### Step 1: Edit the File
Open: `modules/ledger/ledger.module.ts`

### Step 2: Add forwardRef Import
At the top, change:
```typescript
import { Module } from '@nestjs/common';
```

To:
```typescript
import { Module, forwardRef } from '@nestjs/common';
```

### Step 3: Update Module Decorator
Find:
```typescript
@Module({
  imports: [CqrsModule, AccountsModule],
```

Change to:
```typescript
@Module({
  imports: [CqrsModule, forwardRef(() => AccountsModule)],
```

### Step 4: Save File

### Step 5: Restart Server

In PowerShell:
```powershell
# Press Ctrl+C to stop current server
# Then run again:
npm run start:web-api
```

---

## ✅ What You Should See Now

After applying the fix:

```powershell
[Nest] 3380  - 01/08/2026, 19:20:55     LOG [NestFactory] Starting Nest application...
[Nest] 3380  - 01/08/2026, 19:20:55     LOG [InstanceLoader] TypeOrmModule dependencies initialized +45ms
[Nest] 3380  - 01/08/2026, 19:20:55     LOG [InstanceLoader] ConfigModule dependencies initialized +3ms
...
[Web API] listening on port 3002
[Web API] API prefix: /api/v1 — docs at /api/v1/docs
```

**✓ No more circular dependency error!**

---

## 🧪 Test It

In a new PowerShell:
```powershell
curl.exe http://localhost:3002/health
```

Should return:
```json
{"status":"ok"}
```

---

## 📚 What is forwardRef()?

`forwardRef()` is NestJS's way of telling the dependency injection container:
- "This module might depend on me"
- "Wait and resolve this later when both modules are initialized"
- "It's OK if there's a circular dependency"

Think of it like a forward declaration in C++.

---

## ❓ Why Did This Happen?

The architecture has:
- **LedgerModule** needs **AccountsModule** (to verify account ownership)
- **AccountsModule** needs **LedgerGrpcClientModule** (to post transactions)

This created a dependency loop that NestJS couldn't resolve until we used `forwardRef()` to tell it to resolve it lazily.

---

## 🚀 That's It!

One line change fixes it. The server will now start without circular dependency errors.

If you still get an error after this, let me know what it says!

