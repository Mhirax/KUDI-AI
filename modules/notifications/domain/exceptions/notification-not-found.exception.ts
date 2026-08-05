import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../../shared/exceptions/domain.exception';

export class NotificationNotFoundException extends DomainException {
  public override readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(notificationId: string) {
    super(`Notification ${notificationId} not found`, 'NOTIFICATION_NOT_FOUND');
  }
}
