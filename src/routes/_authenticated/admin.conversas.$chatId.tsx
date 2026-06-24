import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  amIAdmin,
  adminGetChatThread,
  type AdminChatThread,
  type AdminChatThreadMessage,
} from "@/lib/admin.functions";
import {
  ArrowLeft,
  EyeOff,
  Lock,
  RefreshCw,
  Users,
  Image as ImageIcon,
  Mic,
  Video,
  Phone,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/conversas/$chatId")({
  head: () => ({ meta: [{ title: "Mensagens — Ultrassecreto" }] }),
  component: AdminChatThreadPage,
});

function AdminChatThreadPage() {
  const { chatId } = Route.useParams();
  const navigate = useNavigate();
  const checkAdmin = useServerFn(amIAdmin);
  const getThread = useServerFn(adminGetChatThread);

  const [phase, setPhase] = useState<"loading" | "denied" | "open">("loading");
  const [data, setData] = useState<AdminChatThread | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await getThread({ data: { chatId, limit: 1000 } });
      setData(r);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao carregar conversa");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const r = await checkAdmin({}).catch(() => ({ is_admin: false }));
      if (!r.is_admin) {
        setPhase("denied");
        return;
      }
      setPhase("open");
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  if (phase === "denied") {
    return (
      <div className="min-h-full grid place-items-center p-6">
        <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-2xl">
          <Lock className="h-7 w-7 mx-auto text-destructive mb-3" />
          <h1 className="text-lg font-extrabold">Acesso bloqueado</h1>
          <button
            onClick={() => navigate({ to: "/admin" })}
            className="mt-4 text-sm font-semibold text-primary"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const chat = data?.chat;
  const title =
    chat?.name ||
    (chat?.members.length
      ? chat.members
          .slice(0, 3)
          .map((m) => m.full_name || m.username || "—")
          .join(" · ")
      : "Conversa");

  return (
    <div className="min-h-full flex flex-col bg-gradient-to-b from-background to-background/60">
      <header className="sticky top-0 z-10 backdrop-blur bg-background/80 border-b">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/conversas"
              className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted text-muted-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-rose-500 via-fuchsia-600 to-violet-700 text-white grid place-items-center shadow-lg shadow-fuchsia-500/30">
              <EyeOff className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base md:text-lg font-extrabold truncate">{title}</h1>
              <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Users className="h-3 w-3" /> {chat?.members_count ?? 0} participante(s) ·{" "}
                {chat?.messages_count ?? 0} mensagens
              </p>
            </div>
            <button
              onClick={load}
              className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted"
              title="Atualizar"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          {chat?.members?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chat.members.map((m) => (
                <Link
                  key={m.id}
                  to="/admin/u/$id"
                  params={{ id: m.id }}
                  className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full bg-muted hover:bg-muted/70"
                >
                  <span className="h-5 w-5 rounded-full overflow-hidden bg-gradient-to-br from-fuchsia-500 to-violet-700 text-white grid place-items-center text-[10px] font-bold">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (m.full_name || m.username || "?").charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="truncate max-w-[120px]">
                    {m.full_name || m.username || "—"}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-3 md:px-6 py-5 space-y-2.5">
        {!data && loading && (
          <div className="text-center text-sm text-muted-foreground py-10">
            Decifrando mensagens…
          </div>
        )}
        {data?.messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">
            Esta conversa ainda não tem mensagens.
          </div>
        )}
        {data?.messages.map((m, i) => {
          const prev = data.messages[i - 1];
          const sameAuthorAsPrev = prev?.sender_id === m.sender_id;
          return <MessageBubble key={m.id} m={m} sameAuthorAsPrev={sameAuthorAsPrev} />;
        })}
      </main>
    </div>
  );
}

function MessageBubble({
  m,
  sameAuthorAsPrev,
}: {
  m: AdminChatThreadMessage;
  sameAuthorAsPrev: boolean;
}) {
  const date = new Date(m.created_at);
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const name = m.sender?.full_name || m.sender?.username || "—";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={`flex gap-2 ${sameAuthorAsPrev ? "mt-0.5" : "mt-3"}`}>
      <div className="w-8 shrink-0">
        {!sameAuthorAsPrev && (
          <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-fuchsia-500 to-violet-700 text-white grid place-items-center text-xs font-bold">
            {m.sender?.avatar_url ? (
              <img src={m.sender.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {!sameAuthorAsPrev && (
          <div className="text-[11px] text-muted-foreground mb-0.5">
            <span className="font-semibold text-foreground">{name}</span>{" "}
            <span>· {date.toLocaleDateString("pt-BR")} {time}</span>
          </div>
        )}
        <div className="inline-block max-w-[85%] rounded-2xl rounded-tl-sm bg-card border px-3 py-2 text-sm shadow-sm">
          <MessageBody m={m} />
          {sameAuthorAsPrev && (
            <span className="block text-[10px] text-muted-foreground mt-0.5">{time}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBody({ m }: { m: AdminChatThreadMessage }) {
  if (m.message_type === "call") {
    let payload: any = {};
    try { payload = m.content ? JSON.parse(m.content) : {}; } catch {}
    const secs = Math.round((payload.duration_ms ?? m.duration_ms ?? 0) / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return (
      <div className="inline-flex items-center gap-2 text-muted-foreground">
        {payload.mode === "video" ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
        <span>
          Chamada de {payload.mode === "video" ? "vídeo" : "voz"} ·{" "}
          {secs ? `${mins}m ${s}s` : "perdida"}
          {payload.outcome ? ` · ${payload.outcome}` : ""}
        </span>
      </div>
    );
  }
  if (m.message_type === "image" && m.media_url) {
    return (
      <div>
        <img src={m.media_url} alt="" className="max-h-72 rounded-xl" />
        {m.content && <div className="mt-1 whitespace-pre-wrap">{m.content}</div>}
      </div>
    );
  }
  if (m.message_type === "audio") {
    const sec = Math.round((m.duration_ms ?? 0) / 1000);
    return (
      <div className="inline-flex items-center gap-2 text-muted-foreground">
        <Mic className="h-4 w-4" />
        <span>Áudio · {sec}s</span>
        {m.media_url && (
          <audio controls src={m.media_url} className="ml-2 h-7" />
        )}
      </div>
    );
  }
  if (m.media_url && !m.content) {
    return (
      <div className="inline-flex items-center gap-2 text-muted-foreground">
        <ImageIcon className="h-4 w-4" />
        <a href={m.media_url} target="_blank" rel="noreferrer" className="underline">
          Anexo ({m.message_type})
        </a>
      </div>
    );
  }
  return <div className="whitespace-pre-wrap break-words">{m.content || "(vazio)"}</div>;
}
