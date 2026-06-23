import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchFeed, type Post } from "@/lib/social";
import { PostCard } from "@/components/PostCard";
import { StoriesRail } from "@/components/StoriesRail";
import { supabase } from "@/integrations/supabase/client";
import { useSwr } from "@/lib/swr-cache";
import { prefetchImages } from "@/lib/image-cache";
import { Compass, Bell, Plus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
});

function FeedPage() {
  const { data: posts, loading, refresh, setData } = useSwr<Post[]>(
    "feed:home",
    () => fetchFeed({ limit: 30 }),
  );
  const [unread, setUnread] = useState(0);

  async function loadUnread() {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .is("read_at", null);
    setUnread(count ?? 0);
  }

  useEffect(() => {
    loadUnread();
    const ch = supabase
      .channel("feed-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => refresh())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => loadUnread())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, () => loadUnread())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = posts ?? [];
  const showEmpty = !loading && list.length === 0;

  // Warm the browser cache for upcoming images so scrolling feels instant.
  useEffect(() => {
    if (!list.length) return;
    const urls: (string | null | undefined)[] = [];
    for (const p of list) {
      urls.push(p.author?.avatar_url);
      const media = (p as any).media as Array<{ url?: string; thumbnail_url?: string | null; type?: string }> | undefined;
      if (media) {
        for (const m of media) {
          if (m.type === "image" && m.url) urls.push(m.url);
          if (m.thumbnail_url) urls.push(m.thumbnail_url);
        }
      }
    }
    prefetchImages(urls);
  }, [list]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <header className="app-header px-5 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Peacely logo mark */}
          <div
            className="h-9 w-9 rounded-xl grid place-items-center shadow-soft shrink-0"
            style={{ background: "var(--gradient-brand)" }}
          >
            <span className="text-white text-lg leading-none" aria-hidden>✌</span>
          </div>
          <div>
            <h1
              className="text-xl font-black leading-none tracking-tight"
              style={{
                fontFamily: "var(--font-display)",
                background: "linear-gradient(135deg, var(--cosmos-violet), var(--cosmos-coral))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Peacely
            </h1>
            <p className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">Feed</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Link
            to="/explore"
            className="h-10 w-10 grid place-items-center rounded-2xl hover:bg-white/5 transition-colors"
            aria-label="Descobrir"
          >
            <Compass className="h-5 w-5" />
          </Link>
          <Link
            to="/notifications"
            className="relative h-10 w-10 grid place-items-center rounded-2xl hover:bg-white/5 transition-colors"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span
                className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 text-[9px] font-bold rounded-full text-white grid place-items-center"
                style={{ background: "var(--cosmos-coral)" }}
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link
            to="/create"
            className="h-10 w-10 grid place-items-center rounded-2xl shadow-soft text-white transition-transform active:scale-90"
            style={{ background: "linear-gradient(135deg, var(--cosmos-violet), var(--cosmos-coral))" }}
            aria-label="Criar post"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* ── Main feed ── */}
      <main className="app-content">
        <StoriesRail />

        {loading && list.length === 0 ? (
          /* Loading skeletons */
          <div className="max-w-xl mx-auto px-3 space-y-5 mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="peacely-card overflow-hidden" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="cosmos-skeleton" style={{ aspectRatio: "1" }} />
                <div className="p-4 space-y-2">
                  <div className="cosmos-skeleton h-3 rounded-full w-2/3" />
                  <div className="cosmos-skeleton h-3 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : showEmpty ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
            <div
              className="h-20 w-20 rounded-3xl grid place-items-center mb-6 shadow-float"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
              Seu cosmos está vazio
            </h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-xs leading-relaxed">
              Siga pessoas ou faça sua primeira postagem para preencher seu universo.
            </p>
            <Link
              to="/create"
              className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white shadow-soft transition-transform active:scale-95"
              style={{ background: "linear-gradient(135deg, var(--cosmos-violet), var(--cosmos-coral))" }}
            >
              <Plus className="h-4 w-4" /> Criar post
            </Link>
            <div className="mt-4">
              <Link to="/explore" className="text-sm font-medium" style={{ color: "var(--cosmos-teal)" }}>
                Descobrir pessoas →
              </Link>
            </div>
          </div>
        ) : (
          /* Feed posts */
          <div className="max-w-xl mx-auto pb-4">
            {list.map((p, i) => (
              <PostCard
                key={p.id}
                post={p}
                priority={i < 3}
                onDeleted={(id) => setData((prev) => (prev ?? []).filter((x) => x.id !== id))}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
