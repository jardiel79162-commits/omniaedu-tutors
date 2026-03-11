import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Phone, Shield, Lock, Send, Paperclip, Mic } from "lucide-react";
import { mockChats, mockMessages } from "@/lib/mockData";
import GhostIndicator from "@/components/GhostIndicator";

interface ChatViewProps {
  ghostMode: boolean;
}

const ChatView = ({ ghostMode }: ChatViewProps) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const chat = mockChats.find((c) => c.id === id);
  const [message, setMessage] = useState("");

  if (!chat) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <GhostIndicator active={ghostMode} />

      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border glass px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/chats")}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full font-mono text-xs font-semibold ${
              chat.security === "ultra"
                ? "border border-security-ultra/50 bg-security-ultra/10 text-security-ultra"
                : "border border-primary/30 bg-primary/10 text-primary"
            }`}
          >
            {chat.avatar}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground">{chat.name}</span>
              {chat.security === "ultra" && <Lock className="h-3 w-3 text-security-ultra" />}
              {chat.security === "private" && <Shield className="h-3 w-3 text-security-private" />}
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">
              {chat.isOnline ? (
                <span className="text-primary">● online</span>
              ) : (
                `visto por último ${chat.time}`
              )}
              {chat.isGroup && ` · ${chat.members} membros`}
            </p>
          </div>

          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary/30 hover:text-primary transition-all">
            <Phone className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Security banner */}
      {chat.security === "ultra" && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-security-ultra/20 bg-security-ultra/5 px-3 py-2">
          <Lock className="h-3.5 w-3.5 text-security-ultra" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-security-ultra">
            Chat Ultra Seguro · Criptografia AES-256 · Screenshots bloqueados
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4 pb-24">
        <div className="flex justify-center">
          <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-[10px] text-muted-foreground">
            CRIPTOGRAFIA ATIVA
          </span>
        </div>

        {mockMessages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.sender === "me"
                  ? "rounded-br-md bg-primary/15 border border-primary/20"
                  : "rounded-bl-md bg-surface-2 border border-border"
              }`}
            >
              <p className="text-sm text-foreground">{msg.content}</p>
              <p
                className={`mt-1 text-right font-mono text-[10px] ${
                  msg.sender === "me" ? "text-primary/60" : "text-muted-foreground"
                }`}
              >
                {msg.time}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border glass px-4 py-3">
        <div className="flex items-center gap-2">
          <button className="text-muted-foreground hover:text-primary transition-colors">
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mensagem criptografada..."
            className="flex-1 rounded-xl border border-border bg-surface-1 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 font-mono"
          />
          {message ? (
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground neon-glow transition-all hover:bg-primary/90">
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button className="text-muted-foreground hover:text-primary transition-colors">
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatView;
