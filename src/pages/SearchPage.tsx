import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MessageSquare, FileText, Link2, User } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import GhostIndicator from "@/components/GhostIndicator";

interface SearchPageProps {
  ghostMode: boolean;
}

const categories = [
  { icon: MessageSquare, label: "Mensagens" },
  { icon: FileText, label: "Arquivos" },
  { icon: Link2, label: "Links" },
  { icon: User, label: "Pessoas" },
];

const SearchPage = ({ ghostMode }: SearchPageProps) => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <GhostIndicator active={ghostMode} />

      <div className="px-4 pt-6">
        <h1 className="font-mono text-xl font-bold text-foreground mb-4">
          Busca <span className="text-primary neon-text">Inteligente</span>
        </h1>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar mensagens, arquivos, links..."
            className="w-full rounded-xl border border-border bg-surface-1 py-3 pl-10 pr-4 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* Categories */}
        <div className="mt-4 flex gap-2">
          {categories.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(i)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition-all ${
                activeCategory === i
                  ? "border border-primary/30 bg-primary/10 text-primary"
                  : "border border-border bg-surface-1 text-muted-foreground"
              }`}
            >
              <cat.icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center px-4 pt-20">
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-surface-1"
        >
          <Search className="h-8 w-8 text-muted-foreground/50" />
        </motion.div>
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          {query ? "Nenhum resultado encontrado" : "Digite para buscar"}
        </p>
      </div>

      <BottomNav ghostMode={ghostMode} />
    </div>
  );
};

export default SearchPage;
