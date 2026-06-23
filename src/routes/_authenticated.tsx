import { createFileRoute, Outlet, redirect, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, User, UserPlus, Home, Film, PlusSquare, Bell, Bookmark, Settings, ShieldAlert, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/app-cache";
import { callStore, type IncomingCall } from "@/lib/call-store";
import { IncomingCallPrompt } from "@/components/CallView";
import { startRingtone, stopRingtone } from "@/lib/ringtone";
import { requestNotificationPermission, showAppNotification } from "@/lib/notifications";
import { OnboardingPermissions } from "@/components/OnboardingPermissions";
import { AdminReportListener } from "@/components/AdminReportListener";
import { getMyBanStatus } from "@/lib/me.functions";
import { Button } from "@/components/ui/button";
import { bootPlusSettings } from "@/lib/plus-settings";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AuthLayout,
});

const SWIPE_ROUTES = ["/feed", "/twos", "/create", "/chats", "/profile"] as const;

function AuthLayout() {
  const loc = useLocation();
  const navigate = useNavigate();
  const isChatThread = /^\/chats\/[^/]+/.test(loc.pathname);
  const isAdmin = loc.pathname === "/admin" || loc.pathname.startsWith("/admin/");

  useEffect(() => {
    requestNotificationPermission();
    bootPlusSettings();
    const ask = () => requestNotificationPermission();
    window.addEventListener("pointerdown", ask, { once: true });
    return () => window.removeEventListener("pointerdown", ask);
  }, []);

  // Swipe-to-navigate between main tabs (works with touch + mouse drag)
  useEffect(() => {
    if (isChatThread) return;
    const idx = SWIPE_ROUTES.indexOf(loc.pathname as any);
    if (idx === -1) return;

    let startX = 0, startY = 0, lastX = 0, lastY = 0, startT = 0, tracking = false, pointerType = "", decided: "h" | "v" | null = null, pid = -1;
    const onDown = (e: PointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"], [data-no-swipe], [role="slider"], .no-swipe')) return;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      startT = Date.now();
      pointerType = e.pointerType;
      tracking = true;
      decided = null;
      pid = e.pointerId;
    };
    const onMove = (e: PointerEvent) => {
      if (!tracking) return;
      lastX = e.clientX;
      lastY = e.clientY;
      if (decided) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      decided = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    };
    const finish = (clientX: number, clientY: number) => {
      if (!tracking) return;
      tracking = false;
      const dx = clientX - startX;
      const dy = clientY - startY;
      const dt = Date.now() - startT;
      if (dt > 900) return;
      const threshold = pointerType === "mouse" ? 60 : 40;
      if (Math.abs(dx) < threshold) return;
      if (Math.abs(dx) <= Math.abs(dy)) return;
      const dir = dx < 0 ? 1 : -1;
      const next = idx + dir;
      if (next < 0 || next >= SWIPE_ROUTES.length) return;
      navigate({ to: SWIPE_ROUTES[next] });
    };
    const onUp = (e: PointerEvent) => finish(e.clientX, e.clientY);
    const onCancel = () => { if (tracking) finish(lastX, lastY); };
    const onLost = (e: PointerEvent) => { if (e.pointerId === pid && tracking) finish(lastX, lastY); };
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onCancel, { passive: true });
    window.addEventListener("lostpointercapture", onLost, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("lostpointercapture", onLost);
    };
  }, [loc.pathname, isChatThread, navigate]);

  return (
    <BanGate>
      <div className="app-shell">
        {!isAdmin && <DesktopRail />}
        <div className="app-pane-main">
          <Outlet />
          {!isChatThread && !isAdmin && <BottomNav />}
        </div>
        <GlobalCallRinger />
        <AdminReportListener />
        {!isAdmin && <OnboardingPermissions />}
      </div>
    </BanGate>
  );
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (days || hours) parts.push(`${hours}h`);
  if (days || hours || mins) parts.push(`${mins}m`);
  parts.push(`${secs}s`);
  return parts.join(" ");
}

