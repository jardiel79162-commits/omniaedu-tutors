import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { fetchUserPosts, type Post } from "@/lib/social";
import { supabase } from "@/integrations/supabase/client";
import { LayoutGrid, Grid3x3, Film, Play, Heart, MessageCircle, Globe2, Users, Lock } from "lucide-react";

type Tab = "all" | "reel" | "photo";

export function ProfilePostsGrid({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    const reload = () =>
      fetchUserPosts(userId).then((p) => {
        if (live) setPosts(p);
      });
    reload().finally(() => live && setLoading(false));

    const ch = supabase
      .channel(`profile-posts-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `author_id=eq.${userId}` },
        () => reload(),
      )
      .subscribe();

    return () => {
      live = false;
      supabase.removeChannel(ch);
    };
  }, [userId]);

  const counts = {
    all: posts.length,
    reel: posts.filter((p) => p.kind === "reel").length,
    photo: posts.filter((p) => p.kind === "photo").length,
  };
  const filtered = tab === "all" ? posts : posts.filter((p) => p.kind === tab);

  return (
    <div className="mt-2 border-t">
      <div className="flex">
        <TabBtn active={tab === "all"} onClick={() => setTab("all")} icon={<LayoutGrid className="h-4 w-4" />} label={`Todos · ${counts.all}`} />
        <TabBtn active={tab === "reel"} onClick={() => setTab("reel")} icon={<Film className="h-4 w-4" />} label={`TWOS · ${counts.reel}`} />
        <TabBtn active={tab === "photo"} onClick={() => setTab("photo")} icon={<Grid3x3 className="h-4 w-4" />} label={`Posts · ${counts.photo}`} />
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-1 p-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10 px-6">
          {tab === "reel" ? "Nenhum reel ainda." : tab === "photo" ? "Nenhum post ainda. Compartilhe seu primeiro momento." : "Nada por aqui ainda."}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {filtered.map((p) => {
            const m = p.media?.[0];
            if (!m) return null;
            const Icon =
              p.visibility === "private" ? Lock : p.visibility === "followers" ? Users : Globe2;
            return (
              <Link
                key={p.id}
                to="/p/$id"
                params={{ id: p.id }}
                className="relative aspect-square bg-muted overflow-hidden group"
              >
                {m.mime.startsWith("video/") ? (
                  <>
                    <video src={m.url} muted className="w-full h-full object-cover" />
                    <Play className="absolute top-1 right-1 h-4 w-4 fill-white text-white drop-shadow" />
                  </>
                ) : (
                  <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                )}
                <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between text-[10px] text-white opacity-0 group-hover:opacity-100 transition">
                  <span className="inline-flex items-center gap-1 bg-black/50 rounded-full px-1.5 py-0.5">
                    <Heart className="h-3 w-3" /> {p.likes_count}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-black/50 rounded-full px-1.5 py-0.5">
                    <MessageCircle className="h-3 w-3" /> {p.comments_count}
                  </span>
                </div>
                <Icon className="absolute top-1 left-1 h-3.5 w-3.5 text-white drop-shadow" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 inline-flex items-center justify-center gap-2 ${active ? "border-t-2 border-primary -mt-px text-foreground" : "text-muted-foreground"}`}
    >
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
