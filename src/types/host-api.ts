export interface HarnessConfig {
  baseUrl: string;
  openApiUrl: string | null;
  authScheme: 'Bearer' | 'ApiKey' | 'Basic' | null;
  defaultHeaders: Record<string, string>;
}

export interface EndpointParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema: { type: string; format?: string; enum?: string[] };
  description: string;
}

export interface DiscoveredEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  tags: string[];
  parameters: EndpointParameter[];
  requestBodySchema: unknown | null;
  responseSchema: unknown | null;
}

export interface OpenApiV3Operation {
  summary?: string;
  operationId?: string;
  tags?: string[];
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    schema?: { type: string; format?: string; enum?: string[] };
    description?: string;
  }>;
  requestBody?: {
    content?: Record<string, { schema?: unknown }>;
  };
  responses?: Record<string, { content?: Record<string, { schema?: unknown }> }>;
}

export type OpenApiV3PathItem = {
  [method in 'get' | 'post' | 'put' | 'patch' | 'delete']?: OpenApiV3Operation;
};

export interface OpenApiV3Doc {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, OpenApiV3PathItem>;
  components?: {
    schemas?: Record<string, unknown>;
  };
}
