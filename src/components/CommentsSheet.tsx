import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/app-cache";
import { Link } from "@tanstack/react-router";
import { X, Send, CornerDownRight, Trash2 } from "lucide-react";

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  author?: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
};

type CommentNode = Comment & { replies: Comment[] };

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function CommentsSheet({
  postId,
  onClose,
  onCountChange,
}: {
  postId: string;
  onClose: () => void;
  onCountChange?: (n: number) => void;
}) {
  const [items, setItems] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  async function load() {
    const { data } = await supabase
      .from("post_comments")
      .select("id,user_id,content,created_at,parent_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    const rows = (data ?? []) as Comment[];
    if (rows.length) {
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,username,avatar_url")
        .in("id", ids);
      const map = new Map<string, any>();
      (profs ?? []).forEach((p: any) => map.set(p.id, p));
      rows.forEach((r) => (r.author = map.get(r.user_id) ?? null));
    }
    setItems(rows);
    onCountChange?.(rows.length);
    setLoading(false);
  }

  useEffect(() => {
    (async () => setMe(await getCurrentUserId()))();
    load();
    const ch = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const threads = useMemo<CommentNode[]>(() => {
    const top: CommentNode[] = [];
    const map = new Map<string, CommentNode>();
    items.forEach((c) => {
      if (!c.parent_id) {
        const node: CommentNode = { ...c, replies: [] };
        map.set(c.id, node);
        top.push(node);
      }
    });
    items.forEach((c) => {
      if (c.parent_id) {
        const parent = map.get(c.parent_id);
        if (parent) parent.replies.push(c);
        else {
          // Orphan reply (parent missing) -> treat as top-level
          const node: CommentNode = { ...c, replies: [] };
          map.set(c.id, node);
          top.push(node);
        }
      }
    });
    return top;
  }, [items]);

  async function send() {
    const content = text.trim();
    if (!content || !me) return;
    setText("");
    const parentId = replyTo?.id ?? null;
    setReplyTo(null);
    await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: me,
      content,
      parent_id: parentId,
    } as any);
  }

  async function remove(id: string) {
    if (!confirm("Excluir este comentário?")) return;
    await supabase.from("post_comments").delete().eq("id", id);
  }

  function CommentRow({ c, isReply = false }: { c: Comment; isReply?: boolean }) {
    const u = c.author?.username || "usuario";
    return (
      <div className={`flex gap-3 ${isReply ? "ml-10" : ""}`}>
        <Link
          to="/u/$username"
          params={{ username: u }}
          className="h-9 w-9 rounded-full bg-gradient-brand grid place-items-center text-white text-sm font-bold shrink-0 overflow-hidden"
        >
          {c.author?.avatar_url ? (
            <img src={c.author.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            (c.author?.full_name || u).charAt(0).toUpperCase()
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-sm break-words [overflow-wrap:anywhere]">
            <span className="font-semibold mr-1.5">{u}</span>
            {c.content}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
            <span>{timeAgo(c.created_at)}</span>
            <button
              type="button"
              onClick={() => setReplyTo(c)}
              className="font-semibold hover:text-foreground inline-flex items-center gap-1"
            >
              <CornerDownRight className="h-3 w-3" /> Responder
            </button>
            {me === c.user_id && (
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="hover:text-destructive inline-flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> Excluir
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end"
      onClick={onClose}
      style={{ height: "100dvh" }}
    >
      <div
        className="w-full bg-background rounded-t-2xl flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-no-swipe
        style={{ height: "min(85dvh, 720px)" }}
      >
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 border-b shrink-0">
          <h3 className="font-semibold truncate">Comentários</h3>
          <button onClick={onClose} aria-label="Fechar" className="shrink-0 -mr-1 p-1">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : threads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Seja a primeira pessoa a comentar
            </p>
          ) : (
            threads.map((t) => (
              <div key={t.id} className="space-y-3">
                <CommentRow c={t} />
                {t.replies.map((r) => (
                  <CommentRow key={r.id} c={r} isReply />
                ))}
              </div>
            ))
          )}
        </div>
        {replyTo && (
          <div className="px-4 py-2 border-t bg-muted/50 flex items-center justify-between gap-2 text-xs shrink-0">
            <span className="truncate min-w-0">
              Respondendo <strong>@{replyTo.author?.username || "usuario"}</strong>
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Cancelar resposta"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div
          className="flex items-center gap-2 p-3 border-t shrink-0"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={replyTo ? `Responder a @${replyTo.author?.username || "usuario"}…` : "Escreva um comentário…"}
            className="flex-1 min-w-0 rounded-full border bg-muted px-4 py-2 text-base sm:text-sm outline-none"
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center disabled:opacity-40"
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
