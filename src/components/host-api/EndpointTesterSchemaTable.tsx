import type { ResolvedSchema } from '../../types';

export function EndpointTesterSchemaTable({ schema, title }: { schema: ResolvedSchema; title: string }) {
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
          if (prop.minimum != null) constraints.push(`≥${prop.minimum}`);
          if (prop.maximum != null) constraints.push(`≤${prop.maximum}`);
          if (prop.minLength != null) constraints.push(`min ${prop.minLength} chars`);
          if (prop.maxLength != null) constraints.push(`max ${prop.maxLength} chars`);

          const typeLabel = prop.format
            ? `${prop.type ?? ''}(${prop.format})`
            : (prop.type ?? 'any');

          return (
            <div key={key} className="flex items-baseline gap-2 px-2 py-1.5 even:bg-gray-50 border-b border-gray-50 last:border-0">
              <span className="font-mono text-[#982407] shrink-0 w-28 truncate" title={key}>{key}</span>
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
