import React from 'react';
import type { SectionConfig } from '../../config';

export interface ApiHeroProps {
  config: SectionConfig;
  /** Full Tailwind gradient class, e.g. "bg-gradient-to-r from-yellow-400 to-orange-400" */
  gradientClass: string;
  /** Text colour for subtitle and link, e.g. "text-yellow-100" */
  subtitleClass: string;
  /** Background colour for the inline code badge, e.g. "bg-yellow-500/40" */
  codeBgClass: string;
  /** Text colour for the optional notice line, e.g. "text-indigo-200" */
  noticeClass?: string;
}

export const ApiHero: React.FC<ApiHeroProps> = ({
  config,
  gradientClass,
  subtitleClass,
  codeBgClass,
  noticeClass = 'text-white/70',
}) => (
  <div className={`${gradientClass} text-white px-6 py-6`}>
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">
        {config.icon} {config.displayName}
      </h1>
      <p className={`${subtitleClass} text-sm`}>
        Sample integration using{' '}
        <a
          href={config.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium"
        >
          {config.docsLabel}
        </a>
        . No API key required. Base URL:{' '}
        <code className={`${codeBgClass} px-1 rounded`}>{config.baseUrl}</code>
      </p>
      {config.notice && (
        <p className={`${noticeClass} text-xs mt-1`}>{config.notice}</p>
      )}
    </div>
  </div>
);
