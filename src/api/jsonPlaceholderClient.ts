import { ApiClient } from './client';
import type { ApiClientOptions } from './client';
import type { Post, User, Todo, CreatePostRequest } from '../types/json-placeholder';

export const JSON_PLACEHOLDER_BASE_URL = 'https://jsonplaceholder.typicode.com';

/**
 * JSONPlaceholder client
 * Extends the generic ApiClient — all requests are captured in the debug panel.
 * Base URL: https://jsonplaceholder.typicode.com (no auth required)
 */
export class JsonPlaceholderClient extends ApiClient {
  constructor(options: ApiClientOptions = {}) {
    super(JSON_PLACEHOLDER_BASE_URL, '', options);
  }

  /** Fetch all posts or a single post by ID. */
  getPosts(): Promise<Post[]>;
  getPosts(id: number): Promise<Post>;
  getPosts(id?: number): Promise<Post[] | Post> {
    return this.get<Post[] | Post>(id !== undefined ? `/posts/${id}` : '/posts');
  }

  /** Fetch all users or a single user by ID. */
  getUsers(): Promise<User[]>;
  getUsers(id: number): Promise<User>;
  getUsers(id?: number): Promise<User[] | User> {
    return this.get<User[] | User>(id !== undefined ? `/users/${id}` : '/users');
  }

  /** Fetch all todos or a single todo by ID. */
  getTodos(): Promise<Todo[]>;
  getTodos(id: number): Promise<Todo>;
  getTodos(id?: number): Promise<Todo[] | Todo> {
    return this.get<Todo[] | Todo>(id !== undefined ? `/todos/${id}` : '/todos');
  }

  /** Create a new post (synthetic — JSONPlaceholder does not persist changes). */
  createPost(payload: CreatePostRequest): Promise<Post> {
    return this.post<Post>('/posts', payload);
  }
}
