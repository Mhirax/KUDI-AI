import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetMyVirtualAccountsQuery } from './get-my-virtual-accounts.query';
import {
  IVirtualAccountRepository,
  VIRTUAL_ACCOUNT_REPOSITORY,
} from '../../../domain/repositories/virtual-account.repository.interface';
import { VirtualAccountResponseDto } from '../../dto/virtual-account-response.dto';

@Injectable()
@QueryHandler(GetMyVirtualAccountsQuery)
export class GetMyVirtualAccountsHandler implements IQueryHandler<
  GetMyVirtualAccountsQuery,
  VirtualAccountResponseDto[]
> {
  constructor(
    @Inject(VIRTUAL_ACCOUNT_REPOSITORY)
    private readonly virtualAccountRepository: IVirtualAccountRepository,
  ) {}

  async execute(query: GetMyVirtualAccountsQuery): Promise<VirtualAccountResponseDto[]> {
    const virtualAccounts = await this.virtualAccountRepository.findAllByUserId(query.userId);
    return virtualAccounts.map((virtualAccount) =>
      VirtualAccountResponseDto.fromDomain(virtualAccount),
    );
  }
}
