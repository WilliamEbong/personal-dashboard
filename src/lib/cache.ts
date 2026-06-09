import { load } from '@tauri-apps/plugin-store';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Module-level singleton — the store file is opened once per session.
type StoreInstance = Awaited<ReturnType<typeof load>>;
let _store: StoreInstance | null = null;

async function getStore(): Promise<StoreInstance> {
  if (!_store) {
    _store = await load('panel-cache.json', { autoSave: true, defaults: {} });
  }
  return _store;
}

export async function readCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const store = await getStore();
    const entry = await store.get<CacheEntry<T>>(key);
    return entry ?? null;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    const store = await getStore();
    await store.set(key, { data, timestamp: Date.now() } satisfies CacheEntry<T>);
  } catch (err) {
    console.error('Cache write failed:', err);
  }
}
