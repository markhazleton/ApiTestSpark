# Data Model: Portable NuGet Package for API Test Harness

**Feature**: `001-nuget-portable-harness` | **Date**: 2026-05-29

## TypeScript Entities (`src/types/host-api.ts`)

### HarnessConfig

Runtime configuration fetched from the host app's config endpoint on SPA startup.

```typescript
interface HarnessConfig {
  baseUrl: string;           // Host app base URL (e.g. "https://localhost:5000")
  openApiUrl: string | null; // Relative or absolute URL to OpenAPI v3 JSON; null if not configured
  authScheme: 'Bearer' | 'ApiKey' | 'Basic' | null;
  defaultHeaders: Record<string, string>; // Always present; empty object if none configured
}
```

**Validation rules**:

- `baseUrl` must be non-empty; SPA derives it from `window.location.origin` as fallback
- `openApiUrl` null → "Your App's APIs" section hidden, no parse attempt
- `defaultHeaders` injected into every request made to host app endpoints

### DiscoveredEndpoint

A single API endpoint parsed from the host app's OpenAPI v3 document.

```typescript
interface DiscoveredEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;              // e.g. "/api/products/{id}"
  summary: string;           // From OpenAPI operationId or summary field
  tags: string[];            // For grouping in UI; empty array if none
  parameters: EndpointParameter[];
  requestBodySchema: unknown | null; // Dereferenced JSON Schema fragment or null
  responseSchema: unknown | null;    // 200/201 response schema fragment or null
}

interface EndpointParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema: { type: string; format?: string; enum?: string[] };
  description: string;
}
```

**Lifecycle**: Created by `openApiParser.ts` on successful OpenAPI v3 document fetch. Stored in `harnessConfigStore`. Replaced on each re-fetch. Never persisted to localStorage.

### OpenApiV3Doc

Minimal TypeScript shape for the subset of OpenAPI v3 JSON the parser reads.

```typescript
interface OpenApiV3Doc {
  openapi: string;            // Must start with "3." — v2 rejected
  info: { title: string; version: string };
  paths: Record<string, OpenApiV3PathItem>;
  components?: {
    schemas?: Record<string, unknown>;
  };
}

type OpenApiV3PathItem = {
  [method in 'get' | 'post' | 'put' | 'patch' | 'delete']?: OpenApiV3Operation;
};

interface OpenApiV3Operation {
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
```

## .NET Entities (`WebSpark.ApiTestHarness/`)

### HarnessOptions (`ApiTestHarnessOptions.cs`)

Configuration object provided by the host app at `MapApiTestHarness()` registration time.

```csharp
public class ApiTestHarnessOptions
{
    /// <summary>Relative or absolute URL to the OpenAPI v3 JSON document.</summary>
    public string? OpenApiUrl { get; set; } = "/openapi.json";

    /// <summary>Auth scheme advertised to the SPA. Never a token value.</summary>
    public string? AuthScheme { get; set; }

    /// <summary>Default headers injected into every SPA request to host endpoints.</summary>
    public Dictionary<string, string> DefaultHeaders { get; set; } = new();

    /// <summary>
    /// Environments in which the harness is active. Empty = all environments.
    /// Example: ["Development", "Staging"]
    /// </summary>
    public string[] Environments { get; set; } = [];

    /// <summary>
    /// When true, emits ILogger.LogDebug for every static asset request and SPA fallback.
    /// Default: false. Use ILogger category "WebSpark.ApiTestHarness" to filter independently.
    /// Alternatively set Logging:LogLevel:WebSpark.ApiTestHarness=Debug in appsettings at runtime.
    /// </summary>
    public bool EnableVerboseLogging { get; set; } = false;

    /// <summary>
    /// Additional origins allowed to call the config endpoint, beyond same-origin.
    /// Default: empty (same-origin only). Use for local dev when SPA and API run on different ports
    /// (e.g., Vite dev server on :5151 and .NET on :5000).
    /// Example: ["http://localhost:5151"]
    /// </summary>
    public string[] CorsOrigins { get; set; } = [];
}
```

**Constraints**:

- `DefaultHeaders` values MUST NOT contain actual tokens or secrets — only header name/value metadata safe for browser exposure
- `Environments` empty array means always active; host app is responsible for not registering the harness in production if desired

### ConfigResponse (anonymous DTO)

Serialized as the JSON response body from `GET /api-test-harness/config`. Derived from `HarnessOptions` at request time — never persisted.

```csharp
// Returned as anonymous object from MapGet handler
new {
    BaseUrl    = $"{request.Scheme}://{request.Host}",
    OpenApiUrl = options.OpenApiUrl,
    AuthScheme = options.AuthScheme,
    DefaultHeaders = options.DefaultHeaders
}
```

## Zustand Store: harnessConfigStore (`src/store/harnessConfigStore.ts`)

Holds the resolved `HarnessConfig` and the list of `DiscoveredEndpoint[]` after the startup fetch sequence completes.

```typescript
interface HarnessConfigState {
  config: HarnessConfig | null;
  endpoints: DiscoveredEndpoint[];
  configStatus: 'idle' | 'loading' | 'ready' | 'error';
  openApiStatus: 'idle' | 'loading' | 'ready' | 'error' | 'skipped';
  configError: string | null;
  openApiError: string | null;

  // Actions
  setConfig: (config: HarnessConfig) => void;
  setEndpoints: (endpoints: DiscoveredEndpoint[]) => void;
  setConfigStatus: (status: HarnessConfigState['configStatus']) => void;
  setOpenApiStatus: (status: HarnessConfigState['openApiStatus']) => void;
  setConfigError: (error: string | null) => void;
  setOpenApiError: (error: string | null) => void;
}
```

**Persistence**: Not persisted to localStorage — config is always re-fetched fresh on app load.

**FIFO limits**: No buffer limits needed — this store holds a single config object, not a history buffer.