function BanGate({ children }: { children: React.ReactNode }) {
  const fetchBan = useServerFn(getMyBanStatus);
  const navigate = useNavigate();
  const [status, setStatus] = useState<{ banned: boolean; banned_until: string | null } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const r = await fetchBan();
        if (!cancelled) setStatus(r);
      } catch {
        if (!cancelled) setStatus({ banned: false, banned_until: null });
      }
    };
    run();
    const id = window.setInterval(run, 60_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [fetchBan]);

  useEffect(() => {
    if (!status?.banned) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status?.banned]);

  if (!status) return null;
  if (!status.banned) return <>{children}</>;

  const until = status.banned_until ? new Date(status.banned_until).getTime() : 0;
  const remaining = until - now;
  const isPermanent = !status.banned_until || until > Date.now() + 100 * 365 * 24 * 3600 * 1000;

  const onSignOut = async () => {
    try { await supabase.auth.signOut(); } catch {}
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen w-full grid place-items-center bg-background px-6">
      <div className="max-w-md w-full text-center space-y-6 py-10">
        <div className="mx-auto h-20 w-20 rounded-full bg-destructive/10 grid place-items-center">
          <ShieldAlert className="h-10 w-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Conta suspensa</h1>
          <p className="text-muted-foreground">
            Sua conta foi banida e o acesso ao app está bloqueado.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          {isPermanent ? (
            <div className="text-lg font-semibold">Banimento permanente</div>
          ) : (
            <>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Tempo restante</div>
              <div className="mt-1 text-3xl font-bold tabular-nums">{formatRemaining(remaining)}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Liberação em {new Date(until).toLocaleString()}
              </div>
            </>
          )}
        </div>
        <Button variant="outline" className="w-full" onClick={onSignOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sair da conta
        </Button>
      </div>
    </div>
  );
}


function DesktopRail() {
  const loc = useLocation();
  const [me, setMe] = useState<{ avatar_url: string | null; full_name: string | null; username: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uid = await getCurrentUserId();
      if (!uid) return;
      const { data } = await supabase.from("profiles").select("avatar_url,full_name,username").eq("id", uid).maybeSingle();
      if (!cancelled) setMe(data as any);
    })();
    return () => { cancelled = true; };
  }, []);

  const items = [
    { to: "/feed",          label: "Feed",       icon: Home },
    { to: "/twos",         label: "TWOS",      icon: Film },
    { to: "/create",        label: "Criar",      icon: PlusSquare },
    { to: "/chats",         label: "Conversas",  icon: MessageSquare },
    { to: "/explore",       label: "Descobrir",  icon: UserPlus },
    { to: "/notifications", label: "Alertas",    icon: Bell },
    { to: "/saved",         label: "Salvos",     icon: Bookmark },
    { to: "/profile",       label: "Perfil",     icon: User },
    { to: "/settings",      label: "Ajustes",    icon: Settings },
  ] as const;

  const initial = (me?.full_name || me?.username || "?").charAt(0).toUpperCase();

  return (
    <aside className="desktop-rail">
      {/* Avatar / profile link */}
      <Link
        to="/profile"
        title="Perfil"
        className="relative h-12 w-12 rounded-2xl overflow-hidden bg-gradient-brand grid place-items-center text-white font-extrabold mb-4 shadow-float group"
        style={{ background: "var(--gradient-brand)" }}
      >
        {me?.avatar_url ? (
          <img src={me.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg">{initial}</span>
        )}
        {/* Glow ring on hover */}
        <span className="absolute inset-0 rounded-2xl ring-2 ring-primary/0 group-hover:ring-primary/60 transition-all duration-300" />
      </Link>

      {/* Separator */}
      <div className="w-8 h-px rounded-full mb-1" style={{ background: "var(--cosmos-glass-border)" }} />

      {items.map(({ to, label, icon: Icon }) => {
        const active = loc.pathname === to || loc.pathname.startsWith(to + "/");
        return (
          <Link
            key={to}
            to={to}
            preload="intent"
            preloadDelay={0}
            title={label}
            className={[
              "flex flex-col items-center gap-1 w-14 py-2.5 rounded-2xl transition-all duration-200 relative group",
              active
                ? "cosmos-nav-active text-white shadow-soft"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5",
            ].join(" ")}
          >
            <Icon className={`h-5 w-5 transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-110"}`} />
            <span className="text-[9px] font-semibold tracking-wide uppercase opacity-80">{label}</span>
            {/* Active indicator dot */}
            {active && (
              <span
                className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full"
                style={{ background: "var(--cosmos-coral)" }}
              />
            )}
          </Link>
        );
      })}
    </aside>
  );
}

