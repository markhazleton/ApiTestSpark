import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BRANDING } from '../utils';
import { useHarnessConfigStore } from '../store/harnessConfigStore';

interface BuildInfo {
  version: string;
  buildDate: string;
  buildTimestamp: number;
}

export function Footer() {
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const config = useHarnessConfigStore((state) => state.config);
  const userVariables = ([
    ['User', config?.userName],
    ['Email', config?.userEmail],
    ['ID', config?.userId],
  ] as Array<[string, string | undefined]>).filter(
    (entry): entry is [string, string] => !!entry[1]?.trim()
  );

  useEffect(() => {
    const cacheBuster = new Date().getTime();
      const buildInfoUrl = `${import.meta.env.BASE_URL}build-info.json`;
      fetch(`${buildInfoUrl}?v=${cacheBuster}`)
      .then((response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data: BuildInfo | null) => {
        if (data) setBuildInfo(data);
      })
      .catch(() => {
        // Build info is non-critical; silently skip if unavailable
      });
  }, []);

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
    <footer className="mt-auto border-t border-[#ded8d4] bg-white/90 px-4 py-3 text-center text-xs text-stone-600">
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <Link to="/how-to-use" className="text-[#982407] hover:text-[#741b05] hover:underline">
          How to Use
        </Link>
        <span className="text-stone-300">|</span>
        <a href="https://apitest.makeboldspark.com" className="text-[#982407] hover:text-[#741b05] hover:underline">
          API Test Spark
        </a>
        <span className="text-stone-300">|</span>
        <span>
          Built by{' '}
          <a href="https://markhazleton.com" className="text-[#982407] hover:text-[#741b05] hover:underline">
            Mark Hazleton
          </a>
        </span>
        <span className="text-stone-300">·</span>
        <a href={BRANDING.familyUrl} className="text-[#982407] hover:text-[#741b05] hover:underline">
          {BRANDING.productFamily}
        </a>
        <span className="text-stone-300">·</span>
        <a href={BRANDING.companyUrl} className="text-[#982407] hover:text-[#741b05] hover:underline">
          {BRANDING.companyName}
        </a>
        {userVariables.length > 0 && (
          <>
            <span className="text-stone-300">|</span>
            {userVariables.map(([label, value]) => (
              <span key={label} className="font-mono" title={`${label}: ${value}`}>
                {label}: {value}
              </span>
            ))}
          </>
        )}
        {buildInfo && (
          <>
            <span className="text-stone-300">|</span>
            <span>
              Version <span className="font-semibold">{buildInfo.version}</span>
            </span>
            <span className="text-stone-300">|</span>
            <span>Build: {formatBuildDate(buildInfo.buildDate)}</span>
          </>
        )}
      </div>
    </footer>
  );
}
