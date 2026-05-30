import { useState } from 'react';
import type { DiscoveredEndpoint, EndpointParameter, ResponseCode, ResolvedSchema } from '../../types';
import { useHostApi } from '../../hooks';
import { useHarnessConfigStore } from '../../store';
import { buildJsonScaffold } from '../../utils/openApiParser';
import { renderMarkdown } from '../../utils/renderMarkdown';

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-blue-100 text-blue-800',
  POST:   'bg-green-100 text-green-800',
  PUT:    'bg-yellow-100 text-yellow-800',
  PATCH:  'bg-orange-100 text-orange-800',
  DELETE: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, string> = {
  '2': 'bg-green-50 text-green-700 border-green-200',
  '4': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  '5': 'bg-red-50 text-red-700 border-red-200',
};

interface EndpointTesterProps {
  endpoint: DiscoveredEndpoint;
}

// ── Parameter field ───────────────────────────────────────────────────────────

function ParamField({
  param,
  value,
  onChange,
}: {
  param: EndpointParameter;
  value: string;
  onChange: (v: string) => void;
}) {
  const labelId = `param-${param.in}-${param.name}`;
  // Use example → default → type as placeholder
  const placeholder = param.example
    ?? (param.schema.default != null ? String(param.schema.default) : undefined)
    ?? param.schema.type;

  const constraints: string[] = [];
  if (param.schema.minimum != null)   constraints.push(`min ${param.schema.minimum}`);
  if (param.schema.maximum != null)   constraints.push(`max ${param.schema.maximum}`);
  if (param.schema.minLength != null) constraints.push(`≥${param.schema.minLength} chars`);
  if (param.schema.maxLength != null) constraints.push(`≤${param.schema.maxLength} chars`);
  if (param.schema.nullable)          constraints.push('nullable');

  // Pre-fill default value on first render if field is empty
  const effectiveValue = value !== '' ? value
    : (param.schema.default != null ? String(param.schema.default) : value);

  return (
    <div>
      <label htmlFor={labelId} className="text-xs font-semibold text-gray-600 flex items-center gap-1 flex-wrap mb-1">
        <span className="font-mono">{param.name}</span>
        {param.required && <span className="text-red-500">*</span>}
        <span className="text-gray-400 font-normal">({param.in})</span>
        {param.schema.format && (
          <span className="text-purple-400 font-normal font-mono text-[10px]">{param.schema.format}</span>
        )}
        {constraints.map((c) => (
          <span key={c} className="text-gray-300 font-normal font-mono text-[10px] bg-gray-50 px-1 rounded">{c}</span>
        ))}
      </label>
      {param.description && (
        <p className="text-xs text-gray-400 mb-1 leading-relaxed">{param.description}</p>
      )}
      {param.schema.enum?.length ? (
        <select
          id={labelId}
          value={effectiveValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
        >
          {!param.required && <option value="">— optional —</option>}
          {param.schema.enum.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      ) : param.schema.type === 'boolean' ? (
        <select
          id={labelId}
          value={effectiveValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
        >
          {!param.required && <option value="">— optional —</option>}
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <input
          id={labelId}
          type={param.schema.type === 'integer' || param.schema.type === 'number' ? 'number' : 'text'}
          value={effectiveValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      )}
    </div>
  );
}

// ── Schema property table ─────────────────────────────────────────────────────

function SchemaTable({ schema, title }: { schema: ResolvedSchema; title: string }) {
  const props = schema.type === 'array' && schema.items?.properties
    ? schema.items.properties
    : schema.properties;
  const required = schema.type === 'array'
    ? (schema.items?.required ?? [])
    : (schema.required ?? []);
  const schemaDesc = schema.type === 'array'
    ? schema.items?.description
    : schema.description;

  if (!props) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-1">
        {title}
        <span className="font-normal text-gray-400 ml-1">
          ({schema.type === 'array' ? 'array of objects' : 'object'})
        </span>
      </p>
      {schemaDesc && (
        <p className="text-xs text-gray-400 italic mb-1">{schemaDesc}</p>
      )}
      <div className="border border-gray-100 rounded overflow-hidden text-xs">
        {Object.entries(props).map(([key, prop]) => {
          const isRequired = required.includes(key);
          const isNullable = prop.nullable ?? false;
          const constraints: string[] = [];
          if (prop.minimum != null)   constraints.push(`≥${prop.minimum}`);
          if (prop.maximum != null)   constraints.push(`≤${prop.maximum}`);
          if (prop.minLength != null) constraints.push(`min ${prop.minLength} chars`);
          if (prop.maxLength != null) constraints.push(`max ${prop.maxLength} chars`);

          const typeLabel = prop.format
            ? `${prop.type ?? ''}(${prop.format})`
            : (prop.type ?? 'any');

          return (
            <div key={key} className="flex items-baseline gap-2 px-2 py-1.5 even:bg-gray-50 border-b border-gray-50 last:border-0">
              <span className="font-mono text-blue-700 shrink-0 w-28 truncate" title={key}>{key}</span>
              <span className="text-gray-400 font-mono shrink-0 text-[10px]">{typeLabel}</span>
              {isRequired && (
                <span className="text-red-400 shrink-0 text-[10px] font-semibold">required</span>
              )}
              {isNullable && !isRequired && (
                <span className="text-gray-300 shrink-0 text-[10px] font-mono">nullable</span>
              )}
              {prop.default !== undefined && (
                <span className="text-amber-500 shrink-0 text-[10px] font-mono">
                  default: {JSON.stringify(prop.default)}
                </span>
              )}
              {constraints.map((c) => (
                <span key={c} className="text-gray-300 shrink-0 text-[10px] font-mono">{c}</span>
              ))}
              {prop.enum && (
                <span className="text-purple-400 shrink-0 text-[10px] font-mono truncate max-w-24" title={prop.enum.join(' | ')}>
                  {prop.enum.join(' | ')}
                </span>
              )}
              {prop.description && (
                <span className="text-gray-400 truncate text-[11px]" title={prop.description}>
                  {prop.description}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Response code badges ──────────────────────────────────────────────────────

function ResponseCodeBadges({ codes }: { codes: ResponseCode[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!codes.length) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-1.5">Documented responses</p>
      <div className="flex flex-wrap gap-1.5">
        {codes.map((rc) => {
          const colorKey = rc.status[0] as keyof typeof STATUS_COLORS;
          const colorClass = STATUS_COLORS[colorKey] ?? 'bg-gray-50 text-gray-600 border-gray-200';
          const isOpen = expanded === rc.status;

          return (
            <div key={rc.status} className="flex flex-col">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : rc.status)}
                className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${colorClass} hover:opacity-80 transition-opacity`}
                title={rc.schema ? `${rc.description} — click to expand schema` : rc.description}
              >
                {rc.status}
                {rc.description && (
                  <span className="font-normal ml-1 text-[10px] opacity-70">{rc.description}</span>
                )}
                {rc.schema && <span className="ml-1 opacity-50 text-[9px]">▾</span>}
              </button>
              {isOpen && rc.schema && (
                <div className="mt-1 ml-1">
                  <SchemaTable schema={rc.schema} title={`${rc.status} response schema`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Response renderer ─────────────────────────────────────────────────────────

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function ResponseObjectForm({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  const [fields, setFields] = useState<Record<string, string>>(() =>
    Object.fromEntries(entries.map(([k, v]) => [k, v == null ? '' : String(v)]))
  );
  const [copied, setCopied] = useState(false);

  function copyJson() {
    const out = Object.fromEntries(
      entries.map(([k]) => {
        const orig = data[k];
        const str = fields[k];
        if (orig == null) return [k, null];
        if (typeof orig === 'number') return [k, Number(str)];
        if (typeof orig === 'boolean') return [k, str === 'true'];
        return [k, str];
      })
    );
    navigator.clipboard.writeText(JSON.stringify(out, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="border border-gray-200 rounded overflow-hidden text-xs">
      <div className="bg-gray-50 border-b border-gray-200 px-3 py-1.5 flex items-center justify-between">
        <span className="text-gray-500 font-semibold">Response object</span>
        <button type="button" onClick={copyJson} className="text-blue-600 hover:text-blue-800 text-xs underline">
          {copied ? 'Copied!' : 'Copy as JSON'}
        </button>
      </div>
      {entries.map(([key]) => {
        const orig = data[key];
        const isObj = typeof orig === 'object' && orig !== null;
        const isBool = typeof orig === 'boolean';
        return (
          <div key={key} className="flex items-center gap-3 px-3 py-1.5 even:bg-gray-50 border-b border-gray-100 last:border-0">
            <label className="font-mono font-semibold text-blue-700 shrink-0 w-28 truncate" title={key} htmlFor={`resp-${key}`}>
              {key}
            </label>
            {isObj ? (
              <span className="font-mono text-gray-500 truncate text-[10px]">{JSON.stringify(orig)}</span>
            ) : isBool ? (
              <select
                id={`resp-${key}`}
                value={fields[key]}
                onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
                className="flex-1 font-mono border border-gray-200 rounded px-2 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                id={`resp-${key}`}
                type={typeof orig === 'number' ? 'number' : 'text'}
                value={fields[key]}
                onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
                className="flex-1 font-mono border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            )}
          </div>
        );
      })}
      <p className="text-gray-400 px-3 py-1 border-t border-gray-100">Full JSON in debug panel</p>
    </div>
  );
}

function ResponseView({ data }: { data: unknown }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  if (Array.isArray(data) && data.length > 0 && isPlainObject(data[0])) {
    const rows = data as Record<string, unknown>[];
    const cols = Object.keys(rows[0]);
    const sorted = sortKey
      ? [...rows].sort((a, b) => {
          const av = a[sortKey], bv = b[sortKey];
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
          return sortAsc ? cmp : -cmp;
        })
      : rows;

    function toggleSort(col: string) {
      if (sortKey === col) setSortAsc((a) => !a);
      else { setSortKey(col); setSortAsc(true); }
    }

    return (
      <div className="overflow-auto border border-gray-200 rounded text-xs">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {cols.map((col) => (
                <th
                  key={col}
                  onClick={() => toggleSort(col)}
                  className="px-3 py-1.5 text-left font-semibold text-gray-600 font-mono whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                >
                  {col}
                  {sortKey === col && <span className="ml-1 text-blue-500">{sortAsc ? '↑' : '↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0 even:bg-gray-50 hover:bg-blue-50 transition-colors">
                {cols.map((col) => {
                  const val = row[col];
                  const display = val == null ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
                  return (
                    <td key={col} className="px-3 py-1.5 font-mono text-gray-700 whitespace-nowrap max-w-50 truncate" title={display}>
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-gray-400 px-3 py-1 border-t border-gray-100">
          {rows.length} {rows.length === 1 ? 'row' : 'rows'} — full JSON in debug panel
        </p>
      </div>
    );
  }

  if (Array.isArray(data) && data.length === 0) {
    return <p className="text-xs text-gray-400 italic">Empty array — no rows returned.</p>;
  }

  if (isPlainObject(data)) {
    return <ResponseObjectForm data={data as Record<string, unknown>} />;
  }

  return (
    <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto max-h-40 font-mono border border-gray-100">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function EndpointTester({ endpoint }: EndpointTesterProps) {
  const { config } = useHarnessConfigStore();
  const { mutate, isPending, data, error } = useHostApi();
  const [copied, setCopied] = useState(false);

  const needsBody = ['POST', 'PUT', 'PATCH'].includes(endpoint.method);
  const [pathParams, setPathParams]   = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [authToken, setAuthToken]     = useState('');
  const [bodyText, setBodyText]       = useState(() =>
    needsBody ? buildJsonScaffold(endpoint.requestBodySchema) : ''
  );

  const pathParamList  = endpoint.parameters.filter((p) => p.in === 'path');
  const queryParamList = endpoint.parameters.filter((p) => p.in === 'query');

  function handleFire() {
    const extraHeaders: Record<string, string> = {};
    if (authToken && config?.authScheme) {
      extraHeaders['Authorization'] = `${config.authScheme} ${authToken}`;
    }
    let body: unknown;
    if (needsBody && bodyText.trim()) {
      try { body = JSON.parse(bodyText); } catch { body = bodyText; }
    }
    mutate({ method: endpoint.method, path: endpoint.path, pathParams, queryParams, body, extraHeaders });
  }

  function copyOperationId() {
    navigator.clipboard.writeText(endpoint.operationId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="p-4 space-y-4">

      {/* ── Header: method + path + operationId ── */}
      <div className="flex items-start gap-2 flex-wrap">
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0 ${METHOD_COLORS[endpoint.method] ?? 'bg-gray-100 text-gray-800'}`}>
          {endpoint.method}
        </span>
        <span className="text-sm font-mono text-gray-800 break-all flex-1">{endpoint.path}</span>
        {endpoint.deprecated && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium shrink-0">deprecated</span>
        )}
      </div>

      {/* ── operationId — copyable identifier ── */}
      {endpoint.operationId && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-mono">operationId</span>
          <button
            type="button"
            onClick={copyOperationId}
            title="Click to copy operationId"
            className="text-[11px] font-mono text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            {endpoint.operationId}
          </button>
          {copied && <span className="text-[10px] text-green-600">copied!</span>}
        </div>
      )}

      {/* ── Deprecated warning ── */}
      {endpoint.deprecated && (
        <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-700">
          This endpoint is marked deprecated and may be removed in a future version.
        </div>
      )}

      {/* ── Summary ── */}
      {endpoint.summary && endpoint.summary !== `${endpoint.method} ${endpoint.path}` && (
        <p className="text-sm font-semibold text-gray-800">{endpoint.summary}</p>
      )}

      {/* ── Description — full markdown renderer ── */}
      {endpoint.description && (
        <div className="text-xs space-y-1">
          {renderMarkdown(endpoint.description)}
        </div>
      )}

      {/* ── Response codes ── */}
      {endpoint.responseCodes.length > 0 && (
        <ResponseCodeBadges codes={endpoint.responseCodes} />
      )}

      {/* ── Default headers from config ── */}
      {config?.defaultHeaders && Object.keys(config.defaultHeaders).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">Default headers (from harness config)</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(config.defaultHeaders).map(([k, v]) => (
              <span key={k} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                {k}: {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Auth token ── */}
      {config?.authScheme && (
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">
            {config.authScheme} token
          </label>
          <input
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Enter token…"
            className="w-full text-xs font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      )}

      {/* ── Path parameters ── */}
      {pathParamList.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500">Path parameters</p>
          {pathParamList.map((p) => (
            <ParamField
              key={p.name}
              param={p}
              value={pathParams[p.name] ?? ''}
              onChange={(v) => setPathParams((prev) => ({ ...prev, [p.name]: v }))}
            />
          ))}
        </div>
      )}

      {/* ── Query parameters ── */}
      {queryParamList.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500">Query parameters</p>
          {queryParamList.map((p) => (
            <ParamField
              key={p.name}
              param={p}
              value={queryParams[p.name] ?? ''}
              onChange={(v) => setQueryParams((prev) => ({ ...prev, [p.name]: v }))}
            />
          ))}
        </div>
      )}

      {/* ── Request body ── */}
      {needsBody && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-600">
              Request body (JSON)
              {endpoint.requestBodyRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            {endpoint.requestBodySchema?.properties && (
              <button
                type="button"
                onClick={() => setBodyText(buildJsonScaffold(endpoint.requestBodySchema))}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                reset scaffold
              </button>
            )}
          </div>

          {/* requestBody.description from the OpenAPI spec */}
          {endpoint.requestBodyDescription && (
            <p className="text-xs text-gray-400 mb-1.5 italic">{endpoint.requestBodyDescription}</p>
          )}

          {/* Schema property chips with type annotation */}
          {endpoint.requestBodySchema?.properties && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {Object.entries(endpoint.requestBodySchema.properties).map(([key, prop]) => (
                <span
                  key={key}
                  title={[prop.description, prop.type, prop.format].filter(Boolean).join(' · ')}
                  className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded font-mono cursor-default"
                >
                  {key}
                  {endpoint.requestBodySchema?.required?.includes(key) && (
                    <span className="text-red-400 ml-0.5">*</span>
                  )}
                  {prop.type && (
                    <span className="text-blue-400 ml-1 opacity-70">
                      {prop.format ? `${prop.type}(${prop.format})` : prop.type}
                    </span>
                  )}
                  {prop.default !== undefined && (
                    <span className="text-amber-400 ml-1 opacity-70">={JSON.stringify(prop.default)}</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Full schema table */}
          {endpoint.requestBodySchema && (
            <div className="mb-2">
              <SchemaTable schema={endpoint.requestBodySchema} title="Request body schema" />
            </div>
          )}

          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder="{}"
            title="Request body JSON"
            className="w-full text-xs font-mono border border-gray-200 rounded px-2 py-1.5 resize-y focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      )}

      {/* ── Send button ── */}
      <button
        onClick={handleFire}
        disabled={isPending}
        type="button"
        className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Sending…' : 'Send Request'}
      </button>

      {/* ── Error ── */}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded p-2 font-mono">
          {error instanceof Error ? error.message : 'Request failed'}
        </div>
      )}

      {/* ── Response ── */}
      {data !== undefined && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">Response</p>
          <ResponseView data={data} />
        </div>
      )}

      {/* ── Response schema hint (pre-request) ── */}
      {endpoint.responseSchema && data === undefined && (
        <SchemaTable schema={endpoint.responseSchema} title="Expected response schema" />
      )}

    </div>
  );
}
