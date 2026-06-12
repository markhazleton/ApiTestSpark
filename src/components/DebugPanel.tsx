import React, { useDeferredValue, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDebugStore } from '../store';
import { JsonCodeBlock, LazyDetails } from './debug-panel/DebugPanelUtils';
import { buildCurl } from '../utils';

interface DebugPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isCollapsed, onToggleCollapse }) => {
  const queryClient = useQueryClient();
  const { requests, responses, metrics, errors, clearAll } = useDebugStore();

  const [activeTab, setActiveTab] = useState<'requests' | 'metrics' | 'errors'>('requests');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const deferredRequests  = useDeferredValue(requests);
  const deferredResponses = useDeferredValue(responses);
  const deferredMetrics   = useDeferredValue(metrics);
  const deferredErrors    = useDeferredValue(errors);

  const reversedRequests = useMemo(() => [...deferredRequests].reverse(),  [deferredRequests]);
  const reversedMetrics  = useMemo(() => [...deferredMetrics].reverse(),   [deferredMetrics]);
  const reversedErrors   = useMemo(() => [...deferredErrors].reverse(),    [deferredErrors]);

  const responsesByRequestId = useMemo(
    () => new Map(deferredResponses.map((r) => [r.requestId, r])),
    [deferredResponses],
  );
  const errorsByRequestId = useMemo(
    () =>
      new Map(
        deferredErrors.flatMap((e) => {
          const rid = e.context?.requestId;
          return rid ? [[rid as string, e]] : [];
        }),
      ),
    [deferredErrors],
  );

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const avgMs = () => {
    if (!deferredResponses.length) return '—';
    const total = deferredResponses.reduce((s, r) => s + r.apiResponseDuration, 0);
    return `${(total / deferredResponses.length).toFixed(0)} ms`;
  };

  const successRate = () => {
    if (!metrics.length) return '100%';
    const ok = metrics.filter((m) => m.isSuccess).length;
    return `${((ok / metrics.length) * 100).toFixed(0)}%`;
  };

