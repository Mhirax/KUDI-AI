import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAccountByIdQuery } from './get-account-by-id.query';
import {
  ACCOUNT_REPOSITORY,
  IAccountRepository,
} from '../../../domain/repositories/account.repository.interface';
import { AccountNotFoundException } from '../../../domain/exceptions/account-not-found.exception';
import { AccountResponseDto } from '../../dto/account-response.dto';

/**
 * Authorization is enforced here, in the application layer, rather
 * than via a route guard: answering "can this caller see this
 * account?" requires loading the account first, so a guard would only
 * duplicate this lookup. Coarse-grained checks (is the caller
 * authenticated at all) remain in gateway guards; resource-level
 * ownership checks live with the use case that already has the
 * resource in hand.
 */
@Injectable()
@QueryHandler(GetAccountByIdQuery)
export class GetAccountByIdHandler
  implements IQueryHandler<GetAccountByIdQuery, AccountResponseDto>
{
  constructor(@Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository) {}

  async execute(query: GetAccountByIdQuery): Promise<AccountResponseDto> {
    const account = await this.accountRepository.findById(query.accountId);
    if (!account) {
      throw new AccountNotFoundException(query.accountId);
    }

    if (account.userId !== query.requestingUserId && !query.isAdmin) {
      throw new ForbiddenException('You may only access your own accounts');
    }

    return AccountResponseDto.fromDomain(account);
  }
}
