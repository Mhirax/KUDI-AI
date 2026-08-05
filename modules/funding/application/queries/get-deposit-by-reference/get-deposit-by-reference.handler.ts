import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetDepositByReferenceQuery } from './get-deposit-by-reference.query';
import {
  DEPOSIT_REPOSITORY,
  IDepositRepository,
} from '../../../domain/repositories/deposit.repository.interface';
import { DepositReference } from '../../../domain/value-objects/deposit-reference.vo';
import { DepositNotFoundException } from '../../../domain/exceptions/deposit-not-found.exception';
import { DepositResponseDto } from '../../dto/deposit-response.dto';

/**
 * Customers poll this after returning from hosted checkout to learn
 * whether their deposit has settled. Ownership enforced here in the
 * application layer, mirroring Accounts/Ledger.
 */
@Injectable()
@QueryHandler(GetDepositByReferenceQuery)
export class GetDepositByReferenceHandler implements IQueryHandler<
  GetDepositByReferenceQuery,
  DepositResponseDto
> {
  constructor(@Inject(DEPOSIT_REPOSITORY) private readonly depositRepository: IDepositRepository) {}

  async execute(query: GetDepositByReferenceQuery): Promise<DepositResponseDto> {
    const deposit = await this.depositRepository.findByReference(
      DepositReference.create(query.reference),
    );
    if (!deposit) {
      throw new DepositNotFoundException(query.reference);
    }
    if (deposit.userId !== query.requestingUserId && !query.isAdmin) {
      throw new ForbiddenException('You may only access your own deposits');
    }
    return DepositResponseDto.fromDomain(deposit);
  }
}
