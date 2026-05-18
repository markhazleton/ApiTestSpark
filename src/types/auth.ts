// OAuth Token Types

export interface AuthTokenRequest {
  grant_type: 'password';
  client_id: string;
  client_secret: string;
  username: string;
  password: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  'as:client_id': string;
  RefreshTokenLifeTime: string;
  Id: string;
  EPID: string;
  BQAMemberships: string;
  userName: string;
  Surname: string;
  GivenName: string;
  Email: string;
  Roles: string;
  Logins: string;
  TwoFactorAvailable: string;
  TwoFactorEnabled: string;
  TwoFactorConfig: string;
  '.issued': string;
  '.expires': string;
}
