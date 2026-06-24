import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  amIAdmin,
  adminListAllChats,
  type AdminChatListItem,
} from "@/lib/admin.functions";
import {
  ArrowLeft,
  EyeOff,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/conversas")({
  head: () => ({ meta: [{ title: "Conversas — Ultrassecreto" }] }),
  component: AdminChatsPage,
});

function AdminChatsPage() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(amIAdmin);
  const listChats = useServerFn(adminListAllChats);

  const [phase, setPhase] = useState<"loading" | "denied" | "open">("loading");
  const [chats, setChats] = useState<AdminChatListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await listChats({ data: { search, limit: 300 } });
      setChats(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao carregar conversas");
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
  }, []);

  useEffect(() => {
    if (phase !== "open") return;
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalMessages = useMemo(
    () => chats.reduce((s, c) => s + c.messages_count, 0),
    [chats],
  );

  if (phase === "loading") {
    return (
      <div className="min-h-full grid place-items-center p-10 text-sm text-muted-foreground">
        Verificando acesso ultrassecreto…
      </div>
    );
  }

  if (phase === "denied") {
    return (
      <div className="min-h-full grid place-items-center p-6 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="w-full max-w-md rounded-3xl border bg-card/80 backdrop-blur p-8 shadow-2xl text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/15 text-destructive grid place-items-center mb-4">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-extrabold">Conteúdo bloqueado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta área é privativa do dono do site. Nenhum usuário, nem outros administradores
            sem o código mestre, consegue visualizá-la.
          </p>
          <button
            onClick={() => navigate({ to: "/admin" })}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-background to-background/60">
      {/* HEADER */}
      <header className="sticky top-0 z-10 backdrop-blur bg-background/70 border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted text-muted-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-rose-500 via-fuchsia-600 to-violet-700 text-white grid place-items-center shadow-lg shadow-fuchsia-500/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-extrabold tracking-tight leading-tight">
                Conversas · Ultrassecreto
              </h1>
              <p className="text-[11px] md:text-xs text-muted-foreground flex items-center gap-1">
                <EyeOff className="h-3 w-3" /> Visível apenas com a chave mestra do servidor
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

          {/* warning strip */}
          <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 mt-[2px] shrink-0" />
            <span>
              Você está vendo o conteúdo de conversas privadas. O acesso é registrado e
              criptografado. Use estritamente para moderação e investigação legítima.
            </span>
          </div>

          {/* search + stats */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por participante, nome do grupo ou trecho da última mensagem"
                className="w-full rounded-full bg-input/60 border border-border pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Stat label="Conversas" value={chats.length} />
              <Stat label="Mensagens" value={totalMessages} />
              <Stat
                label="Grupos"
                value={chats.filter((c) => c.type !== "direct").length}
              />
            </div>
          </div>
        </div>
      </header>

      {/* LIST */}
      <main className="max-w-5xl mx-auto px-4 py-5">
        {loading && chats.length === 0 ? (
          <div className="p-10 text-sm text-muted-foreground text-center">
            Decifrando registros…
          </div>
        ) : chats.length === 0 ? (
          <div className="p-10 text-sm text-muted-foreground text-center">
            <MessageCircle className="h-7 w-7 mx-auto mb-2 opacity-50" />
            Nenhuma conversa encontrada.
          </div>
        ) : (
          <ul className="space-y-2">
            {chats.map((c) => (
              <ChatCard key={c.id} c={c} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card px-2.5 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        {label}
      </div>
      <div className="text-base font-extrabold tabular-nums">
        {value.toLocaleString("pt-BR")}
      </div>
    </div>
  );
}

function ChatCard({ c }: { c: AdminChatListItem }) {
  const title =
    c.name ||
    (c.members.length
      ? c.members
          .slice(0, 2)
          .map((m) => m.full_name || m.username || "—")
          .join(" · ")
      : "Conversa sem nome");
  const isGroup = c.type !== "direct";
  return (
    <Link
      to="/admin/conversas/$chatId"
      params={{ chatId: c.id }}
      className="block rounded-2xl border bg-card hover:bg-muted/40 transition-colors p-3 shadow-sm hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        {/* avatar stack */}
        <div className="relative shrink-0 h-12 w-12">
          {c.members.slice(0, 2).map((m, i) => (
            <div
              key={m.id}
              className={`absolute h-9 w-9 rounded-full ring-2 ring-card overflow-hidden bg-gradient-to-br from-fuchsia-500 to-violet-700 text-white grid place-items-center text-xs font-bold ${
                i === 0 ? "top-0 left-0" : "bottom-0 right-0"
              }`}
            >
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (m.full_name || m.username || "?").charAt(0).toUpperCase()
              )}
            </div>
          ))}
          {c.members.length === 0 && (
            <div className="h-12 w-12 rounded-full bg-muted grid place-items-center">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold truncate">{title}</span>
            {isGroup && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                GRUPO
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {c.last_message || "Sem mensagens ainda"}
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> {c.members_count}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> {c.messages_count}
            </span>
            {c.last_message_at && (
              <span className="ml-auto">
                {new Date(c.last_message_at).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );
}
