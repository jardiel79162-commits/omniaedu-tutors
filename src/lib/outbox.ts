// Lightweight outbox for actions that must survive offline / network failures.
// Actions are queued in localStorage and a registered handler is retried
// whenever the connection comes back or the app focuses.

type OutboxItem<T = unknown> = {
  id: string;
  kind: string;
  payload: T;
  at: number;
  tries: number;
};

const KEY = "outbox:v1";
const MAX_TRIES = 8;

type Handler = (payload: unknown) => Promise<void>;
const handlers = new Map<string, Handler>();
let flushing = false;
let listenersAttached = false;

function read(): OutboxItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: OutboxItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
}

export function registerOutboxHandler(kind: string, fn: Handler): void {
  handlers.set(kind, fn);
  ensureListeners();
  // Try to drain queue immediately for this kind.
  if (typeof navigator === "undefined" || navigator.onLine !== false) {
    void flushOutbox();
  }
}

export function enqueueOutbox<T>(kind: string, payload: T): string {
  const item: OutboxItem<T> = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    payload,
    at: Date.now(),
    tries: 0,
  };
  const items = read();
  items.push(item as OutboxItem);
  write(items);
  ensureListeners();
  void flushOutbox();
  return item.id;
}

export async function flushOutbox(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    let items = read();
    if (items.length === 0) return;
    const remaining: OutboxItem[] = [];
    for (const item of items) {
      const handler = handlers.get(item.kind);
      if (!handler) {
        remaining.push(item);
        continue;
      }
      try {
        await handler(item.payload);
        // success → drop
      } catch {
        item.tries += 1;
        if (item.tries < MAX_TRIES) remaining.push(item);
        // dropped after MAX_TRIES
      }
    }
    write(remaining);
  } finally {
    flushing = false;
  }
}

function ensureListeners() {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;
  window.addEventListener("online", () => void flushOutbox());
  window.addEventListener("focus", () => void flushOutbox());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void flushOutbox();
  });
}
