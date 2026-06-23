import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { recentPostAuthors } from "@/lib/social";
import { useSwr } from "@/lib/swr-cache";
import { Plus } from "lucide-react";

type Friend = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  hasNewPost?: boolean;
};

type Me = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type RailData = { me: Me | null; friends: Friend[] };

async function fetchRail(): Promise<RailData> {
  const { data: ses } = await supabase.auth.getSession();
  const uid = ses.session?.user?.id;
  if (!uid) return { me: null, friends: [] };

  const { data: myProf } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .eq("id", uid)
    .maybeSingle();

  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", uid)
    .limit(50);
  const ids = (follows ?? []).map((f: any) => f.following_id);
  if (!ids.length) return { me: (myProf as Me) ?? null, friends: [] };

  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", ids);

  const liveSet = await recentPostAuthors(ids, 24);

  const list: Friend[] = (profs ?? []).map((p: any) => ({
    ...p,
    hasNewPost: liveSet.has(p.id),
  }));
  list.sort((a, b) => Number(b.hasNewPost) - Number(a.hasNewPost));
  return { me: (myProf as Me) ?? null, friends: list };
}

export function FriendsRail() {
  const { data, loading } = useSwr<RailData>("friends-rail", fetchRail);
  const me = data?.me ?? null;
  const friends = data?.friends ?? [];

  if (loading && !data) {
    return (
      <div className="flex gap-3 px-4 py-3 overflow-x-auto no-scrollbar border-b">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 shrink-0">
            <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
            <div className="h-2 w-12 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-4 py-3 overflow-x-auto no-scrollbar border-b">
      {me && (
        <Link
          to="/create"
          className="flex flex-col items-center gap-1 shrink-0 w-16"
          aria-label="Criar um post"
        >
          <div className="relative h-16 w-16">
            <Avatar profile={me} size={64} />
            <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary text-primary-foreground border-2 border-background grid place-items-center">
              <Plus className="h-3 w-3" strokeWidth={3} />
            </span>
          </div>
          <span className="text-[11px] font-medium truncate max-w-full">Seu post</span>
        </Link>
      )}

      {friends.length === 0 ? (
        <Link
          to="/explore"
          className="flex flex-col items-center gap-1 shrink-0 w-16 text-muted-foreground"
        >
          <div className="h-16 w-16 rounded-full border-2 border-dashed border-border grid place-items-center">
            <Plus className="h-5 w-5" />
          </div>
          <span className="text-[11px]">Seguir</span>
        </Link>
      ) : (
        friends.map((f) => (
          <Link
            key={f.id}
            to="/u/$username"
            params={{ username: f.username || f.id }}
            className="flex flex-col items-center gap-1 shrink-0 w-16"
          >
            <div
              className={
                f.hasNewPost
                  ? "rounded-full p-[2px] bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-amber-400"
                  : "rounded-full p-[2px] bg-transparent ring-1 ring-border"
              }
            >
              <div className="rounded-full bg-background p-[2px]">
                <Avatar profile={f} size={56} />
              </div>
            </div>
            <span className="text-[11px] truncate max-w-full">
              {f.username || f.full_name || "amigo"}
            </span>
          </Link>
        ))
      )}
    </div>
  );
}

function Avatar({
  profile,
  size,
}: {
  profile: { username: string | null; full_name: string | null; avatar_url: string | null };
  size: number;
}) {
  const initial = (profile.full_name || profile.username || "?").charAt(0).toUpperCase();
  return (
    <div
      style={{ height: size, width: size }}
      className="rounded-full overflow-hidden bg-gradient-brand text-white grid place-items-center font-bold"
    >
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.4 }}>{initial}</span>
      )}
    </div>
  );
}
