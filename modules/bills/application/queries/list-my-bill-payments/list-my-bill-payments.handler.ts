import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListMyBillPaymentsQuery } from './list-my-bill-payments.query';
import {
  BILL_PAYMENT_REPOSITORY,
  IBillPaymentRepository,
} from '../../../domain/repositories/bill-payment.repository.interface';
import { BillPaymentResponseDto } from '../../dto/bill-payment-response.dto';
import { PaginatedResponseDto } from '../../../../../shared/dto/paginated-response.dto';

@Injectable()
@QueryHandler(ListMyBillPaymentsQuery)
export class ListMyBillPaymentsHandler implements IQueryHandler<
  ListMyBillPaymentsQuery,
  PaginatedResponseDto<BillPaymentResponseDto>
> {
  constructor(
    @Inject(BILL_PAYMENT_REPOSITORY) private readonly billPaymentRepository: IBillPaymentRepository,
  ) {}

  async execute(
    query: ListMyBillPaymentsQuery,
  ): Promise<PaginatedResponseDto<BillPaymentResponseDto>> {
    const { billPayments, total } = await this.billPaymentRepository.findPageByUserId({
      userId: query.userId,
      page: query.page,
      limit: query.limit,
    });
    return {
      data: billPayments.map((billPayment) => BillPaymentResponseDto.fromDomain(billPayment)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
