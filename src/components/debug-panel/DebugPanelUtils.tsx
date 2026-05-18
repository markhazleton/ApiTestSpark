import React, { useState } from 'react';

interface LazyDetailsProps {
  summary: React.ReactNode;
  summaryClassName?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

interface JsonCodeBlockProps {
  value: unknown;
  className?: string;
}

export const LazyDetails: React.FC<LazyDetailsProps> = ({
  summary,
  summaryClassName = 'text-sm font-medium text-gray-700 cursor-pointer',
  defaultOpen = false,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`${summaryClassName} flex items-center gap-1 w-full text-left`}
      >
        <span>{isOpen ? '▾' : '▸'}</span>
        <span>{summary}</span>
      </button>
      {isOpen && <div className="mt-1">{children}</div>}
    </div>
  );
};

export const JsonCodeBlock: React.FC<JsonCodeBlockProps> = ({ value, className }) => {
  const text = React.useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);
  return (
    <pre className={className ?? 'bg-gray-900 text-green-400 text-xs p-2 rounded overflow-x-auto'}>
      {text}
    </pre>
  );
};

/** Alias for plain-text or already-formatted code blocks */
export const HighlightedCodeBlock: React.FC<{
  content: string;
  language?: string;
  className?: string;
}> = ({ content, className }) => (
  <pre className={className ?? 'bg-gray-900 text-green-400 text-xs p-2 rounded overflow-x-auto'}>
    {content}
  </pre>
);
