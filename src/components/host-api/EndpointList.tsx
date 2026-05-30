import type { DiscoveredEndpoint } from '../../types';

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-blue-100 text-blue-800',
  POST:   'bg-green-100 text-green-800',
  PUT:    'bg-yellow-100 text-yellow-800',
  PATCH:  'bg-orange-100 text-orange-800',
  DELETE: 'bg-red-100 text-red-800',
};

interface EndpointListProps {
  endpoints: DiscoveredEndpoint[];
  selected: DiscoveredEndpoint | null;
  onSelect: (endpoint: DiscoveredEndpoint) => void;
}

export function EndpointList({ endpoints, selected, onSelect }: EndpointListProps) {
  if (endpoints.length === 0) {
    return <p className="text-sm text-gray-500 px-2 py-4">No endpoints discovered.</p>;
  }

  // Group by first tag, falling back to "General"
  const groups = endpoints.reduce<Record<string, DiscoveredEndpoint[]>>((acc, ep) => {
    const tag = ep.tags[0] ?? 'General';
    (acc[tag] ??= []).push(ep);
    return acc;
  }, {});

  return (
    <div className="divide-y divide-gray-100">
      {Object.entries(groups).map(([tag, items]) => (
        <div key={tag}>
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 sticky top-0 z-10">
            {tag}
          </div>
          {items.map((ep) => {
            const isSelected = selected?.method === ep.method && selected?.path === ep.path;
            const showSummary = ep.summary && ep.summary !== `${ep.method} ${ep.path}`;
            return (
              <button
                key={`${ep.method}-${ep.path}`}
                onClick={() => onSelect(ep)}
                title={ep.description || ep.summary}
                className={`w-full text-left px-3 py-2.5 flex flex-col gap-1 hover:bg-gray-50 transition-colors border-l-2 ${
                  isSelected ? 'bg-blue-50 border-blue-500' : 'border-transparent'
                } ${ep.deprecated ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${METHOD_COLORS[ep.method] ?? 'bg-gray-100 text-gray-800'}`}>
                    {ep.method}
                  </span>
                  <span className="text-xs font-mono text-gray-700 break-all">{ep.path}</span>
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
      ))}
    </div>
  );
}
