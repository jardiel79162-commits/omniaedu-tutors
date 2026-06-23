import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { listPlanLimits, updatePlanLimit, type PlanLimitRow } from "@/lib/plan-limits.functions";
import { ensureAdminAccess } from "@/lib/admin.functions";
import { ArrowLeft, Sparkles, Save, RefreshCw, Search, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/benefits")({
  component: BenefitsPage,
});

function BenefitsPage() {
  const ensureAdmin = useServerFn(ensureAdminAccess);
  const list = useServerFn(listPlanLimits);
  const update = useServerFn(updatePlanLimit);

  const [phase, setPhase] = useState<"loading" | "denied" | "open">("loading");
  const [rows, setRows] = useState<PlanLimitRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<PlanLimitRow>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("Perfil");

  async function refresh() {
    const r = await list({});
    setRows(r);
    setDrafts({});
  }

  useEffect(() => {
    (async () => {
      try {
        const r = await ensureAdmin({});
        if (!r.is_admin) { setPhase("denied"); return; }
        await refresh();
        setPhase("open");
      } catch { setPhase("denied"); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    const s = new Set<string>();
    rows.forEach(r => s.add(r.category));
    return Array.from(s);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r =>
      (tab === "Todos" || r.category === tab) &&
      (!q || r.label.toLowerCase().includes(q) || r.key.toLowerCase().includes(q))
    );
  }, [rows, search, tab]);

  function setDraft(id: string, patch: Partial<PlanLimitRow>) {
    setDrafts(d => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  async function save(row: PlanLimitRow) {
    const d = drafts[row.id];
    if (!d) return;
    setBusy(row.id);
    try {
      await update({ data: { id: row.id, ...d } });
      toast.success(`"${row.label}" atualizado`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao salvar");
    } finally { setBusy(null); }
  }

  async function toggleEnabled(row: PlanLimitRow) {
    setBusy(row.id);
    try {
      await update({ data: { id: row.id, enabled: !row.enabled } });
      await refresh();
    } catch (e: any) { toast.error(e?.message || "Falha"); }
    finally { setBusy(null); }
  }

  if (phase === "loading") return <div className="p-10 text-sm text-muted-foreground">Verificando acesso…</div>;
  if (phase === "denied") return <div className="p-10 text-sm text-muted-foreground">Acesso negado.</div>;

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="app-header px-5 pt-5 pb-3 border-b bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="flex items-center gap-2">
          <Link to="/admin" className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white grid place-items-center shadow-soft">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">Controle de Benefícios</h1>
            <p className="text-[11px] text-muted-foreground">Edite os limites e recursos dos planos Free e Plus</p>
          </div>
          <button onClick={refresh} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar benefício…"
            className="w-full rounded-full bg-input/60 border border-border pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="mt-3 flex gap-1 flex-wrap text-xs font-semibold">
          {["Todos", ...categories].map(c => (
            <button
              key={c}
              onClick={() => setTab(c)}
              className={`px-3 py-1 rounded-full ${tab === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >{c}</button>
          ))}
        </div>
      </header>

      <main className="app-content">
        <ul className="divide-y">
          {filtered.map(row => {
            const d = drafts[row.id] || {};
            const free = d.free_value !== undefined ? d.free_value : row.free_value;
            const plus = d.plus_value !== undefined ? d.plus_value : row.plus_value;
            const dirty = !!drafts[row.id];
            return (
              <li key={row.id} className={`px-4 py-3 ${!row.enabled ? "opacity-50" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{row.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{row.key}</span>
                      {row.unit && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{row.unit}</span>}
                    </div>
                    {row.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p>
                    )}

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <ValueEditor
                        label="Free"
                        valueType={row.value_type}
                        value={free}
                        onChange={v => setDraft(row.id, { free_value: v })}
                      />
                      <ValueEditor
                        label="Plus"
                        valueType={row.value_type}
                        value={plus}
                        onChange={v => setDraft(row.id, { plus_value: v })}
                        accent
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <button onClick={() => toggleEnabled(row)} disabled={busy === row.id}>
                      {row.enabled
                        ? <ToggleRight className="h-6 w-6 text-emerald-500" />
                        : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                    </button>
                    {dirty && (
                      <button
                        onClick={() => save(row)}
                        disabled={busy === row.id}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary text-primary-foreground flex items-center gap-1"
                      >
                        {busy === row.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Salvar
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}

function ValueEditor({
  label, valueType, value, onChange, accent,
}: {
  label: string;
  valueType: "number" | "boolean" | "text" | "unlimited";
  value: any;
  onChange: (v: any) => void;
  accent?: boolean;
}) {
  const tone = accent
    ? "border-amber-400/40 bg-amber-50/30 dark:bg-amber-500/5"
    : "border-border bg-muted/30";

  return (
    <label className={`block rounded-xl border ${tone} px-2.5 py-1.5`}>
      <div className="text-[10px] uppercase font-bold tracking-wide text-muted-foreground">{label}</div>
      {valueType === "boolean" ? (
        <select
          value={value === true ? "true" : "false"}
          onChange={e => onChange(e.target.value === "true")}
          className="w-full bg-transparent text-sm font-semibold outline-none mt-0.5"
        >
          <option value="true">Ativado</option>
          <option value="false">Desativado</option>
        </select>
      ) : valueType === "number" ? (
        <input
          type="number"
          value={Number(value ?? 0)}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full bg-transparent text-sm font-semibold outline-none mt-0.5 tabular-nums"
        />
      ) : valueType === "unlimited" ? (
        <input
          type="text"
          value={String(value ?? "ilimitado")}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-transparent text-sm font-semibold outline-none mt-0.5"
        />
      ) : (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-transparent text-sm font-semibold outline-none mt-0.5"
        />
      )}
      {valueType === "number" && Number(value) === -1 && (
        <div className="text-[10px] text-amber-600 font-bold">∞ Ilimitado (use -1)</div>
      )}
    </label>
  );
}
