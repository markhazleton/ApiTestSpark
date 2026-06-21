import type { EndpointParameter } from '../types';

export function getParameterValue(
  parameter: EndpointParameter,
  values: Record<string, string>,
): string {
  const supplied = values[parameter.name]?.trim();
  if (supplied) return supplied;

  return parameter.schema.default != null ? String(parameter.schema.default) : '';
}

export function getMissingRequiredPathParameters(
  parameters: EndpointParameter[],
  values: Record<string, string>,
): string[] {
  return parameters
    .filter((parameter) => parameter.in === 'path' && parameter.required)
    .filter((parameter) => !getParameterValue(parameter, values))
    .map((parameter) => parameter.name);
}

export function resolvePathParameters(
  path: string,
  parameters: EndpointParameter[],
  values: Record<string, string>,
): string {
  let resolved = path;
  for (const parameter of parameters) {
    if (parameter.in !== 'path') continue;

    const value = getParameterValue(parameter, values);
    if (value) {
      resolved = resolved.replace(`{${parameter.name}}`, encodeURIComponent(value));
    }
  }
  return resolved;
}
