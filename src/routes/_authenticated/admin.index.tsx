import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  amIAdmin,
  ensureAdminAccess,
  adminListUsers,
  adminStats,
  adminGrantPlus,
  adminRevokePlus,
  adminSetAdminRole,
  adminDeleteUser,
  type AdminUserRow,
  type AdminStats,
} from "@/lib/admin.functions";
import {
  Shield, Search, AlertTriangle, Crown, Copy, LogOut, RefreshCw,
  Users, MessageSquare, FileText, Activity, UserPlus, Sparkles,
  Trash2, ShieldOff, ShieldCheck, MoreVertical, EyeOff, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminPage,
});

const PLUS_PRESETS: { label: string; days: number | null }[] = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "1 ano", days: 365 },
  { label: "10 anos", days: 3650 },
  { label: "ILIMITADO", days: null },
];

function AdminPage() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(amIAdmin);
  const ensureAdmin = useServerFn(ensureAdminAccess);
  const listUsers = useServerFn(adminListUsers);
  const getStats = useServerFn(adminStats);
  const grantPlus = useServerFn(adminGrantPlus);
  const revokePlus = useServerFn(adminRevokePlus);
  const setAdminRole = useServerFn(adminSetAdminRole);
  const deleteUser = useServerFn(adminDeleteUser);

  const [phase, setPhase] = useState<"loading" | "denied" | "open">("loading");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "suspicious" | "plus" | "admin">("all");
  const [loadingList, setLoadingList] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  async function refreshAdmin() {
    setLoadingList(true);
    try {
      const [u, s] = await Promise.all([
        listUsers({ data: { search, limit: 500 } }),
        getStats({}),
      ]);
      setUsers(u);
      setStats(s);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao carregar");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const r = await ensureAdmin({});
        if (r.is_admin) {
          setPhase("open");
          refreshAdmin();
        } else {
          setPhase("denied");
        }
      } catch {
        const r = await checkAdmin({}).catch(() => ({ is_admin: false }));
        setPhase(r.is_admin ? "open" : "denied");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "open") return;
    const t = setTimeout(() => refreshAdmin(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (filter === "suspicious") return u.suspicious_score > 0;
      if (filter === "plus") return u.is_plus;
      if (filter === "admin") return u.is_admin;
      return true;
    });
  }, [users, filter]);

  async function doGrant(u: AdminUserRow, days: number | null) {
    setBusyId(u.id); setOpenMenu(null);
    try {
      const r = await grantPlus({ data: { userId: u.id, days } });
      toast.success(r.until ? `Plus liberado até ${new Date(r.until).toLocaleDateString("pt-BR")}` : "Plus ILIMITADO liberado");
      refreshAdmin();
    } catch (e: any) { toast.error(e?.message || "Falha"); }
    finally { setBusyId(null); }
  }
  async function doRevokePlus(u: AdminUserRow) {
    setBusyId(u.id); setOpenMenu(null);
    try {
      await revokePlus({ data: { userId: u.id } });
      toast.success("Plus removido");
      refreshAdmin();
    } catch (e: any) { toast.error(e?.message || "Falha"); }
    finally { setBusyId(null); }
  }
  async function doToggleAdmin(u: AdminUserRow) {
    setBusyId(u.id); setOpenMenu(null);
    try {
      await setAdminRole({ data: { userId: u.id, makeAdmin: !u.is_admin } });
      toast.success(u.is_admin ? "ADM removido" : "ADM concedido");
      refreshAdmin();
    } catch (e: any) { toast.error(e?.message || "Falha"); }
    finally { setBusyId(null); }
  }
  async function doDelete(u: AdminUserRow) {
    if (!confirm(`Excluir usuário ${u.username || u.email}? Esta ação é IRREVERSÍVEL.`)) return;
    setBusyId(u.id); setOpenMenu(null);
    try {
      await deleteUser({ data: { userId: u.id } });
      toast.success("Usuário excluído");
      refreshAdmin();
    } catch (e: any) { toast.error(e?.message || "Falha"); }
    finally { setBusyId(null); }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  if (phase === "loading") {
    return <div className="p-10 text-sm text-muted-foreground">Verificando acesso…</div>;
  }

  if (phase === "denied") {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary grid place-items-center">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Administrador não autorizado</h1>
              <p className="text-xs text-muted-foreground">Entre com a conta ADM para abrir este painel.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background" onClick={() => setOpenMenu(null)}>
      <header className="app-header px-5 pt-5 pb-3 border-b bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-soft">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">Painel ADM</h1>
            <p className="text-[11px] text-muted-foreground">Controle total — Peacely</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); refreshAdmin(); }} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted" title="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`} />
          </button>
          <button onClick={signOut} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted" title="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {stats && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
            <BigStat icon={<Users className="h-4 w-4" />} label="Usuários" value={stats.total_users} sub={`+${stats.new_users_24h} 24h`} />
            <BigStat icon={<Sparkles className="h-4 w-4" />} label="Plus" value={stats.plus_users} sub={`${stats.total_users ? Math.round(stats.plus_users / stats.total_users * 100) : 0}%`} />
            <BigStat icon={<FileText className="h-4 w-4" />} label="Posts" value={stats.total_posts} sub={`+${stats.new_posts_24h} 24h`} />
            <BigStat icon={<MessageSquare className="h-4 w-4" />} label="Mensagens" value={stats.total_messages} sub={`+${stats.new_messages_24h} 24h`} />
            <BigStat icon={<Activity className="h-4 w-4" />} label="Ativos 24h" value={stats.active_24h} sub={`${stats.total_chats} chats`} />
          </div>
        )}

        <Link
          to="/admin/benefits"
          className="mt-3 flex items-center gap-3 rounded-2xl border bg-gradient-to-br from-amber-400/15 via-amber-500/10 to-transparent p-3 shadow-soft hover:shadow-md transition-shadow"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white grid place-items-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">Controle de Benefícios</div>
            <div className="text-[11px] text-muted-foreground">Editar limites e recursos dos planos Free e Plus</div>
          </div>
          <span className="text-xs font-semibold text-primary">Abrir →</span>
        </Link>

        <Link
          to="/admin/security"
          className="mt-3 flex items-center gap-3 rounded-2xl border bg-gradient-to-br from-red-500/15 via-red-500/10 to-transparent p-3 shadow-soft hover:shadow-md transition-shadow"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white grid place-items-center">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">Segurança</div>
            <div className="text-[11px] text-muted-foreground">Eventos suspeitos, uploads bloqueados, falhas de login</div>
          </div>
          <span className="text-xs font-semibold text-primary">Abrir →</span>
        </Link>

        <Link
          to="/admin/reports"
          className="mt-3 flex items-center gap-3 rounded-2xl border bg-gradient-to-br from-destructive/15 via-destructive/10 to-transparent p-3 shadow-soft hover:shadow-md transition-shadow"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-destructive to-red-700 text-destructive-foreground grid place-items-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">Denúncias</div>
            <div className="text-[11px] text-muted-foreground">Departamento de investigação · perfis em supervisão</div>
          </div>
          <span className="text-xs font-semibold text-primary">Abrir →</span>
        </Link>





        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, @user ou código"
              className="w-full rounded-full bg-input/60 border border-border pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <div className="mt-2 flex gap-1 text-xs font-semibold flex-wrap">
          {(["all", "suspicious", "plus", "admin"] as const).map((k) => (
            <button
              key={k}
              onClick={(e) => { e.stopPropagation(); setFilter(k); }}
              className={`px-3 py-1 rounded-full ${filter === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {k === "all" ? `Todos (${users.length})`
                : k === "suspicious" ? `Suspeitos (${users.filter(u => u.suspicious_score>0).length})`
                : k === "plus" ? `Plus (${users.filter(u => u.is_plus).length})`
                : `ADMs (${users.filter(u => u.is_admin).length})`}
            </button>
          ))}
        </div>
      </header>

      <main className="app-content">
        {loadingList && users.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">
            <UserPlus className="h-6 w-6 mx-auto mb-2 opacity-50" />
            Nenhum usuário.
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((u) => (
              <UserRow
                key={u.id}
                u={u}
                busy={busyId === u.id}
                menuOpen={openMenu === u.id}
                onToggleMenu={(e) => { e.stopPropagation(); setOpenMenu(openMenu === u.id ? null : u.id); }}
                onGrant={(d) => doGrant(u, d)}
                onRevokePlus={() => doRevokePlus(u)}
                onToggleAdmin={() => doToggleAdmin(u)}
                onDelete={() => doDelete(u)}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function BigStat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-card px-3 py-2.5 shadow-soft">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        {icon} {label}
      </div>
      <div className="mt-0.5 text-xl font-extrabold tabular-nums leading-tight">{value.toLocaleString("pt-BR")}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function UserRow({
  u, busy, menuOpen, onToggleMenu, onGrant, onRevokePlus, onToggleAdmin, onDelete,
}: {
  u: AdminUserRow;
  busy: boolean;
  menuOpen: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  onGrant: (days: number | null) => void;
  onRevokePlus: () => void;
  onToggleAdmin: () => void;
  onDelete: () => void;
}) {
  const initial = (u.full_name || u.username || u.email || "?").charAt(0).toUpperCase();
  return (
    <li className="px-4 py-3 relative hover:bg-muted/40 transition-colors">
      <div className="flex items-start gap-3">
        <Link to="/admin/u/$id" params={{ id: u.id }} className="h-11 w-11 rounded-full bg-gradient-brand grid place-items-center text-white font-semibold overflow-hidden shrink-0">
          {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : initial}
        </Link>
        <Link to="/admin/u/$id" params={{ id: u.id }} className="flex-1 min-w-0 cursor-pointer">

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold truncate">{u.full_name || u.username || "—"}</span>
            {u.is_plus && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
                <Crown className="h-3 w-3" /> PLUS
                {u.plus_until && <span className="opacity-70 ml-1">até {new Date(u.plus_until).toLocaleDateString("pt-BR")}</span>}
              </span>
            )}
            {u.is_admin && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">ADM</span>
            )}
            {u.suspicious_score > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">
                <AlertTriangle className="h-3 w-3" /> suspeito
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            @{u.username || "—"} · {u.email || "sem e-mail"}
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            <span><strong className="text-foreground tabular-nums">{u.followers_count}</strong> seguidores</span>
            <span><strong className="text-foreground tabular-nums">{u.following_count}</strong> seguindo</span>
            <span><strong className="text-foreground tabular-nums">{u.posts_count}</strong> posts</span>
            <span>·</span>
            <span>24h: {u.recent_messages_24h} msg · {u.recent_posts_24h} posts</span>
            {u.last_sign_in_at && <span>· último login {new Date(u.last_sign_in_at).toLocaleString("pt-BR")}</span>}
          </div>
          {u.short_code && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard?.writeText(u.short_code!); toast.success(`Código ${u.short_code} copiado`); }}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary cursor-pointer"
            >
              <Copy className="h-3 w-3" /> {u.short_code}
            </span>
          )}
          {u.suspicious_reasons.length > 0 && (
            <ul className="mt-1 text-[11px] text-destructive list-disc list-inside">
              {u.suspicious_reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </Link>
        <button
          onClick={onToggleMenu}
          disabled={busy}
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted shrink-0"
        >
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
        </button>
      </div>

      {menuOpen && (
        <div
          className="absolute right-3 top-12 z-20 w-56 rounded-2xl border bg-popover shadow-xl p-1.5 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Conceder Plus</div>
          {PLUS_PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => onGrant(p.days)}
              className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted flex items-center gap-2"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Plus por {p.label}
            </button>
          ))}
          <button
            onClick={() => {
              const v = prompt("Quantos dias de Plus?", "30");
              const n = v ? parseInt(v, 10) : NaN;
              if (Number.isFinite(n) && n > 0) onGrant(n);
            }}
            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted flex items-center gap-2"
          >
            <Sparkles className="h-3.5 w-3.5" /> Personalizado…
          </button>
          {u.is_plus && (
            <button onClick={onRevokePlus} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted flex items-center gap-2 text-amber-700">
              <Crown className="h-3.5 w-3.5" /> Remover Plus
            </button>
          )}
          <div className="my-1 border-t" />
          <button onClick={onToggleAdmin} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted flex items-center gap-2">
            {u.is_admin ? <><ShieldOff className="h-3.5 w-3.5" /> Remover ADM</> : <><ShieldCheck className="h-3.5 w-3.5" /> Conceder ADM</>}
          </button>
          <div className="my-1 border-t" />
          <button onClick={onDelete} className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-destructive/10 text-destructive flex items-center gap-2">
            <Trash2 className="h-3.5 w-3.5" /> Excluir usuário
          </button>
        </div>
      )}
    </li>
  );
}
