import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetBillPaymentByReferenceQuery } from './get-bill-payment-by-reference.query';
import {
  BILL_PAYMENT_REPOSITORY,
  IBillPaymentRepository,
} from '../../../domain/repositories/bill-payment.repository.interface';
import { BillReference } from '../../../domain/value-objects/bill-reference.vo';
import { BillPaymentNotFoundException } from '../../../domain/exceptions/bill-payment-not-found.exception';
import { BillPaymentResponseDto } from '../../dto/bill-payment-response.dto';

@Injectable()
@QueryHandler(GetBillPaymentByReferenceQuery)
export class GetBillPaymentByReferenceHandler implements IQueryHandler<
  GetBillPaymentByReferenceQuery,
  BillPaymentResponseDto
> {
  constructor(
    @Inject(BILL_PAYMENT_REPOSITORY) private readonly billPaymentRepository: IBillPaymentRepository,
  ) {}

  async execute(query: GetBillPaymentByReferenceQuery): Promise<BillPaymentResponseDto> {
    const billPayment = await this.billPaymentRepository.findByReference(
      BillReference.create(query.reference),
    );
    if (!billPayment) {
      throw new BillPaymentNotFoundException(query.reference);
    }
    if (billPayment.userId !== query.requestingUserId && !query.isAdmin) {
      throw new ForbiddenException('You may only access your own bill payments');
    }
    return BillPaymentResponseDto.fromDomain(billPayment);
  }
}