function GlobalCallRinger() {
  const navigate = useNavigate();
  const loc = useLocation();
  const [incoming, setIncoming] = useState<IncomingCall | null>(callStore.get());

  useEffect(() => callStore.subscribe(setIncoming), []);

  useEffect(() => {
    let cancelled = false;
    const channels: ReturnType<typeof supabase.channel>[] = [];
    let me = "";

    async function init() {
      const userId = await getCurrentUserId();
      if (!userId || cancelled) return;
      me = userId;

      const directCh = supabase
        .channel(`call-events-${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_events", filter: `recipient_id=eq.${userId}` }, async ({ new: row }: any) => {
          if (!row || row.caller_id === me || row.status !== "ringing") return;
          if (callStore.get()) return;

          let peerName = "Chamada";
          try {
            const { data: chat } = await supabase.from("chats").select("type,name").eq("id", row.chat_id).maybeSingle();
            if (chat?.type === "group") {
              peerName = chat.name || "Grupo";
            } else {
              const { data: p } = await supabase.from("profiles").select("full_name,username").eq("id", row.caller_id).maybeSingle();
              peerName = p?.full_name || p?.username || "Usuário";
            }
          } catch {}

          const inc: IncomingCall = { eventId: row.id, chatId: row.chat_id, from: row.caller_id, mode: row.mode, offer: row.offer, peerName, receivedAt: Date.now() };
          callStore.set(inc);
          startRingtone("incoming");
          showAppNotification(peerName, row.mode === "video" ? "Chamada de vídeo" : "Chamada de voz", `call-${row.id}`);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "call_events", filter: `recipient_id=eq.${userId}` }, ({ new: row }: any) => {
          const cur = callStore.get();
          if (cur?.eventId === row.id && row.status !== "ringing") {
            callStore.set(null);
            stopRingtone();
          }
        })
        .subscribe();
      channels.push(directCh);

      const ringerCh = supabase
        .channel(`ringer-${userId}`)
        .on("broadcast", { event: "ring" }, async ({ payload }: any) => {
          if (!payload || payload.from === me) return;
          if (callStore.get()) return;
          let peerName = payload.peerName || "Chamada";
          if (!payload.peerName) {
            try {
              const { data: chat } = await supabase.from("chats").select("type,name").eq("id", payload.chatId).maybeSingle();
              if (chat?.type === "group") peerName = chat.name || "Grupo";
              else {
                const { data: p } = await supabase.from("profiles").select("full_name,username").eq("id", payload.from).maybeSingle();
                peerName = p?.full_name || p?.username || "Usuário";
              }
            } catch {}
          }
          const inc: IncomingCall = { eventId: payload.eventId, chatId: payload.chatId, from: payload.from, mode: payload.mode, offer: payload.offer, peerName, receivedAt: Date.now() };
          callStore.set(inc);
          startRingtone("incoming");
          showAppNotification(peerName, payload.mode === "video" ? "Chamada de vídeo" : "Chamada de voz", `call-${payload.eventId ?? Date.now()}`);
        })
        .subscribe();
      channels.push(ringerCh);

      const { data: members } = await supabase.from("chat_members").select("chat_id").eq("user_id", userId);
      const chatIds = Array.from(new Set((members ?? []).map((m: any) => m.chat_id as string)));
      for (const chatId of chatIds) {
        const ch = supabase.channel(`call-notify-${chatId}`, { config: { broadcast: { self: false } } })
          .on("broadcast", { event: "hangup" }, ({ payload }: any) => {
            if (!payload || payload.from === me) return;
            const cur = callStore.get();
            if (cur && cur.chatId === chatId) callStore.set(null);
            stopRingtone();
          })
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${chatId}` }, async ({ new: msg }: any) => {
            if (!msg || msg.sender_id === me) return;
            if (window.location.pathname === `/chats/${chatId}`) return;
            let title = "Nova mensagem";
            try {
              const { data: chat } = await supabase.from("chats").select("type,name").eq("id", chatId).maybeSingle();
              if (chat?.type === "group") title = chat.name || "Grupo";
              else {
                const { data: p } = await supabase.from("profiles").select("full_name,username").eq("id", msg.sender_id).maybeSingle();
                title = p?.full_name || p?.username || "Mensagem";
              }
            } catch {}
            const body = msg.message_type === "audio" ? "Mensagem de voz" : msg.message_type === "image" ? "Imagem" : msg.message_type === "location" ? "Localização" : msg.message_type === "call" ? "Ligação" : (msg.content || "Mensagem de texto");
            showAppNotification(title, body, {
              tag: `msg-${msg.id}`,
              onClick: () => navigate({ to: "/chats/$id", params: { id: chatId } }),
            });
          })
          .subscribe();
        channels.push(ch);
      }
    }

    init();
    return () => {
      cancelled = true;
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, []);

  if (!incoming || loc.pathname === `/chats/${incoming.chatId}`) return null;

  return (
    <IncomingCallPrompt
      peerName={incoming.peerName}
      mode={incoming.mode}
      onAccept={() => {
        callStore.setPending(incoming.chatId, incoming);
        callStore.set(null);
        stopRingtone();
        if (incoming.eventId) void (supabase as any).from("call_events").update({ status: "accepted" }).eq("id", incoming.eventId);
        navigate({ to: "/chats/$id", params: { id: incoming.chatId } });
      }}
      onReject={() => {
        callStore.set(null);
        stopRingtone();
        if (incoming.eventId) void (supabase as any).from("call_events").update({ status: "declined" }).eq("id", incoming.eventId);
      }}
    />
  );
}

