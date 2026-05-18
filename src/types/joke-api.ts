// JokeAPI v2 types  (https://jokeapi.dev)

export type JokeCategory = 'Any' | 'Misc' | 'Programming' | 'Dark' | 'Pun' | 'Spooky' | 'Christmas';
export type JokeType = 'single' | 'twopart';
export type JokeFlag = 'nsfw' | 'religious' | 'political' | 'racist' | 'sexist' | 'explicit';
export type JokeLang = 'en' | 'de' | 'cs' | 'es' | 'fr' | 'pt';

export interface JokeFlags {
  nsfw: boolean;
  religious: boolean;
  political: boolean;
  racist: boolean;
  sexist: boolean;
  explicit: boolean;
}

/** Single-type joke */
export interface SingleJoke {
  error: false;
  category: JokeCategory;
  type: 'single';
  joke: string;
  flags: JokeFlags;
  id: number;
  safe: boolean;
  lang: JokeLang;
}

/** Two-part joke (setup / delivery) */
export interface TwoPartJoke {
  error: false;
  category: JokeCategory;
  type: 'twopart';
  setup: string;
  delivery: string;
  flags: JokeFlags;
  id: number;
  safe: boolean;
  lang: JokeLang;
}

export type JokeResponse = SingleJoke | TwoPartJoke;

/** Error response from JokeAPI */
export interface JokeErrorResponse {
  error: true;
  internalError: boolean;
  code: number;
  message: string;
  causedBy: string[];
  additionalInfo: string;
  timestamp: number;
}

/** Filters passed to the client */
export interface JokeFilters {
  category?: JokeCategory;
  type?: JokeType;
  blacklistFlags?: JokeFlag[];
  safeMode?: boolean;
  lang?: JokeLang;
  contains?: string;
  amount?: number;
}
