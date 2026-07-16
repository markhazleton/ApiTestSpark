export type RemoteApiProfileSource = 'server' | 'browser';
export type RemoteProxyMode = 'server' | 'browser';

export interface RemoteApiProfile {
  id: string;
  name: string;
  description?: string;
  remoteBaseUrl?: string;
  remoteOpenApiUrl?: string;
  remoteOpenApiApiKeyHeader?: string;
  remoteOpenApiApiKeyValue?: string;
  remoteOpenApiBearerToken?: string;
  remoteOpenApiApiKeyConfigured?: boolean;
  remoteOpenApiBearerTokenConfigured?: boolean;
  /** True when this profile's OAuth token acquisition is configured server-side (Program.cs).
   * The client secret and acquired token never reach the browser; this is a read-only indicator. */
  remoteOAuthConfigured?: boolean;
  /** When true, requests use the active Environment's OAuth-derived token instead of remoteOpenApiBearerToken. */
  remoteUseOAuthToken?: boolean;
  /** Server-configured profiles use the same-origin remote call proxy when true. */
  remoteCallProxyEnabled?: boolean;
  remoteDefaultHeaders: Record<string, string>;
  source: RemoteApiProfileSource;
  proxyMode: RemoteProxyMode;
}

export interface HarnessConfig {
  baseUrl: string;
  openApiUrl: string | null;
  authScheme: 'Bearer' | 'ApiKey' | 'Basic' | null;
  defaultHeaders: Record<string, string>;
  enableDemoIntegrations: boolean;
  /** Authenticated user's resolved display name, if available. */
  userName?: string;
  /** Authenticated user's resolved email or UPN, if available. */
  userEmail?: string;
  /** Authenticated user's stable identifier, if available. */
  userId?: string;
  /** NuGet package version of the embedded harness, e.g. "1.2.0". */
  harnessVersion?: string;
  /** ISO-8601 build timestamp baked into the assembly at pack time. */
  harnessBuiltAt?: string;
}

/**
 * Wire format returned by /api-test-spark/config.
 *
 * Remote fields are used only to hydrate the independent remote-profile store;
 * they are deliberately excluded from the host API runtime configuration.
 */
export interface HarnessBootstrapConfig extends HarnessConfig {
  remoteDefaultHeaders?: Record<string, string>;
  remoteBaseUrl?: string;
  remoteOpenApiUrl?: string;
  remoteOpenApiApiKeyHeader?: string;
  remoteOpenApiApiKeyValue?: string;
  remoteOpenApiBearerToken?: string;
  remoteApiProfiles?: RemoteApiProfile[];
}

/** Metadata from the OpenAPI info block, surfaced in the UI header. */
export interface ApiInfo {
  title: string;
  version: string;
  description?: string;
  contactName?: string;
  contactUrl?: string;
  contactEmail?: string;
  licenseName?: string;
  licenseUrl?: string;
}

export interface EndpointParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema: {
    type: string;
    format?: string;
    enum?: string[];
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    default?: unknown;
    nullable?: boolean;
  };
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
  operationId: string;
  summary: string;
  description: string;
  deprecated: boolean;
  tags: string[];
  parameters: EndpointParameter[];
  requestBodySchema: ResolvedSchema | null;
  requestBodyRequired: boolean;
  requestBodyDescription: string;
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
  default?: unknown;
  nullable?: boolean;
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
    schema?: {
      type?: string | string[];
      format?: string;
      enum?: string[];
      pattern?: string;
      minimum?: number;
      maximum?: number;
      minLength?: number;
      maxLength?: number;
      default?: unknown;
      nullable?: boolean;
    };
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
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: { name?: string; url?: string; email?: string };
    license?: { name?: string; url?: string };
  };
  paths: Record<string, OpenApiV3PathItem>;
  components?: {
    schemas?: Record<string, unknown>;
  };
}
