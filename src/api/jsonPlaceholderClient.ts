import { createRestCaller } from "./client";
import type { ApiClientCallbacks } from "./client";
import type {
  Post,
  User,
  Todo,
  CreatePostRequest,
} from "../types/json-placeholder";
import { SECTION_CONFIGS } from "../config";

/** Single source of truth — defined in src/config/sections.ts. */
export const JSON_PLACEHOLDER_BASE_URL =
  SECTION_CONFIGS.jsonplaceholder.baseUrl;

/** Create a caller for JSONPlaceholder. All requests are captured in the debug panel.
 *  Pass baseUrl to override the default (e.g. from the config store). */
export function createJsonPlaceholderCaller(callbacks: ApiClientCallbacks, baseUrl = JSON_PLACEHOLDER_BASE_URL) {
  const caller = createRestCaller(baseUrl, { callbacks });
  return {
    getPosts: (id?: number) =>
      caller.get<Post[] | Post>(id !== undefined ? `/posts/${id}` : "/posts"),
    getUsers: (id?: number) =>
      caller.get<User[] | User>(id !== undefined ? `/users/${id}` : "/users"),
    getTodos: (id?: number) =>
      caller.get<Todo[] | Todo>(id !== undefined ? `/todos/${id}` : "/todos"),
    createPost: (payload: CreatePostRequest) =>
      caller.post<Post>("/posts", payload),
  };
}
