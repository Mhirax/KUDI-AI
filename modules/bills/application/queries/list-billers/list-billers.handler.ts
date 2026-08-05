import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListBillersQuery } from './list-billers.query';
import {
  BILL_PAYMENT_PROVIDER,
  IBillPaymentProvider,
} from '../../../domain/services/bill-payment-provider.interface';
import { BillerResponseDto } from '../../dto/biller-response.dto';

/**
 * Live provider passthrough (no local persistence): the biller
 * catalogue is Flutterwave's data and goes stale fast. A Redis cache
 * in front of this is an infrastructure concern for a later phase.
 */
@Injectable()
@QueryHandler(ListBillersQuery)
export class ListBillersHandler implements IQueryHandler<ListBillersQuery, BillerResponseDto[]> {
  constructor(@Inject(BILL_PAYMENT_PROVIDER) private readonly billProvider: IBillPaymentProvider) {}

  async execute(query: ListBillersQuery): Promise<BillerResponseDto[]> {
    const billers = await this.billProvider.getBillers(query.category);
    return billers.map((biller) => BillerResponseDto.fromDomain(biller));
  }
}
