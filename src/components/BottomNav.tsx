import { MessageSquare, Ghost, Brain, ShieldOff, Search } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

interface BottomNavProps {
  ghostMode: boolean;
}

const BottomNav = ({ ghostMode }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { icon: MessageSquare, label: "Chats", path: "/chats" },
    { icon: Search, label: "Buscar", path: "/search" },
    { icon: Ghost, label: "Ghost", path: "/ghost" },
    { icon: Brain, label: "IA", path: "/ai-summary" },
    { icon: ShieldOff, label: "Zero", path: "/protocol-zero" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border glass">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          const isGhost = item.path === "/ghost" && ghostMode;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className={`absolute -top-2 h-0.5 w-8 rounded-full ${isGhost ? "bg-ghost" : "bg-primary"}`}
                  style={{
                    boxShadow: isGhost
                      ? "0 0 10px hsl(180 100% 50% / 0.6)"
                      : "0 0 10px hsl(130 100% 50% / 0.6)",
                  }}
                />
              )}
              <item.icon
                className={`h-5 w-5 transition-colors ${
                  isActive
                    ? isGhost
                      ? "text-ghost"
                      : "text-primary"
                    : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-mono ${
                  isActive
                    ? isGhost
                      ? "text-ghost"
                      : "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
