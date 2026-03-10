import { useNavigate, useLocation } from "react-router-dom";
import { Home, BookOpen, TrendingUp } from "lucide-react";

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { path: "/", icon: Home, label: "Início" },
    { path: "/tarefa", icon: BookOpen, label: "Tarefa" },
    { path: "/progresso", icon: TrendingUp, label: "Progresso" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2 z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {items.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="font-display text-[11px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
