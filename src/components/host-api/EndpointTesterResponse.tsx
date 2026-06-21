import { useState } from 'react';
import { useHarnessConfigStore } from '../../store';

export type UnknownErrorReporter = (e: {
  id: string;
  category: 'Unknown';
  message: string;
  timestamp: Date;
  context: Record<string, unknown>;
}) => void;

function toJsonPath(parentKey: string | null, fieldKey: string, inArray = false): string {
  if (inArray) {
    return parentKey ? `$.${parentKey}[*].${fieldKey}` : `$[*].${fieldKey}`;
  }
  return parentKey ? `$.${parentKey}.${fieldKey}` : `$.${fieldKey}`;
}

function copyToClipboard(text: string, addError: UnknownErrorReporter): void {
  if (!navigator?.clipboard) {
    addError({ id: crypto.randomUUID(), category: 'Unknown', message: 'Clipboard unavailable', timestamp: new Date(), context: {} });
    return;
  }
  navigator.clipboard.writeText(text).catch(() =>
    addError({ id: crypto.randomUUID(), category: 'Unknown', message: 'Copy failed', timestamp: new Date(), context: {} })
  );
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function SortableTable({
  rows,
  parentKey = null,
  addError,
}: {
  rows: Record<string, unknown>[];
  parentKey?: string | null;
  addError: UnknownErrorReporter;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
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
    else {
      setSortKey(col);
      setSortAsc(true);
    }
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
                  {sortKey === col && <span className="ml-1 text-[#982407]">{sortAsc ? '↑' : '↓'}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0 even:bg-gray-50 hover:bg-[#fff7f5] transition-colors">
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
      <div className="px-3 py-1 border-t border-gray-100 flex items-center justify-between">
        <p className="text-gray-400">
          {rows.length} {rows.length === 1 ? 'row' : 'rows'} — full JSON in debug panel
        </p>
        {rows.length > 2 && (
          <button
            type="button"
            onClick={() => setTableExpanded((e) => !e)}
            className="text-[#982407] hover:text-[#741b05] text-xs underline shrink-0 ml-2"
          >
            {tableExpanded ? 'Show less' : `Show all ${rows.length} items`}
          </button>
        )}
      </div>
    </div>
  );
}

function ResponseObjectForm({
  data,
  jsonViewMode,
  addError,
}: {
  data: Record<string, unknown>;
  jsonViewMode: 'pretty' | 'minified';
  addError: UnknownErrorReporter;
}) {
  const entries = Object.entries(data);

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
    const seen = new WeakSet<object>();
    const out: Record<string, unknown> = {};
    for (const [k, orig] of entries) {
      if (isPlainObject(orig)) {
        if (seen.has(orig)) {
          out[k] = '[Circular reference detected]';
          continue;
        }
        seen.add(orig);
        const nested = nestedFields[k] ?? {};
        const rebuilt: Record<string, unknown> = {};
        for (const [nk, nv] of Object.entries(orig)) {
          const edited = nested[nk];
          if (edited !== undefined) {
            const origNv = nv;
            if (origNv == null) {
              rebuilt[nk] = null;
            } else if (typeof origNv === 'number') {
              rebuilt[nk] = Number(edited);
            } else if (typeof origNv === 'boolean') {
              rebuilt[nk] = edited === 'true';
            } else {
              rebuilt[nk] = edited;
            }
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
        <button type="button" onClick={copyJson} className="text-[#982407] hover:text-[#741b05] text-xs underline">
          {copied ? 'Copied!' : 'Copy as JSON'}
        </button>
      </div>
      {entries.map(([key, orig]) => {
        if (orig === undefined) {
          return (
            <div key={key} className="flex items-center gap-3 px-3 py-1.5 even:bg-gray-50 border-b border-gray-100 last:border-0">
              <span
                className="font-mono font-semibold text-[#982407] shrink-0 w-28 truncate cursor-pointer"
                title={toJsonPath(null, key)}
                onClick={() => copyToClipboard(toJsonPath(null, key), addError)}
              >{key}</span>
              <span className="font-mono text-gray-400 text-[10px] italic">undefined</span>
            </div>
          );
        }

        if (orig === null) {
          return (
            <div key={key} className="flex items-center gap-3 px-3 py-1.5 even:bg-gray-50 border-b border-gray-100 last:border-0">
              <span
                className="font-mono font-semibold text-[#982407] shrink-0 w-28 truncate cursor-pointer"
                title={toJsonPath(null, key)}
                onClick={() => copyToClipboard(toJsonPath(null, key), addError)}
              >{key}</span>
              <span className="font-mono text-gray-400 italic text-[10px]">null</span>
            </div>
          );
        }

        if (Array.isArray(orig) && orig.length > 0 && isPlainObject(orig[0])) {
          return (
            <div key={key} className="px-3 py-1.5 border-b border-gray-100 last:border-0">
              <span
                className="font-mono font-semibold text-[#982407] text-xs cursor-pointer"
                title={`$.${key}[*]`}
                onClick={() => copyToClipboard(`$.${key}[*]`, addError)}
              >{key}</span>
              <div className="mt-1">
                <SortableTable rows={orig as Record<string, unknown>[]} parentKey={key} addError={addError} />
              </div>
            </div>
          );
        }

        if (isPlainObject(orig)) {
          const seen = new WeakSet<object>();
          seen.add(orig);
          const nestedEntries = Object.entries(orig);
          return (
            <div key={key} className="px-3 py-1.5 border-b border-gray-100 last:border-0">
              <details className="group">
                <summary
                  className="font-mono font-semibold text-[#982407] text-xs cursor-pointer list-none flex items-center gap-1"
                  title={toJsonPath(null, key)}
                  onClick={(e) => { if (e.detail === 2) { e.preventDefault(); copyToClipboard(toJsonPath(null, key), addError); } }}
                >
                  <span className="text-gray-400 group-open:rotate-90 transition-transform inline-block">▶</span>
                  {key}
                  <span className="text-gray-400 font-normal text-[10px]">({nestedEntries.length} fields)</span>
                </summary>
                <div className="mt-1 ml-2 border border-gray-100 rounded overflow-hidden">
                  {nestedEntries.map(([nk, nv]) => {
                    if (isPlainObject(nv) && seen.has(nv)) {
                      return (
                        <div key={nk} className="flex items-center gap-3 px-2 py-1 even:bg-gray-50 border-b border-gray-50 last:border-0">
                          <span className="font-mono text-[#982407] shrink-0 w-24 truncate text-[11px]">{nk}</span>
                          <span className="font-mono text-red-400 text-[10px] italic">[Circular reference detected]</span>
                        </div>
                      );
                    }
                    const jsonPath = toJsonPath(key, nk);
                    if (nv === null || nv === undefined) {
                      return (
                        <div key={nk} className="flex items-center gap-3 px-2 py-1 even:bg-gray-50 border-b border-gray-50 last:border-0">
                          <label
                            className="font-mono text-[#982407] shrink-0 w-24 truncate text-[11px] cursor-pointer"
                            title={jsonPath}
                            onClick={() => copyToClipboard(jsonPath, addError)}
                          >{nk}</label>
                          <span className="font-mono text-gray-400 italic text-[10px]">{nv === null ? 'null' : 'undefined'}</span>
                        </div>
                      );
                    }
                    if (isPlainObject(nv) || Array.isArray(nv)) {
                      return (
                        <div key={nk} className="flex items-start gap-3 px-2 py-1 even:bg-gray-50 border-b border-gray-50 last:border-0">
                          <label
                            className="font-mono text-[#982407] shrink-0 w-24 truncate text-[11px] cursor-pointer"
                            title={jsonPath}
                            onClick={() => copyToClipboard(jsonPath, addError)}
                          >{nk}</label>
                          <span className="font-mono text-gray-500 truncate text-[10px]">{JSON.stringify(nv)}</span>
                        </div>
                      );
                    }
                    const isBool = typeof nv === 'boolean';
                    const curVal = nestedFields[key]?.[nk] ?? String(nv);
                    return (
                      <div key={nk} className="flex items-center gap-3 px-2 py-1 even:bg-gray-50 border-b border-gray-50 last:border-0">
                        <label
                          htmlFor={`resp-${key}-${nk}`}
                          className="font-mono text-[#982407] shrink-0 w-24 truncate text-[11px] cursor-pointer"
                          title={jsonPath}
                          onClick={() => copyToClipboard(jsonPath, addError)}
                        >{nk}</label>
                        {isBool ? (
                          <select
                            id={`resp-${key}-${nk}`}
                            value={curVal}
                            onChange={(e) => setNestedFields((nf) => ({ ...nf, [key]: { ...(nf[key] ?? {}), [nk]: e.target.value } }))}
                            className="flex-1 font-mono border border-gray-200 rounded px-2 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#982407] text-xs"
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
                            className="flex-1 font-mono border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#982407] text-xs"
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

        if (Array.isArray(orig)) {
          const jsonStr = jsonViewMode === 'minified' ? JSON.stringify(orig) : JSON.stringify(orig, null, 2);
          return (
            <div key={key} className="flex items-center gap-3 px-3 py-1.5 even:bg-gray-50 border-b border-gray-100 last:border-0">
              <span
                className="font-mono font-semibold text-[#982407] shrink-0 w-28 truncate cursor-pointer"
                title={toJsonPath(null, key)}
                onClick={() => copyToClipboard(toJsonPath(null, key), addError)}
              >{key}</span>
              <span className="font-mono text-gray-500 truncate text-[10px]">{jsonStr}</span>
            </div>
          );
        }

        const isBool = typeof orig === 'boolean';
        const jsonPath = toJsonPath(null, key);
        return (
          <div key={key} className="flex items-center gap-3 px-3 py-1.5 even:bg-gray-50 border-b border-gray-100 last:border-0">
            <label
              className="font-mono font-semibold text-[#982407] shrink-0 w-28 truncate cursor-pointer"
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
                className="flex-1 font-mono border border-gray-200 rounded px-2 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#982407]"
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
                className="flex-1 font-mono border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#982407]"
              />
            )}
          </div>
        );
      })}
      <p className="text-gray-400 px-3 py-1 border-t border-gray-100">Full JSON in debug panel</p>
    </div>
  );
}

export function ResponseView({
  data,
  responseKey,
  addError,
}: {
  data: unknown;
  responseKey: number;
  addError: UnknownErrorReporter;
}) {
  const { jsonViewMode, setJsonViewMode } = useHarnessConfigStore();

  if (Array.isArray(data) && data.length > 0 && isPlainObject(data[0])) {
    return <SortableTable rows={data as Record<string, unknown>[]} addError={addError} />;
  }

  if (Array.isArray(data) && data.length === 0) {
    return <p className="text-xs text-gray-400 italic">Empty array — no rows returned.</p>;
  }

  if (isPlainObject(data)) {
    return <ResponseObjectForm key={responseKey} data={data as Record<string, unknown>} jsonViewMode={jsonViewMode} addError={addError} />;
  }

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
