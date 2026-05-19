import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { createJokeApiCaller } from "../api/jokeApiClient";
import { useDebugStore, useUnifiedConfigStore } from "../store";
import type { JokeFilters, JokeResponse } from "../types/joke-api";

export function useJokeApi() {
  const { addRequest, addResponse, addError, addMetric } = useDebugStore();
  const [lastJoke, setLastJoke] = useState<JokeResponse | null>(null);

  const createClient = useCallback(
    () => {
      const { baseUrl } = useUnifiedConfigStore.getState().getSectionConfig("jokeapi");
      return createJokeApiCaller(
        {
          onRequest: addRequest,
          onResponse: addResponse,
          onError: (err) =>
            addError({
              id: err.id ?? uuidv4(),
              category: err.category,
              message: err.message,
              timestamp: err.timestamp,
              context: err.context ?? {},
            }),
        },
        baseUrl,
      );
    },
    [addRequest, addResponse, addError],
  );

  const fetchJoke = useMutation({
    mutationFn: async (filters: JokeFilters) => {
      const start = performance.now();
      const client = createClient();
      try {
        const joke = await client.getJoke(filters);
        addMetric({
          apiName: "JokeAPI/getJoke",
          duration: performance.now() - start,
          timestamp: new Date(),
          isSuccess: true,
        });
        return joke;
      } catch (err) {
        addMetric({
          apiName: "JokeAPI/getJoke",
          duration: performance.now() - start,
          timestamp: new Date(),
          isSuccess: false,
          errorMessage: err instanceof Error ? err.message : "Unknown",
        });
        throw err;
      }
    },
    onSuccess: (data) => setLastJoke(data),
  });

  const ping = useMutation({
    mutationFn: async () => {
      const start = performance.now();
      const client = createClient();
      try {
        const res = await client.ping();
        addMetric({
          apiName: "JokeAPI/ping",
          duration: performance.now() - start,
          timestamp: new Date(),
          isSuccess: true,
        });
        return res;
      } catch (err) {
        addMetric({
          apiName: "JokeAPI/ping",
          duration: performance.now() - start,
          timestamp: new Date(),
          isSuccess: false,
          errorMessage: err instanceof Error ? err.message : "Unknown",
        });
        throw err;
      }
    },
  });

  return { fetchJoke, ping, lastJoke };
}