function BottomNav() {
  const loc = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let me: string | null = null;
    async function loadFriends() {
      if (!me) return;
      const { count } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("addressee_id", me)
        .eq("status", "pending");
      if (!cancelled) setPendingCount(count ?? 0);
    }
    async function loadUnread() {
      if (!me) return;
      const { data: members } = await supabase
        .from("chat_members")
        .select("chat_id")
        .eq("user_id", me);
      const chatIds = (members ?? []).map((m: any) => m.chat_id as string);
      if (chatIds.length === 0) {
        if (!cancelled) setUnreadChats(0);
        return;
      }
      const [{ data: reads }, { data: lastMsgs }] = await Promise.all([
        supabase
          .from("chat_reads")
          .select("chat_id,last_read_at")
          .eq("user_id", me)
          .in("chat_id", chatIds),
        supabase
          .from("chat_messages")
          .select("chat_id,sender_id,created_at")
          .in("chat_id", chatIds)
          .order("created_at", { ascending: false }),
      ]);
      const readMap = new Map<string, string>();
      (reads ?? []).forEach((r: any) => readMap.set(r.chat_id, r.last_read_at));
      const seen = new Set<string>();
      let count = 0;
      for (const m of (lastMsgs ?? []) as any[]) {
        if (seen.has(m.chat_id)) continue;
        seen.add(m.chat_id);
        if (m.sender_id === me) continue;
        const lr = readMap.get(m.chat_id);
        if (!lr || new Date(m.created_at).getTime() > new Date(lr).getTime()) count++;
      }
      if (!cancelled) setUnreadChats(count);
    }
    (async () => {
      me = await getCurrentUserId();
      if (!me) return;
      loadFriends();
      loadUnread();
    })();
    const ch = supabase
      .channel("nav-badges")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => loadFriends())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => loadUnread())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reads" }, () => loadUnread())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, []);

  const chatsBadge = pendingCount + unreadChats;

  const items = [
    { to: "/feed",    label: "Feed",      icon: Home,           badge: 0 },
    { to: "/twos",   label: "TWOS",     icon: Film,           badge: 0 },
    { to: "/create",  label: "",          icon: PlusSquare,     badge: 0, isCreate: true },
    { to: "/chats",   label: "Chats",     icon: MessageSquare,  badge: chatsBadge },
    { to: "/profile", label: "Perfil",    icon: User,           badge: 0 },
  ] as const;

  return (
    <nav className="bottom-nav">
      <ul className="grid grid-cols-5 px-1 pt-1.5 pb-1.5">
        {items.map(({ to, label, icon: Icon, badge, ...rest }) => {
          const active = loc.pathname === to || loc.pathname.startsWith(to + "/");
          const isCreate = (rest as any).isCreate;
          return (
            <li key={to}>
              <Link
                to={to}
                preload="intent"
                preloadDelay={0}
                className="flex flex-col items-center gap-0.5 py-1.5 rounded-2xl relative active:scale-90 transition-all duration-150"
              >
                <div className="relative">
                  {isCreate ? (
                    /* Create button — special pill style */
                    <span
                      className="flex items-center justify-center h-10 w-10 rounded-2xl shadow-soft"
                      style={{ background: "linear-gradient(135deg, var(--cosmos-violet), var(--cosmos-coral))" }}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </span>
                  ) : (
                    <Icon className={`h-5 w-5 transition-all duration-200 ${active ? "scale-110" : ""}`}
                      style={{ color: active ? "var(--cosmos-violet)" : undefined }}
                    />
                  )}
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 text-[9px] font-bold rounded-full bg-destructive text-destructive-foreground grid place-items-center">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                {!isCreate && (
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wide transition-all duration-200"
                    style={{ color: active ? "var(--cosmos-violet)" : undefined, opacity: active ? 1 : 0.55 }}
                  >
                    {label}
                  </span>
                )}
                {/* Active glow dot */}
                {active && !isCreate && (
                  <span
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: "var(--cosmos-coral)" }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
