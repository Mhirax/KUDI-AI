export class MarkNotificationReadCommand {
  constructor(
    readonly notificationId: string,
    readonly requestingUserId: string,
  ) {}
}
