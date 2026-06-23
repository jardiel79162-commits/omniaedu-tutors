import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, LogOut, ShieldCheck, KeyRound, UserCog } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [{ title: "Configurações — Peacely" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [loadingMe, setLoadingMe] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [hideFollowers, setHideFollowers] = useState(false);
  const [hideFollowing, setHideFollowing] = useState(false);
  const [privacySaving, setPrivacySaving] = useState<"followers" | "following" | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      setEmail(u?.email ?? "");
      setUserId(u?.id ?? null);
      if (u?.id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("hide_followers,hide_following")
          .eq("id", u.id)
          .maybeSingle();
        setHideFollowers(!!(p as any)?.hide_followers);
        setHideFollowing(!!(p as any)?.hide_following);
      }
      setLoadingMe(false);
    })();
  }, []);

  async function togglePrivacy(field: "hide_followers" | "hide_following", next: boolean) {
    if (!userId) return;
    const key = field === "hide_followers" ? "followers" : "following";
    setPrivacySaving(key);
    const prev = field === "hide_followers" ? hideFollowers : hideFollowing;
    if (field === "hide_followers") setHideFollowers(next);
    else setHideFollowing(next);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ [field]: next })
      .eq("id", userId);
    if (error) {
      toast.error("Não foi possível salvar a preferência");
      if (field === "hide_followers") setHideFollowers(prev);
      else setHideFollowing(prev);
    } else {
      toast.success(next ? "Lista oculta" : "Lista visível");
    }
    setPrivacySaving(null);
  }


  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd.length < 6) return toast.error("A senha precisa ter pelo menos 6 caracteres.");
    if (newPwd !== confirmPwd) return toast.error("As senhas não coincidem.");
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso.");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar senha");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 md:px-8 py-3 bg-background/80 backdrop-blur border-b border-border">
        <Link to="/profile" className="md:hidden text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg md:text-2xl font-bold tracking-tight">Configurações</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 space-y-6 pb-28">
        {/* Conta */}
        <section className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold">Conta</h2>
              <p className="text-xs text-muted-foreground">Seu e-mail de acesso</p>
            </div>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">E-mail</span>
            <input
              type="email"
              value={loadingMe ? "Carregando..." : email}
              readOnly
              className="mt-1 w-full rounded-2xl bg-muted/40 border border-border px-4 py-3 text-sm outline-none"
            />
          </label>
        </section>

        {/* Trocar senha */}
        <section className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold">Alterar senha</h2>
              <p className="text-xs text-muted-foreground">
                Por segurança, sua senha atual nunca é exibida.
              </p>
            </div>
          </div>

          <form onSubmit={changePassword} className="space-y-3">
            <PwdField
              label="Nova senha"
              value={newPwd}
              onChange={setNewPwd}
              show={showNew}
              toggle={() => setShowNew((v) => !v)}
            />
            <PwdField
              label="Confirmar nova senha"
              value={confirmPwd}
              onChange={setConfirmPwd}
              show={showConfirm}
              toggle={() => setShowConfirm((v) => !v)}
            />
            <button
              disabled={saving}
              className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-60 shadow-soft"
            >
              {saving ? "Salvando..." : "Atualizar senha"}
            </button>
          </form>
        </section>

        {/* Privacidade */}
        <section className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <UserCog className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold">Privacidade</h2>
              <p className="text-xs text-muted-foreground">
                Controle quem pode ver suas listas de seguidores.
              </p>
            </div>
          </div>

          <PrivacyToggle
            label="Ocultar meus seguidores"
            description="Outras pessoas verão um aviso ao tentar abrir sua lista de seguidores."
            checked={hideFollowers}
            saving={privacySaving === "followers"}
            onChange={(v) => togglePrivacy("hide_followers", v)}
          />
          <div className="h-px bg-border my-3" />
          <PrivacyToggle
            label="Ocultar quem eu sigo"
            description="A lista de pessoas que você segue ficará privada."
            checked={hideFollowing}
            saving={privacySaving === "following"}
            onChange={(v) => togglePrivacy("hide_following", v)}
          />
        </section>

        {/* Segurança */}

        <section className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold">Sessão</h2>
              <p className="text-xs text-muted-foreground">Encerre sua sessão neste dispositivo.</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-full bg-destructive/10 text-destructive py-3 font-semibold hover:bg-destructive/15 transition"
          >
            <LogOut className="h-4 w-4" /> Sair da conta
          </button>
        </section>
      </div>
    </div>
  );
}

function PrivacyToggle({
  label,
  description,
  checked,
  saving,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  saving: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={saving}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 h-7 w-12 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        } disabled:opacity-60`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

function PwdField({
  label,
  value,
  onChange,
  show,
  toggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggle: () => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1 relative flex items-center rounded-2xl bg-input/60 border border-border focus-within:ring-2 focus-within:ring-ring transition-all">
        <span className="pl-4 text-muted-foreground">
          <Lock className="h-4 w-4" />
        </span>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          minLength={6}
          required
          placeholder="Mínimo 6 caracteres"
          className="flex-1 bg-transparent px-3 py-3 outline-none text-sm"
        />
        <button
          type="button"
          onClick={toggle}
          className="pr-4 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}
