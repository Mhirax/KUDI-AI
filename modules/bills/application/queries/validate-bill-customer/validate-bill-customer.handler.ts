import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ValidateBillCustomerQuery } from './validate-bill-customer.query';
import {
  BILL_PAYMENT_PROVIDER,
  IBillPaymentProvider,
} from '../../../domain/services/bill-payment-provider.interface';
import { ValidatedCustomerResponseDto } from '../../dto/validated-customer-response.dto';

/**
 * Pre-payment customer lookup so the app can show "MTN — ADEBAYO
 * OLOWO" before the customer commits money. The payment path re-runs
 * this validation server-side regardless — this query is UX, not the
 * security boundary.
 */
@Injectable()
@QueryHandler(ValidateBillCustomerQuery)
export class ValidateBillCustomerHandler implements IQueryHandler<
  ValidateBillCustomerQuery,
  ValidatedCustomerResponseDto
> {
  constructor(@Inject(BILL_PAYMENT_PROVIDER) private readonly billProvider: IBillPaymentProvider) {}

  async execute(query: ValidateBillCustomerQuery): Promise<ValidatedCustomerResponseDto> {
    const result = await this.billProvider.validateCustomer({
      billerCode: query.billerCode,
      itemCode: query.itemCode,
      customerIdentifier: query.customerIdentifier,
    });
    return { isValid: result.isValid, customerName: result.customerName };
  }
}
