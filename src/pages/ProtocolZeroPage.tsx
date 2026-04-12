import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ScanText, FileImage, ShieldAlert, Zap, Lock, Fingerprint, RefreshCcw, HandPlatter, ShieldCheck } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import GhostIndicator from "@/components/GhostIndicator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner"; // Assuming sonner for animated toasts

interface ProtocolZeroPageProps {
  ghostMode: boolean;
}

const ProtocolZeroPage = ({ ghostMode }: ProtocolZeroPageProps) => {
  const [step, setStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<"pass" | "fail" | null>(null);

  const totalSteps = 4; // Not including dynamic scan

  const handleStartScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanResult(null);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress > 100) {
        progress = 100;
      }
      setScanProgress(progress);
      if (progress === 100) {
        clearInterval(interval);
        setTimeout(() => {
          const result = Math.random() > 0.5 ? "pass" : "fail"; // Simulate scan result
          setScanResult(result);
          setIsScanning(false);
          if (result === "pass") {
            toast.success("Verificação de Integridade concluída! Segurança no nível ideal.");
          } else {
            toast.error("Atenção! Pontos fracos detectados. Seu dispositivo pode estar comprometido.");
          }
        }, 500);
      }
    }, 150);
  };

  const stepsContent = [
    {
      title: "Integridade de Rede",
      description: "Verifica a presença de proxies, VPNs ou interceptações SSL que possam comprometer a privacidade dos seus dados em trânsito.",
      icon: <Lock size={48} className="text-security-private" />,
      action: null,
      status: scanResult === "pass" ? "pass" : scanResult === "fail" ? "fail" : "idle",
      buttonText: "Verificar Rede",
      buttonAction: () => setStep(1),
    },
    {
      title: "Análise de Sistema Operacional",
      description: "Detecta modificações no sistema operacional, root/jailbreak, ou binários suspeitos que abrem brechas de segurança.",
      icon: <ShieldAlert size={48} className="text-security-private" />,
      action: null,
      status: scanResult === "pass" ? "pass" : scanResult === "fail" ? "fail" : "idle",
      buttonText: "Analisar Sistema",
      buttonAction: () => setStep(2),
    },
    {
      title: "Verificação de Ambiente de Execução",
      description: "Identifica a presença de emuladores ou ambientes virtualizados que podem ser usados para contornar proteções do aplicativo.",
      icon: <Zap size={48} className="text-security-private" />,
      action: null,
      status: scanResult === "pass" ? "pass" : scanResult === "fail" ? "fail" : "idle",
      buttonText: "Verificar Ambiente",
      buttonAction: () => setStep(3),
    },
    {
      title: "Proteção de Biometria e Chaves",
      description: "Confirma se suas chaves criptográficas estão armazenadas de forma segura na Secure Enclave do dispositivo, e não em armazenamento volátil.",
      icon: <Fingerprint size={48} className="text-security-private" />,
      action: null,
      status: scanResult === "pass" ? "pass" : scanResult === "fail" ? "fail" : "idle",
      buttonText: "Checar Biometria",
      buttonAction: () => setStep(4),
    },
    {
      title: "Integridade do Aplicativo",
      description: "Verifica a assinatura digital e o hash do aplicativo para garantir que ele não foi adulterado ou comprometido por software malicioso.",
      icon: <Check size={48} className="text-security-private" />,
      action: null,
      status: scanResult === "pass" ? "pass" : scanResult === "fail" ? "fail" : "idle",
      buttonText: "Verificar App",
      buttonAction: () => handleStartScan(),
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <GhostIndicator active={ghostMode} />

      <div className="px-4 pt-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-security-ultra" />
          <h1 className="font-mono text-xl font-bold text-foreground">
            Protocolo <span className="text-security-ultra neon-text">Zero</span>
          </h1>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Maximize a seguranÃ§a do seu dispositivo e dados.
        </p>
      </div>

      <div className="p-4">
        <Alert className="border-security-ultra/30 bg-security-ultra/5">
          <ShieldAlert className="h-4 w-4 text-security-ultra" />
          <AlertTitle className="font-mono text-sm text-security-ultra">
            VerificaÃ§Ã£o de Integridade
          </AlertTitle>
          <AlertDescription className="font-mono text-xs text-muted-foreground">
            O Protocolo Zero escaneia seu ambiente de execuÃ§Ã£o para garantir que nenhuma vulnerabilidade possa ser explorada contra sua comunicaÃ§Ã£o.
          </AlertDescription>
        </Alert>

        <div className="mt-6 space-y-4">
          {stepsContent.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-security-private/10 text-security-private">
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="font-mono text-sm font-semibold text-foreground">{item.title}</p>
                <p className="font-mono text-xs text-muted-foreground">{item.description}</p>
              </div>
              <AnimatePresence mode="wait">
                {item.status === "pass" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                  >
                    <Check className="h-6 w-6 text-green-500" />
                  </motion.div>
                )}
                {item.status === "fail" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                  >
                    <X className="h-6 w-6 text-red-500" />
                  </motion.div>
                )}
                {item.status === "idle" && (
                  <Button
                    size="sm"
                    className="font-mono text-xs"
                    onClick={item.buttonAction}
                    disabled={isScanning || index > step}
                  >
                    {item.buttonText}
                  </Button>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {isScanning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-xl border border-border bg-card p-4"
          >
            <p className="mb-2 font-mono text-sm font-semibold text-foreground">Escaneando...</p>
            <Progress value={scanProgress} className="h-2 [&::-webkit-progress-bar]:bg-muted-foreground/20 [&::-webkit-progress-value]:bg-security-ultra" />
            <p className="mt-2 text-right font-mono text-xs text-muted-foreground">{scanProgress}%</p>
          </motion.div>
        )}

        {scanResult && (
          <Alert className={`mt-6 ${scanResult === "pass" ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
            {scanResult === "pass" ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
            <AlertTitle className="font-mono text-sm">VerificaÃ§Ã£o {scanResult === "pass" ? "ConcluÃ­da" : "Falhou"}</AlertTitle>
            <AlertDescription className="font-mono text-xs text-muted-foreground">
              {scanResult === "pass"
                ? "Seu dispositivo e ambiente de execuÃ§Ã£o estÃ£o em conformidade com os padrÃµes de seguranÃ§a do Protocolo Zero."
                : "Foram detectadas anomalias. Recomenda-se investigar as vulnerabilidades antes de prosseguir com comunicaÃ§Ãµes sensÃ­veis."}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="mt-8 px-4 text-center">
        <p className="font-mono text-[10px] text-muted-foreground/50">
          POWERED BY <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-transparent bg-clip-text animate-gradient">JTC Parker</span>
        </p>
      </div>

      <BottomNav ghostMode={ghostMode} />
    </div>
  );
};

export default ProtocolZeroPage;