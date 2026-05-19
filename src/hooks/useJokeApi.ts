import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { createJokeApiCaller } from "../api/jokeApiClient";
import { useDebugStore, useUnifiedConfigStore } from "../store";
import type { JokeFilters, JokeResponse } from "../types/joke-api";
import { withMetric, buildDebugCallbacks } from "./hookUtils";

export function useJokeApi() {
  const { addRequest, addResponse, addError, addMetric } = useDebugStore();
  const [lastJoke, setLastJoke] = useState<JokeResponse | null>(null);

  const createClient = useCallback(() => {
    const { baseUrl } = useUnifiedConfigStore
      .getState()
      .getSectionConfig("jokeapi");
    return createJokeApiCaller(
      buildDebugCallbacks(addRequest, addResponse, addError),
      baseUrl,
    );
  }, [addRequest, addResponse, addError]);

  const fetchJoke = useMutation({
    mutationFn: (filters: JokeFilters) =>
      withMetric("JokeAPI/getJoke", addMetric, () =>
        createClient().getJoke(filters),
      ),
    onSuccess: (data) => setLastJoke(data),
  });

  const ping = useMutation({
    mutationFn: () =>
      withMetric("JokeAPI/ping", addMetric, () => createClient().ping()),
  });

  return { fetchJoke, ping, lastJoke };
}
