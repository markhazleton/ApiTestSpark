import { createRestCaller } from './client';
import type { ApiClientCallbacks } from './client';
import type { Post, User, Todo, CreatePostRequest } from '../types/json-placeholder';

export const JSON_PLACEHOLDER_BASE_URL = 'https://jsonplaceholder.typicode.com';

/** Create a caller for JSONPlaceholder. All requests are captured in the debug panel. */
export function createJsonPlaceholderCaller(callbacks: ApiClientCallbacks) {
  const caller = createRestCaller(JSON_PLACEHOLDER_BASE_URL, { callbacks });
  return {
    getPosts: (id?: number) =>
      caller.get<Post[] | Post>(id !== undefined ? `/posts/${id}` : '/posts'),
    getUsers: (id?: number) =>
      caller.get<User[] | User>(id !== undefined ? `/users/${id}` : '/users'),
    getTodos: (id?: number) =>
      caller.get<Todo[] | Todo>(id !== undefined ? `/todos/${id}` : '/todos'),
    createPost: (payload: CreatePostRequest) =>
      caller.post<Post>('/posts', payload),
  };
}
