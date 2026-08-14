export class RefreshAccessTokenCommand {
  constructor(
    readonly refreshToken: string,
    readonly ipAddress: string | null,
    readonly userAgent: string | null,
  ) {}
}
