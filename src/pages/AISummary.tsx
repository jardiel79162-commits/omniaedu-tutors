import { motion } from "framer-motion";
import { Brain, CheckCircle2, ListTodo, MessageSquare, Sparkles } from "lucide-react";
import { mockSummaries } from "@/lib/mockData";
import BottomNav from "@/components/BottomNav";
import GhostIndicator from "@/components/GhostIndicator";

interface AISummaryProps {
  ghostMode: boolean;
}

const AISummary = ({ ghostMode }: AISummaryProps) => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <GhostIndicator active={ghostMode} />

      <div className="px-4 pt-6">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h1 className="font-mono text-xl font-bold text-foreground">
            Resumos <span className="text-primary neon-text">IA</span>
          </h1>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Resumos automáticos das suas conversas de grupo
        </p>
      </div>

      <div className="space-y-4 p-4">
        {mockSummaries.map((summary, i) => (
          <motion.div
            key={summary.groupId}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{summary.groupName}</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Gerado às {summary.generatedAt}
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4">
              <p className="text-sm leading-relaxed text-foreground/80">{summary.summary}</p>
            </div>

            {/* Decisions */}
            <div className="border-t border-border px-4 py-3">
              <div className="mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                  Decisões
                </span>
              </div>
              <ul className="space-y-1">
                {summary.decisions.map((d, j) => (
                  <li key={j} className="text-sm text-muted-foreground">
                    • {d}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tasks */}
            <div className="border-t border-border px-4 py-3">
              <div className="mb-2 flex items-center gap-1.5">
                <ListTodo className="h-3.5 w-3.5 text-security-private" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-security-private">
                  Tarefas
                </span>
              </div>
              <ul className="space-y-1">
                {summary.tasks.map((t, j) => (
                  <li key={j} className="text-sm text-muted-foreground">
                    • {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Important messages */}
            <div className="border-t border-border px-4 py-3">
              <div className="mb-2 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-security-ultra" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-security-ultra">
                  Mensagens Importantes
                </span>
              </div>
              <ul className="space-y-1">
                {summary.importantMessages.map((m, j) => (
                  <li key={j} className="text-sm text-foreground/70 italic">
                    "{m}"
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>

      <BottomNav ghostMode={ghostMode} />
    </div>
  );
};

export default AISummary;
