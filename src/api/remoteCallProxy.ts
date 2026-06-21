import type { RemoteApiProfile } from '../types';

export function usesServerRemoteCallProxy(profile: RemoteApiProfile): boolean {
  return profile.source === 'server' && profile.proxyMode === 'server' && !!profile.remoteCallProxyEnabled;
}

export function buildRemoteCallProxyUrl(profileId: string, remoteUrl: string): string {
  const target = new URL(remoteUrl);
  const proxyUrl = new URL('/api-test-spark/remote-call', window.location.origin);
  proxyUrl.searchParams.set('profileId', profileId);
  proxyUrl.searchParams.set('path', `${target.pathname}${target.search}`);
  return proxyUrl.toString();
}
