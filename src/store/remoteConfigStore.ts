import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RemoteApiProfile } from '../types';

export type RemoteConfig = RemoteApiProfile;

type LegacyRemoteConfig = {
  remoteBaseUrl?: string;
  remoteOpenApiUrl?: string;
  remoteOpenApiApiKeyHeader?: string;
  remoteOpenApiApiKeyValue?: string;
  remoteOpenApiBearerToken?: string;
  remoteDefaultHeaders?: Record<string, string>;
};

interface RemoteConfigStore {
  profiles: RemoteApiProfile[];
  serverProfiles: RemoteApiProfile[];
  hiddenServerProfileIds: string[];
  selectedProfileId: string | null;
  setServerProfiles: (profiles: RemoteApiProfile[]) => void;
  addProfile: (profile?: Partial<RemoteApiProfile>) => RemoteApiProfile;
  upsertProfile: (profile: Partial<RemoteApiProfile>) => RemoteApiProfile;
  updateProfile: (id: string, patch: Partial<RemoteApiProfile>) => void;
  deleteProfile: (id: string) => void;
  hideServerProfile: (id: string, hidden: boolean) => void;
  selectProfile: (id: string | null) => void;
  reset: () => void;
  clear: () => void;
}

const EMPTY_HEADERS: Record<string, string> = {};

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

function newId(): string {
  return crypto?.randomUUID?.() ?? `remote-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyRemoteProfile(patch: Partial<RemoteApiProfile> = {}): RemoteApiProfile {
  return normalizeRemoteProfile({
    id: newId(),
    name: 'Remote API',
    description: '',
    remoteBaseUrl: '',
    remoteOpenApiUrl: '',
    remoteOpenApiApiKeyHeader: '',
    remoteOpenApiApiKeyValue: '',
    remoteOpenApiBearerToken: '',
    remoteDefaultHeaders: {},
    source: 'browser',
    proxyMode: 'browser',
    ...patch,
  });
}

export function normalizeRemoteProfile(profile: Partial<RemoteApiProfile>): RemoteApiProfile {
  const source = profile.source === 'server' ? 'server' : 'browser';
  return {
    id: profile.id?.trim() || newId(),
    name: profile.name?.trim() || profile.remoteBaseUrl || profile.remoteOpenApiUrl || 'Remote API',
    description: profile.description ?? '',
    remoteBaseUrl: profile.remoteBaseUrl ?? '',
    remoteOpenApiUrl: profile.remoteOpenApiUrl ?? '',
    remoteOpenApiApiKeyHeader: profile.remoteOpenApiApiKeyHeader ?? '',
    remoteOpenApiApiKeyValue: source === 'server' ? '' : (profile.remoteOpenApiApiKeyValue ?? ''),
    remoteOpenApiBearerToken: source === 'server' ? '' : (profile.remoteOpenApiBearerToken ?? ''),
    remoteOpenApiApiKeyConfigured: !!profile.remoteOpenApiApiKeyConfigured,
    remoteOpenApiBearerTokenConfigured: !!profile.remoteOpenApiBearerTokenConfigured,
    remoteOAuthConfigured: !!profile.remoteOAuthConfigured,
    remoteUseOAuthToken: profile.remoteUseOAuthToken ?? false,
    remoteCallProxyEnabled: source === 'server' && !!profile.remoteCallProxyEnabled,
    remoteDefaultHeaders: profile.remoteDefaultHeaders ?? EMPTY_HEADERS,
    source,
    proxyMode: source === 'server' ? 'server' : 'browser',
  };
}

export function getRemoteProfileLabel(profile: RemoteApiProfile): string {
  return profile.name?.trim() || profile.remoteBaseUrl || profile.remoteOpenApiUrl || 'Remote API';
}

function nextBrowserCopyName(baseName: string, usedLabels: Set<string>): string {
  const copyBase = `${baseName.trim() || 'Remote API'} (Browser)`;
  let candidate = copyBase;
  let index = 2;
  while (usedLabels.has(normalizeLabel(candidate))) {
    candidate = `${copyBase} ${index}`;
    index += 1;
  }

  usedLabels.add(normalizeLabel(candidate));
  return candidate;
}

function reassignCollidingBrowserProfiles(
  browserProfiles: RemoteApiProfile[],
  serverProfiles: RemoteApiProfile[]
): RemoteApiProfile[] {
  if (browserProfiles.length === 0 || serverProfiles.length === 0) {
    return browserProfiles;
  }

  const serverIds = new Set(serverProfiles.map((profile) => profile.id));
  const usedIds = new Set(serverProfiles.map((profile) => profile.id));
  const usedLabels = new Set(serverProfiles.map((profile) => normalizeLabel(getRemoteProfileLabel(profile))));

  return browserProfiles.map((rawProfile) => {
    const profile = normalizeRemoteProfile(rawProfile);
    if (!serverIds.has(profile.id)) {
      usedIds.add(profile.id);
      usedLabels.add(normalizeLabel(getRemoteProfileLabel(profile)));
      return profile;
    }

    let nextId = newId();
    while (usedIds.has(nextId)) {
      nextId = newId();
    }

    usedIds.add(nextId);
    return normalizeRemoteProfile({
      ...profile,
      id: nextId,
      name: nextBrowserCopyName(getRemoteProfileLabel(profile), usedLabels),
      source: 'browser',
      proxyMode: 'browser',
    });
  });
}

export function validateRemoteProfile(profile: RemoteApiProfile): string[] {
  const errors: string[] = [];
  for (const [label, value] of [
    ['Remote Base URL', profile.remoteBaseUrl],
    ['OpenAPI Spec URL', profile.remoteOpenApiUrl],
  ] as const) {
    if (value && !/^https?:\/\/.+/.test(value)) errors.push(`${label} must start with http:// or https://`);
  }
  if (profile.remoteOpenApiApiKeyValue && !profile.remoteOpenApiApiKeyHeader) {
    errors.push('API key value requires a header name');
  }
  return errors;
}

