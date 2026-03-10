import { motion } from "framer-motion";
import { ReactNode } from "react";

type TeacherSubject = "math" | "calligraphy" | "reading" | "mentor";

interface TeacherCardProps {
  subject: TeacherSubject;
  name: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}

const accentMap: Record<TeacherSubject, string> = {
  math: "border-math/40 hover:border-math",
  calligraphy: "border-calligraphy/40 hover:border-calligraphy",
  reading: "border-reading/40 hover:border-reading",
  mentor: "border-mentor/40 hover:border-mentor",
};

const dotMap: Record<TeacherSubject, string> = {
  math: "bg-math",
  calligraphy: "bg-calligraphy",
  reading: "bg-reading",
  mentor: "bg-mentor",
};

export function TeacherCard({ subject, name, description, icon, onClick }: TeacherCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full text-left bg-card rounded-lg border-2 ${accentMap[subject]} p-6 shadow-card transition-colors duration-300 cursor-pointer`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-3 h-3 rounded-full ${dotMap[subject]} mt-1.5 shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-muted-foreground">{icon}</span>
            <h3 className="font-display font-semibold text-foreground text-lg truncate">{name}</h3>
          </div>
          <p className="font-body text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.button>
  );
}
