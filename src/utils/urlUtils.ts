/**
 * URL joining helpers.
 *
 * Guards against double slashes when a base URL (often user-configured with a
 * trailing slash) is combined with an endpoint path (often starting with a
 * leading slash from an OpenAPI import).
 */

/** Join a base URL and a path, collapsing any redundant slashes at the seam. */
export function joinUrl(base: string, path: string): string {
  const trimmedBase = (base ?? '').replace(/\/+$/, '');
  const trimmedPath = (path ?? '').replace(/^\/+/, '');
  if (!trimmedPath) return trimmedBase || '/';
  return `${trimmedBase}/${trimmedPath}`;
}
