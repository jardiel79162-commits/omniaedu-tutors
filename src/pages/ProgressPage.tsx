import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ProgressNarrative } from "@/components/ProgressNarrative";
import { BottomNav } from "@/components/BottomNav";

const mockEntries = [
  {
    id: "1",
    teacherName: "Prof. JTC Matemática",
    subject: "math" as const,
    narrative: "Você dominou a adição simples com números até 20. Agora vamos trabalhar o reagrupamento — é o próximo passo natural.",
    date: "Hoje",
  },
  {
    id: "2",
    teacherName: "Profa. JTC Caligrafia",
    subject: "calligraphy" as const,
    narrative: "Suas letras 'a' e 'o' estão com traçado mais firme. A inclinação do 'd' ainda precisa de atenção. Vamos treinar juntos.",
    date: "Ontem",
  },
  {
    id: "3",
    teacherName: "Prof. JTC Leitura",
    subject: "reading" as const,
    narrative: "Você leu a palavra 'horizonte' corretamente pela primeira vez. Lembre-se do som do 'z' — ele aparece em muitas palavras novas.",
    date: "2 dias atrás",
  },
  {
    id: "4",
    teacherName: "Prof. JTC Matemática",
    subject: "math" as const,
    narrative: "Nas últimas 5 contas de subtração, você acertou todas. Seu domínio dos números de 1 a 10 está sólido.",
    date: "3 dias atrás",
  },
];

const ProgressPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-5 pt-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground mb-8">
          <ArrowLeft size={16} />
          <span className="font-display text-sm">Voltar</span>
        </button>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-mentor" />
            <span className="font-display text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Mentor OmniaEdu
            </span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground mb-2">
            Sua jornada
          </h1>
          <p className="font-body text-muted-foreground leading-relaxed mb-10">
            Cada conquista conta uma história. Aqui está o que seus professores observaram sobre sua evolução.
          </p>
        </motion.div>

        <ProgressNarrative entries={mockEntries} />
      </div>
      <BottomNav />
    </div>
  );
};

export default ProgressPage;
