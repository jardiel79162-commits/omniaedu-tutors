import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, PenLine, BookOpenText, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Step = "welcome" | "age" | "math" | "calligraphy" | "reading" | "complete";

const mathQuestions = [
  { q: "Quanto é 3 + 2?", options: ["4", "5", "6"], correct: 1 },
  { q: "Quanto é 8 - 3?", options: ["4", "5", "6"], correct: 1 },
  { q: "Quanto é 4 × 2?", options: ["6", "7", "8"], correct: 2 },
];

const readingQuestions = [
  { q: "Qual palavra começa com a letra B?", options: ["Casa", "Bola", "Dado"], correct: 1 },
  { q: "Quantas sílabas tem 'cachorro'?", options: ["2", "3", "4"], correct: 1 },
  { q: "Qual é o som da letra M?", options: ["Mmm", "Sss", "Ppp"], correct: 0 },
];

const OnboardingPage = () => {
  const [step, setStep] = useState<Step>("welcome");
  const [ageGroup, setAgeGroup] = useState("child");
  const [mathAnswers, setMathAnswers] = useState<number[]>([]);
  const [readingAnswers, setReadingAnswers] = useState<number[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const assessLevel = (answers: number[], correctAnswers: number[]) => {
    const score = answers.reduce((acc, a, i) => acc + (a === correctAnswers[i] ? 1 : 0), 0);
    if (score >= 3) return 3;
    if (score >= 2) return 2;
    return 1;
  };

  const handleComplete = async () => {
    if (!user) return;
    const mathLevel = assessLevel(mathAnswers, mathQuestions.map(q => q.correct));
    const readingLevel = assessLevel(readingAnswers, readingQuestions.map(q => q.correct));

    try {
      await supabase.from("student_profiles").update({
        age_group: ageGroup,
        math_level: mathLevel,
        calligraphy_level: 1,
        reading_level: readingLevel,
        onboarding_completed: true,
      }).eq("user_id", user.id);

      // Save diagnostics
      await supabase.from("diagnostic_results").insert([
        { user_id: user.id, subject: "math", answers: mathAnswers as any, assessed_level: mathLevel },
        { user_id: user.id, subject: "reading", answers: readingAnswers as any, assessed_level: readingLevel },
        { user_id: user.id, subject: "calligraphy", answers: [] as any, assessed_level: 1 },
      ]);

      navigate("/");
    } catch {
      toast({ variant: "destructive", title: "Erro ao salvar", description: "Tente novamente." });
    }
  };

  const handleQuizAnswer = (answer: number, questions: typeof mathQuestions, answers: number[], setAnswers: (a: number[]) => void, nextStep: Step) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setCurrentQ(0);
      setStep(nextStep);
    }
  };

  const renderQuiz = (
    title: string,
    icon: React.ReactNode,
    accentDot: string,
    questions: typeof mathQuestions,
    answers: number[],
    setAnswers: (a: number[]) => void,
    nextStep: Step
  ) => (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      </div>
      <div className="mb-2">
        <span className="font-display text-xs text-muted-foreground">
          Pergunta {currentQ + 1} de {questions.length}
        </span>
      </div>
      <div className="bg-card border border-border rounded-lg p-6 shadow-card mb-6">
        <p className="font-body text-foreground text-lg mb-6">{questions[currentQ].q}</p>
        <div className="space-y-3">
          {questions[currentQ].options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleQuizAnswer(i, questions, answers, setAnswers, nextStep)}
              className="w-full text-left bg-background border border-border rounded-lg px-5 py-3.5 font-body text-foreground hover:border-primary transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === "welcome" && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-mentor" />
                  <span className="font-display text-xs font-medium text-muted-foreground uppercase tracking-widest">Mentor OmniaEdu</span>
                </div>
                <h1 className="font-display text-2xl font-semibold text-foreground mb-4">
                  Vamos nos conhecer
                </h1>
                <p className="font-body text-muted-foreground leading-relaxed mb-10">
                  Antes de começar, preciso entender um pouco sobre você para preparar a melhor jornada de aprendizado.
                </p>
                <button
                  onClick={() => setStep("age")}
                  className="w-full bg-primary text-primary-foreground font-display font-medium py-3.5 rounded-lg flex items-center justify-center gap-2"
                >
                  Começar <ArrowRight size={16} />
                </button>
              </div>
            )}

            {step === "age" && (
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">Qual é a sua faixa etária?</h2>
                <p className="font-body text-sm text-muted-foreground mb-6">Isso nos ajuda a adaptar a linguagem e o conteúdo.</p>
                <div className="space-y-3">
                  {[
                    { value: "child", label: "Criança (até 10 anos)" },
                    { value: "teen", label: "Jovem (11 a 17 anos)" },
                    { value: "adult", label: "Adulto (18+)" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setAgeGroup(opt.value); setStep("math"); }}
                      className={`w-full text-left bg-card border border-border rounded-lg px-5 py-4 font-display text-foreground hover:border-primary transition-colors ${ageGroup === opt.value ? "border-primary" : ""}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "math" && renderQuiz(
              "Diagnóstico de Matemática",
              <Calculator size={20} />,
              "bg-math",
              mathQuestions,
              mathAnswers,
              setMathAnswers,
              "reading"
            )}

            {step === "reading" && renderQuiz(
              "Diagnóstico de Leitura",
              <BookOpenText size={20} />,
              "bg-reading",
              readingQuestions,
              readingAnswers,
              setReadingAnswers,
              "complete"
            )}

            {step === "complete" && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-mentor" />
                  <span className="font-display text-xs font-medium text-muted-foreground uppercase tracking-widest">Mentor OmniaEdu</span>
                </div>
                <h1 className="font-display text-2xl font-semibold text-foreground mb-4">
                  Tudo pronto!
                </h1>
                <p className="font-body text-muted-foreground leading-relaxed mb-10">
                  Seus professores já conhecem seu nível e estão preparando as primeiras tarefas. Vamos começar?
                </p>
                <button
                  onClick={handleComplete}
                  className="w-full bg-primary text-primary-foreground font-display font-medium py-3.5 rounded-lg flex items-center justify-center gap-2"
                >
                  Entrar na escola <ArrowRight size={16} />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingPage;
