import React from 'react';

interface JsonDisplayProps {
  data: unknown;
  /** Override the auto-generated count label ("N items returned" / "Single item returned"). */
  label?: string;
  /** Tailwind max-height class for the scrollable pre block. Defaults to "max-h-80". */
  maxHeightClass?: string;
}

export const JsonDisplay: React.FC<JsonDisplayProps> = ({
  data,
  label,
  maxHeightClass = 'max-h-80',
}) => {
  const items = Array.isArray(data) ? (data as unknown[]) : null;
  const autoLabel = items !== null
    ? `${items.length} item${items.length !== 1 ? 's' : ''} returned`
    : 'Single item returned';

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label ?? autoLabel}</p>
      <pre
        className={`bg-gray-50 border border-gray-200 rounded-md p-3 text-xs overflow-auto ${maxHeightClass} text-gray-800`}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};
