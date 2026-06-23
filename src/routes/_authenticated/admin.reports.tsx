import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  adminListReports,
  adminUpdateReportStatus,
  adminBanPermanent,
  adminUnbanPermanent,
  REPORT_REASON_LABELS,
  type AdminReportRow,
} from "@/lib/reports.functions";
import { ArrowLeft, Flag, RefreshCw, Ban, ShieldCheck, Eye, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReportsPage,
});

const FILTERS = [
  { key: "pending", label: "Pendentes" },
  { key: "all", label: "Todas" },
  { key: "reviewed", label: "Analisadas" },
  { key: "actioned", label: "Aplicadas" },
  { key: "dismissed", label: "Arquivadas" },
] as const;

function AdminReportsPage() {
  const list = useServerFn(adminListReports);
  const updateStatus = useServerFn(adminUpdateReportStatus);
  const banPerma = useServerFn(adminBanPermanent);
  const unbanPerma = useServerFn(adminUnbanPermanent);

  const [rows, setRows] = useState<AdminReportRow[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const r = await list({ data: { status: filter, limit: 200 } });
      setRows(r);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [filter]);

  async function setStatus(id: string, status: "reviewed" | "dismissed" | "actioned") {
    setBusyId(id);
    try {
      await updateStatus({ data: { reportId: id, status } });
      toast.success("Status atualizado");
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Falha");
    } finally {
      setBusyId(null);
    }
  }

  async function ban(userId: string) {
    if (!confirm("Banir PERMANENTEMENTE? Só será desbanido por ADM.")) return;
    setBusyId(userId);
    try {
      await banPerma({ data: { userId, reason: "Banimento via denúncia" } });
      toast.success("Usuário banido permanentemente");
      refresh();
    } catch (e: any) { toast.error(e?.message || "Falha"); }
    finally { setBusyId(null); }
  }

  async function unban(userId: string) {
    setBusyId(userId);
    try {
      await unbanPerma({ data: { userId } });
      toast.success("Banimento removido");
      refresh();
    } catch (e: any) { toast.error(e?.message || "Falha"); }
    finally { setBusyId(null); }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="app-header px-5 pt-4 pb-3 border-b bg-gradient-to-br from-destructive/10 via-background to-background">
        <div className="flex items-center gap-2">
          <Link to="/admin" className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-9 w-9 rounded-xl bg-destructive text-destructive-foreground grid place-items-center shadow-soft">
            <Flag className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">Denúncias</h1>
            <p className="text-[11px] text-muted-foreground">Departamento de investigação</p>
          </div>
          <button onClick={refresh} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <main className="app-content p-4 space-y-3">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-10">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Nenhuma denúncia.</p>
        ) : (
          rows.map((r) => (
            <article key={r.id} className="rounded-2xl border bg-card p-4 shadow-soft space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-muted overflow-hidden grid place-items-center text-sm font-bold shrink-0">
                  {r.target_user.avatar_url ? (
                    <img src={r.target_user.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (r.target_user.full_name || r.target_user.username || "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to="/admin/u/$id"
                      params={{ id: r.target_user.id }}
                      className="font-bold text-sm truncate hover:underline"
                    >
                      {r.target_user.full_name || r.target_user.username || "—"}
                    </Link>
                    {r.target_user.banned && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground">BANIDO</span>
                    )}
                    {r.target_user.under_supervision && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700">
                        <AlertTriangle className="h-2.5 w-2.5" /> SUPERVISÃO
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {r.target_user.reports_count} denúncia{r.target_user.reports_count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    @{r.target_user.username || "—"} · {r.target_type}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass(r.status)}`}>
                  {r.status.toUpperCase()}
                </span>
              </div>

              <div className="rounded-xl bg-muted/50 p-3 text-xs space-y-1">
                <div>
                  <span className="font-bold text-destructive">{REPORT_REASON_LABELS[r.reason]}</span>
                </div>
                {r.details && <p className="whitespace-pre-wrap text-foreground/80">{r.details}</p>}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Denunciado por{" "}
                  <Link to="/admin/u/$id" params={{ id: r.reporter.id }} className="font-semibold text-primary hover:underline">
                    @{r.reporter.username || "—"}
                  </Link>
                </span>
                <span>{new Date(r.created_at).toLocaleString("pt-BR")}</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  to="/admin/u/$id"
                  params={{ id: r.target_user.id }}
                  className="px-3 py-1.5 rounded-full bg-muted text-xs font-bold hover:bg-muted/70 inline-flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" /> Ver perfil
                </Link>
                {r.status === "pending" && (
                  <>
                    <button
                      disabled={busyId === r.id}
                      onClick={() => setStatus(r.id, "reviewed")}
                      className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 disabled:opacity-50"
                    >
                      Marcar analisada
                    </button>
                    <button
                      disabled={busyId === r.id}
                      onClick={() => setStatus(r.id, "dismissed")}
                      className="px-3 py-1.5 rounded-full bg-muted text-xs font-bold hover:bg-muted/70 disabled:opacity-50"
                    >
                      Arquivar
                    </button>
                  </>
                )}
                {r.target_user.banned ? (
                  <button
                    disabled={busyId === r.target_user.id}
                    onClick={() => unban(r.target_user.id)}
                    className="ml-auto px-3 py-1.5 rounded-full bg-muted text-xs font-bold hover:bg-muted/70 disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Desbanir
                  </button>
                ) : (
                  <button
                    disabled={busyId === r.target_user.id}
                    onClick={() => { ban(r.target_user.id); setStatus(r.id, "actioned"); }}
                    className="ml-auto px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    <Ban className="h-3.5 w-3.5" /> Banir permanente
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </main>
    </div>
  );
}

function statusClass(s: string) {
  switch (s) {
    case "pending": return "bg-amber-500/15 text-amber-700";
    case "actioned": return "bg-destructive/15 text-destructive";
    case "reviewed": return "bg-primary/15 text-primary";
    default: return "bg-muted text-muted-foreground";
  }
}
