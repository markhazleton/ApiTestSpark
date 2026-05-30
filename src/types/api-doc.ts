import type { DiscoveredEndpoint } from './host-api';

/** A single captured API interaction ready for documentation. */
export interface CapturedCall {
  /** ISO timestamp of the capture. */
  capturedAt: string;
  /** The curl command that reproduces this request exactly. */
  curlCommand: string;
  /** HTTP status code returned. */
  status: number;
  /** Human-readable status text. */
  statusText: string;
  /** Duration in milliseconds. */
  durationMs: number;
  /** Parsed response body (JSON or raw string). */
  responseBody: unknown;
  /** Response headers (subset — content-type etc.). */
  responseHeaders: Record<string, string>;
}

/** One entry in the documentation: an endpoint + optional captured call + author note. */
export interface DocEntry {
  /** Stable ID for list keying and reordering. */
  id: string;
  endpoint: DiscoveredEndpoint;
  /** The live capture, if the user has fired the request. */
  capture: CapturedCall | null;
  /** Parameter values used for the last capture. */
  captureParams: {
    pathParams: Record<string, string>;
    queryParams: Record<string, string>;
    body: string;
    authToken: string;
  };
  /** Optional author annotation shown above the endpoint section. */
  note: string;
}

/** Top-level document the user is building. */
export interface ApiDoc {
  title: string;
  intro: string;
  entries: DocEntry[];
}
