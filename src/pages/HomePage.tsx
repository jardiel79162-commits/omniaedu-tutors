import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Calculator, PenTool, BookOpen, Sparkles, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNavOmnia";

const teachers = [
  { key: "math" as const, name: "Prof. Matemática", icon: Calculator, color: "bg-math-light text-math", route: "/professor/math" },
  { key: "calligraphy" as const, name: "Prof.ª Caligrafia", icon: PenTool, color: "bg-calligraphy-light text-calligraphy", route: "/professor/calligraphy" },
  { key: "reading" as const, name: "Prof. Leitura", icon: BookOpen, color: "bg-reading-light text-reading", route: "/professor/reading" },
];

const HomePage = () => {
  const { profile } = useStudentProfile();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="flex items-center justify-between px-5 pt-6 pb-2">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()},</p>
          <h1 className="font-display text-2xl font-bold">{profile?.display_name || "Aluno"} 👋</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-5 w-5" /></Button>
      </header>

      {/* Mentor Card */}
      <div className="mx-5 mt-4 rounded-2xl border bg-mentor-light p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-mentor" />
          <span className="font-display font-bold text-mentor">Mentor OmniaEdu</span>
        </div>
        <p className="text-sm text-foreground/80">
          Hoje é um ótimo dia para aprender! Vou preparar atividades nos seus pontos que mais precisam de atenção. 🚀
        </p>
      </div>

      {/* Teachers */}
      <section className="px-5 mt-6">
        <h2 className="font-display text-lg font-bold mb-3">Seus professores</h2>
        <div className="space-y-3">
          {teachers.map((t) => (
            <button
              key={t.key}
              onClick={() => navigate(t.route)}
              className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-transform active:scale-[0.98] ${t.color}`}
            >
              <t.icon className="h-8 w-8" />
              <div>
                <p className="font-bold">{t.name}</p>
                <p className="text-xs opacity-70">
                  Nível {t.key === "math" ? profile?.math_level : t.key === "reading" ? profile?.reading_level : profile?.calligraphy_level || 1}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
};

export default HomePage;
