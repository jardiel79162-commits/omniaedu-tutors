import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cache, getCurrentUserId } from "@/lib/app-cache";
import { fetchNicknames, saveNickname } from "@/lib/contact-nicknames";
import { Search as SearchIcon, UserPlus, Check, X, Clock, Ban, MessageCircle } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/search")({
  component: SearchPage,
});

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;

};
type FriendshipStatus = "pending" | "accepted" | "rejected";
type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
};

async function findDirectChatWith(otherId: string) {
  const me = await getCurrentUserId();
  if (!me) return null;
  const { data: mine } = await supabase.from("chat_members").select("chat_id").eq("user_id", me);
  const ids = Array.from(new Set((mine ?? []).map((m) => m.chat_id)));
  if (ids.length === 0) return null;
  const { data: directChats } = await supabase
    .from("chats")
    .select("id")
    .eq("type", "direct")
    .in("id", ids);
  const directIds = (directChats ?? []).map((chat) => chat.id);
  if (directIds.length === 0) return null;
  const { data: sharedMembers } = await supabase
    .from("chat_members")
    .select("chat_id,user_id")
    .in("chat_id", directIds);
  return sharedMembers?.find((member) => member.user_id === otherId)?.chat_id ?? null;
}

function SearchPage() {
  const [tab, setTab] = useState<"search" | "requests">("search");
  const [me, setMe] = useState<string | null>(null);
  const [friendships, setFriendships] = useState<Friendship[]>(
    cache.get<Friendship[]>("friendships") ?? [],
  );

  async function loadFriendships() {
    const { data } = await supabase
      .from("friendships")
      .select("id,requester_id,addressee_id,status,created_at");
    const list = (data ?? []) as Friendship[];
    setFriendships(list);
    cache.set("friendships", list);
  }

  useEffect(() => {
    (async () => {
      const userId = await getCurrentUserId();
      setMe(userId);
      loadFriendships();
    })();
    const ch = supabase
      .channel("friendships-mine")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () =>
        loadFriendships(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Backfill default nicknames for accepted friends so the contact name shows
  // the user's profile name by default (editable from the chat header).
  useEffect(() => {
    if (!me) return;
    const friendIds = friendships
      .filter((f) => f.status === "accepted")
      .map((f) => (f.requester_id === me ? f.addressee_id : f.requester_id));
    if (friendIds.length === 0) return;
    (async () => {
      const existing = await fetchNicknames(friendIds);
      const missing = friendIds.filter((id) => !existing[id]);
      if (missing.length === 0) return;
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,username")
        .in("id", missing);
      for (const p of (profs ?? []) as Array<{ id: string; full_name: string | null; username: string | null }>) {
        const def = p.full_name || p.username;
        if (def) {
          try { await saveNickname(p.id, def); } catch {}
        }
      }
    })();
  }, [me, friendships]);


  const incomingPending = friendships.filter(
    (f) => f.addressee_id === me && f.status === "pending",
  );

  return (
    <>
      <header className="app-header px-5 pt-6 pb-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Pessoas</h1>
        <div className="mt-3 flex gap-1 rounded-full bg-muted p-1">
          <TabBtn active={tab === "search"} onClick={() => setTab("search")}>
            Pesquisar
          </TabBtn>
          <TabBtn active={tab === "requests"} onClick={() => setTab("requests")}>
            Solicitações{" "}
            {incomingPending.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 text-[10px] rounded-full bg-primary text-primary-foreground">
                {incomingPending.length}
              </span>
            )}
          </TabBtn>
        </div>
      </header>
      <main className="app-content px-5 py-3">
        {tab === "search" ? (
          <SearchTab me={me} friendships={friendships} />
        ) : (
          <RequestsTab me={me} friendships={friendships} />
        )}
      </main>
    </>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${active ? "bg-background shadow-card" : "text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}

function SearchTab({ me, friendships }: { me: string | null; friendships: Friendship[] }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const query = q.trim();
      if (!query || !me) {
        setResults([]);
        return;
      }
      // If query is exactly 6 digits, search by short_code first (exact match)
      const isCode = /^\d{6}$/.test(query);
      let data: any[] | null = null;
      if (isCode) {
        const res = await supabase
          .from("profiles")
          .select("id,full_name,username,avatar_url,short_code")
          .eq("short_code", query)
          .neq("id", me)
          .limit(5);
        data = res.data;
      }
      if (!data || data.length === 0) {
        const res = await supabase
          .from("profiles")
          .select("id,full_name,username,avatar_url,short_code")
          .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
          .neq("id", me)
          .limit(20);
        data = res.data;
      }
      if (!cancelled) setResults((data ?? []) as Profile[]);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, me]);

  function statusFor(otherId: string): {
    kind: "none" | "sent_pending" | "sent_rejected" | "received_pending" | "accepted";
    row?: Friendship;
  } {
    const f = friendships.find(
      (x) =>
        (x.requester_id === me && x.addressee_id === otherId) ||
        (x.addressee_id === me && x.requester_id === otherId),
    );
    if (!f) return { kind: "none" };
    if (f.status === "accepted") return { kind: "accepted", row: f };
    if (f.requester_id === me)
      return { kind: f.status === "pending" ? "sent_pending" : "sent_rejected", row: f };
    return { kind: "received_pending", row: f };
  }

  async function sendRequest(otherId: string) {
    if (!me) return;
    setBusy(otherId);
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: me, addressee_id: otherId, status: "pending" });
    setBusy(null);
    if (error) toast.error(error.message);
    else toast.success("Solicitação enviada");
  }

  async function cancelRequest(rowId: string) {
    setBusy(rowId);
    const { error } = await supabase.from("friendships").delete().eq("id", rowId);
    setBusy(null);
    if (error) toast.error(error.message);
  }

  async function openChat(otherId: string) {
    setBusy(otherId);
    const chatId = await findDirectChatWith(otherId);
    setBusy(null);
    if (chatId) navigate({ to: "/chats/$id", params: { id: chatId } });
    else toast.error("Conversa ainda não foi criada. Tente novamente.");
  }

  return (
    <div>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nome, @usuário ou código (6 dígitos)"
          inputMode="text"
          className="w-full rounded-2xl bg-input/60 pl-9 pr-4 py-3 outline-none border focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="mt-4">
        {!q && (
          <p className="text-sm text-muted-foreground text-center py-10">
            Digite algo para buscar pessoas
          </p>
        )}
        {q && results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">Ninguém encontrado</p>
        )}
        <ul className="space-y-2">
          {results.map((r) => {
            const st = statusFor(r.id);
            const name = r.full_name || r.username || "Usuário";
            return (
              <li
                key={r.id}
                onPointerDown={st.kind === "accepted" ? () => openChat(r.id) : undefined}
                className={`flex items-center gap-3 p-3 rounded-2xl bg-card border shadow-card ${st.kind === "accepted" ? "cursor-pointer select-none active:bg-muted/70" : ""}`}
              >
                <div className="h-11 w-11 rounded-full bg-gradient-brand grid place-items-center text-white font-semibold">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.username ? `@${r.username}` : ""}
                  </div>
                </div>
                {st.kind === "none" && (
                  <button
                    disabled={busy === r.id}
                    onClick={() => sendRequest(r.id)}
                    className="rounded-full bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Adicionar
                  </button>
                )}
                {st.kind === "sent_pending" && (
                  <button
                    disabled={busy === st.row!.id}
                    onClick={() => cancelRequest(st.row!.id)}
                    className="rounded-full bg-muted text-muted-foreground px-3 py-2 text-xs font-semibold flex items-center gap-1"
                  >
                    <Clock className="h-3.5 w-3.5" /> Pendente
                  </button>
                )}
                {st.kind === "sent_rejected" && (
                  <span className="rounded-full bg-destructive/10 text-destructive px-3 py-2 text-xs font-semibold flex items-center gap-1">
                    <Ban className="h-3.5 w-3.5" /> Recusado
                  </span>
                )}
                {st.kind === "received_pending" && (
                  <span className="rounded-full bg-warning/20 text-foreground px-3 py-2 text-xs font-semibold">
                    Pediu você
                  </span>
                )}
                {st.kind === "accepted" && (
                  <span className="rounded-full bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" /> Conversar
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function RequestsTab({ me, friendships }: { me: string | null; friendships: Friendship[] }) {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const incoming = friendships.filter((f) => f.addressee_id === me && f.status === "pending");
  const outgoing = friendships.filter((f) => f.requester_id === me);

  useEffect(() => {
    const ids = Array.from(
      new Set([...incoming.map((f) => f.requester_id), ...outgoing.map((f) => f.addressee_id)]),
    );
    if (ids.length === 0) {
      setProfiles({});
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,username,avatar_url")
        .in("id", ids);
      const map: Record<string, Profile> = {};
      ((data ?? []) as Profile[]).forEach((p) => {
        map[p.id] = p;
      });
      setProfiles(map);
    })();
  }, [friendships, me]);

  async function respond(rowId: string, status: "accepted" | "rejected") {
    setBusy(rowId);
    const { error } = await supabase.from("friendships").update({ status }).eq("id", rowId);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success(status === "accepted" ? "Solicitação aceita" : "Solicitação recusada");
      const row = incoming.find((f) => f.id === rowId);
      if (status === "accepted" && row) {
        // Pre-fill nickname with profile's full name so it shows up as "Lopes" etc.
        const p = profiles[row.requester_id];
        const defaultName = p?.full_name || p?.username || "";
        if (defaultName) {
          try { await saveNickname(row.requester_id, defaultName); } catch {}
        }
        const chatId = await findDirectChatWith(row.requester_id);
        if (chatId) navigate({ to: "/chats/$id", params: { id: chatId } });
      }
    }
  }


  async function cancel(rowId: string) {
    setBusy(rowId);
    const { error } = await supabase.from("friendships").delete().eq("id", rowId);
    setBusy(null);
    if (error) toast.error(error.message);
  }

  async function openChat(otherId: string) {
    setBusy(otherId);
    const chatId = await findDirectChatWith(otherId);
    setBusy(null);
    if (chatId) navigate({ to: "/chats/$id", params: { id: chatId } });
    else toast.error("Conversa ainda não foi criada. Tente novamente.");
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">
          Recebidas
        </h2>
        {incoming.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhuma solicitação pendente</p>
        ) : (
          <ul className="space-y-2">
            {incoming.map((f) => {
              const p = profiles[f.requester_id];
              const name = p?.full_name || p?.username || "Usuário";
              return (
                <li
                  key={f.id}
                  onPointerDown={
                    f.status === "accepted" ? () => openChat(f.addressee_id) : undefined
                  }
                  className={`flex items-center gap-3 p-3 rounded-2xl bg-card border shadow-card ${f.status === "accepted" ? "cursor-pointer select-none active:bg-muted/70" : ""}`}
                >
                  <div className="h-11 w-11 rounded-full bg-gradient-brand grid place-items-center text-white font-semibold">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p?.username ? `@${p.username}` : ""}
                    </div>
                  </div>
                  <button
                    disabled={busy === f.id}
                    onClick={() => respond(f.id, "accepted")}
                    className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    disabled={busy === f.id}
                    onClick={() => respond(f.id, "rejected")}
                    className="h-9 w-9 rounded-full bg-muted grid place-items-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">
          Enviadas
        </h2>
        {outgoing.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Você não enviou solicitações</p>
        ) : (
          <ul className="space-y-2">
            {outgoing.map((f) => {
              const p = profiles[f.addressee_id];
              const name = p?.full_name || p?.username || "Usuário";
              return (
                <li
                  key={f.id}
                  onPointerDown={
                    f.status === "accepted" ? () => openChat(f.addressee_id) : undefined
                  }
                  className={`flex items-center gap-3 p-3 rounded-2xl bg-card border shadow-card ${f.status === "accepted" ? "cursor-pointer select-none active:bg-muted/70" : ""}`}
                >
                  <div className="h-11 w-11 rounded-full bg-gradient-brand grid place-items-center text-white font-semibold">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p?.username ? `@${p.username}` : ""}
                    </div>
                  </div>
                  {f.status === "pending" && (
                    <>
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Pendente
                      </span>
                      <button
                        disabled={busy === f.id}
                        onClick={() => cancel(f.id)}
                        className="text-xs text-destructive font-semibold ml-1"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                  {f.status === "accepted" && (
                    <span className="rounded-full bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" /> Conversar
                    </span>
                  )}
                  {f.status === "rejected" && (
                    <>
                      <span className="text-xs font-semibold text-destructive flex items-center gap-1">
                        <Ban className="h-3.5 w-3.5" /> Recusado
                      </span>
                      <button
                        disabled={busy === f.id}
                        onClick={() => cancel(f.id)}
                        className="text-xs text-muted-foreground font-semibold ml-1"
                      >
                        Remover
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
