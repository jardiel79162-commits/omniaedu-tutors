import { useEffect, useRef, useState } from "react";
import { cache } from "@/lib/app-cache";

/**
 * Persistent SWR cache. Returns cached data SYNCHRONOUSLY on revisit
 * (from memory + localStorage, per-user tagged), then refreshes in the
 * background — but only if the cache is older than `freshFor` ms.
 * In-flight fetches are deduplicated per key.
 */

type Entry = { value: unknown; at: number };

const memory = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

function readEntry<T>(key: string): Entry | undefined {
  const m = memory.get(key);
  if (m) return m;
  const persisted = cache.get<Entry>(`swr:${key}`);
  if (persisted && typeof persisted === "object" && "value" in persisted) {
    memory.set(key, persisted);
    return persisted;
  }
  // Backward-compat: legacy plain-value cache
  if (persisted !== undefined) {
    const entry = { value: persisted as T, at: 0 };
    memory.set(key, entry);
    return entry;
  }
  return undefined;
}

export function getCached<T>(key: string): T | undefined {
  return readEntry<T>(key)?.value as T | undefined;
}

export function setCached<T>(key: string, value: T): void {
  const entry = { value, at: Date.now() };
  memory.set(key, entry);
  cache.set(`swr:${key}`, entry);
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    memory.clear();
    return;
  }
  for (const k of Array.from(memory.keys())) {
    if (k.startsWith(prefix)) memory.delete(k);
  }
}

export type SwrState<T> = {
  data: T | undefined;
  loading: boolean;
  refresh: () => Promise<void>;
  setData: (next: T | ((prev: T | undefined) => T)) => void;
};

export function useSwr<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { freshFor?: number },
): SwrState<T> {
  const freshFor = opts?.freshFor ?? 15_000; // skip refresh if cache <15s old
  const cached = readEntry<T>(key);
  const [data, setDataState] = useState<T | undefined>(cached?.value as T | undefined);
  const [loading, setLoading] = useState<boolean>(cached === undefined);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const mountedRef = useRef(true);

  async function refresh() {
    try {
      let p = inflight.get(key);
      if (!p) {
        p = fetcherRef.current();
        inflight.set(key, p);
        p.finally(() => inflight.delete(key));
      }
      const next = (await p) as T;
      if (!mountedRef.current) return;
      setCached(key, next);
      setDataState(next);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    const entry = readEntry<T>(key);
    const isFresh = entry && Date.now() - entry.at < freshFor;
    if (!isFresh) void refresh();
    else setLoading(false);
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function setData(next: T | ((prev: T | undefined) => T)) {
    setDataState((prev) => {
      const value = typeof next === "function" ? (next as (p: T | undefined) => T)(prev) : next;
      setCached(key, value);
      return value;
    });
  }

  return { data, loading, refresh, setData };
}
