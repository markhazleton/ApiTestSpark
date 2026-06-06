import React, { useState } from 'react';
import { useUnifiedConfigStore } from '../../store';
import type { Environment } from '../../types';

interface Props {
  env: Environment;
}

export const RemoteOpenApiConfig: React.FC<Props> = ({ env }) => {
  const {
    getSectionConfig,
    setRemoteOpenApiUrl,
    setRemoteOpenApiApiKeyHeader,
    setRemoteOpenApiApiKeyValue,
    setRemoteOpenApiBearerToken,
    clearRemoteOpenApiConfig,
  } = useUnifiedConfigStore();

  const cfg = getSectionConfig('harnessconfig', env);
  const [url, setUrl] = useState(cfg.remoteOpenApiUrl ?? '');
  const [apiKeyHeader, setApiKeyHeader] = useState(cfg.remoteOpenApiApiKeyHeader ?? '');
  const [apiKeyValue, setApiKeyValue] = useState(cfg.remoteOpenApiApiKeyValue ?? '');
  const [bearerToken, setBearerToken] = useState(cfg.remoteOpenApiBearerToken ?? '');

  const isRemote = !!cfg.remoteOpenApiUrl;

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setUrl(val);
    if (!val) {
      clearRemoteOpenApiConfig(env);
      setApiKeyHeader('');
      setApiKeyValue('');
      setBearerToken('');
    } else {
      setRemoteOpenApiUrl(env, val);
    }
  }

  function handleApiKeyHeaderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setApiKeyHeader(val);
    setRemoteOpenApiApiKeyHeader(env, val || undefined);
  }

  function handleApiKeyValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setApiKeyValue(val);
    setRemoteOpenApiApiKeyValue(env, val || undefined);
  }

  function handleBearerTokenChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setBearerToken(val);
    setRemoteOpenApiBearerToken(env, val || undefined);
  }

  function handleClear() {
    clearRemoteOpenApiConfig(env);
    setUrl('');
    setApiKeyHeader('');
    setApiKeyValue('');
    setBearerToken('');
  }

  return (
    <div className="remote-openapi-config">
      <div className="config-row">
        <label htmlFor="remote-openapi-url">Remote OpenAPI URL</label>
        <input
          id="remote-openapi-url"
          type="url"
          value={url}
          placeholder="https://example.com/openapi.json"
          onChange={handleUrlChange}
        />
        <span className="source-indicator">{isRemote ? 'Remote' : 'Local'}</span>
      </div>

      <div className="config-row">
        <label htmlFor="remote-apikey-header">API Key Header</label>
        <input
          id="remote-apikey-header"
          type="text"
          value={apiKeyHeader}
          placeholder="X-Api-Key"
          onChange={handleApiKeyHeaderChange}
        />
      </div>

      <div className="config-row">
        <label htmlFor="remote-apikey-value">API Key Value</label>
        <input
          id="remote-apikey-value"
          type="password"
          value={apiKeyValue}
          placeholder="••••••••"
          onChange={handleApiKeyValueChange}
        />
      </div>

      <div className="config-row">
        <label htmlFor="remote-bearer-token">Bearer Token</label>
        <input
          id="remote-bearer-token"
          type="password"
          value={bearerToken}
          placeholder="••••••••"
          onChange={handleBearerTokenChange}
        />
        <small className="credential-note">
          Credential changes take effect after restarting the .NET host.
        </small>
      </div>

      <button type="button" onClick={handleClear}>
        Clear remote config
      </button>
    </div>
  );
};
