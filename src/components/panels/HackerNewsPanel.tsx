import { usePanel, PanelFetcher } from '../../hooks/usePanel';
import { fetchWithTimeout } from '../../lib/fetchHelper';

// A single Hacker News item (only the fields we render).
interface Story {
  id: number;
  title: string;
  url?: string;       // external link; absent for Ask HN / text posts
  score?: number;
  descendants?: number; // comment count
  by?: string;
}

const TOP_N = 10;
const ITEM_URL = (id: number) =>
  `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
const HN_DISCUSSION = (id: number) =>
  `https://news.ycombinator.com/item?id=${id}`;

// Multi-step fetch: first the list of top-story IDs (config.url), then the
// top N items individually. Every request goes through the shared fetch
// helper so timeouts/429s/errors are handled uniformly. Defined at module
// level so its identity is stable across renders (the refresh interval in
// usePanel depends on it).
const fetchTopStories: PanelFetcher<Story[]> = async (config) => {
  const idsResult = await fetchWithTimeout<number[]>(config.url, config.timeoutMs);
  if (!idsResult.ok) return idsResult;

  const topIds = idsResult.data.slice(0, TOP_N);
  const items = await Promise.all(
    topIds.map((id) => fetchWithTimeout<Story>(ITEM_URL(id), config.timeoutMs)),
  );

  // Keep whatever items came back; HN occasionally returns null for an item.
  const stories = items
    .filter((r): r is Extract<typeof r, { ok: true }> => r.ok && r.data != null)
    .map((r) => r.data);

  if (stories.length === 0) {
    return { ok: false, error: 'Could not load any stories.', status: null };
  }
  return { ok: true, data: stories, status: 200 };
};

export function HackerNewsPanel() {
  const { data, error, lastUpdated, isLoading } = usePanel<Story[]>(
    'hackernews',
    fetchTopStories,
  );

  const ageMinutes = lastUpdated
    ? Math.round((Date.now() - lastUpdated) / 60_000)
    : null;

  return (
    <div style={{
      border: '1px solid #555',
      borderRadius: 6,
      padding: '1rem',
      margin: '1rem',
      fontFamily: 'monospace',
      maxWidth: 560,
    }}>
      <strong>Hacker News · Top Stories</strong>
      <div style={{ fontSize: '0.75em', color: '#888', marginBottom: 8 }}>
        source: news.ycombinator.com · refresh: 60m
      </div>

      {isLoading && !data && <div>Loading…</div>}

      {data && (
        <ol style={{ margin: 0, paddingLeft: '1.5em', lineHeight: 1.5 }}>
          {data.map((s) => (
            <li key={s.id} style={{ marginBottom: 6 }}>
              <a
                href={s.url ?? HN_DISCUSSION(s.id)}
                target="_blank"
                rel="noreferrer noopener"
                style={{ color: '#60a5fa', textDecoration: 'none' }}
              >
                {s.title}
              </a>
              <div style={{ fontSize: '0.7em', color: '#888' }}>
                {s.score ?? 0} points
                {' · '}
                <a
                  href={HN_DISCUSSION(s.id)}
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{ color: '#888' }}
                >
                  {s.descendants ?? 0} comments
                </a>
                {s.by ? ` · by ${s.by}` : ''}
              </div>
            </li>
          ))}
        </ol>
      )}

      {error && (
        <div style={{ color: '#f87171', marginTop: 8, fontSize: '0.85em' }}>
          {data
            ? 'Refresh failed — showing cached stories. Will retry on next refresh. '
            : 'Could not load stories — will retry. '}
          {error}
        </div>
      )}

      {ageMinutes !== null && (
        <div style={{ color: '#888', marginTop: 8, fontSize: '0.75em' }}>
          Last updated: {ageMinutes === 0 ? 'just now' : `${ageMinutes}m ago`}
          {error && data ? ' (stale)' : ''}
        </div>
      )}
    </div>
  );
}
