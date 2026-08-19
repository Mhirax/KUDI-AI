import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetFlaggedSanctionsProfilesQuery } from './get-flagged-sanctions-profiles.query';
import {
  KYC_PROFILE_REPOSITORY,
  IKycProfileRepository,
} from '../../../domain/repositories/kyc-profile.repository.interface';
import { FlaggedSanctionsProfileResponseDto } from '../../dto/flagged-sanctions-profile-response.dto';

/** The Phase 4b review queue — every profile with an open sanctions flag, oldest first. */
@Injectable()
@QueryHandler(GetFlaggedSanctionsProfilesQuery)
export class GetFlaggedSanctionsProfilesHandler
  implements IQueryHandler<GetFlaggedSanctionsProfilesQuery, FlaggedSanctionsProfileResponseDto[]>
{
  constructor(
    @Inject(KYC_PROFILE_REPOSITORY) private readonly kycProfileRepository: IKycProfileRepository,
  ) {}

  async execute(): Promise<FlaggedSanctionsProfileResponseDto[]> {
    const profiles = await this.kycProfileRepository.findAllCurrentlyFlaggedForSanctions();
    return profiles.map((profile) => FlaggedSanctionsProfileResponseDto.fromDomain(profile));
  }
}
