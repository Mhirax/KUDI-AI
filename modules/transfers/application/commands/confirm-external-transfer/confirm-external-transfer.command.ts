export class ConfirmExternalTransferCommand {
  constructor(
    readonly providerReference: string,
    readonly isSuccessful: boolean,
    readonly failureReason: string | null,
  ) {}
}
