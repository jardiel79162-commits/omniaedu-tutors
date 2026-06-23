import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { useSwr } from "@/lib/swr-cache";
import { StoryComposer } from "./StoryComposer";
import { StoryViewer, type StoryGroup, type StoryItem } from "./StoryViewer";
import { CachedImage } from "@/components/CachedImage";

type Me = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_plus?: boolean | null;
};

type RailData = {
  me: Me | null;
  myStories: StoryItem[];
  groups: StoryGroup[];
  viewedIds: Set<string>;
};

async function fetchRail(): Promise<RailData> {
  const { data: ses } = await supabase.auth.getSession();
  const uid = ses.session?.user?.id ?? null;
  if (!uid) return { me: null, myStories: [], groups: [], viewedIds: new Set() };

  const { data: myProf } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, is_plus")
    .eq("id", uid)
    .maybeSingle();

  const { data: rows } = await supabase
    .from("statuses")
    .select("id,user_id,content,background,media_url,created_at,expires_at")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });

  const list = (rows ?? []) as StoryItem[];
  const myStories = list.filter((s) => s.user_id === uid);
  const others = list.filter((s) => s.user_id !== uid);

  const groupedMap = new Map<string, StoryItem[]>();
  others.forEach((s) => {
    const arr = groupedMap.get(s.user_id) ?? [];
    arr.push(s);
    groupedMap.set(s.user_id, arr);
  });

  const userIds = Array.from(groupedMap.keys());
  let profilesMap: Record<string, Me> = {};
  if (userIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, is_plus")
      .in("id", userIds);
    (profs ?? []).forEach((p: any) => {
      profilesMap[p.id] = p;
    });
  }

  // Viewed status ids
  let viewedIds = new Set<string>();
  const allOtherIds = others.map((s) => s.id);
  if (allOtherIds.length) {
    const { data: views } = await supabase
      .from("status_views")
      .select("status_id")
      .eq("viewer_id", uid)
      .in("status_id", allOtherIds);
    (views ?? []).forEach((v: any) => viewedIds.add(v.status_id));
  }

  const groups: StoryGroup[] = userIds
    .map((id) => ({
      user: profilesMap[id] ?? { id, username: null, full_name: null, avatar_url: null },
      items: groupedMap.get(id) ?? [],
    }))
    // Unseen first, then by latest story
    .sort((a, b) => {
      const aUnseen = a.items.some((s) => !viewedIds.has(s.id));
      const bUnseen = b.items.some((s) => !viewedIds.has(s.id));
      if (aUnseen !== bUnseen) return aUnseen ? -1 : 1;
      const al = a.items[a.items.length - 1].created_at;
      const bl = b.items[b.items.length - 1].created_at;
      return bl.localeCompare(al);
    });

  return { me: (myProf as Me) ?? null, myStories, groups, viewedIds };
}

export function StoriesRail() {
  const { data, loading, refresh, setData } = useSwr<RailData>("stories-rail", fetchRail);
  const [composing, setComposing] = useState(false);
  const [viewerStart, setViewerStart] = useState<number | null>(null);
  const [viewingMine, setViewingMine] = useState(false);

  useEffect(() => {
    const ch = supabase
      .channel("stories-rail-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "statuses" }, () => refresh())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "status_views" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const me = data?.me ?? null;
  const myStories = data?.myStories ?? [];
  const groups = data?.groups ?? [];
  const viewedIds = data?.viewedIds ?? new Set<string>();

  const markGroupViewed = useCallback(
    (groupIndex: number) => {
      if (!data) return;
      const g = data.groups[groupIndex];
      if (!g) return;
      const next = new Set(data.viewedIds);
      g.items.forEach((s) => next.add(s.id));
      setData({ ...data, viewedIds: next });
    },
    [data, setData],
  );

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
    <>
      <div className="flex gap-3 px-4 py-3 overflow-x-auto no-scrollbar border-b">
        {/* My story / add */}
        {me && (
          <button
            onClick={() => (myStories.length ? setViewingMine(true) : setComposing(true))}
            className="flex flex-col items-center gap-1 shrink-0 w-16"
            aria-label={myStories.length ? "Ver meu story" : "Adicionar story"}
          >
            <div className="relative h-16 w-16">
              {myStories.length > 0 ? (
                <div className={`rounded-full p-[2px] h-16 w-16 ${me.is_plus ? "plus-ring" : "bg-emerald-500"}`}>
                  <div className="rounded-full bg-background p-[2px] h-full w-full">
                    <Avatar profile={me} size={56} />
                  </div>
                </div>
              ) : me.is_plus ? (
                <div className="rounded-full p-[2px] h-16 w-16 plus-ring">
                  <div className="rounded-full bg-background p-[2px] h-full w-full">
                    <Avatar profile={me} size={56} />
                  </div>
                </div>
              ) : (
                <Avatar profile={me} size={64} />
              )}
              <span
                className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary text-primary-foreground border-2 border-background grid place-items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setComposing(true);
                }}
                role="button"
                aria-label="Adicionar story"
              >
                <Plus className="h-3 w-3" strokeWidth={3} />
              </span>
            </div>
            <span className="text-[11px] font-medium truncate max-w-full">Seu story</span>
          </button>
        )}

        {groups.length === 0 && (
          <Link
            to="/explore"
            className="flex flex-col items-center gap-1 shrink-0 w-16 text-muted-foreground"
          >
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-border grid place-items-center">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-[11px]">Seguir</span>
          </Link>
        )}

        {groups.map((g, idx) => {
          const allViewed = g.items.every((s) => viewedIds.has(s.id));
          const isPlusUser = !!(g.user as any).is_plus;
          const ringClass = isPlusUser
            ? "plus-ring"
            : allViewed
              ? "bg-muted-foreground/40"
              : "bg-emerald-500";
          const name = g.user.username || g.user.full_name || "amigo";
          return (
            <button
              key={g.user.id}
              onClick={() => setViewerStart(idx)}
              className="flex flex-col items-center gap-1 shrink-0 w-16"
            >
              <div className={`rounded-full p-[2px] h-16 w-16 ${ringClass}`}>
                <div className="rounded-full bg-background p-[2px] h-full w-full">
                  <Avatar profile={g.user} size={56} />
                </div>
              </div>
              <span className="text-[11px] truncate max-w-full inline-flex items-center gap-0.5">
                <span className="truncate">{name}</span>
                {isPlusUser && <span className="text-sky-500">✓</span>}
              </span>
            </button>
          );
        })}
      </div>

      {composing && (
        <StoryComposer
          onClose={() => {
            setComposing(false);
            refresh();
          }}
        />
      )}

      {viewerStart !== null && groups.length > 0 && (
        <StoryViewer
          groups={groups}
          startGroup={viewerStart}
          myId={me?.id ?? null}
          onClose={() => setViewerStart(null)}
          onAdvanceUser={markGroupViewed}
        />
      )}

      {viewingMine && myStories.length > 0 && me && (
        <StoryViewer
          groups={[{ user: me, items: myStories }]}
          startGroup={0}
          myId={me.id}
          onClose={() => {
            setViewingMine(false);
            refresh();
          }}
        />
      )}
    </>
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
        <CachedImage src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.4 }}>{initial}</span>
      )}
    </div>
  );
}
