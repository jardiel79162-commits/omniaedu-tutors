import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cache, getCurrentUserId } from "@/lib/app-cache";
import { fetchNicknames } from "@/lib/contact-nicknames";
import { MessageSquarePlus, UserPlus, Users, Plus } from "lucide-react";
import { StoryViewer, type StoryGroup, type StoryItem } from "@/components/StoryViewer";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { CachedImage } from "@/components/CachedImage";
import { prefetchImages } from "@/lib/image-cache";


type ChatRow = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  avatar_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
};

type ProfileLite = {
  id?: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_plus?: boolean | null;
} | null;

type LastMsg = { type: string; content: string; sender_id: string } | null;

type Tab = "direct" | "group";

function previewLabel(m: LastMsg, isMine: boolean): string {
  if (!m) return "Diga olá 👋";
  const prefix = isMine ? "Você: " : "";
  switch (m.type) {
    case "audio":
      return prefix + "🎤 Mensagem de voz";
    case "image":
      return prefix + "📷 Imagem";
    case "location":
      return prefix + "📍 Localização";
    case "call": {
      try {
        const o = JSON.parse(m.content);
        const mode = o.mode === "video" ? "vídeo" : "voz";
        if (o.outcome === "missed") return `📵 Ligação de ${mode} perdida`;
        return prefix + (o.mode === "video" ? "📹 " : "📞 ") + `Ligação de ${mode}`;
      } catch {
        return "📞 Ligação";
      }
    }
    case "text":
    default:
      return prefix + (m.content || "Mensagem de texto");
  }
}

export const Route = createFileRoute("/_authenticated/chats")({
  component: ChatsPage,
});

