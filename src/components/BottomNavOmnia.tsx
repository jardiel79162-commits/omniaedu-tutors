import { Home, ClipboardList, BarChart3 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const items = [
  { icon: Home, label: "Início", path: "/home" },
  { icon: ClipboardList, label: "Tarefas", path: "/tarefas" },
  { icon: BarChart3, label: "Progresso", path: "/progresso" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button key={item.path} onClick={() => navigate(item.path)} className="flex flex-col items-center gap-0.5 px-3 py-1.5">
              <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[10px] ${isActive ? "text-primary font-bold" : "text-muted-foreground"}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
