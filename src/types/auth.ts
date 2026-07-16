// OAuth Token Types

/**
 * Response from an OAuth2 token endpoint. Only access_token/token_type/expires_in are
 * guaranteed by the OAuth2 spec (RFC 6749); additional identity-provider-specific fields
 * (e.g. ASP.NET Identity's `.issued`/`as:client_id`) may be present but are not required
 * or read by this tool.
 */
export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  [key: string]: unknown;
}
