# Identity Application Layer

Implements CQRS: every use case is either a **Command** (write, via
`@nestjs/cqrs` `CommandHandler`) or a **Query** (read, via
`QueryHandler`). Handlers orchestrate domain objects and ports — they
contain no business rules themselves, only coordination.

## Commands

| Command                    | Responsibility                                          |
|------------------------------|----------------------------------------------------------|
| `RegisterUserCommand`         | Create a new customer account                             |
| `LoginCommand`                 | Authenticate and issue an access/refresh token pair        |
| `RefreshAccessTokenCommand`     | Rotate a refresh token for a new access token               |
| `LogoutCommand`                  | Revoke a session's refresh token family                      |
| `ChangePasswordCommand`           | Change password and revoke all other sessions                 |

## Queries

| Query                    | Responsibility                        |
|----------------------------|------------------------------------------|
| `GetUserByIdQuery`           | Internal/admin user lookup               |
| `GetUserProfileQuery`         | Self-service "my profile" read model    |

## Ports

- `ITokenService` (`ports/token.service.interface.ts`) — JWT signing/
  verification and opaque refresh-token generation/hashing, implemented
  in `infrastructure/services/jwt-token.service.ts`.

## DTOs

Request/response contracts validated with `class-validator`, consumed
by `presentation/controllers`.
