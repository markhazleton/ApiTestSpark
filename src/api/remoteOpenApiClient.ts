import { createRestCaller } from "./client";
import type { ApiClientCallbacks } from "./client";
import type { RemoteApiProfile } from "../types";

function buildProfileHeaders(profile: RemoteApiProfile): Record<string, string> {
  const headers: Record<string, string> = { ...(profile.remoteDefaultHeaders ?? {}) };
  if (profile.remoteOpenApiApiKeyHeader && profile.remoteOpenApiApiKeyValue) {
    headers[profile.remoteOpenApiApiKeyHeader] = profile.remoteOpenApiApiKeyValue;
  }
  if (profile.remoteOpenApiBearerToken) {
    headers.Authorization = `Bearer ${profile.remoteOpenApiBearerToken}`;
  }
  return headers;
}

export function createRemoteOpenApiCaller(callbacks: ApiClientCallbacks) {
  const caller = createRestCaller(window.location.origin, { callbacks });
  return {
    fetchRemoteSpec: (profileId?: string) => {
      const query = profileId ? `?profileId=${encodeURIComponent(profileId)}` : '';
      return caller.get<unknown>(`/api-test-spark/remote-spec${query}`);
    },
  };
}

export function createBrowserRemoteOpenApiCaller(profile: RemoteApiProfile, callbacks: ApiClientCallbacks) {
  if (!profile.remoteOpenApiUrl) {
    throw new Error('Remote OpenAPI URL is not configured.');
  }

  const specUrl = new URL(profile.remoteOpenApiUrl);
  const caller = createRestCaller(specUrl.origin, {
    callbacks,
    extraHeaders: buildProfileHeaders(profile),
  });

  return {
    fetchRemoteSpec: () => caller.get<unknown>(`${specUrl.pathname}${specUrl.search}${specUrl.hash}`),
  };
}
