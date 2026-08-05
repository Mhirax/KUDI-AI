export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
  };
}
