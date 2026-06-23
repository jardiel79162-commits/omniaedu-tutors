import { supabase } from "@/integrations/supabase/client";

// getSession reads from localStorage (fast, no network), unlike getUser
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  supabase.realtime.setAuth(data.session?.access_token ?? "");
  return data.session?.user?.id ?? null;
}

// Per-user cache: tag every entry with the user id at write time and only
// return entries whose tag matches the current user. Prevents data from a
// previously-signed-in account from briefly appearing for the new user.
const store = new Map<string, { uid: string | null; value: unknown }>();
const STORAGE_PREFIX = "jtc-cache:";
const UID_KEY = "jtc-cache:__uid";

let currentUid: string | null = null;
if (typeof window !== "undefined") {
  try {
    currentUid = window.localStorage.getItem(UID_KEY);
  } catch {}
}

function readStorage<T>(key: string): { uid: string | null; value: T } | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeStorage<T>(key: string, entry: { uid: string | null; value: T }) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {}
}

function clearAllStorage() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {}
}

export const cache = {
  get<T>(key: string): T | undefined {
    const mem = store.get(key);
    if (mem) return mem.uid === currentUid ? (mem.value as T) : undefined;
    const fromDisk = readStorage<T>(key);
    if (!fromDisk) return undefined;
    store.set(key, fromDisk);
    return fromDisk.uid === currentUid ? (fromDisk.value as T) : undefined;
  },
  set<T>(key: string, value: T) {
    const entry = { uid: currentUid, value };
    store.set(key, entry);
    writeStorage(key, entry);
  },
  clear() {
    store.clear();
    clearAllStorage();
  },
  /**
   * Update the current user tag. Call on auth state changes. When the user
   * changes (login, logout, account switch), all cached data is wiped so
   * no stale info from the previous account leaks into the new session.
   */
  setUser(uid: string | null) {
    if (currentUid === uid) return;
    const previous = currentUid;
    currentUid = uid;
    if (typeof window !== "undefined") {
      try {
        if (uid) window.localStorage.setItem(UID_KEY, uid);
        else window.localStorage.removeItem(UID_KEY);
      } catch {}
    }
    // Account switch or logout: drop everything from the previous user.
    if (previous !== uid) {
      store.clear();
      clearAllStorage();
    }
  },
};
