import { motion } from "framer-motion";

interface ProgressNarrativeProps {
  entries: {
    id: string;
    teacherName: string;
    subject: "math" | "calligraphy" | "reading";
    narrative: string;
    date: string;
  }[];
}

const dotColor = {
  math: "bg-math",
  calligraphy: "bg-calligraphy",
  reading: "bg-reading",
};

export function ProgressNarrative({ entries }: ProgressNarrativeProps) {
  return (
    <div className="relative pl-6">
      {/* Timeline line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-8">
        {entries.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="relative"
          >
            <div className={`absolute -left-6 top-2 w-3.5 h-3.5 rounded-full ${dotColor[entry.subject]} ring-4 ring-background`} />
            <div className="bg-card rounded-lg border border-border p-5 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {entry.teacherName}
                </span>
                <span className="font-display text-xs text-muted-foreground">{entry.date}</span>
              </div>
              <p className="font-body text-foreground leading-relaxed text-sm italic">
                "{entry.narrative}"
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
