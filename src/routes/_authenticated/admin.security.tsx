import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ShieldAlert, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/security")({
  head: () => ({ meta: [{ title: "Segurança — Admin" }] }),
  component: AdminSecurityPage,
});

interface Event {
  id: string;
  event_type: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  risk_score: number;
  user_id: string | null;
  ip: string | null;
  route: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const SEV_COLOR: Record<Event["severity"], string> = {
  info: "bg-muted text-foreground",
  low: "bg-blue-500/15 text-blue-500",
  medium: "bg-yellow-500/15 text-yellow-500",
  high: "bg-orange-500/15 text-orange-500",
  critical: "bg-destructive/15 text-destructive",
};

function AdminSecurityPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [sev, setSev] = useState<"all" | Event["severity"]>("all");

  async function load() {
    setLoading(true);
    let q = supabase
      .from("security_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (sev !== "all") q = q.eq("severity", sev);
    const { data } = await q;
    setEvents((data ?? []) as Event[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [sev]);

  return (
    <div className="min-h-full bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 md:px-8 py-3 bg-background/80 backdrop-blur border-b border-border">
        <Link to="/admin" className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <ShieldAlert className="h-5 w-5 text-primary" />
        <h1 className="text-lg md:text-2xl font-bold tracking-tight">Segurança</h1>
        <button
          onClick={load}
          className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {(["all", "info", "low", "medium", "high", "critical"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSev(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                sev === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "Todos" : s}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur divide-y divide-border overflow-hidden">
          {loading && <div className="p-6 text-sm text-muted-foreground">Carregando…</div>}
          {!loading && events.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">Nenhum evento registrado.</div>
          )}
          {events.map((e) => (
            <div key={e.id} className="p-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${SEV_COLOR[e.severity]}`}>
                  {e.severity}
                </span>
                <span className="text-sm font-semibold">{e.event_type}</span>
                <span className="text-xs text-muted-foreground">
                  risco {e.risk_score}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              {e.message && <p className="text-sm text-muted-foreground">{e.message}</p>}
              <div className="text-[11px] text-muted-foreground flex gap-3 flex-wrap">
                {e.route && <span>rota: {e.route}</span>}
                {e.ip && <span>ip: {e.ip}</span>}
                {e.user_id && <span>user: {e.user_id.slice(0, 8)}…</span>}
              </div>
              {e.metadata && Object.keys(e.metadata).length > 0 && (
                <pre className="mt-1 text-[11px] bg-muted/40 rounded-lg p-2 overflow-x-auto">
                  {JSON.stringify(e.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
