import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ProgressNarrative } from "@/components/ProgressNarrative";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const ProgressPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Load from teacher_feedback (progress_note type) and progress_entries
    const fetchProgress = async () => {
      const [{ data: feedbacks }, { data: progress }] = await Promise.all([
        supabase
          .from("teacher_feedback")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("progress_entries")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const all = [
        ...(feedbacks || []).map((f) => ({
          id: f.id,
          teacherName: getTeacherName(f.subject),
          subject: f.subject === "mentor" ? "math" : f.subject,
          narrative: f.feedback_text,
          date: formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: ptBR }),
        })),
        ...(progress || []).map((p) => ({
          id: p.id,
          teacherName: p.teacher_name,
          subject: p.subject,
          narrative: p.narrative,
          date: formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ptBR }),
        })),
      ].sort((a, b) => b.id.localeCompare(a.id));

      setEntries(all);
      setLoading(false);
    };

    fetchProgress();
  }, [user]);

  const getTeacherName = (subject: string) => {
    const map: Record<string, string> = {
      math: "Prof. JTC Matemática",
      calligraphy: "Profa. JTC Caligrafia",
      reading: "Prof. JTC Leitura",
      mentor: "Mentor OmniaEdu",
    };
    return map[subject] || "Professor";
  };

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
          <h1 className="font-display text-2xl font-semibold text-foreground mb-2">Sua jornada</h1>
          <p className="font-body text-muted-foreground leading-relaxed mb-10">
            Cada conquista conta uma história. Aqui está o que seus professores observaram sobre sua evolução.
          </p>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-5 animate-pulse">
                <div className="h-3 bg-muted rounded w-1/3 mb-3" />
                <div className="h-4 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        ) : entries.length > 0 ? (
          <ProgressNarrative entries={entries as any} />
        ) : (
          <div className="text-center py-16">
            <p className="font-body text-muted-foreground">
              Ainda não há registros. Complete sua primeira tarefa para começar sua jornada.
            </p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default ProgressPage;
