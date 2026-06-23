import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Bookmark, Plus, Folder, X } from "lucide-react";
import {
  type Collection,
  createCollection,
  deleteCollection,
  fetchSavedPosts,
  listCollections,
} from "@/lib/saves";
import type { Post } from "@/lib/social";
import { useSwr } from "@/lib/swr-cache";

export const Route = createFileRoute("/_authenticated/saved")({
  component: SavedPage,
});

function SavedPage() {
  const [active, setActive] = useState<string | "all">("all");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: collectionsData, setData: setCollections } = useSwr<Collection[]>(
    "saved:collections",
    () => listCollections(),
  );
  const { data: postsData, loading } = useSwr<Post[]>(
    `saved:posts:${active}`,
    () => fetchSavedPosts(active === "all" ? undefined : active),
  );
  const collections = collectionsData ?? [];
  const posts = postsData ?? [];

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const c = await createCollection(name);
    setNewName("");
    setCreating(false);
    setCollections((prev) => [c, ...(prev ?? [])]);
  }

  async function onDelete(id: string) {
    if (!confirm("Excluir esta coleção? Os posts continuam salvos sem coleção.")) return;
    await deleteCollection(id);
    setCollections((prev) => (prev ?? []).filter((c) => c.id !== id));
    if (active === id) setActive("all");
  }

  return (
    <div className="flex flex-col h-full">
      <header className="app-header px-5 pt-5 pb-3 flex items-center gap-3">
        <Link to="/profile" className="h-10 w-10 grid place-items-center rounded-full hover:bg-muted" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Bookmark className="h-5 w-5" /> Salvos
          </h1>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="h-10 w-10 grid place-items-center rounded-full bg-primary text-primary-foreground"
          aria-label="Nova coleção"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <main className="app-content">
        {creating && (
          <form onSubmit={onCreate} className="px-4 py-3 border-b flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da coleção (ex: Viagens)"
              className="flex-1 h-10 rounded-full bg-muted px-4 text-sm outline-none"
              maxLength={40}
            />
            <button
              type="submit"
              className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              Criar
            </button>
          </form>
        )}

        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none border-b">
          <Chip active={active === "all"} onClick={() => setActive("all")}>
            Todos
          </Chip>
          {collections.map((c) => (
            <Chip
              key={c.id}
              active={active === c.id}
              onClick={() => setActive(c.id)}
              onDelete={() => onDelete(c.id)}
            >
              <Folder className="h-3.5 w-3.5" />
              {c.name}
            </Chip>
          ))}
        </div>

        {loading ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : posts.length === 0 ? (
          <div className="p-10 text-center">
            <Bookmark className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-semibold">Nada salvo aqui</p>
            <p className="text-sm text-muted-foreground mt-1">
              Toque no marcador <Bookmark className="inline h-3.5 w-3.5" /> em qualquer post para guardá-lo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-px bg-border">
            {posts.map((p) => (
              <Link
                key={p.id}
                to="/p/$id"
                params={{ id: p.id }}
                className="aspect-square bg-muted overflow-hidden relative"
              >
                {p.media?.[0]?.mime.startsWith("video/") ? (
                  <video src={p.media[0].url} className="w-full h-full object-cover" muted />
                ) : p.media?.[0]?.url ? (
                  <img src={p.media[0].url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-xs text-muted-foreground p-2 text-center">
                    {p.caption.slice(0, 60) || "Post"}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Chip({
  active,
  onClick,
  onDelete,
  children,
}: {
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-xs font-semibold transition ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
      }`}
    >
      <button onClick={onClick} className="inline-flex items-center gap-1.5">
        {children}
      </button>
      {onDelete && active && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Excluir coleção"
          className="ml-1 opacity-80 hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
