import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  adminGetUserDetail, adminGrantPlus, adminRevokePlus,
  adminSetAdminRole, adminDeleteUser, adminSetUserBan, adminResetPassword,
  type AdminUserDetail,
} from "@/lib/admin.functions";
import { adminBanPermanent, adminUnbanPermanent } from "@/lib/reports.functions";
import {
  ArrowLeft, Crown, Shield, ShieldOff, ShieldCheck, Trash2, Ban, KeyRound,
  Mail, Hash, Users, FileText, MessageSquare, Heart,
  MessageCircle, Bell, Activity, RefreshCw, Sparkles, Copy,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/u/$id")({
  component: AdminUserDetailPage,
});

const PLUS_PRESETS: { label: string; days: number | null }[] = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1 ano", days: 365 },
  { label: "10 anos", days: 3650 },
  { label: "ILIMITADO", days: null },
];

function AdminUserDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getDetail = useServerFn(adminGetUserDetail);
  const grantPlus = useServerFn(adminGrantPlus);
  const revokePlus = useServerFn(adminRevokePlus);
  const setAdminRole = useServerFn(adminSetAdminRole);
  const deleteUser = useServerFn(adminDeleteUser);
  const setBan = useServerFn(adminSetUserBan);
  const resetPwd = useServerFn(adminResetPassword);
  const banPerma = useServerFn(adminBanPermanent);
  const unbanPerma = useServerFn(adminUnbanPermanent);

  const [d, setD] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const r = await getDetail({ data: { userId: id } });
      setD(r);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [id]);

  async function act<T>(fn: () => Promise<T>, success: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      // refresh in background — don't block UI
      refresh().catch(() => {});
    } catch (e: any) {
      toast.error(e?.message || "Falha");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !d) {
    return (
      <div className="p-10 text-sm text-muted-foreground flex items-center gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" /> Carregando perfil do usuário…
      </div>
    );
  }

  const p = d.profile ?? {};
  const initial = (p.full_name || p.username || d.auth?.email || "?").charAt(0).toUpperCase();
  const plusUntil = d.subscription?.current_period_end as string | null | undefined;
  const isBanned = d.auth?.banned_until && new Date(d.auth.banned_until).getTime() > Date.now();

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="app-header px-5 pt-4 pb-3 border-b bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="flex items-center gap-2">
          <Link to="/admin" className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-bold flex-1">Perfil do usuário</h1>
          <button onClick={refresh} className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mt-4 flex items-start gap-4">
          <div className="h-20 w-20 rounded-2xl bg-gradient-brand grid place-items-center text-white text-2xl font-extrabold overflow-hidden shrink-0 shadow-soft">
            {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold truncate">{p.full_name || p.username || "—"}</h2>
              {p.is_plus && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
                  <Crown className="h-3 w-3" /> PLUS{plusUntil ? ` até ${new Date(plusUntil).toLocaleDateString("pt-BR")}` : " ILIMITADO"}
                </span>
              )}
              {d.is_admin && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">ADM</span>}
              {isBanned && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive"><Ban className="h-3 w-3" /> BANIDO</span>}
            </div>
            <p className="text-sm text-muted-foreground">@{p.username || "—"}</p>
            {p.bio && <p className="text-xs mt-1 text-foreground/80">{p.bio}</p>}
          </div>
        </div>
      </header>

      <main className="app-content p-4 space-y-4">
        {/* Identidade */}
        <Section title="Identidade">
          <KV icon={<Mail className="h-3.5 w-3.5" />} k="E-mail" v={d.auth?.email || "—"} copy />
          <KV icon={<Hash className="h-3.5 w-3.5" />} k="Código custom" v={p.short_code || "—"} copy mono />
          <KV icon={<Shield className="h-3.5 w-3.5" />} k="Provedor" v={(d.auth?.providers || []).join(", ") || "email"} />
        </Section>

        {/* Métricas */}
        <Section title="Métricas">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <MiniStat icon={<Users className="h-3.5 w-3.5" />} label="Seguidores" value={d.counts.followers} />
            <MiniStat icon={<Users className="h-3.5 w-3.5" />} label="Seguindo" value={d.counts.following} />
            <MiniStat icon={<FileText className="h-3.5 w-3.5" />} label="Posts" value={d.counts.posts} />
            <MiniStat icon={<MessageSquare className="h-3.5 w-3.5" />} label="Mensagens" value={d.counts.messages} />
            <MiniStat icon={<MessageCircle className="h-3.5 w-3.5" />} label="Conversas" value={d.counts.chats} />
            <MiniStat icon={<Heart className="h-3.5 w-3.5" />} label="Curtidas" value={d.counts.likes_given} />
            <MiniStat icon={<MessageCircle className="h-3.5 w-3.5" />} label="Comentários" value={d.counts.comments} />
            <MiniStat icon={<Sparkles className="h-3.5 w-3.5" />} label="Status" value={d.counts.statuses} />
            <MiniStat icon={<Bell className="h-3.5 w-3.5" />} label="Notif." value={d.counts.notifications} />
            <MiniStat icon={<Activity className="h-3.5 w-3.5" />} label="24h msg/post" value={d.counts.msgs_24h + d.counts.posts_24h} />
          </div>
        </Section>

        {/* Plus / Assinatura */}
        <Section title="Plano Plus">
          <div className="text-xs text-muted-foreground mb-2">
            Status atual: <strong className="text-foreground">{d.subscription?.plan ?? "free"} / {d.subscription?.status ?? "inactive"}</strong>
            {plusUntil ? ` (até ${new Date(plusUntil).toLocaleString("pt-BR")})` : p.is_plus ? " (ilimitado)" : ""}
          </div>
          <div className="flex flex-wrap gap-2">
            {PLUS_PRESETS.map((preset) => (
              <button
                key={preset.label}
                disabled={busy}
                onClick={() => act(() => grantPlus({ data: { userId: id, days: preset.days } }), `Plus ${preset.label} concedido`)}
                className="px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-700 text-xs font-bold hover:bg-amber-500/25 disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Crown className="h-3 w-3" /> {preset.label}
              </button>
            ))}
            <button
              disabled={busy}
              onClick={() => {
                const v = prompt("Quantos dias?", "30");
                const n = v ? parseInt(v, 10) : NaN;
                if (Number.isFinite(n) && n > 0) act(() => grantPlus({ data: { userId: id, days: n } }), `Plus ${n}d concedido`);
              }}
              className="px-3 py-1.5 rounded-full bg-muted text-xs font-bold hover:bg-muted/70 disabled:opacity-50"
            >
              Personalizado…
            </button>
            {p.is_plus && (
              <button
                disabled={busy}
                onClick={() => act(() => revokePlus({ data: { userId: id } }), "Plus removido")}
                className="px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 disabled:opacity-50"
              >
                Remover Plus
              </button>
            )}
          </div>
        </Section>

        {/* Permissões */}
        <Section title="Permissões e segurança">
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => act(() => setAdminRole({ data: { userId: id, makeAdmin: !d.is_admin } }), d.is_admin ? "ADM removido" : "ADM concedido")}
              className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 disabled:opacity-50 inline-flex items-center gap-1"
            >
              {d.is_admin ? <><ShieldOff className="h-3.5 w-3.5" /> Remover ADM</> : <><ShieldCheck className="h-3.5 w-3.5" /> Conceder ADM</>}
            </button>
            {[1, 24, 24 * 7, 24 * 30].map((h) => (
              <button
                key={h}
                disabled={busy}
                onClick={() => act(() => setBan({ data: { userId: id, banDurationHours: h } }), `Banido por ${h >= 24 ? h / 24 + "d" : h + "h"}`)}
                className="px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Ban className="h-3.5 w-3.5" /> Banir {h >= 24 ? `${h / 24}d` : `${h}h`}
              </button>
            ))}
            {isBanned && (
              <button
                disabled={busy}
                onClick={() => act(() => setBan({ data: { userId: id, banDurationHours: null } }), "Banimento removido")}
                className="px-3 py-1.5 rounded-full bg-muted text-xs font-bold hover:bg-muted/70 disabled:opacity-50"
              >
                Desbanir
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => {
                if (!confirm("BANIMENTO PERMANENTE — só será desfeito se um ADM clicar em Desbanir. Confirmar?")) return;
                act(() => banPerma({ data: { userId: id, reason: "Banimento administrativo" } }), "Banido permanentemente");
              }}
              className="px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Ban className="h-3.5 w-3.5" /> Banir PERMANENTE
            </button>
            {isBanned && (
              <button
                disabled={busy}
                onClick={() => act(() => unbanPerma({ data: { userId: id } }), "Desbanido")}
                className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-700 text-xs font-bold hover:bg-emerald-500/25 disabled:opacity-50 inline-flex items-center gap-1"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Desbanir permanente
              </button>
            )}
            {/* Discreet inspection link — admin-only, undocumented in UI copy */}
            <Link
              to="/admin/inspect/$id"
              params={{ id }}
              className="px-3 py-1.5 rounded-full bg-muted text-xs font-bold hover:bg-muted/70 inline-flex items-center gap-1"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Atividade
            </Link>
            <button
              disabled={busy}
              onClick={() => {
                const np = prompt("Nova senha (mín. 6):");
                if (np && np.length >= 6) act(() => resetPwd({ data: { userId: id, newPassword: np } }), "Senha redefinida");
              }}
              className="px-3 py-1.5 rounded-full bg-muted text-xs font-bold hover:bg-muted/70 disabled:opacity-50 inline-flex items-center gap-1"
            >
              <KeyRound className="h-3.5 w-3.5" /> Redefinir senha
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (!confirm("Excluir DEFINITIVAMENTE este usuário?")) return;
                act(async () => { await deleteUser({ data: { userId: id } }); navigate({ to: "/admin" }); }, "Usuário excluído");
              }}
              className="px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1 ml-auto"
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </button>
          </div>
        </Section>

      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-soft">
      <h3 className="text-xs uppercase tracking-wide font-bold text-muted-foreground mb-3">{title}</h3>
      {children}
    </section>
  );
}

function KV({ icon, k, v, copy, mono }: { icon: React.ReactNode; k: string; v: string; copy?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1 text-xs">
      <span className="text-muted-foreground inline-flex items-center gap-1 w-32 shrink-0">{icon} {k}</span>
      <span className={`flex-1 truncate ${mono ? "font-mono" : ""}`}>{v}</span>
      {copy && v && v !== "—" && (
        <button onClick={() => { navigator.clipboard?.writeText(v); toast.success("Copiado"); }} className="h-6 w-6 grid place-items-center rounded hover:bg-muted">
          <Copy className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/60 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold inline-flex items-center gap-1">{icon} {label}</div>
      <div className="text-lg font-extrabold tabular-nums">{value.toLocaleString("pt-BR")}</div>
    </div>
  );
}
