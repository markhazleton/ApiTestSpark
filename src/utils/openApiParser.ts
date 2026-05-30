import type {
  ApiInfo,
  DiscoveredEndpoint,
  EndpointParameter,
  OpenApiV3Doc,
  OpenApiV3Operation,
  ResponseCode,
  ResolvedSchema,
} from '../types';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
type HttpMethod = typeof HTTP_METHODS[number];

/** Resolve a $ref like "#/components/schemas/Product" to its raw schema object. */
function resolveRef(ref: string, doc: OpenApiV3Doc): unknown | null {
  const parts = ref.replace(/^#\//, '').split('/');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = doc;
  for (const part of parts) {
    if (node == null || typeof node !== 'object') return null;
    node = node[part];
  }
  return node ?? null;
}

/** Recursively resolve a raw schema node, following $ref and oneOf/anyOf once per level. */
function resolveSchema(raw: unknown, doc: OpenApiV3Doc, depth = 0): ResolvedSchema | null {
  if (depth > 5 || raw == null || typeof raw !== 'object') return null;
  const node = raw as Record<string, unknown>;

  if ('$ref' in node && typeof node['$ref'] === 'string') {
    return resolveSchema(resolveRef(node['$ref'], doc), doc, depth + 1);
  }

  const combiner = node['oneOf'] ?? node['anyOf'];
  if (Array.isArray(combiner)) {
    // For oneOf/anyOf, pick the first non-null branch (handles .NET 10 nullable wrappers)
    for (const branch of combiner) {
      const resolved = resolveSchema(branch, doc, depth + 1);
      if (resolved !== null) return resolved;
    }
    return null;
  }

  const result: ResolvedSchema = {};

  // Normalise type — .NET 10 emits nullable as ["null", "string"]
  const rawType = node['type'];
  if (typeof rawType === 'string') {
    if (rawType === 'null') return null; // bare null type — skip
    result.type = rawType;
  } else if (Array.isArray(rawType)) {
    const nonNull = (rawType as string[]).filter((t) => t !== 'null');
    result.type = nonNull[0] ?? 'string';
    if ((rawType as string[]).includes('null')) result.nullable = true;
  }

  if (typeof node['format'] === 'string')      result.format      = node['format'];
  if (typeof node['description'] === 'string') result.description = node['description'];
  if (node['example'] !== undefined)           result.example     = node['example'];
  if (node['default'] !== undefined)           result.default     = node['default'];
  if (node['nullable'] === true)               result.nullable    = true;
  if (Array.isArray(node['enum']))             result.enum        = node['enum'] as string[];
  if (Array.isArray(node['required']))         result.required    = node['required'] as string[];
  if (typeof node['minimum'] === 'number')     result.minimum     = node['minimum'];
  if (typeof node['maximum'] === 'number')     result.maximum     = node['maximum'];
  if (typeof node['minLength'] === 'number')   result.minLength   = node['minLength'];
  if (typeof node['maxLength'] === 'number')   result.maxLength   = node['maxLength'];

  if (node['properties'] != null && typeof node['properties'] === 'object') {
    result.properties = {};
    for (const [key, val] of Object.entries(node['properties'] as Record<string, unknown>)) {
      const resolved = resolveSchema(val, doc, depth + 1);
      if (resolved) result.properties[key] = resolved;
    }
  }

  if (node['items'] != null) {
    const resolved = resolveSchema(node['items'], doc, depth + 1);
    if (resolved) result.items = resolved;
  }

  return result;
}

/**
 * Build a JSON scaffold string from a resolved schema.
 * Priority order for each field value: example → default → enum[0] → type-based placeholder.
 */
export function buildJsonScaffold(schema: ResolvedSchema | null): string {
  if (!schema?.properties) return '{}';
  const obj: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (prop.example !== undefined) {
      obj[key] = prop.example;
    } else if (prop.default !== undefined) {
      obj[key] = prop.default;
    } else if (prop.enum?.length) {
      obj[key] = prop.enum[0];
    } else if (prop.type === 'object' && prop.properties) {
      // Recursively scaffold nested objects
      try { obj[key] = JSON.parse(buildJsonScaffold(prop)); } catch { obj[key] = {}; }
    } else if (prop.type === 'array' && prop.items?.properties) {
      try { obj[key] = [JSON.parse(buildJsonScaffold(prop.items))]; } catch { obj[key] = []; }
    } else {
      switch (prop.type) {
        case 'integer':
        case 'number':  obj[key] = 0; break;
        case 'boolean': obj[key] = false; break;
        case 'array':   obj[key] = []; break;
        case 'object':  obj[key] = {}; break;
        default:        obj[key] = prop.nullable ? null : '';
      }
    }
  }
  return JSON.stringify(obj, null, 2);
}

