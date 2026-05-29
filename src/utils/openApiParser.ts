import type { DiscoveredEndpoint, EndpointParameter, OpenApiV3Doc, OpenApiV3Operation } from '../types';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
type HttpMethod = typeof HTTP_METHODS[number];

function parseOperation(
  method: HttpMethod,
  path: string,
  op: OpenApiV3Operation,
): DiscoveredEndpoint {
  const parameters: EndpointParameter[] = (op.parameters ?? []).map((p) => ({
    name: p.name,
    in: (['path', 'query', 'header', 'cookie'].includes(p.in)
      ? p.in
      : 'query') as EndpointParameter['in'],
    required: p.required ?? false,
    schema: p.schema ?? { type: 'string' },
    description: p.description ?? '',
  }));

  // Resolve requestBody schema from first content type — skip $ref (not dereferenced in v1)
  let requestBodySchema: unknown = null;
  if (op.requestBody?.content) {
    const firstContent = Object.values(op.requestBody.content)[0];
    if (firstContent?.schema && !('$ref' in (firstContent.schema as object))) {
      requestBodySchema = firstContent.schema;
    }
  }

  // Resolve 200/201 response schema — skip $ref
  let responseSchema: unknown = null;
  const successResponse = op.responses?.['200'] ?? op.responses?.['201'];
  if (successResponse?.content) {
    const firstContent = Object.values(successResponse.content)[0];
    if (firstContent?.schema && !('$ref' in (firstContent.schema as object))) {
      responseSchema = firstContent.schema;
    }
  }

  return {
    method: method.toUpperCase() as DiscoveredEndpoint['method'],
    path,
    summary: op.summary ?? op.operationId ?? `${method.toUpperCase()} ${path}`,
    tags: op.tags ?? [],
    parameters,
    requestBodySchema,
    responseSchema,
  };
}

export function parseOpenApiV3(doc: OpenApiV3Doc): DiscoveredEndpoint[] {
  // Reject non-v3 documents
  if (!doc.openapi?.startsWith('3.')) {
    return [];
  }

  if (!doc.paths || typeof doc.paths !== 'object') {
    // Caller should log a warning via useDebugStore when this returns empty
    return [];
  }

  const endpoints: DiscoveredEndpoint[] = [];

  for (const [path, pathItem] of Object.entries(doc.paths)) {
    if (!pathItem) continue;
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!op) continue;
      try {
        endpoints.push(parseOperation(method, path, op));
      } catch {
        // Skip malformed operations — never throw from the parser
      }
    }
  }

  return endpoints;
}
