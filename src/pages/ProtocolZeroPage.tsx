import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldOff, AlertTriangle, Bomb, KeyRound, Lock,
  Trash2, Eye, EyeOff, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  setPanicPassword,
  isPanicEnabled,
  executeNuclearOption,
  removePanicPassword,
} from "@/lib/panicButton";
import BottomNav from "@/components/BottomNav";
import GhostIndicator from "@/components/GhostIndicator";
import { toast } from "sonner";

interface ProtocolZeroPageProps {
  ghostMode: boolean;
}

const ProtocolZeroPage = ({ ghostMode }: ProtocolZeroPageProps) => {
  const navigate = useNavigate();
  const [panicEnabled, setPanicEnabled] = useState(isPanicEnabled());
  const [showPanicSetup, setShowPanicSetup] = useState(false);
  const [panicPassword, setPanicPasswordInput] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNuclearConfirm, setShowNuclearConfirm] = useState(false);
  const [nuclearCountdown, setNuclearCountdown] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const handleSetPanicPassword = async () => {
    if (panicPassword.length < 4) {
      toast.error("Senha deve ter no mínimo 4 caracteres");
      return;
    }
    if (panicPassword !== confirmPassword) {
      toast.error("Senhas não coincidem");
      return;
    }
    await setPanicPassword(panicPassword);
    setPanicEnabled(true);
    setShowPanicSetup(false);
    setPanicPasswordInput("");
    setConfirmPassword("");
    toast.success("Senha de pânico configurada");
  };

  const handleRemovePanic = () => {
    removePanicPassword();
    setPanicEnabled(false);
    toast.success("Senha de pânico removida");
  };

  const handleNuclearOption = async () => {
    setNuclearCountdown(true);
    let count = 5;
    setCountdown(count);
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        executeNuclearOption().then(() => {
          navigate("/");
          window.location.reload();
        });
      }
    }, 1000);
  };

  const features = [
    {
      icon: KeyRound,
      title: "Criptografia sem Custódia",
      desc: "Chaves existem apenas no seu dispositivo. Nem o servidor pode ler suas mensagens.",
      status: "ATIVO",
    },
    {
      icon: Trash2,
      title: "Destruição Criptográfica",
      desc: "Ao apagar, a chave é destruída e o conteúdo se torna matematicamente irrecuperável.",
      status: "ATIVO",
    },
    {
      icon: Lock,
      title: "Bloqueio de Backups",
      desc: "Mensagens nunca entram em backups externos. Dados existem somente localmente.",
      status: "ATIVO",
    },
    {
      icon: ShieldOff,
      title: "Ausência de Custódia",
      desc: "O servidor nunca possui dados suficientes para descriptografar conteúdo.",
      status: "ATIVO",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <GhostIndicator active={ghostMode} />

      {/* Header */}
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10"
          >
            <ShieldOff className="h-5 w-5 text-destructive" />
          </motion.div>
          <div>
            <h1 className="font-mono text-xl font-bold text-foreground">
              Protocolo <span className="text-destructive">Zero</span>
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              O que é apagado deixa de existir
            </p>
          </div>
        </div>
      </div>

      {/* Security Features */}
      <div className="space-y-2 p-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
              <f.icon className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{f.title}</p>
              <p className="text-xs text-muted-foreground leading-tight">{f.desc}</p>
            </div>
            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[9px] font-bold text-primary">
              {f.status}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Panic Button Section */}
      <div className="px-4">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Botão de Pânico
        </h2>

        {/* Emergency Password Setup */}
        <div className="mb-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2">
                <KeyRound className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Senha de Emergência</p>
                <p className="text-xs text-muted-foreground">
                  {panicEnabled ? "Configurada — digitar no login apaga tudo" : "Não configurada"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {panicEnabled ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            {panicEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemovePanic}
                className="flex-1 border-destructive/30 font-mono text-xs text-destructive hover:bg-destructive/10"
              >
                Remover
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPanicSetup(!showPanicSetup)}
                className="flex-1 border-primary/30 font-mono text-xs text-primary hover:bg-primary/10"
              >
                Configurar
              </Button>
            )}
          </div>

          <AnimatePresence>
            {showPanicSetup && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3 border-t border-border pt-3">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={panicPassword}
                      onChange={(e) => setPanicPasswordInput(e.target.value)}
                      placeholder="Senha de emergência"
                      className="border-border bg-surface-1 pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmar senha"
                    className="border-border bg-surface-1 font-mono text-sm"
                  />
                  <p className="font-mono text-[10px] text-muted-foreground leading-tight">
                    ⚠️ Se digitar esta senha na tela de login, todos os dados serão permanentemente destruídos.
                  </p>
                  <Button
                    onClick={handleSetPanicPassword}
                    size="sm"
                    className="w-full bg-destructive font-mono text-xs text-destructive-foreground hover:bg-destructive/90"
                  >
                    Salvar Senha de Pânico
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nuclear Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {!showNuclearConfirm ? (
            <button
              onClick={() => setShowNuclearConfirm(true)}
              className="w-full rounded-xl border border-destructive/30 bg-destructive/5 p-4 transition-all hover:bg-destructive/10"
            >
              <div className="flex items-center justify-center gap-3">
                <Bomb className="h-5 w-5 text-destructive" />
                <span className="font-mono text-sm font-bold uppercase tracking-wider text-destructive">
                  Opção Nuclear
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                Destrói permanentemente todos os dados do aplicativo
              </p>
            </button>
          ) : (
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="rounded-xl border-2 border-destructive/50 bg-destructive/10 p-4"
            >
              {!nuclearCountdown ? (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <p className="font-mono text-sm font-bold text-destructive">AÇÃO IRREVERSÍVEL</p>
                  </div>
                  <p className="mb-4 font-mono text-xs text-foreground leading-relaxed">
                    Isso irá destruir permanentemente todas as chaves criptográficas, mensagens, dados e sessão.
                    Nenhuma recuperação será possível.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNuclearConfirm(false)}
                      className="flex-1 font-mono text-xs"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleNuclearOption}
                      className="flex-1 bg-destructive font-mono text-xs text-destructive-foreground hover:bg-destructive/90"
                    >
                      <Bomb className="mr-1 h-3 w-3" />
                      DESTRUIR TUDO
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-4">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-destructive bg-destructive/20"
                  >
                    <span className="font-mono text-2xl font-bold text-destructive">{countdown}</span>
                  </motion.div>
                  <p className="font-mono text-xs text-destructive">Destruindo dados...</p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">Protocolo Zero em execução</p>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="mt-6 px-4">
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <p className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            "No JTC Parker, o que é apagado<br />deixa de existir no mundo."
          </p>
        </div>
      </div>

      <BottomNav ghostMode={ghostMode} />
    </div>
  );
};

export default ProtocolZeroPage;
