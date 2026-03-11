import { motion } from "framer-motion";
import { ShieldOff } from "lucide-react";

interface ProtocolZeroBadgeProps {
  compact?: boolean;
}

const ProtocolZeroBadge = ({ compact = false }: ProtocolZeroBadgeProps) => {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-destructive">
        <ShieldOff className="h-2.5 w-2.5" />
        Ø
      </span>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
        <ShieldOff className="h-4 w-4 text-destructive" />
      </div>
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-destructive">
          Protocolo Zero
        </p>
        <p className="font-mono text-[9px] text-muted-foreground">
          Destruição criptográfica ativa
        </p>
      </div>
    </motion.div>
  );
};

export default ProtocolZeroBadge;
