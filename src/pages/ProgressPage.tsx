import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNavOmnia";

interface Feedback {
  id: string;
  subject: string;
  message: string;
  feedback_type: string;
  created_at: string;
}

const subjectLabel: Record<string, string> = { math: "Matemática", reading: "Leitura", calligraphy: "Caligrafia", mentor: "Mentor" };
const db = supabase as any;

const ProgressPage = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    db.from("teacher_feedback").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30)
      .then(({ data }: any) => { setFeedbacks((data as Feedback[]) || []); setLoading(false); });
  }, [user]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /><BottomNav /></div>;

  return (
    <div className="flex min-h-screen flex-col bg-background px-5 pt-6 pb-24">
      <h1 className="font-display text-2xl font-bold mb-4">Meu progresso</h1>
      {feedbacks.length === 0 && <p className="text-muted-foreground text-sm">Nenhum feedback ainda. Complete uma tarefa para ver seu progresso!</p>}
      <div className="space-y-3">
        {feedbacks.map((f) => (
          <div key={f.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-primary">{subjectLabel[f.subject] ?? f.subject}</span>
              <span className="text-[10px] text-muted-foreground">{new Date(f.created_at).toLocaleDateString("pt-BR")}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{f.message}</p>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
};

export default ProgressPage;
