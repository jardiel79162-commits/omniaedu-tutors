import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

const questions = [
  { subject: "math" as const, q: "Quanto é 7 + 5?", options: ["10", "12", "13", "11"], correct: "12" },
  { subject: "math" as const, q: "Quanto é 15 − 8?", options: ["6", "7", "8", "9"], correct: "7" },
  { subject: "reading" as const, q: "Qual palavra começa com a letra B?", options: ["Casa", "Bola", "Dado", "Faca"], correct: "Bola" },
  { subject: "reading" as const, q: "Quantas sílabas tem 'borboleta'?", options: ["2", "3", "4", "5"], correct: "4" },
];

const OnboardingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const current = questions[step];

  const handleSelect = (opt: string) => setAnswers((prev) => ({ ...prev, [step]: opt }));

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    const mathCorrect = [0, 1].filter((i) => answers[i] === questions[i].correct).length;
    const readingCorrect = [2, 3].filter((i) => answers[i] === questions[i].correct).length;
    const mathLevel = mathCorrect >= 2 ? 2 : 1;
    const readingLevel = readingCorrect >= 2 ? 2 : 1;
    const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Aluno";

    const { error } = await db.from("student_profiles").insert({
      user_id: user.id, display_name: displayName,
      math_level: mathLevel, reading_level: readingLevel, calligraphy_level: 1, onboarding_completed: true,
    });
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      navigate("/home", { replace: true });
    }
    setSaving(false);
  };

  const next = () => { if (step < questions.length - 1) setStep(step + 1); else finish(); };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <p className="text-sm text-muted-foreground">Diagnóstico inicial — Pergunta {step + 1} de {questions.length}</p>
        <h2 className="font-display text-2xl font-bold">{current.q}</h2>
        <div className="grid grid-cols-2 gap-3">
          {current.options.map((opt) => (
            <Button key={opt} variant={answers[step] === opt ? "default" : "outline"} className="text-lg py-6" onClick={() => handleSelect(opt)}>
              {opt}
            </Button>
          ))}
        </div>
        <Button className="w-full" disabled={answers[step] == null || saving} onClick={next}>
          {step < questions.length - 1 ? "Próxima" : saving ? "Salvando…" : "Concluir diagnóstico"}
        </Button>
      </div>
    </div>
  );
};

export default OnboardingPage;
