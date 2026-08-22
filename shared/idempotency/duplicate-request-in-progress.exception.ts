import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../exceptions/domain.exception';

/**
 * Thrown when a request arrives with an idempotency key that's
 * currently mid-execution under a different (or the same, genuinely
 * concurrent) request — e.g. a double-tap or a client retrying before
 * the first attempt's response even arrived. The caller should not
 * retry immediately; the original request is still being processed.
 */
export class DuplicateRequestInProgressException extends DomainException {
  public readonly httpStatus = HttpStatus.CONFLICT;

  constructor() {
    super(
      'A request with this idempotency key is already being processed',
      'DUPLICATE_REQUEST_IN_PROGRESS',
    );
    this.name = 'DuplicateRequestInProgressException';
  }
}
