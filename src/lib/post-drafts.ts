// Lightweight IndexedDB store for in-progress post drafts.
// Persists File blobs intact so the user can resume exactly where they left off.

const DB_NAME = "post-drafts";
const STORE = "drafts";
const VERSION = 1;

export type DraftItem = {
  name: string;
  type: string;
  isVideo: boolean;
  blob: Blob;
};

export type PostDraft = {
  id: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  items: DraftItem[];
  caption: string;
  audience: "public" | "followers" | "private";
  allowComments: boolean;
  filter: string;
  ratio: "4:5" | "1:1" | "16:9";
  adjust: Record<string, number | boolean>;
  step: 1 | 2 | 3;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: "id" });
        s.createIndex("userId", "userId", { unique: false });
        s.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | Promise<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const r = fn(store);
        if (r instanceof IDBRequest) {
          r.onsuccess = () => resolve(r.result as T);
          r.onerror = () => reject(r.error);
        } else {
          Promise.resolve(r).then(resolve, reject);
        }
        t.onerror = () => reject(t.error);
      }),
  );
}

export async function listDrafts(userId: string): Promise<PostDraft[]> {
  try {
    const all = await tx<PostDraft[]>("readonly", (s) => s.getAll() as IDBRequest<PostDraft[]>);
    return all
      .filter((d) => d.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function getDraft(id: string): Promise<PostDraft | null> {
  try {
    const d = await tx<PostDraft | undefined>("readonly", (s) => s.get(id) as IDBRequest<PostDraft | undefined>);
    return d ?? null;
  } catch {
    return null;
  }
}

export async function saveDraft(draft: PostDraft): Promise<void> {
  try {
    await tx<unknown>("readwrite", (s) => s.put(draft) as IDBRequest<unknown>);
  } catch (e) {
    console.warn("saveDraft failed", e);
  }
}

export async function deleteDraft(id: string): Promise<void> {
  try {
    await tx<unknown>("readwrite", (s) => s.delete(id) as IDBRequest<unknown>);
  } catch {}
}

export function makeDraftId(): string {
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
