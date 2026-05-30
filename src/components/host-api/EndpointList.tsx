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
    return (
      <p className="text-sm text-gray-500 px-2 py-4">No endpoints discovered.</p>
    );
  }

  // Group by first tag or "General"
  const groups = endpoints.reduce<Record<string, DiscoveredEndpoint[]>>((acc, ep) => {
    const tag = ep.tags[0] ?? 'General';
    (acc[tag] ??= []).push(ep);
    return acc;
  }, {});

  return (
    <div className="divide-y divide-gray-100">
      {Object.entries(groups).map(([tag, items]) => (
        <div key={tag}>
          <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
            {tag}
          </div>
          {items.map((ep) => {
            const isSelected = selected?.method === ep.method && selected?.path === ep.path;
            return (
              <button
                key={`${ep.method}-${ep.path}`}
                onClick={() => onSelect(ep)}
                className={`w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
              >
                <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${METHOD_COLORS[ep.method] ?? 'bg-gray-100 text-gray-800'}`}>
                  {ep.method}
                </span>
                <span className="text-xs font-mono text-gray-700 break-all">{ep.path}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
