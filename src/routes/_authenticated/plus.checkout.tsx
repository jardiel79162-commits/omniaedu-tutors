import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  QrCode,
  Copy,
  Check,
  Crown,
  Shield,
  Loader2,
  Zap,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createPixPayment, getPaymentStatus } from "@/lib/payments.functions";
import { refreshPlus, usePlus } from "@/lib/use-plus";

export const Route = createFileRoute("/_authenticated/plus/checkout")({
  component: CheckoutPage,
});

const PRICE = 19.9;

// ---- Formatters ----
function formatCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function isValidCpf(value: string) {
  const c = value.replace(/\D/g, "");
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(c[i]) * (10 - i);
  let d1 = (s * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(c[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(c[i]) * (11 - i);
  let d2 = (s * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(c[10]);
}

function CheckoutPage() {
  const navigate = useNavigate();
  const { isPlus } = usePlus();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cpf, setCpf] = useState("");

  const [pixLoading, setPixLoading] = useState(false);
  const [pix, setPix] = useState<{
    payment_id: string;
    qr_code: string;
    qr_code_base64: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const pollTimer = useRef<number | null>(null);
  const countdown = useRef<number | null>(null);

  const createPix = useServerFn(createPixPayment);
  const checkStatus = useServerFn(getPaymentStatus);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) setEmail(data.session.user.email);
    });
  }, []);

  // Poll status every 4s
  useEffect(() => {
    if (!pix || paid) return;
    pollTimer.current = window.setInterval(async () => {
      try {
        const { status } = await checkStatus({ data: { payment_id: pix.payment_id } });
        if (status === "approved") {
          setPaid(true);
          await refreshPlus();
          toast.success("Pix confirmado! Bem-vindo ao PLUS.");
          if (pollTimer.current) window.clearInterval(pollTimer.current);
        }
      } catch {
        /* silent */
      }
    }, 4000);
    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
    };
  }, [pix, paid, checkStatus]);

  // Countdown timer for expiry visual
  useEffect(() => {
    if (!pix || paid) return;
    setSecondsLeft(15 * 60);
    countdown.current = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (countdown.current) window.clearInterval(countdown.current);
    };
  }, [pix, paid]);

  function validate() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Informe nome e sobrenome");
      return false;
    }
    if (!isValidCpf(cpf)) {
      toast.error("CPF inválido");
      return false;
    }
    if (!email || !email.includes("@")) {
      toast.error("Não foi possível detectar o e-mail da sua conta");
      return false;
    }
    return true;
  }

  async function handlePix() {
    if (!validate()) return;
    setPixLoading(true);
    try {
      const res = await createPix({
        data: {
          payer_email: email,
          payer_first_name: firstName.trim(),
          payer_last_name: lastName.trim(),
          payer_doc_number: cpf,
        },
      });
      setPix({
        payment_id: res.payment_id,
        qr_code: res.qr_code,
        qr_code_base64: res.qr_code_base64,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar Pix");
    } finally {
      setPixLoading(false);
    }
  }

  async function copyPix() {
    if (!pix?.qr_code) return;
    await navigator.clipboard.writeText(pix.qr_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Código Pix copiado");
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  if (paid || isPlus) {
    return (
      <div className="min-h-dvh bg-background grid place-items-center p-6">
        <div className="max-w-sm w-full text-center space-y-4 p-6 rounded-3xl border bg-card">
          <div
            className="h-16 w-16 mx-auto rounded-2xl grid place-items-center text-white shadow-lg"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1,#a855f7)" }}
          >
            <Crown className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold">Você é PLUS!</h1>
          <p className="text-sm text-muted-foreground">
            Seu selo verificado já está ativo. Aproveite tudo do Peacely PLUS.
          </p>
          <button
            onClick={() => navigate({ to: "/profile" })}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold"
          >
            Ir para o perfil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 backdrop-blur bg-background/85 border-b">
        <div className="flex items-center gap-2 p-3">
          <Link to="/plus" className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-semibold">Checkout PLUS</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 pb-32 space-y-5">
        {/* Order summary */}
        <div
          className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl"
          style={{ background: "linear-gradient(135deg,#0ea5e9 0%,#6366f1 50%,#a855f7 100%)" }}
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="flex items-start gap-3">
            <Crown className="h-7 w-7" />
            <div className="flex-1">
              <div className="font-extrabold text-lg leading-tight">Peacely PLUS</div>
              <div className="text-xs opacity-90">Mensal · 30 dias</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold">
                R$ {PRICE.toFixed(2).replace(".", ",")}
              </div>
              <div className="text-[10px] opacity-80">por mês</div>
            </div>
          </div>
        </div>

        {/* PIX badge */}
        <div className="flex items-center gap-3 p-3 rounded-2xl border bg-card">
          <div
            className="h-10 w-10 rounded-xl grid place-items-center text-white shadow"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
          >
            <Zap className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Pagamento via Pix</div>
            <div className="text-[11px] text-muted-foreground">
              Aprovação instantânea · ativação automática
            </div>
          </div>
        </div>

        {/* PIX FORM */}
        {!pix && (
          <div className="space-y-3 p-4 rounded-2xl border bg-card">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome" value={firstName} onChange={setFirstName} placeholder="João" />
              <Field
                label="Sobrenome"
                value={lastName}
                onChange={setLastName}
                placeholder="Silva"
              />
            </div>
            <Field
              label="CPF"
              value={cpf}
              onChange={(v) => setCpf(formatCpf(v))}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
            <button
              onClick={handlePix}
              disabled={pixLoading}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold shadow inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {pixLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <QrCode className="h-5 w-5" />
              )}
              {pixLoading
                ? "Gerando..."
                : `Gerar QR Code · R$ ${PRICE.toFixed(2).replace(".", ",")}`}
            </button>
          </div>
        )}

        {/* PIX QR */}
        {pix && (
          <div className="space-y-3 p-4 rounded-2xl border bg-card text-center">
            <div className="text-sm font-semibold">Escaneie o QR Code no seu banco</div>
            <div className="mx-auto bg-white p-3 rounded-2xl inline-block shadow">
              <img
                src={`data:image/png;base64,${pix.qr_code_base64}`}
                alt="QR Code Pix"
                className="h-56 w-56"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Expira em {mm}:{ss}
            </div>
            <div className="text-xs text-muted-foreground">ou copie e cole o código abaixo</div>
            <div className="flex gap-2">
              <input
                value={pix.qr_code}
                readOnly
                className="flex-1 h-11 rounded-xl border bg-background px-3 text-xs font-mono"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                onClick={copyPix}
                className="h-11 px-4 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Ok" : "Copiar"}
              </button>
            </div>
            <div className="text-xs text-muted-foreground inline-flex items-center justify-center gap-2 pt-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Aguardando confirmação...
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Shield className="h-3 w-3" /> Pagamento processado com segurança
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "numeric" | "text" | "email";
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full h-11 rounded-xl border bg-background px-3 text-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
      />
    </div>
  );
}
