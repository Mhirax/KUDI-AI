import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import flutterwaveConfig from '../../infrastructure/config/flutterwave.config';

// Domain ports
import { BILL_PAYMENT_REPOSITORY } from './domain/repositories/bill-payment.repository.interface';
import { BILL_PAYMENT_PROVIDER } from './domain/services/bill-payment-provider.interface';
import { BILL_FEE_CALCULATOR } from './domain/services/bill-fee-calculator.interface';

// Infrastructure adapters (this module)
import { PrismaBillPaymentRepository } from './infrastructure/persistence/prisma-bill-payment.repository';
import { FlutterwaveBillPaymentProvider } from './infrastructure/services/flutterwave-bill-payment-provider.service';
import { FlatRateBillFeeCalculator } from './infrastructure/services/flat-rate-bill-fee-calculator.service';

// Flutterwave integration adapter
import { FLUTTERWAVE_BILLS_CLIENT } from '../../integrations/payment-gateway/flutterwave/bill-payments/flutterwave-bills.port';
import { FlutterwaveBillsAdapter } from '../../integrations/payment-gateway/flutterwave/bill-payments/flutterwave-bills.adapter';

// Application command/query handlers
import { InitiateBillPaymentHandler } from './application/commands/initiate-bill-payment/initiate-bill-payment.handler';
import { RefreshBillPaymentStatusHandler } from './application/commands/refresh-bill-payment-status/refresh-bill-payment-status.handler';
import { ListBillersHandler } from './application/queries/list-billers/list-billers.handler';
import { ValidateBillCustomerHandler } from './application/queries/validate-bill-customer/validate-bill-customer.handler';
import { GetBillPaymentByReferenceHandler } from './application/queries/get-bill-payment-by-reference/get-bill-payment-by-reference.handler';
import { ListMyBillPaymentsHandler } from './application/queries/list-my-bill-payments/list-my-bill-payments.handler';

// Presentation
import { BillsController } from './presentation/controllers/bills.controller';

// Cross-module dependency: Accounts' exported ACCOUNT_REPOSITORY port
// (debit/compensating-credit in the payment saga).
import { AccountsModule } from '../accounts/accounts.module';

const commandHandlers = [InitiateBillPaymentHandler, RefreshBillPaymentStatusHandler];
const queryHandlers = [
  ListBillersHandler,
  ValidateBillCustomerHandler,
  GetBillPaymentByReferenceHandler,
  ListMyBillPaymentsHandler,
];

/**
 * Bills bounded-context module — airtime, data, electricity, TV and
 * internet payments from Kudi wallets, via a debit-first saga with
 * compensating credit (mirroring Transfers' external payout saga).
 */
@Module({
  imports: [CqrsModule, ConfigModule.forFeature(flutterwaveConfig), HttpModule, AccountsModule],
  controllers: [BillsController],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    { provide: BILL_PAYMENT_REPOSITORY, useClass: PrismaBillPaymentRepository },
    { provide: BILL_PAYMENT_PROVIDER, useClass: FlutterwaveBillPaymentProvider },
    { provide: BILL_FEE_CALCULATOR, useClass: FlatRateBillFeeCalculator },
    { provide: FLUTTERWAVE_BILLS_CLIENT, useClass: FlutterwaveBillsAdapter },
  ],
  exports: [BILL_PAYMENT_REPOSITORY],
})
export class BillsModule {}
