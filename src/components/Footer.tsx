import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface BuildInfo {
  version: string;
  buildDate: string;
  buildTimestamp: number;
}

export function Footer() {
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);

  useEffect(() => {
    // Fetch build info from public directory with cache busting
    const cacheBuster = new Date().getTime();
    fetch(`/build-info.json?v=${cacheBuster}`)
      .then((response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data: BuildInfo | null) => {
        if (data) {
          setBuildInfo(data);
        }
      })
      .catch(() => {
        // Build info is non-critical; silently skip if unavailable
      });
  }, []);

  if (!buildInfo) {
    return null;
  }

  const formatBuildDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <footer className="mt-auto border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-xs text-gray-600">
      <div className="flex items-center justify-center gap-4">
        <Link to="/how-to-use" className="text-blue-600 hover:text-blue-800 hover:underline">
          How to Use
        </Link>
        <span className="text-gray-400">|</span>
        <span>
          Version <span className="font-semibold">{buildInfo.version}</span>
        </span>
        <span className="text-gray-400">|</span>
        <span>Build: {formatBuildDate(buildInfo.buildDate)}</span>
      </div>
    </footer>
  );
}
