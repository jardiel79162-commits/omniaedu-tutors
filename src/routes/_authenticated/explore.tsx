import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSwr } from "@/lib/swr-cache";
import { Search, ArrowLeft, Play } from "lucide-react";

type ExploreSearch = { tag?: string; q?: string };

export const Route = createFileRoute("/_authenticated/explore")({
  validateSearch: (s: Record<string, unknown>): ExploreSearch => ({
    tag: typeof s.tag === "string" ? s.tag : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  component: ExplorePage,
});

type MediaRow = {
  id: string;
  post_id: string;
  url: string;
  mime: string;
};

async function fetchExploreMedia(tag: string | undefined): Promise<MediaRow[]> {
  let postIds: string[] | null = null;
  if (tag) {
    const { data } = await supabase
      .from("post_hashtags")
      .select("post_id")
      .eq("tag", tag.toLowerCase());
    postIds = ((data ?? []) as any[]).map((r) => r.post_id);
    if (!postIds.length) return [];
  }
  let q1 = supabase
    .from("post_media")
    .select("id,post_id,url,mime,position")
    .eq("position", 0)
    .order("post_id", { ascending: false })
    .limit(60);
  if (postIds) q1 = q1.in("post_id", postIds);
  const { data } = await q1;
  return ((data as any) ?? []) as MediaRow[];
}

function ExplorePage() {
  const { tag, q } = useSearch({ from: "/_authenticated/explore" });
  const navigate = useNavigate();
  const [query, setQuery] = useState(q ?? (tag ? `#${tag}` : ""));
  const [users, setUsers] = useState<any[]>([]);

  const { data: trendingData } = useSwr<{ tag: string; uses_count: number }[]>(
    "explore:trending",
    async () => {
      const { data } = await supabase
        .from("hashtags")
        .select("tag,uses_count")
        .order("uses_count", { ascending: false })
        .limit(12);
      return ((data as any) ?? []) as { tag: string; uses_count: number }[];
    },
  );
  const trending = trendingData ?? [];

  const { data: mediaData } = useSwr<MediaRow[]>(
    `explore:media:${tag ?? "all"}`,
    () => fetchExploreMedia(tag),
  );
  const media = mediaData ?? [];

  useEffect(() => {
    if (!q || q.startsWith("#")) {
      setUsers([]);
      return;
    }
    const term = q.replace("@", "").trim();
    if (!term) return;
    supabase
      .from("profiles")
      .select("id,full_name,username,avatar_url")
      .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
      .limit(20)
      .then(({ data }) => setUsers((data as any) ?? []));
  }, [q]);

  function submit() {
    const v = query.trim();
    if (v.startsWith("#")) {
      navigate({ to: "/explore", search: { tag: v.slice(1).toLowerCase() } });
    } else {
      navigate({ to: "/explore", search: { q: v } });
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="app-header flex items-center gap-2 px-3 pt-5 pb-3 border-b">
        <Link to="/feed" className="h-10 w-10 grid place-items-center rounded-full" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Pesquisar pessoas ou #hashtag"
            className="w-full rounded-full bg-muted pl-9 pr-4 py-2 text-sm outline-none"
          />
        </div>
      </header>
      <main className="app-content p-3 space-y-5">
        {!tag && !q && trending.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-2 px-1">Em alta</h2>
            <div className="flex flex-wrap gap-2">
              {trending.map((t) => (
                <Link
                  key={t.tag}
                  to="/explore"
                  search={{ tag: t.tag }}
                  className="px-3 py-1.5 rounded-full bg-muted text-sm font-medium"
                >
                  #{t.tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        {users.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-2 px-1">Pessoas</h2>
            <ul className="divide-y border rounded-xl overflow-hidden">
              {users.map((u) => (
                <li key={u.id}>
                  <Link
                    to="/u/$username"
                    params={{ username: u.username || "usuario" }}
                    className="flex items-center gap-3 p-3 hover:bg-muted"
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-brand grid place-items-center text-white font-bold overflow-hidden">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (u.full_name || u.username || "?").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{u.full_name || u.username}</div>
                      <div className="text-xs text-muted-foreground">@{u.username}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          {tag && <h2 className="text-sm font-semibold mb-2 px-1">#{tag}</h2>}
          <div className="grid grid-cols-3 gap-1">
            {media.map((m) => (
              <Link
                key={m.id}
                to="/p/$id"
                params={{ id: m.post_id }}
                className="relative aspect-square bg-muted overflow-hidden"
              >
                {m.mime.startsWith("video/") ? (
                  <>
                    <video src={m.url} muted className="w-full h-full object-cover" />
                    <div className="absolute top-1 right-1 text-white">
                      <Play className="h-4 w-4 fill-white" />
                    </div>
                  </>
                ) : (
                  <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                )}
              </Link>
            ))}
          </div>
          {media.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nada encontrado</p>
          )}
        </div>
      </main>
    </div>
  );
}
