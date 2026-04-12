import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { callAiTeacher, Subject } from "@/lib/aiTeacher";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Lightbulb } from "lucide-react";
import BottomNav from "@/components/BottomNavOmnia";

interface Task {
  id: string;
  subject: string;
  title: string;
  description: string;
  instructions: string;
  hint: string | null;
  expected_answer: string | null;
  status: string;
  ai_feedback: string | null;
}

const TaskPage = () => {
  const { user } = useAuth();
  const { profile } = useStudentProfile();
  const [task, setTask] = useState<Task | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadPendingTask();
  }, [user]);

  const loadPendingTask = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("tasks" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setTask(data as Task | null);
    setLoading(false);
  };

  const generateNewTask = async (subject: Subject) => {
    if (!user || !profile) return;
    setLoading(true);
    try {
      const level = subject === "math" ? profile.math_level : subject === "reading" ? profile.reading_level : profile.calligraphy_level;
      const raw = await callAiTeacher({ action: "generate_task", subject, level });
      let parsed: any;
      try { parsed = JSON.parse(raw); } catch { parsed = { title: "Atividade", description: raw, instructions: raw }; }

      const { data, error } = await supabase.from("tasks" as any).insert({
        user_id: user.id,
        subject,
        title: parsed.title || "Atividade",
        description: parsed.description || "",
        instructions: parsed.instructions || parsed.description || "",
        difficulty: level,
        hint: parsed.hint || null,
        expected_answer: parsed.expected_answer || null,
      }).select().single();
      if (error) throw error;
      setTask(data as Task);
    } catch (e: any) {
      toast({ title: "Erro ao gerar tarefa", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const submitAnswer = async () => {
    if (!task || !user || !profile) return;
    setSubmitting(true);
    try {
      const level = task.subject === "math" ? profile.math_level : task.subject === "reading" ? profile.reading_level : profile.calligraphy_level;
      const feedback = await callAiTeacher({
        action: "correct_answer",
        subject: task.subject as Subject,
        level,
        taskDescription: task.instructions,
        studentAnswer: answer,
        context: task.expected_answer || undefined,
      });

      await supabase.from("tasks" as any).update({ status: "completed", ai_feedback: feedback, completed_at: new Date().toISOString() } as any).eq("id", task.id);
      await supabase.from("teacher_feedback" as any).insert({ user_id: user.id, task_id: task.id, subject: task.subject, message: feedback, feedback_type: "correction" });

      setTask({ ...task, status: "completed", ai_feedback: feedback });
      setAnswer("");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-5 pt-6 pb-24">
      <h1 className="font-display text-2xl font-bold mb-4">Tarefa do dia</h1>

      {!task && (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">Nenhuma tarefa pendente. Peça para um professor gerar uma! 🎯</p>
          <Button onClick={() => generateNewTask("math")} className="w-full bg-math hover:bg-math/90">Nova tarefa de Matemática</Button>
          <Button onClick={() => generateNewTask("reading")} className="w-full bg-reading hover:bg-reading/90">Nova tarefa de Leitura</Button>
          <Button onClick={() => generateNewTask("calligraphy")} className="w-full bg-calligraphy hover:bg-calligraphy/90">Nova tarefa de Caligrafia</Button>
        </div>
      )}

      {task && task.status === "pending" && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-display text-lg font-bold">{task.title}</h2>
            <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap">{task.instructions}</p>
            {showHint && task.hint && <p className="mt-2 text-xs text-primary italic">💡 {task.hint}</p>}
          </div>
          {task.hint && !showHint && (
            <Button variant="ghost" size="sm" onClick={() => setShowHint(true)}>
              <Lightbulb className="h-4 w-4 mr-1" /> Ver dica
            </Button>
          )}
          <Input placeholder="Sua resposta…" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <Button className="w-full" onClick={submitAnswer} disabled={!answer.trim() || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Enviar resposta
          </Button>
        </div>
      )}

      {task && task.status === "completed" && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-reading" />
              <span className="font-bold text-reading">Corrigido!</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{task.ai_feedback}</p>
          </div>
          <Button onClick={() => { setTask(null); setShowHint(false); }} className="w-full">Próxima tarefa</Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default TaskPage;
