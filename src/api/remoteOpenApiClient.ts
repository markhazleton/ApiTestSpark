import { createRestCaller } from "./client";
import type { ApiClientCallbacks } from "./client";

export function createRemoteOpenApiCaller(callbacks: ApiClientCallbacks) {
  const caller = createRestCaller(window.location.origin, { callbacks });
  return {
    fetchRemoteSpec: (profileId?: string) => {
      const query = profileId ? `?profileId=${encodeURIComponent(profileId)}` : '';
      return caller.get<unknown>(`/api-test-spark/remote-spec${query}`);
    },
  };
}
