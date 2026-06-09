// Central config: every data source lives here.
// To add a new panel, add one entry — nothing else changes.
export const SOURCE_CONFIG = {
  hackernews: {
    // Entry point: the list of top-story IDs. Individual items are fetched
    // from .../item/<id>.json by the panel's own fetcher.
    url: 'https://hacker-news.firebaseio.com/v0/topstories.json',
    refreshMs: 60 * 60_000,   // re-fetch every 60 minutes
    timeoutMs: 10_000,        // abort if no response within 10 seconds
  },
} as const;

export type SourceKey = keyof typeof SOURCE_CONFIG;

// Shape every source entry conforms to — used by panel fetchers.
export interface SourceConfig {
  url: string;
  refreshMs: number;
  timeoutMs: number;
}
