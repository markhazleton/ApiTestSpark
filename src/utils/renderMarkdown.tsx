/**
 * Lightweight OpenAPI description renderer.
 *
 * Handles the subset of markdown that .NET AspNetCore.OpenApi and standard
 * OpenAPI descriptions actually emit:
 *   **bold**, *italic*, `inline code`, ## headings,
 *   - / * bullet lists, numbered lists,
 *   ```fenced code blocks```,
 *   | markdown tables | (rendered as a simple styled table)
 *
 * Returns an array of React elements — caller wraps in a <div>.
 * Deliberately avoids a full markdown parser to stay bundle-free.
 */

import type { ReactNode } from 'react';

const CODE_CLASS = 'bg-gray-100 text-gray-800 px-0.5 py-px rounded font-mono text-[10px]';

function inlineMarkdown(text: string): ReactNode {
  // Split on **bold**, *italic*, `code`, in one pass
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className={CODE_CLASS}>{part.slice(1, -1)}</code>;
    return part;
  });
}

export function renderMarkdown(text: string): ReactNode[] {
  const lines = text.split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block ────────────────────────────────────────────────────
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre
          key={`fence-${i}`}
          className="bg-gray-900 text-green-300 text-xs font-mono rounded p-3 overflow-x-auto my-1 border border-gray-700"
        >
          {lang && <span className="text-gray-500 block text-[10px] mb-1">{lang}</span>}
          {codeLines.join('\n')}
        </pre>,
      );
      i++; // skip closing ```
      continue;
    }

    // ── Heading (## or ###) ──────────────────────────────────────────────────
    if (/^#{2,3}\s/.test(line)) {
      const level = line.match(/^(#{2,3})/)?.[1].length ?? 2;
      const content = line.replace(/^#{2,3}\s+/, '');
      nodes.push(
        <p key={`h-${i}`} className={level === 2 ? 'font-bold text-gray-700 mt-2' : 'font-semibold text-gray-600 mt-1'}>
          {inlineMarkdown(content)}
        </p>,
      );
      i++;
      continue;
    }

    // ── Markdown table (line that starts and ends with |) ───────────────────
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      // Skip separator row (contains only |, -, :, spaces)
      const dataRows = tableLines.filter((l) => !/^\s*\|[\s|:-]+\|\s*$/.test(l));
      const parseCells = (l: string) =>
        l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

      const [headerRow, ...bodyRows] = dataRows;
      if (!headerRow) continue;

      const headers = parseCells(headerRow);
      nodes.push(
        <div key={`table-${i}`} className="overflow-x-auto my-1">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr className="bg-gray-100">
                {headers.map((h, hi) => (
                  <th key={hi} className="px-2 py-1 border border-gray-200 text-left font-semibold text-gray-700">
                    {inlineMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className="even:bg-gray-50">
                  {parseCells(row).map((cell, ci) => (
                    <td key={ci} className="px-2 py-1 border border-gray-200 text-gray-600">
                      {inlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // ── Numbered list item ───────────────────────────────────────────────────
    if (/^\d+\.\s/.test(line.trimStart())) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trimStart())) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 ml-1">
          {listItems.map((item, ii) => (
            <li key={ii} className="text-gray-600">{inlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // ── Bullet list item (- or *) ────────────────────────────────────────────
    if (/^[-*]\s/.test(line.trimStart())) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trimStart())) {
        listItems.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="space-y-0.5 ml-1">
          {listItems.map((item, ii) => (
            <li key={ii} className="text-gray-600 flex gap-1.5">
              <span className="text-gray-400 shrink-0">•</span>
              <span>{inlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // ── Blank line → spacer ──────────────────────────────────────────────────
    if (!line.trim()) {
      nodes.push(<div key={`br-${i}`} className="h-1" />);
      i++;
      continue;
    }

    // ── Plain paragraph ──────────────────────────────────────────────────────
    nodes.push(
      <p key={`p-${i}`} className="text-gray-600 leading-relaxed">
        {inlineMarkdown(line)}
      </p>,
    );
    i++;
  }

  return nodes;
}
