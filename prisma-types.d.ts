// Emergency Prisma Type Definitions - Comprehensive
declare module '@prisma/client' {
  export interface User {
    id: string;
    email: string;
    phoneNumber: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface RefreshToken {
    id: string;
    userId: string;
    tokenHash: string;
    family: string;
    expiresAt: Date;
    revokedAt: Date | null;
    replacedByTokenId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
  }

  export interface Account {
    id: string;
    userId: string;
    accountNumber: string;
    accountType: AccountType;
    currency: Currency;
    balance: bigint;
    status: AccountStatus;
    version: number;
    nuban?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Transfer {
    id: string;
    reference: string;
    sourceAccountId: string;
    fromAccountId?: string;
    destinationAccountId?: string;
    toAccountId: string;
    amount: bigint;
    amountMinorUnits?: bigint;
    feeMinorUnits?: bigint;
    fee?: bigint;
    type: TransferType;
    status: TransferStatus;
    narration?: string;
    failureReason: string | null;
    externalReference: string | null;
    providerReference?: string | null;
    recipientBankCode?: string;
    version?: number;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface KycProfile {
    id: string;
    userId: string;
    bvn: string | null;
    bvnHash?: string;
    nin: string | null;
    ninHash?: string;
    tin: string | null;
    status: KycStatus;
    tier: KycTier;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Card {
    id: string;
    userId?: string;
    accountId: string;
    cardNumber: string;
    cardType: CardType;
    type?: string;
    brand?: string;
    last4?: string;
    status: CardStatus;
    expiryDate?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface VirtualAccount {
    id: string;
    userId: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Deposit {
    id: string;
    reference: string;
    userId: string;
    amount: bigint;
    status: DepositStatus;
    source: string;
    channel?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface LedgerEntry {
    id: string;
    reference: string;
    accountId: string;
    userId?: string;
    amount: bigint;
    type: LedgerEntryType;
    status: string;
    debitAmount?: bigint;
    creditAmount?: bigint;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface BillPayment {
    id: string;
    reference: string;
    userId: string;
    amount: bigint;
    billerCode: string;
    status: BillPaymentStatus;
    version?: number;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Loan {
    id: string;
    userId: string;
    amount: bigint;
    status: LoanStatus;
    dueDate?: Date;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface RewardAccount {
    id: string;
    userId: string;
    balance: bigint;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface RewardTransaction {
    id: string;
    rewardAccountId: string;
    userId?: string;
    amount: bigint;
    points?: bigint;
    type: string;
    status?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface ReferralRedemption {
    id: string;
    userId: string;
    referrerId: string;
    rewardAmount: bigint;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface SavingsGoal {
    id: string;
    userId: string;
    amount: bigint;
    targetAmountMinorUnits?: bigint;
    name?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Notification {
    id: string;
    userId: string;
    title: string;
    body: string;
    type?: string;
    isRead?: boolean;
    readAt?: Date | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export enum UserRole {
    CUSTOMER = 'CUSTOMER',
    SUPPORT_AGENT = 'SUPPORT_AGENT',
    COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER',
    ADMIN = 'ADMIN',
    SUPER_ADMIN = 'SUPER_ADMIN'
  }

  export enum UserStatus {
    PENDING_VERIFICATION = 'PENDING_VERIFICATION',
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
    LOCKED = 'LOCKED',
    DEACTIVATED = 'DEACTIVATED'
  }

  export enum AccountType {
    WALLET = 'WALLET',
    SAVINGS = 'SAVINGS',
    CURRENT = 'CURRENT'
  }

  export enum AccountStatus {
    ACTIVE = 'ACTIVE',
    DORMANT = 'DORMANT',
    FROZEN = 'FROZEN',
    CLOSED = 'CLOSED',
    PENDING_VERIFICATION = 'PENDING_VERIFICATION'
  }

  export enum Currency {
    NGN = 'NGN',
    USD = 'USD',
    EUR = 'EUR'
  }

  export enum TransferType {
    INTERNAL = 'INTERNAL',
    EXTERNAL = 'EXTERNAL'
  }

  export enum TransferStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REVERSED = 'REVERSED'
  }

  export enum KycStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
  }

  export enum KycTier {
    TIER_1 = 'TIER_1',
    TIER_2 = 'TIER_2',
    TIER_3 = 'TIER_3'
  }

  export enum CardType {
    VIRTUAL = 'VIRTUAL',
    PHYSICAL = 'PHYSICAL'
  }

  export enum CardStatus {
    ACTIVE = 'ACTIVE',
    FROZEN = 'FROZEN',
    TERMINATED = 'TERMINATED'
  }

  export enum DepositStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
  }

  export enum LedgerEntryType {
    DEBIT = 'DEBIT',
    CREDIT = 'CREDIT'
  }

  export enum BillPaymentStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
  }

  export enum LoanStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    DISBURSED = 'DISBURSED',
    REPAID = 'REPAID'
  }

  export namespace Prisma {
    export class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, code: string, clientVersion: string);
    }

    export interface LedgerEntryWhereInput {
      id?: string;
      accountId?: string;
      reference?: string;
      [key: string]: any;
    }

    export interface PrismaClient {
      $connect(): Promise<void>;
      $disconnect(): Promise<void>;
      $transaction(fn: (tx: any) => Promise<any>): Promise<any>;
    }
  }

  export class PrismaClient {
    user: any;
    refreshToken: any;
    account: any;
    transfer: any;
    kycProfile: any;
    card: any;
    virtualAccount: any;
    deposit: any;
    ledgerEntry: any;
    billPayment: any;
    loan: any;
    rewardAccount: any;
    rewardTransaction: any;
    referralRedemption: any;
    savingsGoal: any;
    notification: any;

    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $transaction(fn: (tx: any) => Promise<any>): Promise<any>;
  }

  export default PrismaClient;
}
