export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  twoFactorEnabled: boolean;
  email: string;
}
