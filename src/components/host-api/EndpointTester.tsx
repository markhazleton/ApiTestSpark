import { useState } from 'react';
import type { DiscoveredEndpoint, EndpointParameter, RemoteApiProfile, ResponseCode, ResolvedSchema } from '../../types';
import { useHostApi } from '../../hooks';
import { useHarnessConfigStore, useDebugStore } from '../../store';
import { buildJsonScaffold } from '../../utils/openApiParser';
import { renderMarkdown } from '../../utils/renderMarkdown';
import { buildCurl } from '../../utils';
import type { CurlArgs } from '../../utils';

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
  remoteProfile?: RemoteApiProfile;
}

// ── T005: JSONPath helper ─────────────────────────────────────────────────────

function toJsonPath(parentKey: string | null, fieldKey: string, inArray = false): string {
  if (inArray) {
    return parentKey ? `$.${parentKey}[*].${fieldKey}` : `$[*].${fieldKey}`;
  }
  return parentKey ? `$.${parentKey}.${fieldKey}` : `$.${fieldKey}`;
}

// ── Clipboard helper (critic-002: guard against non-HTTPS contexts) ───────────

function copyToClipboard(text: string, addError: (e: { id: string; category: 'Unknown'; message: string; timestamp: Date; context: Record<string, unknown> }) => void): void {
  if (!navigator?.clipboard) {
    addError({ id: crypto.randomUUID(), category: 'Unknown', message: 'Clipboard unavailable', timestamp: new Date(), context: {} });
    return;
  }
  navigator.clipboard.writeText(text).catch(() =>
    addError({ id: crypto.randomUUID(), category: 'Unknown', message: 'Copy failed', timestamp: new Date(), context: {} })
  );
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
  const placeholder = param.example
    ?? (param.schema.default != null ? String(param.schema.default) : undefined)
    ?? param.schema.type;

  const constraints: string[] = [];
  if (param.schema.minimum != null)   constraints.push(`min ${param.schema.minimum}`);
  if (param.schema.maximum != null)   constraints.push(`max ${param.schema.maximum}`);
  if (param.schema.minLength != null) constraints.push(`≥${param.schema.minLength} chars`);
  if (param.schema.maxLength != null) constraints.push(`≤${param.schema.maxLength} chars`);
  if (param.schema.nullable)          constraints.push('nullable');

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

// ── T006: SortableTable inner function (also used for nested arrays) ──────────

function SortableTable({
  rows,
  parentKey = null,
  addError,
}: {
  rows: Record<string, unknown>[];
  parentKey?: string | null;
  addError: (e: { id: string; category: 'Unknown'; message: string; timestamp: Date; context: Record<string, unknown> }) => void;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  // T029: 2-row default; resets on each render (local state, not store)
  const [tableExpanded, setTableExpanded] = useState(false);

  if (rows.length === 0) {
    return <p className="text-xs text-gray-400 italic">Empty array — no rows returned.</p>;
  }

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

  const visibleRows = tableExpanded ? sorted : sorted.slice(0, 2);

  return (
    <div className="overflow-auto border border-gray-200 rounded text-xs">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {cols.map((col) => {
              const jsonPath = toJsonPath(parentKey, col, true);
              return (
                <th
                  key={col}
                  onClick={() => toggleSort(col)}
                  title={`${jsonPath} — double-click to copy path`}
                  className="px-3 py-1.5 text-left font-semibold text-gray-600 font-mono whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                  onDoubleClick={() => copyToClipboard(jsonPath, addError)}
                >
                  {col}
                  {sortKey === col && <span className="ml-1 text-blue-500">{sortAsc ? '↑' : '↓'}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, i) => (
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
      {/* T030: Show all / Show less controls */}
      <div className="px-3 py-1 border-t border-gray-100 flex items-center justify-between">
        <p className="text-gray-400">
          {rows.length} {rows.length === 1 ? 'row' : 'rows'} — full JSON in debug panel
        </p>
        {rows.length > 2 && (
          <button
            type="button"
            onClick={() => setTableExpanded((e) => !e)}
            className="text-blue-600 hover:text-blue-800 text-xs underline shrink-0 ml-2"
          >
            {tableExpanded ? 'Show less' : `Show all ${rows.length} items`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── T007–T013: ResponseObjectForm with editable nested objects ────────────────

function ResponseObjectForm({
  data,
  jsonViewMode,
  addError,
}: {
  data: Record<string, unknown>;
  jsonViewMode: 'pretty' | 'minified';
  addError: (e: { id: string; category: 'Unknown'; message: string; timestamp: Date; context: Record<string, unknown> }) => void;
}) {
  const entries = Object.entries(data);

  // critic-001: state is initialised from data on mount. Reset on new data is handled by
  // the parent passing key={responseKey} to force a remount (not useEffect setState).
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const [k, v] of entries) {
      if (!isPlainObject(v) && !Array.isArray(v)) {
        init[k] = v == null ? '' : String(v);
      }
    }
    return init;
  });
  const [nestedFields, setNestedFields] = useState<Record<string, Record<string, string>>>({});
  const [copied, setCopied] = useState(false);

  function copyJson() {
    // T010: reconstruct with nested edits merged in
    const seen = new WeakSet<object>();
    const out: Record<string, unknown> = {};
    for (const [k, orig] of entries) {
      if (isPlainObject(orig)) {
        // T011: circular reference guard
        if (seen.has(orig)) { out[k] = '[Circular reference detected]'; continue; }
        seen.add(orig);
        const nested = nestedFields[k] ?? {};
        const rebuilt: Record<string, unknown> = {};
        for (const [nk, nv] of Object.entries(orig)) {
          const edited = nested[nk];
          if (edited !== undefined) {
            const origNv = nv;
            if (origNv == null) { rebuilt[nk] = null; }
            else if (typeof origNv === 'number') { rebuilt[nk] = Number(edited); }
            else if (typeof origNv === 'boolean') { rebuilt[nk] = edited === 'true'; }
            else { rebuilt[nk] = edited; }
          } else {
            rebuilt[nk] = nv;
          }
        }
        out[k] = rebuilt;
      } else if (orig == null) {
        out[k] = null;
      } else if (typeof orig === 'number') {
        out[k] = Number(fields[k]);
      } else if (typeof orig === 'boolean') {
        out[k] = fields[k] === 'true';
      } else {
        out[k] = fields[k] ?? orig;
      }
    }
    const text = jsonViewMode === 'minified'
      ? JSON.stringify(out)
      : JSON.stringify(out, null, 2);
    copyToClipboard(text, addError);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="border border-gray-200 rounded overflow-hidden text-xs">
      <div className="bg-gray-50 border-b border-gray-200 px-3 py-1.5 flex items-center justify-between">
        <span className="text-gray-500 font-semibold">Response object</span>
        <button type="button" onClick={copyJson} className="text-blue-600 hover:text-blue-800 text-xs underline">
          {copied ? 'Copied!' : 'Copy as JSON'}
        </button>
      </div>
      {entries.map(([key, orig]) => {
        // T033a: treat undefined same as null
        if (orig === undefined) {
          return (
            <div key={key} className="flex items-center gap-3 px-3 py-1.5 even:bg-gray-50 border-b border-gray-100 last:border-0">
              <span
                className="font-mono font-semibold text-blue-700 shrink-0 w-28 truncate cursor-pointer"
                title={toJsonPath(null, key)}
                onClick={() => copyToClipboard(toJsonPath(null, key), addError)}
              >{key}</span>
              <span className="font-mono text-gray-400 text-[10px] italic">undefined</span>
            </div>
          );
        }

        // T011: null top-level field — read-only
        if (orig === null) {
          return (
            <div key={key} className="flex items-center gap-3 px-3 py-1.5 even:bg-gray-50 border-b border-gray-100 last:border-0">
              <span
                className="font-mono font-semibold text-blue-700 shrink-0 w-28 truncate cursor-pointer"
                title={toJsonPath(null, key)}
                onClick={() => copyToClipboard(toJsonPath(null, key), addError)}
              >{key}</span>
              <span className="font-mono text-gray-400 italic text-[10px]">null</span>
            </div>
          );
        }

        // T008: nested array of objects — SortableTable (FR-003)
        if (Array.isArray(orig) && orig.length > 0 && isPlainObject(orig[0])) {
          return (
            <div key={key} className="px-3 py-1.5 border-b border-gray-100 last:border-0">
              <span
                className="font-mono font-semibold text-blue-700 text-xs cursor-pointer"
                title={`$.${key}[*]`}
                onClick={() => copyToClipboard(`$.${key}[*]`, addError)}
              >{key}</span>
              <div className="mt-1">
                <SortableTable rows={orig as Record<string, unknown>[]} parentKey={key} addError={addError} />
              </div>
            </div>
          );
        }

        // T008: nested plain object — collapsible editable form (FR-001, FR-012)
        if (isPlainObject(orig)) {
          // T011: circular reference guard
          const seen = new WeakSet<object>();
          seen.add(orig);
          const nestedEntries = Object.entries(orig);
          return (
            <div key={key} className="px-3 py-1.5 border-b border-gray-100 last:border-0">
              <details className="group">
                <summary
                  className="font-mono font-semibold text-blue-700 text-xs cursor-pointer list-none flex items-center gap-1"
                  title={toJsonPath(null, key)}
                  onClick={(e) => { if (e.detail === 2) { e.preventDefault(); copyToClipboard(toJsonPath(null, key), addError); } }}
                >
                  <span className="text-gray-400 group-open:rotate-90 transition-transform inline-block">▶</span>
                  {key}
                  <span className="text-gray-400 font-normal text-[10px]">({nestedEntries.length} fields)</span>
                </summary>
                <div className="mt-1 ml-2 border border-gray-100 rounded overflow-hidden">
                  {nestedEntries.map(([nk, nv]) => {
                    // T011: depth-2 circular guard
                    if (isPlainObject(nv) && seen.has(nv)) {
                      return (
                        <div key={nk} className="flex items-center gap-3 px-2 py-1 even:bg-gray-50 border-b border-gray-50 last:border-0">
                          <span className="font-mono text-blue-600 shrink-0 w-24 truncate text-[11px]">{nk}</span>
                          <span className="font-mono text-red-400 text-[10px] italic">[Circular reference detected]</span>
                        </div>
                      );
                    }
                    const jsonPath = toJsonPath(key, nk);
                    // T011: null nested field — read-only
                    if (nv === null || nv === undefined) {
                      return (
                        <div key={nk} className="flex items-center gap-3 px-2 py-1 even:bg-gray-50 border-b border-gray-50 last:border-0">
                          <label
                            className="font-mono text-blue-600 shrink-0 w-24 truncate text-[11px] cursor-pointer"
                            title={jsonPath}
                            onClick={() => copyToClipboard(jsonPath, addError)}
                          >{nk}</label>
                          <span className="font-mono text-gray-400 italic text-[10px]">{nv === null ? 'null' : 'undefined'}</span>
                        </div>
                      );
                    }
                    // FR-002: depth-2+ objects — read-only JSON
                    if (isPlainObject(nv) || Array.isArray(nv)) {
                      return (
                        <div key={nk} className="flex items-start gap-3 px-2 py-1 even:bg-gray-50 border-b border-gray-50 last:border-0">
                          <label
                            className="font-mono text-blue-600 shrink-0 w-24 truncate text-[11px] cursor-pointer"
                            title={jsonPath}
                            onClick={() => copyToClipboard(jsonPath, addError)}
                          >{nk}</label>
                          <span className="font-mono text-gray-500 truncate text-[10px]">{JSON.stringify(nv)}</span>
                        </div>
                      );
                    }
                    // Editable primitive
                    const isBool = typeof nv === 'boolean';
                    const curVal = nestedFields[key]?.[nk] ?? String(nv);
                    return (
                      <div key={nk} className="flex items-center gap-3 px-2 py-1 even:bg-gray-50 border-b border-gray-50 last:border-0">
                        <label
                          htmlFor={`resp-${key}-${nk}`}
                          className="font-mono text-blue-600 shrink-0 w-24 truncate text-[11px] cursor-pointer"
                          title={jsonPath}
                          onClick={() => copyToClipboard(jsonPath, addError)}
                        >{nk}</label>
                        {isBool ? (
                          <select
                            id={`resp-${key}-${nk}`}
                            value={curVal}
                            onChange={(e) => setNestedFields((nf) => ({ ...nf, [key]: { ...(nf[key] ?? {}), [nk]: e.target.value } }))}
                            className="flex-1 font-mono border border-gray-200 rounded px-2 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs"
                          >
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : (
                          <input
                            id={`resp-${key}-${nk}`}
                            type={typeof nv === 'number' ? 'number' : 'text'}
                            value={curVal}
                            onChange={(e) => setNestedFields((nf) => ({ ...nf, [key]: { ...(nf[key] ?? {}), [nk]: e.target.value } }))}
                            className="flex-1 font-mono border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>
          );
        }

        // Array of primitives — read-only JSON (FR-003)
        if (Array.isArray(orig)) {
          const jsonStr = jsonViewMode === 'minified' ? JSON.stringify(orig) : JSON.stringify(orig, null, 2);
          return (
            <div key={key} className="flex items-center gap-3 px-3 py-1.5 even:bg-gray-50 border-b border-gray-100 last:border-0">
              <span
                className="font-mono font-semibold text-blue-700 shrink-0 w-28 truncate cursor-pointer"
                title={toJsonPath(null, key)}
                onClick={() => copyToClipboard(toJsonPath(null, key), addError)}
              >{key}</span>
              <span className="font-mono text-gray-500 truncate text-[10px]">{jsonStr}</span>
            </div>
          );
        }

        // Editable primitive (existing behaviour, now with JSONPath tooltip)
        const isBool = typeof orig === 'boolean';
        const jsonPath = toJsonPath(null, key);
        return (
          <div key={key} className="flex items-center gap-3 px-3 py-1.5 even:bg-gray-50 border-b border-gray-100 last:border-0">
            <label
              className="font-mono font-semibold text-blue-700 shrink-0 w-28 truncate cursor-pointer"
              title={jsonPath}
              htmlFor={`resp-${key}`}
              onClick={() => copyToClipboard(jsonPath, addError)}
            >
              {key}
            </label>
            {isBool ? (
              <select
                id={`resp-${key}`}
                value={fields[key] ?? ''}
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
                value={fields[key] ?? ''}
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

// ── T018–T020: ResponseView with pretty/minified toggle ───────────────────────

function ResponseView({
  data,
  responseKey,
  addError,
}: {
  data: unknown;
  responseKey: number;
  addError: (e: { id: string; category: 'Unknown'; message: string; timestamp: Date; context: Record<string, unknown> }) => void;
}) {
  // T018: read from store — not local state — for session persistence (US5)
  const { jsonViewMode, setJsonViewMode } = useHarnessConfigStore();

  if (Array.isArray(data) && data.length > 0 && isPlainObject(data[0])) {
    // Array of objects — sortable table (no toggle — FR-007 excludes table views)
    return <SortableTable rows={data as Record<string, unknown>[]} addError={addError} />;
  }

  if (Array.isArray(data) && data.length === 0) {
    return <p className="text-xs text-gray-400 italic">Empty array — no rows returned.</p>;
  }

  if (isPlainObject(data)) {
    // critic-001 + M-01: responseKey counter forces remount on every new response (O(1))
    return <ResponseObjectForm key={responseKey} data={data as Record<string, unknown>} jsonViewMode={jsonViewMode} addError={addError} />;
  }

  // Scalar / complex fallback — pre block with toggle
  const jsonStr = jsonViewMode === 'minified'
    ? JSON.stringify(data)
    : JSON.stringify(data, null, 2);

  return (
    <div>
      <div className="flex items-center justify-end mb-1">
        <button
          type="button"
          onClick={() => setJsonViewMode(jsonViewMode === 'pretty' ? 'minified' : 'pretty')}
          className="text-[10px] text-gray-400 hover:text-gray-600 underline ml-2 font-mono"
        >
          {jsonViewMode === 'pretty' ? 'Minify' : 'Pretty'}
        </button>
      </div>
      <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto max-h-40 font-mono border border-gray-100">
        {jsonStr}
      </pre>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

// T014: LastRequest type (data-model.md)
type LastRequest = CurlArgs;

export function EndpointTester({ endpoint, remoteProfile }: EndpointTesterProps) {
  const { config } = useHarnessConfigStore();
  const { addError } = useDebugStore();
  const { mutate, isPending, data, error } = useHostApi();
  const [copied, setCopied] = useState(false);
  // T014: captured in onSuccess, not handleFire (critic-005)
  const [lastRequest, setLastRequest] = useState<LastRequest | null>(null);
  const [curlCopied, setCurlCopied] = useState(false);
  // M-01: O(1) counter replaces key={JSON.stringify(data)} — incremented in onSuccess
  const [responseKey, setResponseKey] = useState(0);

  const needsBody = ['POST', 'PUT', 'PATCH'].includes(endpoint.method);
  const [pathParams, setPathParams]   = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [authToken, setAuthToken]     = useState('');
  const [bodyText, setBodyText]       = useState(() =>
    needsBody ? buildJsonScaffold(endpoint.requestBodySchema) : ''
  );

  const pathParamList  = endpoint.parameters.filter((p) => p.in === 'path');
  const queryParamList = endpoint.parameters.filter((p) => p.in === 'query');

  function buildResolvedUrl(): string {
    const baseUrl = remoteProfile?.remoteBaseUrl || config?.baseUrl || window.location.origin;
    let resolved = endpoint.path;
    for (const [key, value] of Object.entries(pathParams)) {
      resolved = resolved.replace(`{${key}}`, encodeURIComponent(value));
    }
    const url = new URL(resolved, baseUrl);
    for (const [key, value] of Object.entries(queryParams)) {
      if (value) url.searchParams.set(key, value);
    }
    return url.toString();
  }

  function handleFire() {
    const extraHeaders: Record<string, string> = {};
    if (authToken && config?.authScheme) {
      extraHeaders['Authorization'] = `${config.authScheme} ${authToken}`;
    }
    let body: unknown;
    if (needsBody && bodyText.trim()) {
      try { body = JSON.parse(bodyText); } catch { body = bodyText; }
    }

    // Build the request snapshot for lastRequest capture — use remote or local headers
    const isRemote = !!remoteProfile;
    const baseConfigHeaders = isRemote
      ? (remoteProfile?.remoteDefaultHeaders ?? {})
      : (config?.defaultHeaders ?? {});
    const requestHeaders: Record<string, string> = {
      ...baseConfigHeaders,
      ...(isRemote && remoteProfile?.source !== 'server' && remoteProfile?.remoteOpenApiApiKeyHeader && remoteProfile?.remoteOpenApiApiKeyValue
        ? { [remoteProfile.remoteOpenApiApiKeyHeader]: remoteProfile.remoteOpenApiApiKeyValue }
        : {}),
      ...(isRemote && remoteProfile?.source !== 'server' && remoteProfile?.remoteOpenApiBearerToken
        ? { Authorization: `Bearer ${remoteProfile.remoteOpenApiBearerToken}` }
        : {}),
      ...extraHeaders,
      ...(needsBody && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    };
    const resolvedUrl = buildResolvedUrl();
    const pendingRequest: LastRequest = {
      method: endpoint.method,
      url: resolvedUrl,
      headers: requestHeaders,
      body: needsBody ? body : undefined,
    };

    mutate(
      { method: endpoint.method, path: endpoint.path, pathParams, queryParams, body, extraHeaders, remoteProfile },
      {
        onSuccess: () => {
          // T014: capture at success time so cURL always matches displayed response (critic-005)
          setLastRequest(pendingRequest);
          // M-01: increment O(1) key counter instead of JSON.stringify(data)
          setResponseKey((k) => k + 1);
        },
      }
    );
  }

  function copyOperationId() {
    copyToClipboard(endpoint.operationId, addError);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function copyCurl() {
    if (!lastRequest) return;
    const curlText = buildCurl(lastRequest);
    copyToClipboard(curlText, addError);
    setCurlCopied(true);
    setTimeout(() => setCurlCopied(false), 1500);
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
      {(() => {
        const isRemote = !!remoteProfile;
        const effectiveHeaders = isRemote
          ? {
              ...(remoteProfile?.remoteDefaultHeaders ?? {}),
              ...(remoteProfile?.source !== 'server' && remoteProfile?.remoteOpenApiApiKeyHeader && remoteProfile?.remoteOpenApiApiKeyValue
                ? { [remoteProfile.remoteOpenApiApiKeyHeader]: remoteProfile.remoteOpenApiApiKeyValue }
                : {}),
              ...(remoteProfile?.source !== 'server' && remoteProfile?.remoteOpenApiBearerToken
                ? { Authorization: `Bearer ${remoteProfile.remoteOpenApiBearerToken}` }
                : {}),
            }
          : (config?.defaultHeaders ?? {});
        const entries = Object.entries(effectiveHeaders);
        if (entries.length === 0) return null;
        return (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">
              {isRemote ? 'Remote headers (from harness config)' : 'Default headers (from harness config)'}
            </p>
            <div className="flex flex-wrap gap-1">
              {entries.map(([k, v]) => (
                <span key={k} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                  {k}: {v}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

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

          {endpoint.requestBodyDescription && (
            <p className="text-xs text-gray-400 mb-1.5 italic">{endpoint.requestBodyDescription}</p>
          )}

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
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-500">Response</p>
            {/* T015: Copy as cURL — present after successful call */}
            {lastRequest && (
              <button
                type="button"
                onClick={copyCurl}
                className="text-xs text-blue-600 hover:text-blue-800 underline font-mono"
              >
                {curlCopied ? 'Copied!' : 'Copy as cURL'}
              </button>
            )}
          </div>
          <ResponseView data={data} responseKey={responseKey} addError={addError} />
        </div>
      )}

      {/* ── Response schema hint (pre-request) ── */}
      {endpoint.responseSchema && data === undefined && (
        <SchemaTable schema={endpoint.responseSchema} title="Expected response schema" />
      )}

    </div>
  );
}
