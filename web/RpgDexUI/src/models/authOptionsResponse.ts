export interface AuthOptionsResponse {
  hasPassword: string;
  externalProviders: string[];
  isTwoFactorEnabled: boolean;
}
