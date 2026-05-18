// JSONPlaceholder types  (https://jsonplaceholder.typicode.com)

export type JsonPlaceholderResourceType = 'posts' | 'users' | 'todos';

// ── Post ─────────────────────────────────────────────────────────────────────

export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

export interface CreatePostRequest {
  title: string;
  body: string;
  userId: number;
}

// ── User ─────────────────────────────────────────────────────────────────────

export interface Geo {
  lat: string;
  lng: string;
}

export interface UserAddress {
  street: string;
  suite: string;
  city: string;
  zipcode: string;
  geo: Geo;
}

export interface UserCompany {
  name: string;
  catchPhrase: string;
  bs: string;
}

/** All fields contain synthetic/fake lorem-ipsum data — no real PII. */
export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  address: UserAddress;
  phone: string;
  website: string;
  company: UserCompany;
}

// ── Todo ─────────────────────────────────────────────────────────────────────

export interface Todo {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
}
