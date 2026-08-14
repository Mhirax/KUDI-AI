export class SubmitNinVerificationCommand {
  constructor(
    readonly userId: string,
    readonly nin: string,
  ) {}
}
