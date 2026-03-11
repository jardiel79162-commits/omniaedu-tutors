import { motion } from "framer-motion";
import { Shield, Lock, Users } from "lucide-react";
import { Chat } from "@/lib/mockData";

interface ChatCardProps {
  chat: Chat;
  onClick: () => void;
}

const ChatCard = ({ chat, onClick }: ChatCardProps) => {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="group flex w-full items-center gap-3 rounded-xl border border-border/50 bg-card p-3 text-left transition-all hover:border-primary/30 hover:neon-glow"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-mono text-sm font-semibold text-primary">
          {chat.avatar}
        </div>
        {chat.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium text-foreground">{chat.name}</span>
            {chat.isGroup && <Users className="h-3 w-3 text-muted-foreground" />}
            {chat.security === "ultra" && <Lock className="h-3 w-3 text-destructive/70" />}
            {chat.security === "private" && <Shield className="h-3 w-3 text-security-private/70" />}
          </div>
          <span className="text-xs font-mono text-muted-foreground">{chat.time}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{chat.lastMessage}</p>
          {chat.unread > 0 && (
            <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 font-mono text-[10px] font-bold text-primary-foreground">
              {chat.unread}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
};

export default ChatCard;
