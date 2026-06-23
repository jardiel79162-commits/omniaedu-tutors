import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/app-cache";
import { useSwr } from "@/lib/swr-cache";
import { ArrowLeft, Heart, MessageCircle, UserPlus, MessageCirclePlus, Check } from "lucide-react";

type Notif = {
  id: string;
  type: "follow" | "like" | "comment" | "mention" | "conv_request" | "conv_accept" | "report_new" | "report_supervision";
  actor_id: string | null;
  target_id: string | null;
  read_at: string | null;
  created_at: string;
  actor?: { username: string | null; full_name: string | null; avatar_url: string | null } | null;
};

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

async function fetchNotifs(): Promise<Notif[]> {
  const uid = await getCurrentUserId();
  if (!uid) return [];
  const { data } = await supabase
    .from("notifications")
    .select("id,type,actor_id,target_id,read_at,created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as Notif[];
  if (rows.length) {
    const ids = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[]));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .in("id", ids);
      const map = new Map<string, any>();
      (profs ?? []).forEach((p: any) => map.set(p.id, p));
      rows.forEach((r) => {
        if (r.actor_id) r.actor = map.get(r.actor_id) ?? null;
      });
    }
  }
  // mark all as read (fire and forget)
  void supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", uid)
    .is("read_at", null);
  return rows;
}

function NotificationsPage() {
  const { data, loading, refresh } = useSwr<Notif[]>("notifs", fetchNotifs);
  const items = data ?? [];
  const navigate = useNavigate();

  async function load() {
    await refresh();
  }

  useEffect(() => {
    const ch = supabase
      .channel("notifs-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function respondRequest(notifId: string, requestId: string | null, accept: boolean) {
    if (!requestId) return;
    await supabase
      .from("conversation_requests")
      .update({ status: accept ? "accepted" : "rejected" })
      .eq("id", requestId);
    await supabase.from("notifications").delete().eq("id", notifId);
    load();
  }

  function label(n: Notif) {
    const who = n.actor?.full_name || n.actor?.username || "Alguém";
    switch (n.type) {
      case "follow": return `${who} começou a seguir você`;
      case "like": return `${who} curtiu seu post`;
      case "comment": return `${who} comentou no seu post`;
      case "mention": return `${who} mencionou você`;
      case "conv_request": return `${who} quer conversar com você`;
      case "conv_accept": return `${who} aceitou seu pedido de conversa`;
      case "report_new": return `🚨 Nova denúncia recebida (${who})`;
      case "report_supervision": return `⚠️ Usuário atingiu 10 denúncias — ultra supervisão`;
    }
  }

  function icon(t: Notif["type"]) {
    switch (t) {
      case "like": return <Heart className="h-4 w-4 text-red-500 fill-red-500" />;
      case "comment": return <MessageCircle className="h-4 w-4 text-primary" />;
      case "follow": return <UserPlus className="h-4 w-4 text-primary" />;
      case "conv_request":
      case "conv_accept": return <MessageCirclePlus className="h-4 w-4 text-primary" />;
      default: return null;
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="app-header flex items-center gap-3 px-4 pt-5 pb-3 border-b">
        <button onClick={() => navigate({ to: "/feed" })} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Notificações</h1>
      </header>
      <main className="app-content">
        {loading && items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Nada por aqui</p>
        ) : (
          <ul className="divide-y">
            {items.map((n) => {
              const u = n.actor?.username || "usuario";
              const isReq = n.type === "conv_request";
              const isPost = n.type === "like" || n.type === "comment";
              const content = (
                <div className="flex items-center gap-3 px-4 py-3">
                  <Link
                    to="/u/$username"
                    params={{ username: u }}
                    className="h-10 w-10 rounded-full bg-gradient-brand grid place-items-center text-white font-bold overflow-hidden shrink-0"
                  >
                    {n.actor?.avatar_url ? (
                      <img src={n.actor.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (n.actor?.full_name || u).charAt(0).toUpperCase()
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm flex items-center gap-1.5">
                      {icon(n.type)}
                      <span className="truncate">{label(n)}</span>
                    </div>
                  </div>
                  {isReq && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => respondRequest(n.id, n.target_id, true)}
                        className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center"
                        aria-label="Aceitar"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => respondRequest(n.id, n.target_id, false)}
                        className="h-8 px-3 rounded-full bg-muted text-xs font-semibold"
                      >
                        Recusar
                      </button>
                    </div>
                  )}
                </div>
              );
              if (isPost && n.target_id) {
                return (
                  <li key={n.id}>
                    <Link to="/p/$id" params={{ id: n.target_id }} className="block hover:bg-muted">
                      {content}
                    </Link>
                  </li>
                );
              }
              return <li key={n.id}>{content}</li>;
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
