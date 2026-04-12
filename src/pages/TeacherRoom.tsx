import { useParams, useNavigate } from "react-router-dom";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { Calculator, PenTool, BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNavOmnia";

const meta: Record<string, { name: string; icon: any; colorClass: string; description: string }> = {
  math: { name: "Prof. JTC Matemática", icon: Calculator, colorClass: "text-math", description: "Especialista em contas, raciocínio lógico e resolução passo a passo." },
  calligraphy: { name: "Prof.ª JTC Caligrafia", icon: PenTool, colorClass: "text-calligraphy", description: "Especialista em traçado, alinhamento e legibilidade." },
  reading: { name: "Prof. JTC Leitura", icon: BookOpen, colorClass: "text-reading", description: "Especialista em alfabetização, fonemas e fluência." },
};

const TeacherRoom = () => {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const { profile } = useStudentProfile();
  const t = meta[subject || ""] ?? meta.math;
  const Icon = t.icon;
  const level = subject === "math" ? profile?.math_level : subject === "reading" ? profile?.reading_level : profile?.calligraphy_level;

  return (
    <div className="flex min-h-screen flex-col bg-background px-5 pt-6 pb-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="flex items-center gap-3 mb-4">
        <Icon className={`h-10 w-10 ${t.colorClass}`} />
        <div>
          <h1 className="font-display text-xl font-bold">{t.name}</h1>
          <p className="text-xs text-muted-foreground">Nível atual: {level ?? 1}</p>
        </div>
      </div>

      <p className="text-sm text-foreground/80 mb-6">{t.description}</p>

      <Button onClick={() => navigate("/tarefas")} className="w-full">
        Ir para minhas tarefas
      </Button>

      <BottomNav />
    </div>
  );
};

export default TeacherRoom;
