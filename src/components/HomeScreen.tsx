import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BRANDING } from "../utils";
import { SECTION_CONFIGS } from "../config";
import { useHarnessConfigStore } from "../store/harnessConfigStore";
import { getRemoteProfileLabel, getVisibleRemoteProfiles, useRemoteConfigStore } from "../store/remoteConfigStore";
import type { RemoteApiProfile } from "../types";

interface NavItem {
  icon: string;
  title: string;
  description: string;
  path: string;
  external?: boolean;
}

interface NavSection {
  label: string;
  defaultOpen?: boolean;
  items: NavItem[];
}

// ---------------------------------------------------------------------------
// Static section — always visible
// ---------------------------------------------------------------------------
const YOUR_API_SECTION: NavSection = {
  label: "Your App's APIs",
  defaultOpen: true,
  items: [
    {
      icon: "🔍",
      title: "Host API Explorer",
      description: "Autodiscovered endpoints from your app's OpenAPI v3 document. Test any endpoint interactively.",
      path: "/host-api",
    },
    {
      icon: "📄",
      title: "API Doc Builder",
      description: "Select endpoints, capture live curl + responses, and generate markdown documentation targeted at front-end developer agents.",
      path: "/api-docs",
    },
  ],
};

function buildRemoteSections(profiles: RemoteApiProfile[]): NavSection[] {
  return profiles.map((profile) => {
    const label = getRemoteProfileLabel(profile);
    const description = profile.description?.trim() || profile.remoteBaseUrl || profile.remoteOpenApiUrl || 'Remote API';
    return {
      label,
      defaultOpen: true,
      items: [
        {
          icon: "🌐",
          title: `${label} Explorer`,
          description: `Test endpoints from ${description}.`,
          path: `/remote-api/${encodeURIComponent(profile.id)}`,
        },
        {
          icon: "📄",
          title: `${label} Docs`,
          description: `Capture live responses and generate markdown documentation for ${description}.`,
          path: `/remote-docs/${encodeURIComponent(profile.id)}`,
        },
      ],
    };
  });
}

// ---------------------------------------------------------------------------
// Demo section — shown only when enableDemoIntegrations is true
// ---------------------------------------------------------------------------
const DEMO_SECTION: NavSection = {
  label: "Sample Integrations",
  defaultOpen: true,
  items: Object.values(SECTION_CONFIGS).map((cfg) => ({
    icon: cfg.icon,
    title: cfg.displayName,
    description: cfg.description,
    path: cfg.path,
  })),
};

// ---------------------------------------------------------------------------
// Section group component
// ---------------------------------------------------------------------------
function SectionGroup({ section }: { section: NavSection }) {
  const [open, setOpen] = useState(section.defaultOpen ?? true);
  const navigate = useNavigate();

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-black text-[#787878] uppercase tracking-wider hover:text-[#982407] transition-colors"
      >
        <span>{section.label}</span>
        <span className="text-[#982407]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-2 pb-4">
          {section.items.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                if (item.external) {
                  window.open(item.path, "_blank", "noopener");
                } else {
                  navigate(item.path);
                }
              }}
              className="brand-card text-left p-4 rounded-md transition-all"
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="font-black text-[#040605] mb-1">{item.title}</div>
              <div className="text-sm text-stone-600">{item.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Home Screen
// ---------------------------------------------------------------------------
export default function HomeScreen() {
  const config = useHarnessConfigStore((s) => s.config);
  const remoteStore = useRemoteConfigStore();
  const showDemos = config?.enableDemoIntegrations ?? true;
  const remoteProfiles = getVisibleRemoteProfiles(remoteStore);

  const sections: NavSection[] = [YOUR_API_SECTION];
  if (remoteProfiles.length > 0) {
    sections.unshift(...buildRemoteSections(remoteProfiles));
  }
  if (showDemos) sections.push(DEMO_SECTION);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="brand-shell text-white px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#d9aaa0]">{BRANDING.productFamily}</p>
            <h1 className="text-4xl sm:text-5xl font-black mt-2 mb-3">{BRANDING.productName}</h1>
            <p className="text-stone-200 text-lg max-w-2xl">
              {BRANDING.tagline} for local, hosted, and remote APIs managed inside the Make Bold ecosystem.
            </p>
          </div>

        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {sections.map((section) => (
          <div key={section.label} className="brand-panel rounded-md">
            <SectionGroup section={section} />
          </div>
        ))}
      </div>
    </div>
  );
}
