import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

/**
 * Raised when a state transition is attempted from a terminal status
 * (SUCCESSFUL/FAILED/REVERSED) — e.g. a duplicate or out-of-order
 * webhook confirming an already-settled transfer a second time.
 */
export class InvalidTransferStateException extends DomainException {
  public readonly httpStatus = HttpStatus.CONFLICT;

  constructor(transferId: string, currentStatus: string, attemptedAction: string) {
    super(
      `Cannot ${attemptedAction} transfer ${transferId}: it is already ${currentStatus}`,
      'INVALID_TRANSFER_STATE',
    );
    this.name = 'InvalidTransferStateException';
  }
}