  // ── Collapsed state ───────────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <div className="w-full h-full bg-gray-800 flex flex-col items-center border-l border-gray-700">
        <button
          onClick={onToggleCollapse}
          className="w-full py-4 text-white hover:bg-gray-700 flex items-center justify-center flex-1"
          title="Expand Debug Panel"
        >
          <span
            className="text-sm font-medium whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.1em' }}
          >
            Debug
          </span>
        </button>
      </div>
    );
  }

  // ── Expanded state ────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full bg-gray-800 text-white flex flex-col border-l border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-3 flex justify-between items-center flex-shrink-0 border-b border-gray-700">
        <h2 className="text-base font-bold">Debug Panel</h2>
        <div className="flex gap-2">
          <button
            onClick={onToggleCollapse}
            className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs"
          >
            Collapse
          </button>
          <button
            onClick={() => { clearAll(); queryClient.resetQueries(); }}
            className="px-2 py-1 bg-red-600 rounded hover:bg-red-700 text-xs"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 p-2 bg-gray-700 flex-shrink-0">
        {[
          { label: 'Requests', value: String(requests.length), color: 'text-purple-300' },
          { label: 'Avg',      value: avgMs(),                  color: 'text-[#d9aaa0]' },
          { label: 'Success',  value: successRate(),             color: 'text-green-300' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-800 rounded p-1.5 text-center">
            <div className="text-xs text-gray-400">{label}</div>
            <div className={`text-sm font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-700 flex-shrink-0 border-b border-gray-600">
        {(['requests', 'metrics', 'errors'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              activeTab === tab ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            {tab}
            {tab === 'errors' && errors.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1">
                {errors.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 bg-gray-50 space-y-2 text-gray-900">

        {/* ── Requests tab ── */}
        {activeTab === 'requests' && (
          reversedRequests.length === 0
            ? <p className="text-gray-400 text-center py-8 text-sm">No requests yet</p>
            : reversedRequests.map((req) => {
                const res      = responsesByRequestId.get(req.id);
                const hasErr   = errorsByRequestId.has(req.id);
                const sc       = res?.status;
                const isOk     = sc !== undefined && sc >= 200 && sc < 300;
                const isPending = !res && !hasErr;
                const expanded  = expandedIds.has(req.id);

                const borderCl = hasErr    ? 'border-red-300'
                               : isPending ? 'border-yellow-200'
                               : isOk      ? 'border-green-300'
                               :              'border-red-300';
                const methodCl = req.method === 'GET'    ? 'bg-[#f7e6e1] text-[#982407]'
                               : req.method === 'POST'   ? 'bg-green-100 text-green-700'
                               : req.method === 'PUT'    ? 'bg-yellow-100 text-yellow-700'
                               : req.method === 'DELETE' ? 'bg-red-100 text-red-700'
                               :                           'bg-gray-100 text-gray-700';

                return (
                  <div key={req.id} className={`rounded border text-xs overflow-hidden ${borderCl}`}>

                    {/* ── Summary row (always visible, clickable) ── */}
                    <button
                      onClick={() => toggleExpand(req.id)}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 bg-white hover:bg-gray-50 text-left"
                    >
                      {/* chevron */}
                      <svg className={`w-3 h-3 flex-shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>

                      <span className={`font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${methodCl}`}>{req.method}</span>

                      {sc !== undefined
                        ? <span className={`font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${isOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{sc}</span>
                        : isPending
                          ? <span className="text-yellow-600 flex-shrink-0">⏳</span>
                          : null
                      }

                      {res && <span className="text-gray-500 flex-shrink-0">{res.apiResponseDuration.toFixed(0)} ms</span>}

                      <span className="text-gray-500 truncate min-w-0 flex-1">{req.url}</span>

                      <span className="text-gray-400 flex-shrink-0 ml-1">{new Date(req.timestamp).toLocaleTimeString()}</span>
                    </button>

                    {/* ── Expanded detail ── */}
                    {expanded && (
                      <div className="px-2 pb-2 pt-1 bg-gray-50 border-t border-gray-100 space-y-2">

                        {/* cURL */}
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-gray-500 uppercase tracking-wide">cURL</span>
                            <button
                              onClick={() => handleCopy(buildCurl(req), `curl-${req.id}`)}
                              className="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
                            >
                              {copiedId === `curl-${req.id}` ? '✓ Copied' : '⎘ Copy'}
                            </button>
                          </div>
                          <pre className="bg-gray-900 text-yellow-300 text-xs p-2 rounded overflow-x-auto max-h-40 whitespace-pre-wrap break-all">{buildCurl(req)}</pre>
                        </div>

                        {/* Headers */}
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-gray-500 uppercase tracking-wide">Headers</span>
                            <button
                              onClick={() => handleCopy(JSON.stringify(req.headers, null, 2), `hdr-${req.id}`)}
                              className="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
                            >
                              {copiedId === `hdr-${req.id}` ? '✓' : '⎘ Copy'}
                            </button>
                          </div>
                          <JsonCodeBlock value={req.headers} className="bg-gray-900 text-green-300 text-xs p-2 rounded overflow-x-auto max-h-40" />
                        </div>

                        {/* Response */}
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-gray-500 uppercase tracking-wide">
                              {res ? `Response (${res.status} · ${res.apiResponseDuration.toFixed(0)} ms)` : 'Response'}
                            </span>
                            {res && (
                              <button
                                onClick={() => handleCopy(JSON.stringify(res.body, null, 2), `res-${req.id}`)}
                                className="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
                              >
                                {copiedId === `res-${req.id}` ? '✓ Copied' : '⎘ Copy'}
                              </button>
                            )}
                          </div>
                          {res
                            ? <JsonCodeBlock value={res.body} className="bg-gray-900 text-green-300 text-xs p-2 rounded overflow-x-auto max-h-64" />
                            : isPending && (
                                <div className="p-1.5 bg-yellow-50 border border-yellow-200 rounded text-yellow-700">⏳ Waiting…</div>
                              )
                          }
                        </div>

                      </div>
                    )}
                  </div>
                );
              })
        )}

        {/* ── Metrics tab ── */}
        {activeTab === 'metrics' && (
          reversedMetrics.length === 0
            ? <p className="text-gray-400 text-center py-8 text-sm">No metrics yet</p>
            : reversedMetrics.map((m, i) => (
                <div key={i} className="bg-white rounded border border-gray-200 p-2 flex justify-between items-center text-xs">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-900">{m.apiName}</span>
                    {m.errorMessage && (
                      <div className="text-red-500 truncate mt-0.5">{m.errorMessage}</div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className={`font-bold ${m.isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                      {m.duration.toFixed(0)} ms
                    </div>
                    <div className="text-gray-400">{new Date(m.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
        )}

        {/* ── Errors tab ── */}
        {activeTab === 'errors' && (
          reversedErrors.length === 0
            ? <p className="text-gray-400 text-center py-8 text-sm">No errors</p>
            : reversedErrors.map((e) => (
                <div key={e.id} className="bg-red-50 rounded border border-red-200 p-2 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-red-700 px-1.5 py-0.5 bg-red-100 rounded">
                      {e.category}
                    </span>
                    <span className="text-gray-400">{new Date(e.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-red-800 mb-1">{e.message}</p>
                  {e.context && Object.keys(e.context).length > 0 && (
                    <LazyDetails summary="Context" summaryClassName="text-xs text-red-600 cursor-pointer">
                      <JsonCodeBlock value={e.context} className="bg-red-900 text-red-200 text-xs p-2 rounded mt-1" />
                    </LazyDetails>
                  )}
                </div>
              ))
        )}
      </div>
    </div>
  );
};
