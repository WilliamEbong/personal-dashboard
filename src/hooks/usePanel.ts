import { useState, useEffect, useCallback, useRef } from 'react';
import { SOURCE_CONFIG, SourceKey, SourceConfig } from '../lib/config';
import { fetchWithTimeout, FetchResult } from '../lib/fetchHelper';
import { readCache, writeCache } from '../lib/cache';

export interface PanelState<T> {
  data: T | null;
  error: string | null;
  lastUpdated: number | null;
  isLoading: boolean;
}

// A panel fetcher turns the source config into a result. The default just
// fetches the configured URL; panels with multi-step fetches (e.g. fetch a
// list of IDs, then each item) provide their own — but still go through the
// shared fetch helper and the same cache/refresh machinery below.
export type PanelFetcher<T> = (config: SourceConfig) => Promise<FetchResult<T>>;

function defaultFetcher<T>(config: SourceConfig): Promise<FetchResult<T>> {
  return fetchWithTimeout<T>(config.url, config.timeoutMs);
}

export function usePanel<T>(
  key: SourceKey,
  fetcher: PanelFetcher<T> = defaultFetcher,
): PanelState<T> {
  const config = SOURCE_CONFIG[key];
  // Tracks whether a successful network response has already arrived this
  // session, so a slow cache read can't overwrite fresh data.
  const hasFreshData = useRef(false);

  const [state, setState] = useState<PanelState<T>>({
    data: null,
    error: null,
    lastUpdated: null,
    isLoading: true,
  });

  const refresh = useCallback(async () => {
    const result = await fetcher(config);
    if (result.ok) {
      hasFreshData.current = true;
      await writeCache(key, result.data);
      setState({
        data: result.data,
        error: null,
        lastUpdated: Date.now(),
        isLoading: false,
      });
    } else {
      // Keep whatever data we already have; only update the error.
      setState(prev => ({ ...prev, error: result.error, isLoading: false }));
    }
  }, [key, config, fetcher]);

  // On mount: read the disk cache and show it immediately while the network
  // request is in flight.  Skip if fresh data already arrived first.
  useEffect(() => {
    readCache<T>(key).then(cached => {
      if (cached && !hasFreshData.current) {
        setState(prev => ({
          ...prev,
          data: cached.data,
          lastUpdated: cached.timestamp,
          isLoading: false,
        }));
      }
    });
  }, [key]);

  // Fetch once immediately, then on the configured interval.
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, config.refreshMs);
    return () => clearInterval(id);
  }, [refresh, config.refreshMs]);

  return state;
}
