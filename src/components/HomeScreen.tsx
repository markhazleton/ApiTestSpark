import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BRANDING } from "../utils";
import { SECTION_CONFIGS } from "../config";

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
// Navigation sections — add your own feature sections below the sample
// ---------------------------------------------------------------------------
const SECTIONS: NavSection[] = [
  {
    label: "Sample Integration",
    defaultOpen: true,
    items: Object.values(SECTION_CONFIGS).map((cfg) => ({
      icon: cfg.icon,
      title: cfg.displayName,
      description: cfg.description,
      path: cfg.path,
    })),
  },
  {
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
  },
];

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
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
      >
        <span>{section.label}</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
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
              className="text-left p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="font-semibold text-gray-900 mb-1">{item.title}</div>
              <div className="text-sm text-gray-600">{item.description}</div>
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
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{BRANDING.productName}</h1>
          <p className="text-blue-100 text-lg">{BRANDING.tagline}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {SECTIONS.map((section) => (
          <div key={section.label} className="bg-gray-50 rounded-lg border border-gray-200">
            <SectionGroup section={section} />
          </div>
        ))}
      </div>
    </div>
  );
}