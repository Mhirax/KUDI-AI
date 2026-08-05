import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';
import { VerificationType } from '../enums/verification-type.enum';

export class VerificationAlreadyPassedException extends DomainException {
  public readonly httpStatus = HttpStatus.CONFLICT;

  constructor(type: VerificationType) {
    super(
      `${type} verification has already been completed for this user`,
      'VERIFICATION_ALREADY_PASSED',
    );
    this.name = 'VerificationAlreadyPassedException';
  }
}
