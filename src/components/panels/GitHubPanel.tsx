import { usePanel, PanelFetcher } from '../../hooks/usePanel';
import { fetchWithTimeout } from '../../lib/fetchHelper';

// Only the repo fields we render (both endpoints return this same shape).
interface Repo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  stargazers_count: number;
  updated_at: string;
  description: string | null;
}

// The search endpoint wraps results in { items: [...] }.
interface SearchResponse {
  items: Repo[];
}

// Both halves of the panel, fetched together.
interface GitHubData {
  myRepos: Repo[];
  trending: Repo[];
}

const USERNAME = 'WilliamEbong';
const TOP_N = 10;

// Whether the optional token is present drives both the auth header and the
// little "auth:" hint in the header. The token is an env value (Vite only
// exposes VITE_-prefixed vars); it is never hardcoded. See .env.example.
const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

// GitHub recommends an explicit Accept header; the token, if present, lifts the
// rate limit from 60 to 5,000 req/hour.
function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  return headers;
}

// Compact relative time for a repo's updated_at timestamp.
function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

// Two-step fetch through the shared helper: (1) the user's repos (config.url),
// (2) trending AI/agent repos via the search API. GitHub has no trending
// endpoint, so we approximate it: repos carrying both the `ai` and `agent`
// topics, created in the last ~30 days, most-starred first. Defined at module
// level so its identity is stable across renders (usePanel depends on it).
const fetchGitHub: PanelFetcher<GitHubData> = async (config) => {
  const headers = githubHeaders();

  // (1) The user's own repositories. This is the core of the panel — if it
  // fails (e.g. rate limited), fail the whole refresh so the error surfaces.
  const reposResult = await fetchWithTimeout<Repo[]>(
    config.url, config.timeoutMs, headers,
  );
  if (!reposResult.ok) return reposResult;

  // (2) Trending AI/agent repos. Rolling 30-day window, so the query is built
  // here rather than living in static config.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60_000)
    .toISOString()
    .slice(0, 10); // YYYY-MM-DD
  const query = `topic:ai topic:agent created:>${since}`;
  const searchUrl =
    'https://api.github.com/search/repositories' +
    `?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${TOP_N}`;
  const searchResult = await fetchWithTimeout<SearchResponse>(
    searchUrl, config.timeoutMs, headers,
  );

  // The trending list is secondary: if only it fails, still render the user's
  // repos rather than failing the panel. (Empty list renders a friendly note.)
  const trending = searchResult.ok ? searchResult.data.items : [];

  return {
    ok: true,
    data: { myRepos: reposResult.data, trending },
    status: 200,
  };
};

const linkStyle: React.CSSProperties = {
  color: '#60a5fa',
  textDecoration: 'none',
};

function RepoRow({ repo, showUpdated }: { repo: Repo; showUpdated: boolean }) {
  return (
    <li style={{ marginBottom: 6 }}>
      <a href={repo.html_url} target="_blank" rel="noreferrer noopener" style={linkStyle}>
        {showUpdated ? repo.name : repo.full_name}
      </a>
      {repo.description && (
        <div style={{ fontSize: '0.72em', color: '#aaa', margin: '1px 0' }}>
          {repo.description}
        </div>
      )}
      <div style={{ fontSize: '0.7em', color: '#888' }}>
        ★ {repo.stargazers_count}
        {showUpdated ? ` · updated ${timeAgo(repo.updated_at)}` : ''}
      </div>
    </li>
  );
}

export function GitHubPanel() {
  const { data, error, lastUpdated, isLoading } = usePanel<GitHubData>(
    'github',
    fetchGitHub,
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
      <strong>GitHub</strong>
      <div style={{ fontSize: '0.75em', color: '#888', marginBottom: 8 }}>
        source: api.github.com · refresh: 60m · auth:{' '}
        {TOKEN ? 'token' : 'anonymous (60 req/hr)'}
      </div>

      {isLoading && !data && <div>Loading…</div>}

      {data && (
        <>
          <div style={{ fontSize: '0.85em', color: '#ccc', marginBottom: 4 }}>
            My repositories · @{USERNAME}
          </div>
          {data.myRepos.length > 0 ? (
            <ol style={{ margin: '0 0 12px', paddingLeft: '1.5em', lineHeight: 1.4 }}>
              {data.myRepos.map((r) => (
                <RepoRow key={r.id} repo={r} showUpdated />
              ))}
            </ol>
          ) : (
            <div style={{ fontSize: '0.8em', color: '#888', marginBottom: 12 }}>
              No repositories found.
            </div>
          )}

          <div style={{ fontSize: '0.85em', color: '#ccc', marginBottom: 4 }}>
            Trending AI/agent repos · last 30 days
          </div>
          {data.trending.length > 0 ? (
            <ol style={{ margin: 0, paddingLeft: '1.5em', lineHeight: 1.4 }}>
              {data.trending.map((r) => (
                <RepoRow key={r.id} repo={r} showUpdated={false} />
              ))}
            </ol>
          ) : (
            <div style={{ fontSize: '0.8em', color: '#888' }}>
              Trending list unavailable right now — will retry on next refresh.
            </div>
          )}
        </>
      )}

      {error && (
        <div style={{ color: '#f87171', marginTop: 8, fontSize: '0.85em' }}>
          {data
            ? 'Refresh failed — showing cached data. Will retry on next refresh. '
            : 'Could not load GitHub data — will retry. '}
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
