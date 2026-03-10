import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Calculator, PenLine, BookOpenText } from "lucide-react";
import { TeacherCard } from "@/components/TeacherCard";
import { SingleTaskCard } from "@/components/SingleTaskCard";
import { BottomNav } from "@/components/BottomNav";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-5 pt-10">
        {/* Mentor greeting */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-mentor" />
            <span className="font-display text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Mentor OmniaEdu
            </span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground mb-3">
            Bom dia, aluno.
          </h1>
          <p className="font-body text-muted-foreground leading-relaxed">
            Hoje preparei uma tarefa de matemática para você. Vamos trabalhar com calma, um passo de cada vez.
          </p>
        </motion.div>

        {/* Current task — one task only */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-10"
        >
          <h2 className="font-display text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
            Sua tarefa agora
          </h2>
          <SingleTaskCard
            teacherName="Prof. JTC Matemática"
            subject="math"
            title="Adição com reagrupamento"
            instruction="Resolva a conta 47 + 38 no papel e tire uma foto. Eu vou analisar cada passo e te explicar o que estiver confuso."
            icon={<Calculator size={16} />}
            onStart={() => navigate("/tarefa")}
          />
        </motion.div>

        {/* Teachers */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h2 className="font-display text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
            Seus professores
          </h2>
          <div className="space-y-3">
            <TeacherCard
              subject="math"
              name="JTC Matemática"
              description="Contas, raciocínio lógico e resolução passo a passo."
              icon={<Calculator size={18} />}
              onClick={() => navigate("/professor/matematica")}
            />
            <TeacherCard
              subject="calligraphy"
              name="JTC Caligrafia"
              description="Traçado de letras, alinhamento e legibilidade."
              icon={<PenLine size={18} />}
              onClick={() => navigate("/professor/caligrafia")}
            />
            <TeacherCard
              subject="reading"
              name="JTC Leitura"
              description="Alfabetização, sílabas, fonemas e fluência."
              icon={<BookOpenText size={18} />}
              onClick={() => navigate("/professor/leitura")}
            />
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default HomePage;
