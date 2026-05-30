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
  example?: string;
}

export interface DiscoveredEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  deprecated: boolean;
  tags: string[];
  parameters: EndpointParameter[];
  requestBodySchema: ResolvedSchema | null;
  requestBodyRequired: boolean;
  responseSchema: ResolvedSchema | null;
}

/** A fully-dereferenced schema node — $ref links resolved inline from components/schemas. */
export interface ResolvedSchema {
  type?: string;
  format?: string;
  properties?: Record<string, ResolvedSchema>;
  required?: string[];
  items?: ResolvedSchema;
  enum?: string[];
  description?: string;
  example?: unknown;
}

// ── Raw OpenAPI v3 shapes (parser-internal) ───────────────────────────────────

export interface OpenApiV3Operation {
  summary?: string;
  description?: string;
  operationId?: string;
  deprecated?: boolean;
  tags?: string[];
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    schema?: { type?: string | string[]; format?: string; enum?: string[]; pattern?: string };
    description?: string;
    example?: unknown;
  }>;
  requestBody?: {
    required?: boolean;
    description?: string;
    content?: Record<string, { schema?: unknown }>;
  };
  responses?: Record<string, { description?: string; content?: Record<string, { schema?: unknown }> }>;
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