function normaliseType(raw: string | string[] | undefined): string {
  if (!raw) return 'string';
  if (typeof raw === 'string') return raw;
  return raw.find((t) => t !== 'null') ?? 'string';
}

function parseOperation(
  method: HttpMethod,
  path: string,
  op: OpenApiV3Operation,
  doc: OpenApiV3Doc,
): DiscoveredEndpoint {
  const parameters: EndpointParameter[] = (op.parameters ?? []).map((p) => ({
    name: p.name,
    in: (['path', 'query', 'header', 'cookie'].includes(p.in)
      ? p.in
      : 'query') as EndpointParameter['in'],
    required: p.required ?? false,
    schema: {
      type: normaliseType(p.schema?.type),
      format: p.schema?.format,
      enum: p.schema?.enum,
      minimum: p.schema?.minimum,
      maximum: p.schema?.maximum,
      minLength: p.schema?.minLength,
      maxLength: p.schema?.maxLength,
      default: p.schema?.default,
      nullable: Array.isArray(p.schema?.type)
        ? (p.schema?.type as string[]).includes('null')
        : (p.schema?.nullable ?? false),
    },
    description: p.description ?? '',
    example: p.example != null ? String(p.example) : undefined,
  }));

  let requestBodySchema: ResolvedSchema | null = null;
  const requestBodyRequired = op.requestBody?.required ?? false;
  const requestBodyDescription = op.requestBody?.description ?? '';
  if (op.requestBody?.content) {
    const firstContent = Object.values(op.requestBody.content)[0];
    if (firstContent?.schema) {
      requestBodySchema = resolveSchema(firstContent.schema, doc);
    }
  }

  // Parse all documented response codes, sorted numerically
  const responseCodes: ResponseCode[] = [];
  let responseSchema: ResolvedSchema | null = null;

  if (op.responses) {
    for (const [status, resp] of Object.entries(op.responses)) {
      let schema: ResolvedSchema | null = null;
      if (resp?.content) {
        const firstContent = Object.values(resp.content)[0];
        if (firstContent?.schema) {
          schema = resolveSchema(firstContent.schema, doc);
        }
      }
      responseCodes.push({ status, description: resp?.description ?? '', schema });
      if ((status === '200' || status === '201') && schema) {
        responseSchema = schema;
      }
    }
    responseCodes.sort((a, b) => Number(a.status) - Number(b.status));
  }

  const operationId = op.operationId ?? '';

  return {
    method: method.toUpperCase() as DiscoveredEndpoint['method'],
    path,
    operationId,
    summary: op.summary ?? (operationId || `${method.toUpperCase()} ${path}`),
    description: op.description ?? '',
    deprecated: op.deprecated ?? false,
    tags: op.tags ?? [],
    parameters,
    requestBodySchema,
    requestBodyRequired,
    requestBodyDescription,
    responseSchema,
    responseCodes,
  };
}

export function parseOpenApiV3(doc: OpenApiV3Doc): DiscoveredEndpoint[] {
  if (!doc.openapi?.startsWith('3.')) return [];
  if (!doc.paths || typeof doc.paths !== 'object') return [];

  const endpoints: DiscoveredEndpoint[] = [];

  for (const [path, pathItem] of Object.entries(doc.paths)) {
    if (!pathItem) continue;
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!op) continue;
      try {
        endpoints.push(parseOperation(method, path, op, doc));
      } catch {
        // Skip malformed operations — never throw from the parser
      }
    }
  }

  return endpoints;
}

/** Extract API metadata from the OpenAPI info block. */
export function parseApiInfo(doc: OpenApiV3Doc): ApiInfo {
  return {
    title: doc.info.title,
    version: doc.info.version,
    description: doc.info.description,
    contactName: doc.info.contact?.name,
    contactUrl: doc.info.contact?.url,
    contactEmail: doc.info.contact?.email,
    licenseName: doc.info.license?.name,
    licenseUrl: doc.info.license?.url,
  };
}
