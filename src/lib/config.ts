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
  github: {
    // Primary endpoint: the user's own repositories. The panel makes a second
    // GitHub call (the search endpoint) for "trending AI/agent" repos, built
    // inside the panel because its query carries a rolling 30-day date window.
    url: 'https://api.github.com/users/WilliamEbong/repos?sort=updated&per_page=10',
    refreshMs: 60 * 60_000,   // 60m refresh keeps us well under 60 req/hr anon
    timeoutMs: 10_000,
  },
} as const;

export type SourceKey = keyof typeof SOURCE_CONFIG;

// Shape every source entry conforms to — used by panel fetchers.
export interface SourceConfig {
  url: string;
  refreshMs: number;
  timeoutMs: number;
}
