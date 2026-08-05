export class RegisterUserCommand {
  constructor(
    readonly email: string,
    readonly phoneNumber: string,
    readonly password: string,
    readonly firstName: string,
    readonly lastName: string,
  ) {}
}
