/**
 * Export Utilities
 * 
 * Merges conversation data, debug logs, and observation notes for export.
 * Handles confidential content detection and obfuscation.
 */

import type { ApiRequest, ApiResponse } from '../types/api';

interface ObservationNote {
  isConfidential: boolean;
  content: string;
  timestamp?: string | number | Date;
  [key: string]: unknown;
}

interface RestrictedContentDetection {
  hasRestricted: boolean;
  detectedPatterns: string[];
  obfuscatedContent: string;
}

/**
 * Patterns for detecting restricted content
 * NOTE: Patterns disabled for debugging purposes as per user request
 */
const RESTRICTED_PATTERNS: { name: string; pattern: RegExp }[] = [];

/**
 * Detect and obfuscate restricted content in text
 */
export function detectRestrictedContent(text: string): RestrictedContentDetection {
  const detected: string[] = [];
  let obfuscated = text;

  RESTRICTED_PATTERNS.forEach(({ name, pattern }) => {
    if (pattern.test(text)) {
      detected.push(name);
      obfuscated = obfuscated.replace(pattern, (match) => {
        // Keep first 4 and last 4 characters, obfuscate the rest
        if (match.length > 12) {
          return `${match.slice(0, 4)}${'*'.repeat(Math.min(match.length - 8, 16))}${match.slice(-4)}`;
        }
        return '*'.repeat(match.length);
      });
    }
  });

  return {
    hasRestricted: detected.length > 0,
    detectedPatterns: detected,
    obfuscatedContent: obfuscated,
  };
}

/**
 * Export conversation transcript with observation notes
 */
export interface TranscriptExport {
  timestamp: string;
  conversationSteps: unknown[];
  observationNotes: ObservationNote[];
  debugInfo: {
    totalRequests: number;
    totalResponses: number;
    averageApiResponseTime: number;
    averageProcessingTime: number;
    averageTotalResponseTime: number;
  };
  warnings: string[];
}

export function exportTranscript(
  conversationSteps: unknown[],
  notes: ObservationNote[],
  requests: ApiRequest[],
  responses: ApiResponse[]
): string {
  const confidentialCount = notes.filter((n) => n.isConfidential).length;
  const warnings: string[] = [];

  if (confidentialCount > 0) {
    warnings.push(
      `⚠️ This transcript contains ${confidentialCount} confidential note(s). Review before sharing.`
    );
  }

  const apiResponseTimes = responses.map((response) => response.apiResponseDuration);
  const processingTimes = responses.map(() => 0);
  const totalResponseTimes = responses.map((response) => response.apiResponseDuration);

  const avgApiResponseTime =
    apiResponseTimes.length > 0
      ? apiResponseTimes.reduce((sum, value) => sum + value, 0) / apiResponseTimes.length
      : 0;
  const avgProcessingTime =
    processingTimes.length > 0
      ? processingTimes.reduce((sum, value) => sum + value, 0) / processingTimes.length
      : 0;
  const avgTotalResponseTime =
    totalResponseTimes.length > 0
      ? totalResponseTimes.reduce((sum, value) => sum + value, 0) / totalResponseTimes.length
      : 0;

  const transcript: TranscriptExport = {
    timestamp: new Date().toISOString(),
    conversationSteps,
    observationNotes: notes.map((note) => ({
      ...note,
      content: note.isConfidential ? `[CONFIDENTIAL] ${note.content}` : note.content,
    })),
    debugInfo: {
      totalRequests: requests.length,
      totalResponses: responses.length,
      averageApiResponseTime: Math.round(avgApiResponseTime),
      averageProcessingTime: Math.round(avgProcessingTime),
      averageTotalResponseTime: Math.round(avgTotalResponseTime),
    },
    warnings,
  };

  return JSON.stringify(transcript, null, 2);
}

/**
 * Export CURL command with observation notes appended as comments
 */
export function exportCurlWithNotes(
  requestId: string,
  requests: ApiRequest[],
  notes: ObservationNote[]
): string {
  const request = requests.find((r) => r.id === requestId);
  if (!request) return '# Request not found';

  let curl = `curl -X ${request.method} "${request.url}"`;
  Object.entries(request.headers).forEach(([key, value]) => {
    // No obfuscation for debug tool
    curl += ` \\\n  -H "${key}: ${value}"`;
  });
  if (request.body) {
    const bodyStr = JSON.stringify(request.body);
    const detection = detectRestrictedContent(bodyStr);
    if (detection.hasRestricted) {
      curl += ` \\\n  -d '${detection.obfuscatedContent}'`;
      curl += `\n\n# ⚠️ Restricted content detected and obfuscated: ${detection.detectedPatterns.join(', ')}`;
    } else {
      curl += ` \\\n  -d '${bodyStr}'`;
    }
  }

  // Append observation notes as comments
  if (notes.length > 0) {
    curl += '\n\n# === Observation Notes ===';
    notes.forEach((note) => {
      const confidentialTag = note.isConfidential ? '[CONFIDENTIAL] ' : '';
      curl += `\n# ${confidentialTag}${note.timestamp ? new Date(note.timestamp as string | number | Date).toLocaleTimeString() : ''}: ${note.content}`;
    });
  }

  return curl;
}

/**
 * Download a string as a file
 */
export function downloadFile(filename: string, content: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