export function getVisibleRemoteProfiles(store: Pick<RemoteConfigStore, 'profiles' | 'serverProfiles' | 'hiddenServerProfileIds'>): RemoteApiProfile[] {
  const browserProfiles = store.profiles.map(normalizeRemoteProfile);
  const visibleServerProfiles = store.serverProfiles
    .map(normalizeRemoteProfile)
    .filter((profile) => !store.hiddenServerProfileIds.includes(profile.id));

  const order: string[] = [];
  const byId = new Map<string, RemoteApiProfile>();

  for (const profile of visibleServerProfiles) {
    order.push(profile.id);
    byId.set(profile.id, profile);
  }

  for (const profile of browserProfiles) {
    if (byId.has(profile.id)) continue;
    order.push(profile.id);
    byId.set(profile.id, profile);
  }

  return order.map((id) => byId.get(id)!);
}

function migrateLegacyConfig(value: unknown): Partial<RemoteConfigStore> {
  const state = (value as { state?: LegacyRemoteConfig & Partial<RemoteConfigStore> })?.state;
  if (!state) return {};
  if (Array.isArray(state.profiles)) return state as Partial<RemoteConfigStore>;

  const hasLegacy =
    !!state.remoteBaseUrl ||
    !!state.remoteOpenApiUrl ||
    !!state.remoteOpenApiApiKeyHeader ||
    !!state.remoteOpenApiApiKeyValue ||
    !!state.remoteOpenApiBearerToken ||
    Object.keys(state.remoteDefaultHeaders ?? {}).length > 0;

  if (!hasLegacy) return {};

  return {
    profiles: [
      createEmptyRemoteProfile({
        name: 'Remote API',
        remoteBaseUrl: state.remoteBaseUrl ?? '',
        remoteOpenApiUrl: state.remoteOpenApiUrl ?? '',
        remoteOpenApiApiKeyHeader: state.remoteOpenApiApiKeyHeader ?? '',
        remoteOpenApiApiKeyValue: state.remoteOpenApiApiKeyValue ?? '',
        remoteOpenApiBearerToken: state.remoteOpenApiBearerToken ?? '',
        remoteDefaultHeaders: state.remoteDefaultHeaders ?? {},
      }),
    ],
  };
}

export const useRemoteConfigStore = create<RemoteConfigStore>()(
  persist(
    (set, get) => ({
      profiles: [],
      serverProfiles: [],
      hiddenServerProfileIds: [],
      selectedProfileId: null,

      setServerProfiles: (profiles) => set((state) => {
        const serverProfiles = profiles.map(normalizeRemoteProfile);
        return {
          serverProfiles,
          profiles: reassignCollidingBrowserProfiles(state.profiles.map(normalizeRemoteProfile), serverProfiles),
        };
      }),

      addProfile: (profile = {}) => {
        const next = createEmptyRemoteProfile(profile);
        set((state) => ({ profiles: [...state.profiles, next], selectedProfileId: next.id }));
        return next;
      },

      upsertProfile: (profile) => {
        const next = createEmptyRemoteProfile(profile);
        set((state) => {
          const exists = state.profiles.some((item) => item.id === next.id);
          return {
            profiles: exists
              ? state.profiles.map((item) => (item.id === next.id ? next : item))
              : [...state.profiles, next],
            selectedProfileId: next.id,
          };
        });
        return next;
      },

      updateProfile: (id, patch) => set((state) => ({
        profiles: state.profiles.map((profile) =>
          profile.id === id ? normalizeRemoteProfile({ ...profile, ...patch, id, source: 'browser' }) : profile
        ),
      })),

      deleteProfile: (id) => set((state) => ({
        profiles: state.profiles.filter((profile) => profile.id !== id),
        selectedProfileId: state.selectedProfileId === id ? null : state.selectedProfileId,
      })),

      hideServerProfile: (id, hidden) => set((state) => ({
        hiddenServerProfileIds: hidden
          ? Array.from(new Set([...state.hiddenServerProfileIds, id]))
          : state.hiddenServerProfileIds.filter((profileId) => profileId !== id),
      })),

      selectProfile: (id) => set({ selectedProfileId: id }),

      reset: () => set({ profiles: [], hiddenServerProfileIds: [], selectedProfileId: null }),
      clear: () => get().reset(),
    }),
    {
      name: 'api-test-spark-remote-config',
      version: 2,
      migrate: migrateLegacyConfig,
      partialize: (state) => ({
        profiles: state.profiles,
        hiddenServerProfileIds: state.hiddenServerProfileIds,
        selectedProfileId: state.selectedProfileId,
      }),
    }
  )
);
