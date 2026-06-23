// Persistent image cache: tracks which URLs the browser has already loaded
// so we can render <img> with `decoding="sync"` (no flicker) on re-mount.
// URLs are persisted in localStorage so the cache survives reloads — the
// browser HTTP cache + service worker will serve bytes instantly, and the
// `sync` decode avoids the visible flash.

const KEY = "img-cache:v1";
const LIMIT = 2000;

const loaded = new Set<string>();
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const arr = JSON.parse(raw) as string[];
      for (const u of arr) loaded.add(u);
    }
  } catch {}
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    const arr = Array.from(loaded);
    const trimmed = arr.length > LIMIT ? arr.slice(arr.length - LIMIT) : arr;
    window.localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {}
}

export function isImageCached(url: string | null | undefined): boolean {
  if (!url) return false;
  hydrate();
  return loaded.has(url);
}

export function markImageLoaded(url: string | null | undefined): void {
  if (!url) return;
  hydrate();
  if (loaded.has(url)) return;
  loaded.add(url);
  // Persist lazily so we don't block paint.
  if (typeof window !== "undefined") {
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(persist, { timeout: 2000 });
    } else {
      setTimeout(persist, 1000);
    }
  }
}

// Warm the browser cache for a list of URLs (avatars, thumbnails, etc.).
// Safe to call repeatedly — already-cached URLs are skipped.
export function prefetchImages(urls: Array<string | null | undefined>): void {
  if (typeof window === "undefined") return;
  hydrate();
  for (const url of urls) {
    if (!url || loaded.has(url)) continue;
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.onload = () => markImageLoaded(url);
    img.src = url;
  }
}
