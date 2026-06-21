import type { DiscoveredEndpoint, EndpointParameter, RemoteApiProfile } from '../../types';
import { buildJsonScaffold } from '../../utils/openApiParser';
import { getParameterValue } from '../../utils';
import { EndpointTesterSchemaTable } from './EndpointTesterSchemaTable';

function ParamField({
  param,
  value,
  onChange,
  hasError = false,
}: {
  param: EndpointParameter;
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
}) {
  const labelId = `param-${param.in}-${param.name}`;
  const placeholder = param.example
    ?? (param.schema.default != null ? String(param.schema.default) : undefined)
    ?? param.schema.type;

  const constraints: string[] = [];
  if (param.schema.minimum != null) constraints.push(`min ${param.schema.minimum}`);
  if (param.schema.maximum != null) constraints.push(`max ${param.schema.maximum}`);
  if (param.schema.minLength != null) constraints.push(`≥${param.schema.minLength} chars`);
  if (param.schema.maxLength != null) constraints.push(`≤${param.schema.maxLength} chars`);
  if (param.schema.nullable) constraints.push('nullable');

  const effectiveValue = value !== '' ? value
    : (param.schema.default != null ? String(param.schema.default) : value);

  return (
    <div>
      <label htmlFor={labelId} className="text-xs font-semibold text-gray-600 flex items-center gap-1 flex-wrap mb-1">
        <span className="font-mono">{param.name}</span>
        {param.required && <span className="text-red-500">*</span>}
        <span className="text-gray-400 font-normal">({param.in})</span>
        {param.schema.format && (
          <span className="text-purple-400 font-normal font-mono text-[10px]">{param.schema.format}</span>
        )}
        {constraints.map((c) => (
          <span key={c} className="text-gray-300 font-normal font-mono text-[10px] bg-gray-50 px-1 rounded">{c}</span>
        ))}
      </label>
      {param.description && (
        <p className="text-xs text-gray-400 mb-1 leading-relaxed">{param.description}</p>
      )}
      {param.schema.enum?.length ? (
        <select
          id={labelId}
          value={effectiveValue}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full text-xs font-mono border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#982407] bg-white ${hasError ? 'border-red-400' : 'border-gray-200'}`}
        >
          {!param.required && <option value="">— optional —</option>}
          {param.schema.enum.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      ) : param.schema.type === 'boolean' ? (
        <select
          id={labelId}
          value={effectiveValue}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full text-xs font-mono border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#982407] bg-white ${hasError ? 'border-red-400' : 'border-gray-200'}`}
        >
          {!param.required && <option value="">— optional —</option>}
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <input
          id={labelId}
          type={param.schema.type === 'integer' || param.schema.type === 'number' ? 'number' : 'text'}
          value={effectiveValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full text-xs font-mono border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#982407] ${hasError ? 'border-red-400' : 'border-gray-200'}`}
        />
      )}
    </div>
  );
}

export function EndpointTesterRequestEditor({
  endpoint,
  remoteProfile,
  defaultHeaders,
  authScheme,
  authToken,
  setAuthToken,
  pathParamList,
  queryParamList,
  pathParams,
  queryParams,
  setPathParam,
  setQueryParam,
  validationError,
  setValidationError,
  bodyText,
  setBodyText,
  needsBody,
  isPending,
  error,
  onSend,
}: {
  endpoint: DiscoveredEndpoint;
  remoteProfile?: RemoteApiProfile;
  defaultHeaders: Record<string, string>;
  authScheme?: string;
  authToken: string;
  setAuthToken: (token: string) => void;
  pathParamList: EndpointParameter[];
  queryParamList: EndpointParameter[];
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  setPathParam: (name: string, value: string) => void;
  setQueryParam: (name: string, value: string) => void;
  validationError: string | null;
  setValidationError: (value: string | null) => void;
  bodyText: string;
  setBodyText: (value: string) => void;
  needsBody: boolean;
  isPending: boolean;
  error: unknown;
  onSend: () => void;
}) {
  const headerEntries = Object.entries(defaultHeaders);

  return (
    <>
      {headerEntries.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">
            {remoteProfile ? 'Remote headers (from harness config)' : 'Default headers (from harness config)'}
          </p>
          <div className="flex flex-wrap gap-1">
            {headerEntries.map(([k, v]) => (
              <span key={k} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                {k}: {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {!remoteProfile && authScheme && (
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">
            {authScheme} token
          </label>
          <input
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Enter token…"
            className="w-full text-xs font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#982407]"
          />
        </div>
      )}

      {pathParamList.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500">Path parameters</p>
          {pathParamList.map((p) => (
            <ParamField
              key={p.name}
              param={p}
              value={pathParams[p.name] ?? ''}
              hasError={validationError !== null && p.required && !getParameterValue(p, pathParams)}
              onChange={(v) => {
                setPathParam(p.name, v);
                setValidationError(null);
              }}
            />
          ))}
        </div>
      )}

      {queryParamList.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500">Query parameters</p>
          {queryParamList.map((p) => (
            <ParamField
              key={p.name}
              param={p}
              value={queryParams[p.name] ?? ''}
              onChange={(v) => setQueryParam(p.name, v)}
            />
          ))}
        </div>
      )}

      {needsBody && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-600">
              Request body (JSON)
              {endpoint.requestBodyRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            {endpoint.requestBodySchema?.properties && (
              <button
                type="button"
                onClick={() => setBodyText(buildJsonScaffold(endpoint.requestBodySchema))}
                className="text-xs text-[#982407] hover:text-[#741b05] underline"
              >
                reset scaffold
              </button>
            )}
          </div>

          {endpoint.requestBodyDescription && (
            <p className="text-xs text-gray-400 mb-1.5 italic">{endpoint.requestBodyDescription}</p>
          )}

          {endpoint.requestBodySchema?.properties && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {Object.entries(endpoint.requestBodySchema.properties).map(([key, prop]) => (
                <span
                  key={key}
                  title={[prop.description, prop.type, prop.format].filter(Boolean).join(' · ')}
                  className="text-[10px] bg-[#fff7f5] text-[#982407] border border-[#f0c8bf] px-1.5 py-0.5 rounded font-mono cursor-default"
                >
                  {key}
                  {endpoint.requestBodySchema?.required?.includes(key) && (
                    <span className="text-red-400 ml-0.5">*</span>
                  )}
                  {prop.type && (
                    <span className="text-[#982407] ml-1 opacity-70">
                      {prop.format ? `${prop.type}(${prop.format})` : prop.type}
                    </span>
                  )}
                  {prop.default !== undefined && (
                    <span className="text-amber-400 ml-1 opacity-70">={JSON.stringify(prop.default)}</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {endpoint.requestBodySchema && (
            <div className="mb-2">
              <EndpointTesterSchemaTable schema={endpoint.requestBodySchema} title="Request body schema" />
            </div>
          )}

          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder="{}"
            title="Request body JSON"
            className="w-full text-xs font-mono border border-gray-200 rounded px-2 py-1.5 resize-y focus:outline-none focus:ring-1 focus:ring-[#982407]"
          />
        </div>
      )}

      <button
        onClick={onSend}
        disabled={isPending}
        type="button"
        className="px-4 py-1.5 text-sm bg-[#982407] text-white rounded hover:bg-[#741b05] disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Sending…' : 'Send Request'}
      </button>

      {validationError && (
        <div className="text-xs text-red-600 bg-red-50 rounded p-2 font-mono">
          {validationError}
        </div>
      )}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded p-2 font-mono">
          {error instanceof Error ? error.message : 'Request failed'}
        </div>
      )}
    </>
  );
}
