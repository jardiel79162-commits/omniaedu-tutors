import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/app-cache";
import { fetchUserPosts, sendConversationRequest, type Post } from "@/lib/social";
import { FollowButton } from "@/components/FollowButton";
import { ArrowLeft, Grid3x3, Film, LayoutGrid, MessageCirclePlus, Play, Flag } from "lucide-react";
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { CreatorRewardsRow, TopCreatorBadge } from "@/components/CreatorRewards";
import { ReportDialog } from "@/components/ReportDialog";

export const Route = createFileRoute("/_authenticated/u/$username")({
  component: UserProfilePage,
});

function UserProfilePage() {
  const { username } = Route.useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"all" | "reel" | "photo">("all");
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0, posts: 0 });
  const [reqStatus, setReqStatus] = useState<"none" | "pending" | "accepted" | "loading">("loading");
  const [reportOpen, setReportOpen] = useState(false);

  async function load() {
    const uid = await getCurrentUserId();
    setMe(uid);
    const { data: p } = await supabase
      .from("profiles")
      .select("id,full_name,username,avatar_url,about,followers_count,following_count,posts_count,is_plus")
      .eq("username", username)
      .maybeSingle();
    if (!p) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setProfile(p);
    setFollowCounts({
      followers: (p as any).followers_count ?? 0,
      following: (p as any).following_count ?? 0,
      posts: (p as any).posts_count ?? 0,
    });
    const list = await fetchUserPosts(p.id);
    setPosts(list);
    setLoading(false);

    if (uid && uid !== p.id) {
      // Check if chat already exists
      const { data: chats } = await supabase
        .from("chat_members")
        .select("chat_id,chats!inner(type)")
        .eq("user_id", uid);
      const myChatIds = ((chats ?? []) as any[])
        .filter((c) => c.chats?.type === "direct")
        .map((c) => c.chat_id);
      let hasChat = false;
      if (myChatIds.length) {
        const { data: theirMembership } = await supabase
          .from("chat_members")
          .select("chat_id")
          .eq("user_id", p.id)
          .in("chat_id", myChatIds);
        hasChat = (theirMembership ?? []).length > 0;
      }
      if (hasChat) {
        setReqStatus("accepted");
        return;
      }
      const { data: req } = await supabase
        .from("conversation_requests")
        .select("status")
        .or(`and(from_id.eq.${uid},to_id.eq.${p.id}),and(from_id.eq.${p.id},to_id.eq.${uid})`)
        .maybeSingle();
      if (req?.status === "pending") setReqStatus("pending");
      else if (req?.status === "accepted") setReqStatus("accepted");
      else setReqStatus("none");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Live updates: profile counters change when anyone follows/unfollows or posts.
  useEffect(() => {
    if (!profile?.id) return;
    const ch = supabase
      .channel(`user-live-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${profile.id}` },
        (payload: any) => {
          const n = payload.new ?? {};
          setFollowCounts({
            followers: n.followers_count ?? 0,
            following: n.following_count ?? 0,
            posts: n.posts_count ?? 0,
          });
          setProfile((prev: any) => (prev ? { ...prev, ...n } : prev));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `author_id=eq.${profile.id}` },
        async () => {
          const list = await fetchUserPosts(profile.id);
          setPosts(list);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [profile?.id]);

  async function requestChat() {
    if (!profile) return;
    try {
      await sendConversationRequest(profile.id);
      setReqStatus("pending");
      toast.success("Pedido de conversa enviado");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  }

  async function openChat() {
    if (!profile) return;
    const { data, error } = await supabase.rpc("ensure_direct_chat" as any, {
      _requester_id: me,
      _addressee_id: profile.id,
    } as any);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/chats/$id", params: { id: data as any } });
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>;
  }
  if (!profile) {
    return (
      <div className="p-10 text-center">
        <p className="text-lg font-semibold">Usuário não encontrado</p>
        <Link to="/feed" className="text-primary text-sm mt-2 inline-block">
          Voltar
        </Link>
      </div>
    );
  }

  const isSelf = me === profile.id;
  const filtered = tab === "all" ? posts : posts.filter((p) => p.kind === tab);

  return (
    <div className="flex flex-col h-full">
      <header className="app-header flex items-center gap-3 px-4 pt-5 pb-3 border-b">
        <button onClick={() => history.back()} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold flex-1 truncate">@{profile.username}</h1>
        {!isSelf && (
          <button
            onClick={() => setReportOpen(true)}
            aria-label="Denunciar"
            className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted text-muted-foreground"
          >
            <Flag className="h-5 w-5" />
          </button>
        )}
      </header>
      <main className="app-content">
        <div className="p-5 flex items-start gap-4">
          <div className={profile.is_plus ? "plus-avatar-frame shrink-0" : "shrink-0"}>
            <div className="h-20 w-20 rounded-full bg-gradient-brand grid place-items-center text-white text-2xl font-bold overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (profile.full_name || profile.username || "?").charAt(0).toUpperCase()
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className={`text-lg font-bold truncate ${profile.is_plus ? "plus-name" : ""}`}>{profile.full_name || profile.username}</h2>
              {profile.is_plus && <VerifiedBadge />}
              <TopCreatorBadge userId={profile.id} />
            </div>
            <div className="flex gap-5 mt-3 text-sm">
              <div><strong>{followCounts.posts}</strong> <span className="text-muted-foreground">posts</span></div>
              <Link
                to="/u/$username/followers"
                params={{ username: profile.username ?? "" }}
                className="hover:underline"
              >
                <strong>{followCounts.followers}</strong>{" "}
                <span className="text-muted-foreground">seguidores</span>
              </Link>
              <Link
                to="/u/$username/following"
                params={{ username: profile.username ?? "" }}
                className="hover:underline"
              >
                <strong>{followCounts.following}</strong>{" "}
                <span className="text-muted-foreground">seguindo</span>
              </Link>
            </div>

            <div className="mt-2"><CreatorRewardsRow userId={profile.id} /></div>
          </div>
        </div>
        {profile.about && <p className="px-5 text-sm whitespace-pre-wrap">{profile.about}</p>}

        {!isSelf && (
          <div className="px-5 mt-4 flex gap-2">
            <div className="flex-1">
              <FollowButton targetId={profile.id} onChange={(f) => setFollowCounts((c) => ({ ...c, followers: c.followers + (f ? 1 : -1) }))} />
            </div>
            {reqStatus === "accepted" ? (
              <button
                onClick={openChat}
                className="flex-1 rounded-md bg-secondary text-secondary-foreground px-4 py-2 text-sm font-semibold"
              >
                Conversar
              </button>
            ) : reqStatus === "pending" ? (
              <button
                disabled
                className="flex-1 rounded-md bg-muted text-muted-foreground px-4 py-2 text-sm font-semibold"
              >
                Pedido enviado
              </button>
            ) : (
              <button
                onClick={requestChat}
                className="flex-1 rounded-md bg-secondary text-secondary-foreground px-4 py-2 text-sm font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <MessageCirclePlus className="h-4 w-4" /> Pedir conversa
              </button>
            )}
          </div>
        )}

        <div className="mt-6 border-t flex">
          <button
            onClick={() => setTab("all")}
            className={`flex-1 py-3 grid place-items-center ${tab === "all" ? "border-t-2 border-primary -mt-px" : "text-muted-foreground"}`}
            aria-label="Todos"
          >
            <LayoutGrid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setTab("reel")}
            className={`flex-1 py-3 grid place-items-center ${tab === "reel" ? "border-t-2 border-primary -mt-px" : "text-muted-foreground"}`}
            aria-label="TWOS"
          >
            <Film className="h-5 w-5" />
          </button>
          <button
            onClick={() => setTab("photo")}
            className={`flex-1 py-3 grid place-items-center ${tab === "photo" ? "border-t-2 border-primary -mt-px" : "text-muted-foreground"}`}
            aria-label="Posts"
          >
            <Grid3x3 className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {filtered.map((p) => {
            const m = p.media?.[0];
            if (!m) return null;
            return (
              <Link
                key={p.id}
                to="/p/$id"
                params={{ id: p.id }}
                className="relative aspect-square bg-muted overflow-hidden"
              >
                {m.mime.startsWith("video/") ? (
                  <>
                    <video src={m.url} muted className="w-full h-full object-cover" />
                    <Play className="absolute top-1 right-1 h-4 w-4 fill-white text-white" />
                  </>
                ) : (
                  <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                )}
              </Link>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum post nesta aba.</p>
        )}
      </main>
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="profile"
        targetId={profile.id}
        targetUserId={profile.id}
        targetLabel={`Perfil de @${profile.username}`}
      />
    </div>
  );
}
