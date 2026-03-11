import { motion } from "framer-motion";
import { Ghost, Eye, EyeOff, MessageSquareOff, Bell, BellOff, Activity } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import GhostIndicator from "@/components/GhostIndicator";

interface GhostModeProps {
  ghostMode: boolean;
  setGhostMode: (v: boolean) => void;
}

const GhostMode = ({ ghostMode, setGhostMode }: GhostModeProps) => {
  const features = [
    { icon: EyeOff, label: "Ocultar status online", desc: "Ninguém vê quando você está online", active: ghostMode },
    { icon: MessageSquareOff, label: "Ocultar leitura", desc: "Sem confirmação de leitura", active: ghostMode },
    { icon: BellOff, label: "Modo silencioso total", desc: "Nenhuma notificação será enviada", active: ghostMode },
    { icon: Activity, label: "Ocultar digitando", desc: "Indicador 'digitando' desativado", active: ghostMode },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <GhostIndicator active={ghostMode} />

      <div className="px-4 pt-6">
        <h1 className="font-mono text-xl font-bold text-foreground">
          Modo <span className={ghostMode ? "text-ghost" : "text-primary"}>Ghost</span>
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Invisibilidade digital total
        </p>
      </div>

      {/* Main toggle */}
      <div className="p-4">
        <motion.button
          onClick={() => setGhostMode(!ghostMode)}
          whileTap={{ scale: 0.97 }}
          className={`w-full rounded-2xl border p-6 transition-all ${
            ghostMode
              ? "border-ghost/30 bg-ghost/5 ghost-glow"
              : "border-border bg-card"
          }`}
        >
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={ghostMode ? { y: [0, -5, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className={`flex h-24 w-24 items-center justify-center rounded-full ${
                ghostMode
                  ? "border border-ghost/30 bg-ghost/10"
                  : "border border-border bg-surface-2"
              }`}
            >
              <Ghost
                className={`h-12 w-12 ${ghostMode ? "text-ghost" : "text-muted-foreground"}`}
              />
            </motion.div>
            <div>
              <p className={`font-mono text-lg font-bold ${ghostMode ? "text-ghost" : "text-foreground"}`}>
                {ghostMode ? "ATIVO" : "DESATIVADO"}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {ghostMode ? "Você está invisível" : "Toque para ativar"}
              </p>
            </div>
          </div>
        </motion.button>
      </div>

      {/* Feature toggles */}
      <div className="space-y-2 px-4">
        {features.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
              f.active ? "border-ghost/20 bg-ghost/5" : "border-border bg-card"
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                f.active ? "bg-ghost/10" : "bg-surface-2"
              }`}
            >
              <f.icon className={`h-5 w-5 ${f.active ? "text-ghost" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${f.active ? "text-ghost" : "text-foreground"}`}>{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
            <div
              className={`h-6 w-11 rounded-full transition-colors ${
                f.active ? "bg-ghost/30" : "bg-surface-3"
              }`}
            >
              <div
                className={`h-5 w-5 translate-y-0.5 rounded-full transition-all ${
                  f.active
                    ? "translate-x-[22px] bg-ghost shadow-[0_0_8px_hsl(180_100%_50%/0.5)]"
                    : "translate-x-0.5 bg-muted-foreground"
                }`}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <BottomNav ghostMode={ghostMode} />
    </div>
  );
};

export default GhostMode;
