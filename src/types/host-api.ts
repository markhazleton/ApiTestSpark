export interface HarnessConfig {
  baseUrl: string;
  openApiUrl: string | null;
  authScheme: 'Bearer' | 'ApiKey' | 'Basic' | null;
  defaultHeaders: Record<string, string>;
}

/** Metadata from the OpenAPI info block, surfaced in the UI header. */
export interface ApiInfo {
  title: string;
  version: string;
  description?: string;
  contactName?: string;
  contactUrl?: string;
}

export interface EndpointParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema: { type: string; format?: string; enum?: string[]; minimum?: number; maximum?: number; minLength?: number; maxLength?: number };
  description: string;
  example?: string;
}

/** A single documented response code with its description and optional schema. */
export interface ResponseCode {
  status: string;
  description: string;
  schema: ResolvedSchema | null;
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
  /** All documented response codes for this operation. */
  responseCodes: ResponseCode[];
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
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
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
    schema?: { type?: string | string[]; format?: string; enum?: string[]; pattern?: string; minimum?: number; maximum?: number; minLength?: number; maxLength?: number };
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
  info: { title: string; version: string; description?: string; contact?: { name?: string; url?: string } };
  paths: Record<string, OpenApiV3PathItem>;
  components?: {
    schemas?: Record<string, unknown>;
  };
}
