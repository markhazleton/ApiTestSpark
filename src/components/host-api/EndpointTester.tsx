import { useState } from 'react';
import type { DiscoveredEndpoint, RemoteApiProfile, ResponseCode } from '../../types';
import { useHostApi } from '../../hooks';
import { useHarnessConfigStore, useDebugStore } from '../../store';
import { buildJsonScaffold } from '../../utils/openApiParser';
import { renderMarkdown } from '../../utils/renderMarkdown';
import { buildCurl, getMissingRequiredPathParameters, getParameterValue, resolvePathParameters } from '../../utils';
import type { CurlArgs } from '../../utils';
import { ResponseView } from './EndpointTesterResponse';
import { EndpointTesterRequestEditor } from './EndpointTesterRequestEditor';
import { EndpointTesterSchemaTable as SchemaTable } from './EndpointTesterSchemaTable';

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-[#f7e6e1] text-[#741b05]',
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

// ── Clipboard helper ──────────────────────────────────────────────────────────

function copyToClipboard(text: string, addError: (e: { id: string; category: 'Unknown'; message: string; timestamp: Date; context: Record<string, unknown> }) => void): void {
  if (!navigator?.clipboard) {
    addError({ id: crypto.randomUUID(), category: 'Unknown', message: 'Clipboard unavailable', timestamp: new Date(), context: {} });
    return;
  }
  navigator.clipboard.writeText(text).catch(() =>
    addError({ id: crypto.randomUUID(), category: 'Unknown', message: 'Copy failed', timestamp: new Date(), context: {} })
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

// ── Main component ────────────────────────────────────────────────────────────

// Snapshot of the request that produced the currently displayed response.
type LastRequest = CurlArgs;

export function EndpointTester({ endpoint, remoteProfile }: EndpointTesterProps) {
  const { config } = useHarnessConfigStore();
  const { addError } = useDebugStore();
  const { mutate, isPending, data, error } = useHostApi();
  const [copied, setCopied] = useState(false);
  // Capture only after success so response-panel cURL matches the displayed response.
  const [lastRequest, setLastRequest] = useState<LastRequest | null>(null);
  const [curlCopied, setCurlCopied] = useState(false);
  // O(1) remount key for object responses; incremented after successful calls.
  const [responseKey, setResponseKey] = useState(0);

  const needsBody = ['POST', 'PUT', 'PATCH'].includes(endpoint.method);
  const [pathParams, setPathParams]   = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [authToken, setAuthToken]     = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [bodyText, setBodyText]       = useState(() =>
    needsBody ? buildJsonScaffold(endpoint.requestBodySchema) : ''
  );

  const pathParamList  = endpoint.parameters.filter((p) => p.in === 'path');
  const queryParamList = endpoint.parameters.filter((p) => p.in === 'query');
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

  function buildResolvedUrl(baseUrl: string): string {
    const resolved = resolvePathParameters(endpoint.path, pathParamList, pathParams);
    const url = new URL(resolved, baseUrl);
    for (const [key, value] of Object.entries(queryParams)) {
      if (value) url.searchParams.set(key, value);
    }
    return url.toString();
  }

  function handleFire() {
    const missingPathParameters = getMissingRequiredPathParameters(pathParamList, pathParams);
    if (missingPathParameters.length > 0) {
      setValidationError(`Required path parameter${missingPathParameters.length === 1 ? '' : 's'}: ${missingPathParameters.join(', ')}`);
      return;
    }
    setValidationError(null);

    const baseUrl = remoteProfile
      ? remoteProfile.remoteBaseUrl?.trim()
      : (config?.baseUrl ?? window.location.origin);
    if (!baseUrl) {
      addError({
        id: crypto.randomUUID(),
        category: 'Unknown',
        message: 'Remote API base URL is not configured.',
        timestamp: new Date(),
        context: {},
      });
      return;
    }

    const extraHeaders: Record<string, string> = {};
    if (!remoteProfile && authToken && config?.authScheme) {
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
    const resolvedUrl = buildResolvedUrl(baseUrl);
    const pendingRequest: LastRequest = {
      method: endpoint.method,
      url: resolvedUrl,
      headers: requestHeaders,
      body: needsBody ? body : undefined,
    };

    const resolvedPathParams = Object.fromEntries(
      pathParamList.map((parameter) => [parameter.name, getParameterValue(parameter, pathParams)])
    );

    mutate(
      { method: endpoint.method, path: endpoint.path, pathParams: resolvedPathParams, queryParams, body, extraHeaders, remoteProfile },
      {
        onSuccess: () => {
          // Capture at success time so cURL always matches the displayed response.
          setLastRequest(pendingRequest);
          // Increment the O(1) remount key instead of deriving a key from response JSON.
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

      <EndpointTesterRequestEditor
        endpoint={endpoint}
        remoteProfile={remoteProfile}
        defaultHeaders={effectiveHeaders}
        authScheme={config?.authScheme ?? undefined}
        authToken={authToken}
        setAuthToken={setAuthToken}
        pathParamList={pathParamList}
        queryParamList={queryParamList}
        pathParams={pathParams}
        queryParams={queryParams}
        setPathParam={(name, value) => setPathParams((prev) => ({ ...prev, [name]: value }))}
        setQueryParam={(name, value) => setQueryParams((prev) => ({ ...prev, [name]: value }))}
        validationError={validationError}
        setValidationError={setValidationError}
        bodyText={bodyText}
        setBodyText={setBodyText}
        needsBody={needsBody}
        isPending={isPending}
        error={error}
        onSend={handleFire}
      />

      {/* ── Response ── */}
      {data !== undefined && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-gray-500">Response</p>
            {/* Copy as cURL is available after a successful call. */}
            {lastRequest && (
              <button
                type="button"
                onClick={copyCurl}
                className="text-xs text-[#982407] hover:text-[#741b05] underline font-mono"
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
