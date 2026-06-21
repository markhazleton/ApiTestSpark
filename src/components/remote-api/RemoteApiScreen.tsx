import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getRemoteProfileLabel, getVisibleRemoteProfiles, useRemoteConfigStore } from '../../store/remoteConfigStore';
import { useRemoteOpenApi } from '../../hooks/useRemoteOpenApi';
import { EndpointList } from '../host-api/EndpointList';
import { EndpointTester } from '../host-api/EndpointTester';
import type { DiscoveredEndpoint } from '../../types';

export function RemoteApiScreen() {
  const { profileId } = useParams();
  const remoteStore = useRemoteConfigStore();
  const { mutateAsync: fetchRemoteSpec, isPending, isError, error } = useRemoteOpenApi();

  const [endpoints, setEndpoints] = useState<DiscoveredEndpoint[]>([]);
  const [selected, setSelected] = useState<DiscoveredEndpoint | null>(null);
  const [loaded, setLoaded] = useState(false);

  const visibleProfiles = getVisibleRemoteProfiles(remoteStore);
  const decodedProfileId = profileId ? decodeURIComponent(profileId) : '';
  const profile = decodedProfileId
    ? visibleProfiles.find((item) => item.id === decodedProfileId)
    : visibleProfiles[0];
  const remoteBaseUrl = profile?.remoteBaseUrl;
  const remoteOpenApiUrl = profile?.remoteOpenApiUrl;
  const profileLabel = profile ? getRemoteProfileLabel(profile) : 'Remote API';

  useEffect(() => {
    if (!profile || !remoteOpenApiUrl) return;
    fetchRemoteSpec({ profile })
      .then((eps) => { setEndpoints(eps); setSelected(null); setLoaded(true); })
      .catch(() => { setLoaded(true); });
  // fetchRemoteSpec is a new function identity on every render (useMutation); including it
  // would cause an infinite fetch loop. remoteOpenApiUrl is the correct and only dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, remoteOpenApiUrl]);

  if (!profile || !remoteBaseUrl || !remoteOpenApiUrl) {
    return (
      <div className="p-6">
        <div className="bg-gray-50 border border-gray-200 rounded p-4 max-w-lg">
          <p className="text-sm font-semibold text-gray-700">Remote API profile is incomplete</p>
          <p className="text-xs text-gray-500 mt-1">
            A remote profile needs both a remote base URL and an OpenAPI spec URL. Configure it in <code>MapApiTestSpark()</code> or on the Config page.
          </p>
        </div>
      </div>
    );
  }

  if (isPending || !loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#982407] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-gray-200 shrink-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h1 className="text-lg font-semibold text-gray-900">{profileLabel} Explorer</h1>
          {endpoints.length > 0 && (
            <span className="text-xs text-gray-400">
              {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {remoteBaseUrl && (
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{remoteBaseUrl}</p>
        )}
      </div>

      {/* ── Error banner ── */}
      {isError && (
        <div className="px-6 pt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-xs font-semibold text-yellow-700">Remote OpenAPI fetch failed</p>
            <p className="text-xs text-yellow-600 mt-0.5 font-mono">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!isError && loaded && endpoints.length === 0 && (
        <div className="p-6 text-sm text-gray-500">
          No endpoints found in the remote OpenAPI document.
        </div>
      )}

      {/* ── Two-pane layout ── */}
      {endpoints.length > 0 && (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-72 shrink-0 border-r border-gray-200 overflow-y-auto flex flex-col">
            <EndpointList
              endpoints={endpoints}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {selected ? (
              <EndpointTester key={`${selected.method}-${selected.path}`} endpoint={selected} remoteProfile={profile ?? undefined} />
            ) : (
              <div className="p-8 text-sm text-gray-400 text-center">
                Select an endpoint to test it.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
