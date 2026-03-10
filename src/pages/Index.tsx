import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Calculator, PenLine, BookOpenText, LogOut } from "lucide-react";
import { TeacherCard } from "@/components/TeacherCard";
import { SingleTaskCard } from "@/components/SingleTaskCard";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateTask } from "@/lib/aiTeacher";
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
  math: <Calculator size={16} />,
  calligraphy: <PenLine size={16} />,
  reading: <BookOpenText size={16} />,
};

const subjectTeacher: Record<string, string> = {
  math: "Prof. JTC Matemática",
  calligraphy: "Profa. JTC Caligrafia",
  reading: "Prof. JTC Leitura",
};

const HomePage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useStudentProfile();
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    fetchOrGenerateTask();
  }, [user]);

  const fetchOrGenerateTask = async () => {
    if (!user || !profile) {
      setLoadingTask(false);
      return;
    }

    // Check for existing pending task
    const { data: existing } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      setCurrentTask(existing[0]);
      setLoadingTask(false);
      return;
    }

    // Generate new task via AI
    try {
      const subjects = ["math", "calligraphy", "reading"];
      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      const levelKey = `${subject}_level` as "math_level" | "calligraphy_level" | "reading_level";

      const result = await generateTask(subject, {
        studentLevel: profile[levelKey],
        ageGroup: profile.age_group,
        userMessage: `Gere uma tarefa de nível ${profile[levelKey]} para um aluno ${profile.age_group}.`,
      });

      if (result?.data) {
        const { data: inserted, error } = await supabase
          .from("tasks")
          .insert({
            user_id: user.id,
            subject,
            title: result.data.title,
            instruction: result.data.instruction,
            difficulty: result.data.difficulty,
            content: result.data.content,
          })
          .select()
          .single();

        if (!error && inserted) {
          setCurrentTask(inserted);
        }
      }
    } catch (e: any) {
      console.error("Error generating task:", e);
      toast({ variant: "destructive", title: "Erro", description: e.message || "Não foi possível gerar tarefa." });
    } finally {
      setLoadingTask(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-5 pt-8">
        {/* Header with logout */}
        <div className="flex items-center justify-between mb-8">
          <div />
          <button onClick={signOut} className="text-muted-foreground p-2">
            <LogOut size={18} />
          </button>
        </div>

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
            {greeting()}, {profile?.display_name || "aluno"}.
          </h1>
          <p className="font-body text-muted-foreground leading-relaxed">
            {loadingTask
              ? "Estou preparando sua tarefa..."
              : currentTask
              ? "Preparei uma tarefa para você. Vamos trabalhar com calma, um passo de cada vez."
              : "Todas as tarefas do momento foram concluídas. Descanse ou explore seus professores."}
          </p>
        </motion.div>

        {/* Current task */}
        {loadingTask ? (
          <div className="bg-card border border-border rounded-lg p-8 shadow-card mb-10 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-4" />
            <div className="h-6 bg-muted rounded w-2/3 mb-3" />
            <div className="h-4 bg-muted rounded w-full" />
          </div>
        ) : currentTask ? (
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
              teacherName={subjectTeacher[currentTask.subject] || "Professor"}
              subject={currentTask.subject as "math" | "calligraphy" | "reading"}
              title={currentTask.title}
              instruction={currentTask.instruction}
              icon={subjectIcon[currentTask.subject] || <Calculator size={16} />}
              onStart={() => navigate("/tarefa")}
            />
          </motion.div>
        ) : null}

        {/* Teachers */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.5 }}>
          <h2 className="font-display text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
            Seus professores
          </h2>
          <div className="space-y-3">
            <TeacherCard subject="math" name="JTC Matemática" description="Contas, raciocínio lógico e resolução passo a passo." icon={<Calculator size={18} />} onClick={() => navigate("/professor/matematica")} />
            <TeacherCard subject="calligraphy" name="JTC Caligrafia" description="Traçado de letras, alinhamento e legibilidade." icon={<PenLine size={18} />} onClick={() => navigate("/professor/caligrafia")} />
            <TeacherCard subject="reading" name="JTC Leitura" description="Alfabetização, sílabas, fonemas e fluência." icon={<BookOpenText size={18} />} onClick={() => navigate("/professor/leitura")} />
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
};

export default HomePage;
