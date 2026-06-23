import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { adminListUserChats, adminViewChat, type AdminChatRow, type AdminChatMessage } from "@/lib/reports.functions";
import { ArrowLeft, RefreshCw, MessageSquare, Users } from "lucide-react";
import { toast } from "sonner";

// Secret route: only an admin who knows the URL pattern reaches here.
// /admin/inspect/$id  — inspects all chats of user $id and lets the ADM read messages.
export const Route = createFileRoute("/_authenticated/admin/inspect/$id")({
  component: AdminInspectPage,
});

function AdminInspectPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const listChats = useServerFn(adminListUserChats);
  const viewChat = useServerFn(adminViewChat);
  const [chats, setChats] = useState<AdminChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminChatRow | null>(null);
  const [messages, setMessages] = useState<AdminChatMessage[] | null>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const r = await listChats({ data: { userId: id } });
      setChats(r);
    } catch (e: any) {
      toast.error(e?.message || "Acesso negado");
      navigate({ to: "/admin" });
    } finally {
      setLoading(false);
    }
  }

  async function openChat(c: AdminChatRow) {
    setSelected(c);
    setLoadingMsgs(true);
    setMessages(null);
    try {
      const m = await viewChat({ data: { chatId: c.id, limit: 500 } });
      setMessages(m);
    } catch (e: any) {
      toast.error(e?.message || "Falha");
    } finally {
      setLoadingMsgs(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [id]);

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="app-header px-5 pt-4 pb-3 border-b">
        <div className="flex items-center gap-2">
          <Link to="/admin/u/$id" params={{ id }} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-9 w-9 rounded-xl bg-foreground text-background grid place-items-center shadow-soft">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">Inspeção de conversas</h1>
            <p className="text-[11px] text-muted-foreground">Visualização administrativa restrita</p>
          </div>
          <button onClick={refresh} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="app-content grid sm:grid-cols-[300px_1fr]">
        <aside className="border-r overflow-y-auto max-h-full">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
          ) : chats.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Sem conversas.</p>
          ) : (
            chats.map((c) => (
              <button
                key={c.id}
                onClick={() => openChat(c)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-muted ${
                  selected?.id === c.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold mb-1">
                  <Users className="h-3 w-3" />
                  {c.type === "group" ? c.name || "Grupo" : c.members.map((m) => m.username || m.full_name || "?").filter(Boolean).join(", ")}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{c.last_message || "—"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {c.last_message_at ? new Date(c.last_message_at).toLocaleString("pt-BR") : ""}
                </p>
              </button>
            ))
          )}
        </aside>

        <section className="overflow-y-auto max-h-full p-4 space-y-2">
          {!selected ? (
            <p className="text-center text-sm text-muted-foreground py-10">Selecione uma conversa para inspecionar.</p>
          ) : loadingMsgs ? (
            <p className="text-center text-sm text-muted-foreground py-10">Carregando mensagens…</p>
          ) : (messages ?? []).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">Nenhuma mensagem.</p>
          ) : (
            (messages ?? []).map((m) => (
              <div key={m.id} className={`flex gap-2 ${m.sender_id === id ? "" : "flex-row-reverse"}`}>
                <div className="h-7 w-7 rounded-full bg-muted overflow-hidden shrink-0 grid place-items-center text-[10px] font-bold">
                  {m.sender?.avatar_url ? (
                    <img src={m.sender.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (m.sender?.full_name || m.sender?.username || "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div className={`max-w-[70%] rounded-2xl px-3 py-2 ${m.sender_id === id ? "bg-primary/15" : "bg-muted"}`}>
                  <p className="text-[10px] font-bold text-muted-foreground mb-0.5">
                    @{m.sender?.username || "—"} · {new Date(m.created_at).toLocaleString("pt-BR")}
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {m.content || <span className="italic text-muted-foreground">[{m.message_type || "anexo"}]</span>}
                  </p>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
