import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { createJsonPlaceholderCaller } from "../api/jsonPlaceholderClient";
import { useDebugStore, useUnifiedConfigStore } from "../store";
import type { CreatePostRequest } from "../types/json-placeholder";
import { withMetric, buildDebugCallbacks } from "./hookUtils";

export function useJsonPlaceholder() {
  const { addRequest, addResponse, addError, addMetric } = useDebugStore();

  const createClient = useCallback(() => {
    const { baseUrl } = useUnifiedConfigStore
      .getState()
      .getSectionConfig("jsonplaceholder");
    return createJsonPlaceholderCaller(
      buildDebugCallbacks(addRequest, addResponse, addError),
      baseUrl,
    );
  }, [addRequest, addResponse, addError]);

  const fetchPosts = useMutation({
    mutationFn: (id: number | undefined) =>
      withMetric("JSONPlaceholder/getPosts", addMetric, () =>
        createClient().getPosts(id),
      ),
  });

  const fetchUsers = useMutation({
    mutationFn: (id: number | undefined) =>
      withMetric("JSONPlaceholder/getUsers", addMetric, () =>
        createClient().getUsers(id),
      ),
  });

  const fetchTodos = useMutation({
    mutationFn: (id: number | undefined) =>
      withMetric("JSONPlaceholder/getTodos", addMetric, () =>
        createClient().getTodos(id),
      ),
  });

  const createPost = useMutation({
    mutationFn: (payload: CreatePostRequest) =>
      withMetric("JSONPlaceholder/createPost", addMetric, () =>
        createClient().createPost(payload),
      ),
  });

  return { fetchPosts, fetchUsers, fetchTodos, createPost };
}
