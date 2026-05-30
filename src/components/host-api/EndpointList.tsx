import { useState, useMemo } from 'react';
import type { DiscoveredEndpoint } from '../../types';

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-blue-100 text-blue-800',
  POST:   'bg-green-100 text-green-800',
  PUT:    'bg-yellow-100 text-yellow-800',
  PATCH:  'bg-orange-100 text-orange-800',
  DELETE: 'bg-red-100 text-red-800',
};

// Method sort order: reads first, then writes by destructiveness
const METHOD_ORDER: Record<string, number> = {
  GET: 0, POST: 1, PUT: 2, PATCH: 3, DELETE: 4,
};

interface EndpointListProps {
  endpoints: DiscoveredEndpoint[];
  selected: DiscoveredEndpoint | null;
  onSelect: (endpoint: DiscoveredEndpoint) => void;
}

/**
 * Derive a two-level label from an OpenAPI tag.
 *
 * Rules (applied in order, using only what the OpenAPI spec provides):
 *  1. "Async Demo: Weather Patterns"  → namespace="Async Demo",  label="Weather Patterns"
 *  2. "WebSpark-Domains"              → namespace="WebSpark",     label="Domains"
 *  3. "PublicContent"                 → namespace="General",      label="PublicContent"
 *  4. ""  / undefined                 → namespace="General",      label="General"
 */
function splitTag(tag: string): { namespace: string; label: string } {
  // Pattern 1: "Prefix: Suffix" (colon+space)
  const colonIdx = tag.indexOf(': ');
  if (colonIdx > 0) {
    return { namespace: tag.slice(0, colonIdx).trim(), label: tag.slice(colonIdx + 2).trim() };
  }
  // Pattern 2: "Prefix-Suffix" (hyphen — only split on first hyphen)
  const hyphenIdx = tag.indexOf('-');
  if (hyphenIdx > 0) {
    return { namespace: tag.slice(0, hyphenIdx).trim(), label: tag.slice(hyphenIdx + 1).trim() };
  }
  // Pattern 3: single-word tag — put it under "General"
  return { namespace: 'General', label: tag || 'General' };
}

export function EndpointList({ endpoints, selected, onSelect }: EndpointListProps) {
  const [search, setSearch] = useState('');

  // Derive namespaces once to seed initial collapse state
  const initialNamespaces = useMemo(() => {
    const seen = new Set<string>();
    for (const ep of endpoints) {
      const tag = ep.tags[0] ?? '';
      seen.add(splitTag(tag).namespace);
    }
    return [...seen];
  }, [endpoints]);

  // When there are 3+ namespaces start them all collapsed so the user sees the full map first
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (initialNamespaces.length >= 3) {
      return Object.fromEntries(initialNamespaces.map((ns) => [ns, true]));
    }
    return {};
  });

  const toggleNamespace = (ns: string) =>
    setCollapsed((prev) => ({ ...prev, [ns]: !prev[ns] }));

  // Filter then group into namespace → label → endpoints
  const tree = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = q
      ? endpoints.filter(
          (ep) =>
            ep.path.toLowerCase().includes(q) ||
            ep.method.toLowerCase().includes(q) ||
            ep.summary.toLowerCase().includes(q) ||
            ep.tags.some((t) => t.toLowerCase().includes(q)),
        )
      : endpoints;

    // namespace → label → sorted endpoints
    const ns: Record<string, Record<string, DiscoveredEndpoint[]>> = {};

    for (const ep of filtered) {
      const tag = ep.tags[0] ?? '';
      const { namespace, label } = splitTag(tag);
      (ns[namespace] ??= {})[label] ??= [];
      ns[namespace][label].push(ep);
    }

    // Sort endpoints within each label by method order then path
    for (const labels of Object.values(ns)) {
      for (const eps of Object.values(labels)) {
        eps.sort(
          (a, b) =>
            (METHOD_ORDER[a.method] ?? 9) - (METHOD_ORDER[b.method] ?? 9) ||
            a.path.localeCompare(b.path),
        );
      }
    }

    return ns;
  }, [endpoints, search]);

  if (endpoints.length === 0) {
    return <p className="text-sm text-gray-500 px-2 py-4">No endpoints discovered.</p>;
  }

  const namespaces = Object.keys(tree).sort();
  const hasResults = namespaces.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Search + expand/collapse all */}
      <div className="px-3 py-2 border-b border-gray-200 sticky top-0 bg-white z-20 space-y-1.5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter endpoints…"
          className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        {namespaces.length > 1 && (
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setCollapsed(Object.fromEntries(namespaces.map((ns) => [ns, false])))}
              className="text-[10px] text-blue-500 hover:text-blue-700 underline"
            >
              expand all
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(Object.fromEntries(namespaces.map((ns) => [ns, true])))}
              className="text-[10px] text-gray-400 hover:text-gray-600 underline"
            >
              collapse all
            </button>
          </div>
        )}
      </div>

      {/* Tree */}
      <div className="overflow-y-auto flex-1">
        {!hasResults && (
          <p className="text-xs text-gray-400 px-3 py-4 text-center">No endpoints match "{search}"</p>
        )}

        {namespaces.map((ns) => {
          const isCollapsed = collapsed[ns] ?? false;
          const labels = Object.keys(tree[ns]).sort();
          const totalCount = labels.reduce((s, l) => s + tree[ns][l].length, 0);

          return (
            <div key={ns} className="border-b border-gray-100 last:border-0">
              {/* Namespace header — click to collapse */}
              <button
                onClick={() => toggleNamespace(ns)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 transition-colors sticky top-9 z-10"
              >
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  {ns}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{totalCount}</span>
                  <span className="text-gray-400 text-xs">{isCollapsed ? '▶' : '▼'}</span>
                </div>
              </button>

              {!isCollapsed && labels.map((label) => {
                const items = tree[ns][label];

                return (
                  <div key={label}>
                    {/* Tag label sub-header (only shown when namespace has >1 label) */}
                    {labels.length > 1 && (
                      <div className="px-4 py-1 text-xs font-semibold text-gray-400 bg-gray-50 border-l-2 border-gray-200">
                        {label}
                      </div>
                    )}

                    {items.map((ep) => {
                      const isSelected =
                        selected?.method === ep.method && selected?.path === ep.path;
                      const showSummary =
                        ep.summary && ep.summary !== `${ep.method} ${ep.path}`;

                      return (
                        <button
                          key={`${ep.method}-${ep.path}`}
                          type="button"
                          onClick={() => onSelect(ep)}
                          title={ep.description || ep.summary}
                          className={`w-full text-left px-3 py-2.5 flex flex-col gap-1 hover:bg-gray-50 transition-colors border-l-2 ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500'
                              : 'border-transparent'
                          } ${ep.deprecated ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                METHOD_COLORS[ep.method] ?? 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {ep.method}
                            </span>
                            <span className="text-xs font-mono text-gray-700 break-all">
                              {ep.path}
                            </span>
                            {ep.deprecated && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                                deprecated
                              </span>
                            )}
                          </div>
                          {showSummary && (
                            <p className="text-xs text-gray-500 pl-0.5 line-clamp-2 leading-relaxed">
                              {ep.summary}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
