import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calculator, PenLine, BookOpenText } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { ReactNode } from "react";

type SubjectKey = "matematica" | "caligrafia" | "leitura";

interface TeacherData {
  name: string;
  fullTitle: string;
  accent: string;
  bgAccent: string;
  icon: ReactNode;
  greeting: string;
  focus: string;
  nextStep: string;
}

const teacherData: Record<SubjectKey, TeacherData> = {
  matematica: {
    name: "JTC Matemática",
    fullTitle: "Professor de Matemática",
    accent: "text-math",
    bgAccent: "bg-math/15",
    icon: <Calculator size={20} />,
    greeting: "Olá! Sou seu professor de matemática. Vou te ajudar a entender cada conta, passo a passo, com toda a calma do mundo.",
    focus: "Agora estamos trabalhando em adição com reagrupamento. Você já dominou a adição simples — esse é o próximo degrau.",
    nextStep: "Quando estiver pronto, volte à tela de tarefas. Eu preparei uma conta especial para você resolver hoje.",
  },
  caligrafia: {
    name: "JTC Caligrafia",
    fullTitle: "Professora de Caligrafia",
    accent: "text-calligraphy",
    bgAccent: "bg-calligraphy/15",
    icon: <PenLine size={20} />,
    greeting: "Olá! Sou sua professora de caligrafia. Juntos, vamos trabalhar o traçado de cada letra até que sua escrita fique clara e bonita.",
    focus: "Estamos focando nas letras cursivas minúsculas. Seu 'a' e 'o' já melhoraram bastante — vamos aperfeiçoar o 'd' e o 'g'.",
    nextStep: "Na próxima tarefa, vou pedir que você escreva uma palavra inteira. Pode ser no papel ou direto na tela.",
  },
  leitura: {
    name: "JTC Leitura",
    fullTitle: "Professor de Leitura",
    accent: "text-reading",
    bgAccent: "bg-reading/15",
    icon: <BookOpenText size={20} />,
    greeting: "Olá! Sou seu professor de leitura. Vou te acompanhar desde os primeiros sons até você ler com fluência e confiança.",
    focus: "Estamos praticando sílabas complexas com 'nh' e 'lh'. Você já domina as sílabas simples — agora é hora de avançar.",
    nextStep: "Na próxima sessão, vou pedir que você leia uma frase curta em voz alta. Vou ouvir e te ajudar com cada som.",
  },
};

const TeacherRoom = () => {
  const navigate = useNavigate();
  const { subject } = useParams<{ subject: string }>();
  const teacher = teacherData[(subject as SubjectKey) || "matematica"];

  if (!teacher) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-5 pt-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground mb-8">
          <ArrowLeft size={16} />
          <span className="font-display text-sm">Voltar</span>
        </button>

        {/* Teacher identity */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className={`w-14 h-14 rounded-full ${teacher.bgAccent} flex items-center justify-center mb-4`}>
            <span className={teacher.accent}>{teacher.icon}</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground mb-1">{teacher.name}</h1>
          <p className="font-display text-sm text-muted-foreground">{teacher.fullTitle}</p>
        </motion.div>

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-lg p-6 shadow-card mb-6"
        >
          <p className="font-body text-foreground leading-relaxed">{teacher.greeting}</p>
        </motion.div>

        {/* Current focus */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-lg p-6 shadow-card mb-6"
        >
          <h2 className="font-display text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
            Foco atual
          </h2>
          <p className="font-body text-foreground leading-relaxed">{teacher.focus}</p>
        </motion.div>

        {/* Next step */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-secondary/50 rounded-lg p-5"
        >
          <h2 className="font-display text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
            Próximo passo
          </h2>
          <p className="font-body text-muted-foreground leading-relaxed text-sm italic">
            "{teacher.nextStep}"
          </p>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default TeacherRoom;
