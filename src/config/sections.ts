/**
 * Section configuration engine.
 *
 * Every API integration supported by this tool is registered here.
 * Screens and API clients derive all display metadata and base URLs
 * from SECTION_CONFIGS — no hard-coded URLs anywhere else.
 *
 * To add a new section:
 *   1. Add a key + SectionConfig entry to SECTION_CONFIGS below.
 *   2. Create src/api/<key>Client.ts using createRestCaller(config.baseUrl, ...).
 *   3. Create src/components/<key>/<Key>Screen.tsx importing SECTION_CONFIGS['<key>'].
 */

export interface SectionConfig {
  /** Unique key — matches the SECTION_CONFIGS property name. */
  readonly id: string;
  /** Human-readable title shown in the screen hero. */
  readonly displayName: string;
  /** Emoji icon shown next to the title. */
  readonly icon: string;
  /** Short description shown in the screen hero. */
  readonly description: string;
  /** API base URL — the only place this should be defined. */
  readonly baseUrl: string;
  /** URL for the external documentation link. */
  readonly docsUrl: string;
  /** Link text for the external documentation link. */
  readonly docsLabel: string;
  /** Optional notice shown below the description (e.g. synthetic-data warnings). */
  readonly notice?: string;
}

export const SECTION_CONFIGS = {
  jokeapi: {
    id: "jokeapi",
    displayName: "JokeAPI Tester",
    icon: "😂",
    description: "Sample integration using JokeAPI v2. No API key required.",
    baseUrl: "https://v2.jokeapi.dev",
    docsUrl: "https://jokeapi.dev",
    docsLabel: "JokeAPI v2",
  },
  jsonplaceholder: {
    id: "jsonplaceholder",
    displayName: "JSONPlaceholder Tester",
    icon: "📦",
    description:
      "Sample integration using JSONPlaceholder. No API key required.",
    baseUrl: "https://jsonplaceholder.typicode.com",
    docsUrl: "https://jsonplaceholder.typicode.com",
    docsLabel: "JSONPlaceholder",
    notice:
      "⚠️ All data is synthetic — no real user information. Write operations are simulated and not persisted server-side.",
  },
} as const satisfies Record<string, SectionConfig>;

export type SectionKey = keyof typeof SECTION_CONFIGS;
