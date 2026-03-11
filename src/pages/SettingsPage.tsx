import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, ShieldOff, Bell, Lock, Brain, User, ChevronRight, Eye, LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import GhostIndicator from "@/components/GhostIndicator";

interface SettingsPageProps {
  ghostMode: boolean;
}

interface SettingsItem {
  icon: any;
  label: string;
  desc: string;
  path?: string;
}

const sections: { title: string; items: SettingsItem[] }[] = [
  {
    title: "Conta",
    items: [
      { icon: User, label: "Perfil", desc: "Nome, foto, bio" },
    ],
  },
  {
    title: "Privacidade",
    items: [
      { icon: Lock, label: "Privacidade", desc: "Último visto, foto" },
      { icon: Eye, label: "Confirmação de leitura", desc: "Controle quem vê" },
    ],
  },
  {
    title: "Notificações",
    items: [
      { icon: Bell, label: "Notificações", desc: "Modo inteligente" },
    ],
  },
  {
    title: "Segurança",
    items: [
      { icon: Shield, label: "Criptografia", desc: "AES-256 · Zero Custody" },
      { icon: ShieldOff, label: "Protocolo Zero", desc: "Destruição criptográfica ativa", path: "/protocol-zero" },
    ],
  },
  {
    title: "IA",
    items: [
      { icon: Brain, label: "Resumos automáticos", desc: "Ativados" },
    ],
  },
];

const SettingsPage = ({ ghostMode }: SettingsPageProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <GhostIndicator active={ghostMode} />

      <div className="px-4 pt-6">
        <h1 className="font-mono text-xl font-bold text-foreground">Configurações</h1>
      </div>

      {/* Profile card */}
      <div className="p-4">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-lg font-bold text-primary">
            {(user?.email?.[0] ?? "U").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{user?.user_metadata?.display_name || user?.email?.split("@")[0]}</p>
            <p className="font-mono text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      </div>

      <div className="space-y-6 px-4">
        {sections.map((section, si) => (
          <motion.div key={section.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }}>
            <h2 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{section.title}</h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {section.items.map((item, i) => (
                <button key={item.label} onClick={() => item.path && navigate(item.path)} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2 ${i > 0 ? "border-t border-border" : ""}`}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-4">
        <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 py-3 font-mono text-sm text-destructive transition-all hover:bg-destructive/10">
          <LogOut className="h-4 w-4" />
          Sair da Conta
        </button>
      </div>

      <p className="pb-24 text-center font-mono text-[10px] text-muted-foreground/30">JTC Parker v1.0.0</p>
      <BottomNav ghostMode={ghostMode} />
    </div>
  );
};

export default SettingsPage;
