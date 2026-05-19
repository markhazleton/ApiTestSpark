import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { createJsonPlaceholderCaller } from "../api/jsonPlaceholderClient";
import { useDebugStore } from "../store";
import type { CreatePostRequest } from "../types/json-placeholder";

export function useJsonPlaceholder() {
  const { addRequest, addResponse, addError, addMetric } = useDebugStore();

  const createClient = useCallback(
    () =>
      createJsonPlaceholderCaller({
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
      }),
    [addRequest, addResponse, addError],
  );

  const fetchPosts = useMutation({
    mutationFn: async (id: number | undefined) => {
      const start = performance.now();
      const client = createClient();
      try {
        const result =
          id !== undefined
            ? await client.getPosts(id)
            : await client.getPosts();
        addMetric({
          apiName: "JSONPlaceholder/getPosts",
          duration: performance.now() - start,
          timestamp: new Date(),
          isSuccess: true,
        });
        return result;
      } catch (err) {
        addMetric({
          apiName: "JSONPlaceholder/getPosts",
          duration: performance.now() - start,
          timestamp: new Date(),
          isSuccess: false,
          errorMessage: err instanceof Error ? err.message : "Unknown",
        });
        throw err;
      }
    },
  });

  const fetchUsers = useMutation({
    mutationFn: async (id: number | undefined) => {
      const start = performance.now();
      const client = createClient();
      try {
        const result =
          id !== undefined
            ? await client.getUsers(id)
            : await client.getUsers();
        addMetric({
          apiName: "JSONPlaceholder/getUsers",
          duration: performance.now() - start,
          timestamp: new Date(),
          isSuccess: true,
        });
        return result;
      } catch (err) {
        addMetric({
          apiName: "JSONPlaceholder/getUsers",
          duration: performance.now() - start,
          timestamp: new Date(),
          isSuccess: false,
          errorMessage: err instanceof Error ? err.message : "Unknown",
        });
        throw err;
      }
    },
  });

  const fetchTodos = useMutation({
    mutationFn: async (id: number | undefined) => {
      const start = performance.now();
      const client = createClient();
      try {
        const result =
          id !== undefined
            ? await client.getTodos(id)
            : await client.getTodos();
        addMetric({
          apiName: "JSONPlaceholder/getTodos",
          duration: performance.now() - start,
          timestamp: new Date(),
          isSuccess: true,
        });
        return result;
      } catch (err) {
        addMetric({
          apiName: "JSONPlaceholder/getTodos",
          duration: performance.now() - start,
          timestamp: new Date(),
          isSuccess: false,
          errorMessage: err instanceof Error ? err.message : "Unknown",
        });
        throw err;
      }
    },
  });

  const createPost = useMutation({
    mutationFn: async (payload: CreatePostRequest) => {
      const start = performance.now();
      const client = createClient();
      try {
        const result = await client.createPost(payload);
        addMetric({
          apiName: "JSONPlaceholder/createPost",
          duration: performance.now() - start,
          timestamp: new Date(),
          isSuccess: true,
        });
        return result;
      } catch (err) {
        addMetric({
          apiName: "JSONPlaceholder/createPost",
          duration: performance.now() - start,
          timestamp: new Date(),
          isSuccess: false,
          errorMessage: err instanceof Error ? err.message : "Unknown",
        });
        throw err;
      }
    },
  });

  return { fetchPosts, fetchUsers, fetchTodos, createPost };
}
