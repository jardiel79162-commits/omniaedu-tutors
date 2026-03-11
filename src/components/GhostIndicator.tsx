import { motion } from "framer-motion";
import { Ghost } from "lucide-react";

interface GhostIndicatorProps {
  active: boolean;
}

const GhostIndicator = ({ active }: GhostIndicatorProps) => {
  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full border border-ghost/30 bg-background/90 px-3 py-1.5 font-mono text-xs ghost-glow"
    >
      <motion.div
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Ghost className="h-3.5 w-3.5 text-ghost" />
      </motion.div>
      <span className="text-ghost">GHOST MODE</span>
    </motion.div>
  );
};

export default GhostIndicator;
