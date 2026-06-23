import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Bookmark, MoreHorizontal, Trash2, Pencil, Link2, Flag } from "lucide-react";
import { toast } from "sonner";
import type { Post } from "@/lib/social";
import { likePost, unlikePost, deletePost } from "@/lib/social";
import { isSaved, savePost, unsavePost } from "@/lib/saves";
import { PostMediaCarousel } from "@/components/PostMedia";
import { CommentsSheet } from "@/components/CommentsSheet";
import { LikesSheet } from "@/components/LikesSheet";
import { EditCaptionSheet } from "@/components/EditCaptionSheet";
import { supabase } from "@/integrations/supabase/client";
import { CachedImage } from "@/components/CachedImage";
import { ReportDialog } from "@/components/ReportDialog";

function timeAgo(iso: string) {
  const d = new Date(iso);
  const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function renderCaption(text: string) {
  const parts = text.split(/(#[\p{L}\p{N}_]+|@[A-Za-z0-9._]+)/gu);
  return parts.map((p, i) => {
    if (p.startsWith("#")) {
      return (
        <Link
          key={i}
          to="/explore"
          search={{ tag: p.slice(1).toLowerCase() } as any}
          className="font-semibold"
          style={{ color: "var(--cosmos-teal)" }}
        >
          {p}
        </Link>
      );
    }
    if (p.startsWith("@")) {
      return (
        <Link
          key={i}
          to="/u/$username"
          params={{ username: p.slice(1) }}
          className="font-semibold"
          style={{ color: "var(--cosmos-violet)" }}
        >
          {p}
        </Link>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

/** Build a clean @handle from profile data, never the literal "usuario". */
export function resolveHandle(author: Post["author"]): string {
  const u = author?.username?.trim();
  if (u) return u;
  const n = author?.full_name?.trim();
  if (n) return n.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._]/g, "");
  return author?.id ? author.id.slice(0, 8) : "usuario";
}

export function PostCard({
  post: initial,
  onDeleted,
  priority = false,
}: {
  post: Post;
  onDeleted?: (id: string) => void;
  /** Pass true for first visible posts to load media immediately */
  priority?: boolean;
}) {
  const [post, setPost] = useState(initial);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    let live = true;
    isSaved(post.id).then((v) => live && setSaved(v));
    supabase.auth.getSession().then(({ data }) => {
      if (live) setMe(data.session?.user?.id ?? null);
    });
    return () => { live = false; };
  }, [post.id]);

  // Realtime: keep likes_count in sync
  useEffect(() => {
    const channel = supabase
      .channel(`post-likes-${post.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_likes", filter: `post_id=eq.${post.id}` },
        (payload: any) => {
          if (payload.new?.user_id === me) return;
          setPost((p) => ({ ...p, likes_count: p.likes_count + 1 }));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "post_likes", filter: `post_id=eq.${post.id}` },
        (payload: any) => {
          if (payload.old?.user_id === me) return;
          setPost((p) => ({ ...p, likes_count: Math.max(0, p.likes_count - 1) }));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [post.id, me]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const author = post.author;
  const handle = resolveHandle(author);
  const isOwner = !!me && me === post.author_id;
  const postUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${post.id}` : `/p/${post.id}`;
  const hasMedia = post.media && post.media.length > 0;

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    try {
      if (next) await savePost(post.id);
      else await unsavePost(post.id);
    } catch {
      setSaved(!next);
    }
  }

  async function toggleLike() {
    const liked = !!post.liked_by_me;
    setPost({ ...post, liked_by_me: !liked, likes_count: post.likes_count + (liked ? -1 : 1) });
    try {
      if (liked) await unlikePost(post.id);
      else await likePost(post.id);
    } catch {
      setPost({ ...post, liked_by_me: liked, likes_count: post.likes_count });
    }
  }

  async function doLike() {
    if (post.liked_by_me) return;
    setPost({ ...post, liked_by_me: true, likes_count: post.likes_count + 1 });
    try {
      await likePost(post.id);
    } catch {
      setPost({ ...post, liked_by_me: false, likes_count: post.likes_count });
    }
  }

  function onMediaTap(e: React.MouseEvent<HTMLDivElement>) {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now() + Math.random();
      setHearts((h) => [...h, { id, x, y }]);
      setTimeout(() => setHearts((h) => h.filter((it) => it.id !== id)), 900);
      doLike();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }

  async function onDelete() {
    if (deleting) return;
    if (!confirm("Excluir esta postagem? Essa ação não pode ser desfeita.")) return;
    setDeleting(true);
    try {
      await deletePost(post.id);
      onDeleted?.(post.id);
    } catch {
      alert("Não foi possível excluir a postagem.");
      setDeleting(false);
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(postUrl).then(
      () => toast.success("Link copiado"),
      () => toast.error("Não foi possível copiar"),
    );
    setMenuOpen(false);
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `@${handle}`, text: post.caption, url: postUrl });
        return;
      } catch {}
    }
    copyLink();
  }

  return (
    <article className="peacely-card post-card-animate mx-3 my-5 overflow-hidden">

      {/* ── Media (full-width, no borders) ── */}
      {hasMedia && (
        <div className="relative select-none" onClick={onMediaTap}>
          <PostMediaCarousel items={post.media!} links={post.links ?? []} priority={priority} />

          {/* Like burst animation */}
          {hearts.map((h) => (
            <span
              key={h.id}
              className="like-burst"
              style={{ left: h.x - 48, top: h.y - 48 }}
              aria-hidden
            >
              <span className="lb-ring" />
              <span className="lb-heart">✌</span>
            </span>
          ))}

          {/* ── Floating overlay: author header on top of media ── */}
          <div
            className="absolute top-0 left-0 right-0 flex items-center gap-2.5 px-3 py-3"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)" }}
          >
            <Link
              to="/u/$username"
              params={{ username: handle }}
              className="h-9 w-9 rounded-full bg-gradient-brand grid place-items-center text-white font-bold overflow-hidden shrink-0 ring-2"
              style={{ background: "var(--gradient-brand)", ["--tw-ring-color" as any]: "rgba(255,255,255,0.3)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {author?.avatar_url ? (
                <CachedImage src={author.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (author?.full_name || handle).charAt(0).toUpperCase()
              )}
            </Link>
            <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
              <Link to="/u/$username" params={{ username: handle }} className="font-semibold text-sm text-white truncate block drop-shadow-sm">
                {author?.full_name || `@${handle}`}
              </Link>
              <div className="text-[10px] text-white/70">@{handle} · {timeAgo(post.created_at)}</div>
            </div>
            {/* Menu button on top of media */}
            <div className="relative shrink-0" ref={menuRef} onClick={(e) => e.stopPropagation()}>
              <button
                aria-label="Mais opções"
                onClick={() => setMenuOpen((v) => !v)}
                className="h-8 w-8 grid place-items-center rounded-full text-white"
                style={{ background: "rgba(0,0,0,0.3)" }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 z-30 min-w-48 rounded-2xl overflow-hidden glass-card shadow-float">
                  <button onClick={copyLink} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-white/5 transition-colors">
                    <Link2 className="h-4 w-4 opacity-70" /> Copiar link
                  </button>
                  {isOwner ? (
                    <>
                      <button
                        onClick={() => { setEditOpen(true); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-white/5 transition-colors"
                      >
                        <Pencil className="h-4 w-4 opacity-70" /> Editar legenda
                      </button>
                      <button
                        onClick={onDelete}
                        disabled={deleting}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-destructive hover:bg-white/5 disabled:opacity-60 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" /> {deleting ? "Excluindo…" : "Excluir postagem"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-destructive hover:bg-white/5 transition-colors"
                    >
                      <Flag className="h-4 w-4" /> Denunciar
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Floating overlay: action buttons on bottom of media ── */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-3 py-3"
            style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.65) 0%, transparent 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Like */}
            <button
              onClick={toggleLike}
              aria-label="Curtir"
              className="flex items-center gap-1.5 group"
            >
              <span
                aria-hidden
                className={`like-peace text-[24px] leading-none h-7 w-7 transition-transform duration-200 ${post.liked_by_me ? "active scale-125" : "opacity-80 group-hover:scale-110"}`}
              >
                ✌
              </span>
              {post.likes_count > 0 && (
                <span className="text-xs font-bold text-white drop-shadow-sm">
                  {post.likes_count.toLocaleString("pt-BR")}
                </span>
              )}
            </button>

            {/* Comments */}
            <button
              onClick={() => setCommentsOpen(true)}
              aria-label="Comentar"
              className="flex items-center gap-1.5 group"
            >
              <MessageCircle className="h-6 w-6 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" />
              {post.comments_count > 0 && (
                <span className="text-xs font-bold text-white drop-shadow-sm">{post.comments_count}</span>
              )}
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Share */}
            <button onClick={share} aria-label="Compartilhar" className="group">
              <Send className="h-5 w-5 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" />
            </button>

            {/* Save */}
            <button onClick={toggleSave} aria-label="Salvar" className="group">
              <Bookmark
                className={`h-5 w-5 text-white transition-all duration-200 group-hover:scale-110 ${saved ? "fill-white opacity-100" : "opacity-80"}`}
              />
            </button>
          </div>
        </div>
      )}

      {/* ── If NO media: show header + actions normally ── */}
      {!hasMedia && (
        <header className="flex items-center gap-3 px-4 py-3">
          <Link
            to="/u/$username"
            params={{ username: handle }}
            className="h-10 w-10 rounded-full grid place-items-center text-white font-bold overflow-hidden shrink-0"
            style={{ background: "var(--gradient-brand)" }}
          >
            {author?.avatar_url ? (
              <CachedImage src={author.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (author?.full_name || handle).charAt(0).toUpperCase()
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <Link to="/u/$username" params={{ username: handle }} className="font-semibold text-sm truncate block">
              {author?.full_name || `@${handle}`}
            </Link>
            <div className="text-[11px] text-muted-foreground">@{handle} · {timeAgo(post.created_at)}</div>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              aria-label="Mais opções"
              onClick={() => setMenuOpen((v) => !v)}
              className="h-9 w-9 grid place-items-center rounded-full hover:bg-white/5"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-30 min-w-48 rounded-2xl overflow-hidden glass-card shadow-float">
                <button onClick={copyLink} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-white/5 transition-colors">
                  <Link2 className="h-4 w-4 opacity-70" /> Copiar link
                </button>
                {isOwner ? (
                  <>
                    <button onClick={() => { setEditOpen(true); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-white/5 transition-colors">
                      <Pencil className="h-4 w-4 opacity-70" /> Editar legenda
                    </button>
                    <button onClick={onDelete} disabled={deleting} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-destructive hover:bg-white/5 disabled:opacity-60 transition-colors">
                      <Trash2 className="h-4 w-4" /> {deleting ? "Excluindo…" : "Excluir postagem"}
                    </button>
                  </>
                ) : (
                  <button onClick={() => { setMenuOpen(false); setReportOpen(true); }} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-destructive hover:bg-white/5 transition-colors">
                    <Flag className="h-4 w-4" /> Denunciar
                  </button>
                )}
              </div>
            )}
          </div>
        </header>
      )}

      {/* ── Caption section (below media) ── */}
      {post.caption && (
        <div className="px-4 pt-3 pb-4 text-sm">
          {!hasMedia && (
            <div className="flex items-center gap-3 mb-3">
              <button onClick={toggleLike} aria-label="Curtir" className="flex items-center gap-1.5 group">
                <span aria-hidden className={`like-peace text-[22px] leading-none h-6 w-6 transition-transform ${post.liked_by_me ? "active scale-110" : "opacity-80 group-hover:scale-110"}`}>✌</span>
                {post.likes_count > 0 && <span className="text-xs font-bold">{post.likes_count.toLocaleString("pt-BR")}</span>}
              </button>
              <button onClick={() => setCommentsOpen(true)} aria-label="Comentar" className="flex items-center gap-1.5 group">
                <MessageCircle className="h-5 w-5 opacity-70 group-hover:opacity-100 transition" />
                {post.comments_count > 0 && <span className="text-xs font-bold">{post.comments_count}</span>}
              </button>
              <div className="flex-1" />
              <button onClick={share} aria-label="Compartilhar"><Send className="h-4 w-4 opacity-70 hover:opacity-100 transition" /></button>
              <button onClick={toggleSave} aria-label="Salvar">
                <Bookmark className={`h-4 w-4 transition ${saved ? "fill-foreground opacity-100" : "opacity-70 hover:opacity-100"}`} />
              </button>
            </div>
          )}
          <div className="leading-relaxed">
            <Link to="/u/$username" params={{ username: handle }} className="font-bold mr-1.5" style={{ color: "var(--cosmos-violet)" }}>
              @{handle}
            </Link>
            <span className={captionExpanded ? "" : "line-clamp-3"}>
              {renderCaption(post.caption)}
            </span>
            {!captionExpanded && post.caption.length > 120 && (
              <button
                onClick={() => setCaptionExpanded(true)}
                className="text-muted-foreground hover:text-foreground ml-1 transition-colors text-xs"
              >
                …mais
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {commentsOpen && (
        <CommentsSheet
          postId={post.id}
          onClose={() => setCommentsOpen(false)}
          onCountChange={(n) => setPost((p) => ({ ...p, comments_count: n }))}
        />
      )}
      {likesOpen && <LikesSheet postId={post.id} onClose={() => setLikesOpen(false)} />}
      {editOpen && (
        <EditCaptionSheet
          postId={post.id}
          initialCaption={post.caption}
          onClose={() => setEditOpen(false)}
          onSaved={(c) => setPost((p) => ({ ...p, caption: c }))}
        />
      )}
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="post"
        targetId={post.id}
        targetUserId={post.author?.id ?? ""}
        targetLabel={`Post de @${handle}`}
      />
    </article>
  );
}