function ChatsPage() {
  const navigate = useNavigate();
  const loc = useLocation();
  const cached = cache.get<{ chats: ChatRow[]; others: Record<string, ProfileLite>; lastMsgs: Record<string, LastMsg>; nicks?: Record<string, string>; unread?: Record<string, number>; tab?: Tab }>("chats-list");
  const [chats, setChats] = useState<ChatRow[]>(cached?.chats ?? []);
  const [otherByChat, setOtherByChat] = useState<Record<string, ProfileLite>>(cached?.others ?? {});
  const [lastByChat, setLastByChat] = useState<Record<string, LastMsg>>(cached?.lastMsgs ?? {});
  const [nickByUser, setNickByUser] = useState<Record<string, string>>(cached?.nicks ?? {});
  const [unreadByChat, setUnreadByChatState] = useState<Record<string, number>>(cached?.unread ?? {});
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cached);
  const [storiesByUser, setStoriesByUser] = useState<Record<string, StoryItem[]>>({});
  const [viewer, setViewer] = useState<StoryGroup | null>(null);
  const [tab, setTab] = useState<Tab>(cached?.tab ?? "direct");

  function updateCache(patch: Partial<{ chats: ChatRow[]; others: Record<string, ProfileLite>; lastMsgs: Record<string, LastMsg>; nicks: Record<string, string>; unread: Record<string, number>; tab: Tab }>) {
    const cur = cache.get<any>("chats-list") ?? {};
    cache.set("chats-list", { ...cur, ...patch });
  }

  function setUnreadByChat(updater: (u: Record<string, number>) => Record<string, number>) {
    setUnreadByChatState((u) => {
      const next = updater(u);
      if (next !== u) updateCache({ unread: next });
      return next;
    });
  }

  function selectTab(next: Tab) {
    setTab(next);
    updateCache({ tab: next });
  }

  async function load() {
    try {
      const userId = await getCurrentUserId();
      setMeId(userId);
      if (!userId) {
        setChats([]);
        setOtherByChat({});
        return;
      }
      const { data: chatRows } = await supabase
        .from("chats")
        .select("id,type,name,avatar_url,last_message,last_message_at")
        .order("last_message_at", { ascending: false, nullsFirst: false });

      const list = (chatRows ?? []) as ChatRow[];
      setChats(list);

      if (list.length) {
        const ids = list.map((c) => c.id);
        const directIds = list.filter((c) => c.type === "direct").map((c) => c.id);
        const [{ data: members }, { data: msgs }, { data: reads }] = await Promise.all([
          directIds.length
            ? supabase.from("chat_members").select("chat_id,user_id").in("chat_id", directIds)
            : Promise.resolve({ data: [] as Array<{ chat_id: string; user_id: string }> }),
          supabase
            .from("chat_messages")
            .select("chat_id,message_type,content,sender_id,created_at")
            .in("chat_id", ids)
            .order("created_at", { ascending: false })
            .limit(200),
          supabase
            .from("chat_reads")
            .select("chat_id,last_read_at")
            .eq("user_id", userId)
            .in("chat_id", ids),
        ]);
        const otherIds = Array.from(
          new Set((members ?? []).filter((m) => m.user_id !== userId).map((m) => m.user_id)),
        );
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,full_name,username,avatar_url,is_plus")
          .in("id", otherIds.length ? otherIds : ["00000000-0000-0000-0000-000000000000"]);
        const profMap: Record<string, Exclude<ProfileLite, null>> = {};
        ((profs ?? []) as Exclude<ProfileLite, null>[]).forEach((p) => {
          if (!p.id) return;
          profMap[p.id] = p;
        });
        const map: Record<string, ProfileLite> = {};
        (members ?? []).forEach((m) => {
          if (m.user_id !== userId) map[m.chat_id] = profMap[m.user_id] ?? null;
        });
        const lastMap: Record<string, LastMsg> = {};
        const readMap = new Map<string, string>();
        (reads ?? []).forEach((r: any) => readMap.set(r.chat_id, r.last_read_at));
        const unreadMap: Record<string, number> = {};
        ((msgs ?? []) as Array<{ chat_id: string; message_type: string; content: string; sender_id: string; created_at: string }>).forEach((m) => {
          if (!lastMap[m.chat_id]) lastMap[m.chat_id] = { type: m.message_type, content: m.content, sender_id: m.sender_id };
          if (m.sender_id === userId) return;
          const lr = readMap.get(m.chat_id);
          if (!lr || new Date(m.created_at).getTime() > new Date(lr).getTime()) {
            unreadMap[m.chat_id] = (unreadMap[m.chat_id] ?? 0) + 1;
          }
        });
        const nicks = await fetchNicknames(otherIds);
        setOtherByChat(map);
        setLastByChat(lastMap);
        setNickByUser(nicks);
        setUnreadByChatState(unreadMap);
        updateCache({ chats: list, others: map, lastMsgs: lastMap, nicks, unread: unreadMap });
        // Warm browser image cache for every avatar so opening a chat is instant.
        prefetchImages([
          ...list.map((c) => c.avatar_url),
          ...Object.values(map).map((p) => p?.avatar_url ?? null),
        ]);

        // Active stories for contacts (last 24h)
        if (otherIds.length) {
          const { data: stories } = await supabase
            .from("statuses")
            .select("id,user_id,content,background,media_url,created_at")
            .in("user_id", otherIds)
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: true });
          const byUser: Record<string, StoryItem[]> = {};
          ((stories ?? []) as StoryItem[]).forEach((s) => {
            (byUser[s.user_id] ||= []).push(s);
          });
          setStoriesByUser(byUser);
        } else {
          setStoriesByUser({});
        }
      } else {
        setUnreadByChatState({});
        setStoriesByUser({});
        updateCache({ chats: list, others: {}, lastMsgs: {}, nicks: {}, unread: {} });
      }

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const fallback = window.setTimeout(() => setLoading(false), 1200);
    // Debounce bursts of realtime events so we don't re-query 5x per second.
    let debTimer: number | undefined;
    const scheduleLoad = () => {
      if (debTimer) window.clearTimeout(debTimer);
      debTimer = window.setTimeout(() => { load(); }, 250);
    };
    const ch = supabase
      .channel("chats-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, scheduleLoad)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, scheduleLoad)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_members" }, scheduleLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reads" }, scheduleLoad)
      .on("postgres_changes", { event: "*", schema: "public", table: "statuses" }, scheduleLoad)
      .subscribe();
    return () => {
      window.clearTimeout(fallback);
      if (debTimer) window.clearTimeout(debTimer);
      supabase.removeChannel(ch);
    };
  }, []);

  const isThread = loc.pathname !== "/chats";
  const visibleChats = chats.filter((c) => c.type === tab);

  return (
    <div className="chats-twopane">
      <div className={`chats-list-pane ${isThread ? "mobile-hide" : ""}`}>
        <header className="app-header px-5 pt-6 pb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold tracking-tight">Peacely</h1>
            <Link
              to={tab === "group" ? "/groups/new" : "/search"}
              preload="intent"
              preloadDelay={0}
              className="h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-soft"
              aria-label={tab === "group" ? "Criar grupo" : "Adicionar pessoas"}
            >
              {tab === "group" ? <Plus className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </Link>
          </div>
          <div className="mt-3 inline-flex p-1 rounded-full bg-muted text-sm font-semibold">
            <button
              type="button"
              onClick={() => selectTab("direct")}
              className={`px-4 py-1.5 rounded-full transition ${tab === "direct" ? "bg-background shadow-soft text-foreground" : "text-muted-foreground"}`}
            >
              Conversas
            </button>
            <button
              type="button"
              onClick={() => selectTab("group")}
              className={`px-4 py-1.5 rounded-full transition ${tab === "group" ? "bg-background shadow-soft text-foreground" : "text-muted-foreground"}`}
            >
              Grupos
            </button>
          </div>
        </header>
        <main className="app-content">
          {loading ? (
            <div className="px-5 py-8 text-sm text-muted-foreground">Carregando...</div>
          ) : visibleChats.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-accent grid place-items-center text-accent-foreground">
                {tab === "group" ? <Users className="h-7 w-7" /> : <MessageSquarePlus className="h-7 w-7" />}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {tab === "group" ? "Nenhum grupo ainda" : "Nenhuma conversa ainda"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {tab === "group" ? "Crie um grupo para conversar com várias pessoas" : "Adicione pessoas para começar a conversar"}
              </p>
              <Link
                to={tab === "group" ? "/groups/new" : "/search"}
                preload="intent"
                preloadDelay={0}
                className="inline-block mt-4 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold"
              >
                {tab === "group" ? "Criar grupo" : "Adicionar pessoas"}
              </Link>
            </div>
          ) : (
            <ul className="px-3 py-2 space-y-2">
              {visibleChats.map((c) => {
                const isGroup = c.type === "group";
                const p = isGroup ? null : otherByChat[c.id];
                const nick = p?.id ? nickByUser[p.id] : undefined;
                const hasProfile = !!p;
                const name = isGroup
                  ? c.name || "Grupo"
                  : nick || p?.full_name || p?.username || (hasProfile ? "Usuário" : "");
                const initial = (name || "?").charAt(0).toUpperCase();
                const active = loc.pathname === `/chats/${c.id}`;
                const userStories = !isGroup && p?.id ? storiesByUser[p.id] : undefined;
                const hasStory = !!userStories?.length;
                const avatarUrl = isGroup ? c.avatar_url : p?.avatar_url || null;
                const markRead = () => {
                  setUnreadByChat((u) => (u[c.id] ? { ...u, [c.id]: 0 } : u));
                  if (meId) {
                    void supabase
                      .from("chat_reads")
                      .upsert(
                        { chat_id: c.id, user_id: meId, last_read_at: new Date().toISOString() },
                        { onConflict: "chat_id,user_id" },
                      );
                  }
                };
                const openChat = () => {
                  markRead();
                  navigate({ to: "/chats/$id", params: { id: c.id } });
                };
                return (
                  <li key={c.id}>
                    <Link
                      to="/chats/$id"
                      params={{ id: c.id }}
                      preload="intent"
                      preloadDelay={0}
                      onPointerDown={openChat}
                      onClick={markRead}
                      className={`peacely-tile flex items-center gap-3 px-4 py-3 active:bg-muted select-none ${active ? "ring-2 ring-primary/40" : ""}`}
                    >

                      <button
                        type="button"
                        onClick={(e) => {
                          if (!hasStory || !p) return;
                          e.preventDefault();
                          e.stopPropagation();
                          setViewer({ user: { id: p.id!, username: p.username, full_name: p.full_name, avatar_url: p.avatar_url }, items: userStories! });
                        }}
                        onPointerDown={(e) => { if (hasStory) e.stopPropagation(); }}
                        className={`shrink-0 rounded-full ${hasStory ? "p-[2px] bg-emerald-500" : ""}`}
                        aria-label={hasStory ? "Ver story" : undefined}
                      >
                        <div className={`h-12 w-12 rounded-full bg-gradient-brand grid place-items-center text-white font-semibold overflow-hidden ${hasStory ? "ring-2 ring-background" : ""}`}>
                          {avatarUrl ? (
                            <CachedImage
                              src={avatarUrl}
                              alt=""
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : isGroup ? (
                            <Users className="h-5 w-5" />
                          ) : (
                            initial
                          )}
                        </div>
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="font-semibold truncate flex items-center gap-1 min-w-0"><span className={`truncate ${!isGroup && p?.is_plus ? "plus-name" : ""}`}>{name}</span>{!isGroup && p?.is_plus && <VerifiedBadge />}</div>
                          {c.last_message_at && (
                            <div className="text-[11px] text-muted-foreground shrink-0">
                              {formatTime(c.last_message_at)}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate flex items-center justify-between gap-2">
                          <span className="truncate">
                            {previewLabel(lastByChat[c.id] ?? null, lastByChat[c.id]?.sender_id === meId)}
                          </span>
                          {(unreadByChat[c.id] ?? 0) > 0 && (
                            <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold grid place-items-center">
                              {unreadByChat[c.id] > 99 ? "99+" : unreadByChat[c.id]}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      </div>
      <div className={`chats-thread-pane ${!isThread ? "mobile-hide" : ""}`}>
        {isThread ? (
          <Outlet />
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center text-center p-10">
            <div>
              <div className="mx-auto h-16 w-16 rounded-2xl bg-accent grid place-items-center text-accent-foreground mb-4">
                <MessageSquarePlus className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-semibold">Selecione uma conversa</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Escolha um contato à esquerda para começar a conversar, ligar ou enviar mídias.
              </p>
            </div>
          </div>
        )}
      </div>
      {viewer && (
        <StoryViewer
          groups={[viewer]}
          startGroup={0}
          myId={meId}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
