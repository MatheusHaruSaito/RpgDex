export interface JwtPayload {
  sub: string;
  unique_name: string;
  email: string;
  jti: string;
  exp: number;
  iss: string;
  aud: string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string | string[];
  age_status: string;
}
