export class SubmitBvnVerificationCommand {
  constructor(
    readonly userId: string,
    readonly bvn: string,
  ) {}
}
