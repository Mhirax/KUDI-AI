import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListMyAccountsQuery } from './list-my-accounts.query';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../domain/repositories/account.repository.interface';
import { AccountResponseDto } from '../../dto/account-response.dto';

@Injectable()
@QueryHandler(ListMyAccountsQuery)
export class ListMyAccountsHandler implements IQueryHandler<
  ListMyAccountsQuery,
  AccountResponseDto[]
> {
  constructor(@Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository) {}

  async execute(query: ListMyAccountsQuery): Promise<AccountResponseDto[]> {
    const accounts = await this.accountRepository.findAllByUserId(query.userId);
    return accounts.map((account) => AccountResponseDto.fromDomain(account));
  }
}
