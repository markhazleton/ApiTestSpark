/**
 * OAuth Token Client
 *
 * Builds and sends client_credentials / password grant token requests through the shared
 * executeRequest pipeline (Constitution IV — no raw fetch outside executeRequest).
 *
 * Security: request bodies contain client_secret/user_client_secret/password in plaintext
 * (required by the OAuth2 form-urlencoded grant format). Before those bodies reach the debug
 * callbacks (which the debug panel and Application Insights consume), this module replaces the
 * secret values with a redaction marker — see gates/critic.md critic-001. The real, unredacted
 * body is still sent to the actual token endpoint.
 */
import { executeRequest } from "./client";
import type { ApiClientCallbacks } from "./client";
import type { AuthConfigSet, OAuthGrantType } from "../types/state";

const TOKEN_REQUEST_TIMEOUT_MS = 20_000;
const REDACTED = "***redacted***";
const SECRET_FIELDS = new Set(["client_secret", "password"]);

function buildTokenRequestBody(config: AuthConfigSet, grantType: OAuthGrantType): URLSearchParams {
  const body = new URLSearchParams();
  if (grantType === "client_credentials") {
    body.set("grant_type", "client_credentials");
    body.set("client_id", config.clientId);
    body.set("client_secret", config.clientSecret);
  } else {
    const effectiveClientId = config.userClientId?.trim() || config.clientId;
    const effectiveClientSecret = config.userClientSecret?.trim() || config.clientSecret;
    body.set("grant_type", "password");
    body.set("client_id", effectiveClientId);
    if (effectiveClientSecret) body.set("client_secret", effectiveClientSecret);
    body.set("username", config.testUsername ?? "");
    body.set("password", config.testPassword ?? "");
  }
  return body;
}

function redactTokenRequestBody(body: URLSearchParams): Record<string, string> {
  const redacted: Record<string, string> = {};
  body.forEach((value, key) => {
    redacted[key] = SECRET_FIELDS.has(key) ? REDACTED : value;
  });
  return redacted;
}

export interface AcquireOAuthTokenParams {
  config: AuthConfigSet;
  grantType: OAuthGrantType;
  callbacks?: ApiClientCallbacks;
}

/**
 * Acquires an OAuth2 access token via client_credentials or password grant.
 * Returns the parsed JSON token response (see AuthTokenResponse).
 */
export async function acquireOAuthToken<T>({
  config,
  grantType,
  callbacks,
}: AcquireOAuthTokenParams): Promise<T> {
  const body = buildTokenRequestBody(config, grantType);

  const redactedCallbacks: ApiClientCallbacks | undefined = callbacks && {
    ...callbacks,
    onRequest: callbacks.onRequest
      ? (request) => callbacks.onRequest?.({ ...request, body: redactTokenRequestBody(body) })
      : undefined,
  };

  return executeRequest<T>({
    method: "POST",
    url: config.baseUrl,
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    callbacks: redactedCallbacks,
    contentType: "form",
    timeoutMs: TOKEN_REQUEST_TIMEOUT_MS,
  });
}
