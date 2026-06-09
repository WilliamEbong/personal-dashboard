export type FetchResult<T> =
  | { ok: true;  data: T;     status: number }
  | { ok: false; error: string; status: number | null };

export async function fetchWithTimeout<T>(
  url: string,
  timeoutMs: number,
  headers?: Record<string, string>,
): Promise<FetchResult<T>> {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal, headers });
    clearTimeout(timerId);

    if (res.status === 429) {
      return { ok: false, error: 'Rate limited (429) — will retry on next refresh.', status: 429 };
    }
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}`, status: res.status };
    }

    const data = await res.json() as T;
    return { ok: true, data, status: res.status };
  } catch (err) {
    clearTimeout(timerId);
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: `Timed out after ${timeoutMs}ms`, status: null };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown fetch error',
      status: null,
    };
  }
}
