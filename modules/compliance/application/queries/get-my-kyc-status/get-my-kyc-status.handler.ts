import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetMyKycStatusQuery } from './get-my-kyc-status.query';
import {
  KYC_PROFILE_REPOSITORY,
  IKycProfileRepository,
} from '../../../domain/repositories/kyc-profile.repository.interface';
import { KycProfileNotFoundException } from '../../../domain/exceptions/kyc-profile-not-found.exception';
import { KycStatusResponseDto } from '../../dto/kyc-status-response.dto';

@Injectable()
@QueryHandler(GetMyKycStatusQuery)
export class GetMyKycStatusHandler implements IQueryHandler<GetMyKycStatusQuery, KycStatusResponseDto> {
  constructor(@Inject(KYC_PROFILE_REPOSITORY) private readonly kycProfileRepository: IKycProfileRepository) {}

  async execute(query: GetMyKycStatusQuery): Promise<KycStatusResponseDto> {
    const profile = await this.kycProfileRepository.findByUserId(query.userId);
    if (!profile) {
      throw new KycProfileNotFoundException(query.userId);
    }
    return KycStatusResponseDto.fromDomain(profile);
  }
}
