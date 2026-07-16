// API clients barrel export
export {
  ApiClient,
  RequestAbortedError,
  executeRequest,
  createRestCaller,
} from "./client";
export type {
  ApiClientOptions,
  ApiClientCallbacks,
  ApiRequestConfig,
  HttpMethod,
  RestCallerOptions,
} from "./client";
export { createJokeApiCaller, JOKE_API_BASE_URL } from "./jokeApiClient";
export {
  createJsonPlaceholderCaller,
  JSON_PLACEHOLDER_BASE_URL,
} from "./jsonPlaceholderClient";
export { HostApiClient } from "./hostApiClient";
export { acquireOAuthToken } from "./oauthTokenClient";
export type { AcquireOAuthTokenParams } from "./oauthTokenClient";
export { createRemoteOpenApiCaller } from "./remoteOpenApiClient";
