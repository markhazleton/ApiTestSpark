export interface CurlArgs {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

export function buildCurl(args: CurlArgs): string {
  const lines: string[] = [`curl -X ${args.method} "${args.url}"`];
  for (const [k, v] of Object.entries(args.headers)) {
    lines.push(`  -H "${k}: ${v}"`);
  }
  if (args.body !== undefined) {
    lines.push(`  -d '${JSON.stringify(args.body)}'`);
  }
  return lines.join(' \\\n');
}
