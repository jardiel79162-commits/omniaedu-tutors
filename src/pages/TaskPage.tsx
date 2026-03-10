import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Calculator, PenLine, BookOpenText, ArrowLeft, Send } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { correctAnswer } from "@/lib/aiTeacher";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  subject: string;
  title: string;
  instruction: string;
  content: any;
  status: string;
}

const subjectIcon: Record<string, React.ReactNode> = {
  math: <Calculator size={18} />,
  calligraphy: <PenLine size={18} />,
  reading: <BookOpenText size={18} />,
};

const subjectColor: Record<string, string> = {
  math: "bg-math/15 text-math border-l-math",
  calligraphy: "bg-calligraphy/15 text-calligraphy border-l-calligraphy",
  reading: "bg-reading/15 text-reading border-l-reading",
};

const subjectTeacher: Record<string, string> = {
  math: "Prof. JTC Matemática",
  calligraphy: "Profa. JTC Caligrafia",
  reading: "Prof. JTC Leitura",
};

const TaskPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setTask(data?.[0] || null);
        setLoading(false);
      });
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !task || !answer.trim()) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      // Save attempt
      await supabase.from("task_attempts").insert({
        task_id: task.id,
        user_id: user.id,
        answer: answer.trim(),
      });

      // Get AI correction
      const result = await correctAnswer(task.subject, {
        userMessage: `O aluno respondeu: "${answer.trim()}"`,
        answer: answer.trim(),
        taskContent: task.content,
      });

      const feedbackText = result?.text || "Resposta recebida! Vamos analisar juntos.";
      setFeedback(feedbackText);

      // Save feedback
      await supabase.from("teacher_feedback").insert({
        user_id: user.id,
        task_id: task.id,
        subject: task.subject,
        feedback_text: feedbackText,
        feedback_type: "correction",
      });

      // Mark task completed
      await supabase.from("tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", task.id);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message || "Erro ao enviar resposta." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="font-display text-sm text-muted-foreground animate-pulse">Carregando tarefa...</span>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen pb-24">
        <div className="max-w-lg mx-auto px-5 pt-8">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground mb-8">
            <ArrowLeft size={16} /><span className="font-display text-sm">Voltar</span>
          </button>
          <div className="text-center py-20">
            <p className="font-body text-muted-foreground">Nenhuma tarefa pendente. Volte à tela inicial para gerar uma nova.</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const iconBg = subjectColor[task.subject]?.split(" ")[0] || "bg-muted";
  const iconText = subjectColor[task.subject]?.split(" ")[1] || "text-foreground";

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-5 pt-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground mb-8">
          <ArrowLeft size={16} /><span className="font-display text-sm">Voltar</span>
        </button>

        {/* Teacher header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
          <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
            <span className={iconText}>{subjectIcon[task.subject]}</span>
          </div>
          <div>
            <h1 className="font-display font-semibold text-lg text-foreground">{subjectTeacher[task.subject]}</h1>
            <p className="font-display text-xs text-muted-foreground">{task.title}</p>
          </div>
        </motion.div>

        {/* Instruction */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`bg-card border border-border border-l-4 ${subjectColor[task.subject]?.split(" ")[2] || "border-l-primary"} rounded-lg p-6 mb-6 shadow-card`}
        >
          <p className="font-body text-foreground leading-relaxed mb-4">{task.instruction}</p>
          {task.content?.problem && (
            <div className="bg-background rounded-lg p-6 text-center">
              <p className="font-display text-2xl font-semibold text-foreground">{task.content.problem}</p>
            </div>
          )}
        </motion.div>

        {/* Hints */}
        {task.content?.hints && task.content.hints.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="bg-secondary/50 rounded-lg p-4 mb-6">
            <span className="font-display text-[11px] font-medium text-muted-foreground uppercase tracking-wider block mb-2">Dicas</span>
            <ul className="space-y-1">
              {task.content.hints.map((hint: string, i: number) => (
                <li key={i} className="font-body text-sm text-muted-foreground">• {hint}</li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Answer input */}
        {!feedback ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <label className="font-display text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
              Sua resposta
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-4 py-3 font-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={3}
              placeholder="Digite sua resposta aqui..."
              maxLength={2000}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !answer.trim()}
              className="w-full mt-4 bg-primary text-primary-foreground font-display font-medium py-3.5 rounded-lg flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Enviando..." : <><Send size={16} /> Enviar resposta</>}
            </button>
          </motion.div>
        ) : (
          /* AI Feedback */
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-lg p-6 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1.5 h-1.5 rounded-full ${iconBg.replace("/15", "")}`} />
              <span className="font-display text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {subjectTeacher[task.subject]}
              </span>
            </div>
            <p className="font-body text-foreground leading-relaxed whitespace-pre-wrap">{feedback}</p>
            <button
              onClick={() => navigate("/")}
              className="w-full mt-6 bg-primary text-primary-foreground font-display font-medium py-3.5 rounded-lg"
            >
              Próxima tarefa
            </button>
          </motion.div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default TaskPage;
