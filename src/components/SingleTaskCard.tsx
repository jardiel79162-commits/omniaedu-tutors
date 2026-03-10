import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SingleTaskCardProps {
  teacherName: string;
  subject: "math" | "calligraphy" | "reading";
  title: string;
  instruction: string;
  icon: ReactNode;
  onStart: () => void;
}

const borderMap = {
  math: "border-l-math",
  calligraphy: "border-l-calligraphy",
  reading: "border-l-reading",
};

export function SingleTaskCard({ teacherName, subject, title, instruction, icon, onStart }: SingleTaskCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`bg-card rounded-lg border border-border border-l-4 ${borderMap[subject]} p-8 shadow-soft`}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-display text-sm font-medium text-muted-foreground">{teacherName}</span>
      </div>

      <h2 className="font-display font-semibold text-xl text-foreground mb-3">{title}</h2>
      <p className="font-body text-muted-foreground leading-relaxed mb-8">{instruction}</p>

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={onStart}
        className="w-full bg-primary text-primary-foreground font-display font-medium py-3.5 rounded-lg transition-colors"
      >
        Começar Tarefa
      </motion.button>
    </motion.div>
  );
}
