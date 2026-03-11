import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Filter } from "lucide-react";
import { mockChats } from "@/lib/mockData";
import ChatCard from "@/components/ChatCard";
import BottomNav from "@/components/BottomNav";
import GhostIndicator from "@/components/GhostIndicator";

interface ChatListProps {
  ghostMode: boolean;
}

const ChatList = ({ ghostMode }: ChatListProps) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? mockChats : mockChats.filter((c) => c.priority === filter);

  return (
    <div className="min-h-screen bg-background pb-20">
      <GhostIndicator active={ghostMode} />

      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border glass px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-xl font-bold text-foreground">
            JTC <span className="text-primary neon-text">Parker</span>
          </h1>
          <div className="flex gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-1 text-muted-foreground transition-all hover:border-primary/30 hover:text-primary">
              <Filter className="h-4 w-4" />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary neon-glow transition-all hover:bg-primary/20">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {["all", "high", "medium", "low"].map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`whitespace-nowrap rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-all ${
                filter === p
                  ? "border border-primary/50 bg-primary/10 text-primary neon-glow"
                  : "border border-border bg-surface-1 text-muted-foreground hover:border-primary/20"
              }`}
            >
              {p === "all" ? "Todos" : p === "high" ? "Importantes" : p === "medium" ? "Normal" : "Silenciosos"}
            </button>
          ))}
        </div>
      </div>

      {/* Chat list */}
      <div className="space-y-2 p-4">
        {filtered.map((chat, i) => (
          <motion.div
            key={chat.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <ChatCard chat={chat} onClick={() => navigate(`/chat/${chat.id}`)} />
          </motion.div>
        ))}
      </div>

      <BottomNav ghostMode={ghostMode} />
    </div>
  );
};

export default ChatList;
