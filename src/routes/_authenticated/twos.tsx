import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { fetchFeed, likePost, unlikePost, deletePost, type Post } from "@/lib/social";
import { Heart, MessageCircle, ArrowLeft, Volume2, VolumeX, Pause, MoreHorizontal, Trash2, ChevronUp, ChevronDown, Play } from "lucide-react";
import { CommentsSheet } from "@/components/CommentsSheet";
import { useSwr } from "@/lib/swr-cache";
import { resolveHandle } from "@/components/PostCard";
import { supabase } from "@/integrations/supabase/client";

// Shared mute state across all reels
const muteStore = (() => {
  let muted = true;
  const listeners = new Set<() => void>();
  return {
    get: () => muted,
    set: (v: boolean) => { muted = v; listeners.forEach((l) => l()); },
    subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  };
})();
function useMuted(): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(muteStore.subscribe, muteStore.get, muteStore.get);
  return [value, muteStore.set];
}

export const Route = createFileRoute("/_authenticated/twos")({
  component: ReelsPage,
});

function ReelsPage() {
  const { data, loading, setData } = useSwr<Post[]>("feed:reels", () => fetchFeed({ kind: "reel", limit: 18 }));
  const reels = data ?? [];
  const onDeleted = (id: string) => setData((prev) => (prev ?? []).filter((x) => x.id !== id));

  const scrollerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      if (live) setViewerId(data.session?.user?.id ?? null);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (activeIndex > reels.length - 1) setActiveIndex(Math.max(0, reels.length - 1));
  }, [activeIndex, reels.length]);

  // Keep active reel synced by scroll position; this is steadier on mobile than relying on threshold crossings.
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || reels.length === 0) return;
    let frame = 0;
    const updateActive = () => {
      frame = 0;
      const middle = root.scrollTop + root.clientHeight / 2;
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      sectionRefs.current.forEach((el, idx) => {
        if (!el) return;
        const center = el.offsetTop + el.offsetHeight / 2;
        const distance = Math.abs(center - middle);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = idx;
        }
      });
      setActiveIndex((current) => (current === bestIndex ? current : bestIndex));
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(updateActive);
    };
    updateActive();
    root.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      root.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reels.length]);

  const goTo = useCallback((idx: number) => {
    const root = scrollerRef.current;
    const next = Math.max(0, Math.min(reels.length - 1, idx));
    const el = sectionRefs.current[next];
    if (!root || !el) return;
    setActiveIndex(next);
    root.scrollTo({ top: el.offsetTop, behavior: "smooth" });
  }, [reels.length]);

  const goPrev = useCallback(() => goTo(Math.max(0, activeIndex - 1)), [activeIndex, goTo]);
  const goNext = useCallback(() => goTo(Math.min(reels.length - 1, activeIndex + 1)), [activeIndex, goTo, reels.length]);

  // Keyboard navigation (desktop)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && t.closest('input, textarea, [contenteditable="true"]')) return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === "j") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "k") {
        e.preventDefault();
        goPrev();
      } else if (e.key === " ") {
        // let item handle pause
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  return (
    <div
      className="fixed inset-x-0 top-0 bottom-[calc(64px+env(safe-area-inset-bottom))] bg-black z-20 flex flex-col lg:bottom-0"
    >
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-5 pb-3 bg-gradient-to-b from-black/60 to-transparent text-white">
        <Link to="/feed" className="h-10 w-10 grid place-items-center rounded-full bg-black/40">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">TWOS</h1>
        <span className="w-10" />
      </header>

      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto snap-y snap-mandatory overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {loading && reels.length === 0 ? (
          <div className="h-full grid place-items-center text-white">Carregando…</div>
        ) : reels.length === 0 ? (
          <div className="h-full grid place-items-center text-white text-center px-8">
            <div>
              <p className="font-semibold mb-2">Nenhum reel ainda</p>
              <Link to="/create" className="text-primary underline">
                Criar o primeiro
              </Link>
            </div>
          </div>
        ) : (
          reels.map((r, i) => {
            const distance = Math.abs(i - activeIndex);
            if (distance > 1) {
              return (
                <section
                  key={r.id}
                  ref={(el) => {
                    sectionRefs.current[i] = el;
                  }}
                  data-idx={i}
                  className="h-full w-full snap-start snap-always bg-black"
                />
              );
            }
            return (
              <ReelItem
                key={r.id}
                reel={r}
                index={i}
                active={i === activeIndex}
                near={distance === 0}
                viewerId={viewerId}
                registerRef={(el) => (sectionRefs.current[i] = el)}
                onDeleted={onDeleted}
              />
            );
          })
        )}
      </div>

      {/* Desktop nav buttons */}
      {reels.length > 1 && (
        <div data-no-tap className="absolute left-3 sm:left-auto sm:right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3">
          <button
            onClick={goPrev}
            disabled={activeIndex === 0}
            aria-label="TWO anterior"
            className="h-12 w-12 rounded-full bg-black/35 hover:bg-black/50 backdrop-blur text-white grid place-items-center disabled:opacity-25 disabled:cursor-not-allowed transition"
          >
            <ChevronUp className="h-6 w-6" />
          </button>
          <button
            onClick={goNext}
            disabled={activeIndex >= reels.length - 1}
            aria-label="Próximo reel"
            className="h-12 w-12 rounded-full bg-black/35 hover:bg-black/50 backdrop-blur text-white grid place-items-center disabled:opacity-25 disabled:cursor-not-allowed transition"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}

function ReelItem({
  reel: initial,
  index,
  active,
  near,
  viewerId,
  registerRef,
  onDeleted,
}: {
  reel: Post;
  index: number;
  active: boolean;
  near: boolean;
  viewerId: string | null;
  registerRef: (el: HTMLElement | null) => void;
  onDeleted?: (id: string) => void;
}) {
  const [reel, setReel] = useState(initial);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [muted, setMuted] = useMuted();
  const [paused, setPaused] = useState(false);
  const [showMute, setShowMute] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [errorVideo, setErrorVideo] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [btnPop, setBtnPop] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef<number>(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const muteHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);
  const movedRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const media = reel.media?.[0];
  const isVideo = !!media?.mime.startsWith("video/");

  // Drive playback strictly from "active": only the focused reel owns a video source.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active && !paused) {
      const p = v.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          v.muted = true;
          setMuted(true);
          v.play().catch(() => setErrorVideo(true));
        });
      }
    } else {
      v.pause();
      if (!active) {
        try { v.currentTime = 0; } catch {}
        setProgress(0);
      }
    }
  }, [active, paused, near]);

  // Time tracking for active video
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !active) return;
    const onTime = () => {
      if (scrubbing) return;
      if (v.duration > 0) setProgress(v.currentTime / v.duration);
    };
    const onMeta = () => setDuration(v.duration || 0);
    const onWaiting = () => setLoadingVideo(true);
    const onPlaying = () => { setLoadingVideo(false); setErrorVideo(false); };
    const onError = () => { setLoadingVideo(false); setErrorVideo(true); };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("canplay", onPlaying);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("canplay", onPlaying);
      v.removeEventListener("error", onError);
    };
  }, [active, scrubbing]);

  function seekFromEvent(clientX: number, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setProgress(ratio);
    const v = videoRef.current;
    if (v && v.duration > 0) v.currentTime = ratio * v.duration;
  }

  function onScrubDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setScrubbing(true);
    seekFromEvent(e.clientX, e.currentTarget);
  }
  function onScrubMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!scrubbing) return;
    e.stopPropagation();
    seekFromEvent(e.clientX, e.currentTarget);
  }
  function onScrubUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!scrubbing) return;
    e.stopPropagation();
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    setScrubbing(false);
  }

  function fmt(s: number) {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  }

  async function doLike() {
    if (reel.liked_by_me) return;
    setReel({ ...reel, liked_by_me: true, likes_count: reel.likes_count + 1 });
    setBtnPop((n) => n + 1);
    try {
      await likePost(reel.id);
    } catch {
      setReel(initial);
    }
  }

  async function toggleLike() {
    const liked = !!reel.liked_by_me;
    setReel({ ...reel, liked_by_me: !liked, likes_count: reel.likes_count + (liked ? -1 : 1) });
    if (!liked) {
      setBtnPop((n) => n + 1);
      // spawn a centered burst when liking via the button
      spawnHeart(window.innerWidth / 2, window.innerHeight / 2);
    }
    try {
      if (liked) await unlikePost(reel.id);
      else await likePost(reel.id);
    } catch {
      setReel(initial);
    }
  }

  function flashMute() {
    setShowMute(true);
    if (muteHideRef.current) clearTimeout(muteHideRef.current);
    muteHideRef.current = setTimeout(() => setShowMute(false), 700);
  }

  function spawnHeart(x: number, y: number) {
    const id = Date.now() + Math.random();
    setHearts((h) => [...h, { id, x, y }]);
    setTimeout(() => setHearts((h) => h.filter((it) => it.id !== id)), 900);
  }

  function tryPlay() {
    const v = videoRef.current;
    if (!v) return;
    setErrorVideo(false);
    setLoadingVideo(true);
    try { v.load(); } catch {}
    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        v.muted = true;
        setMuted(true);
        v.play().catch(() => setLoadingVideo(false));
      });
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-no-tap]")) return;
    heldRef.current = false;
    movedRef.current = false;
    startRef.current = { x: e.clientX, y: e.clientY };
    holdTimerRef.current = setTimeout(() => {
      heldRef.current = true;
      const v = videoRef.current;
      if (v) {
        v.pause();
        setPaused(true);
      }
    }, 220);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!startRef.current) return;
    const dx = Math.abs(e.clientX - startRef.current.x);
    const dy = Math.abs(e.clientY - startRef.current.y);
    if (dx > 10 || dy > 10) {
      movedRef.current = true;
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (heldRef.current) {
      const v = videoRef.current;
      if (v) {
        v.play().catch(() => {});
        setPaused(false);
      }
      heldRef.current = false;
      return;
    }
    if (movedRef.current) return;

    const now = Date.now();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (now - lastTapRef.current < 280) {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      lastTapRef.current = 0;
      spawnHeart(x, y);
      doLike();
    } else {
      lastTapRef.current = now;
      tapTimerRef.current = setTimeout(() => {
        const next = !muteStore.get();
        setMuted(next);
        flashMute();
        tapTimerRef.current = null;
      }, 260);
    }
  }

  const u = resolveHandle(reel.author);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOwner = !!viewerId && viewerId === reel.author_id;

  async function onDelete() {
    if (deleting) return;
    if (!confirm("Excluir este reel?")) return;
    setDeleting(true);
    try {
      await deletePost(reel.id);
      onDeleted?.(reel.id);
    } catch {
      alert("Não foi possível excluir.");
      setDeleting(false);
    }
  }

  // Only mount the <video> tag for the current reel. This keeps mobile from buffering several videos at once.
  const videoSrc = useMemo(() => (near && isVideo ? media!.url : ""), [near, isVideo, media]);
  const preload = active ? "auto" : "none";

  return (
    <section
      ref={registerRef}
      data-idx={index}
      className="h-full w-full snap-start snap-always relative"
    >
      {isVideo ? (
        near ? (
          <video
            ref={videoRef}
            src={videoSrc}
            loop
            playsInline
            muted={muted}
            preload={preload}
            disablePictureInPicture
            controlsList="nodownload noplaybackrate nofullscreen noremoteplayback"
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onCanPlay={() => {
              setLoadingVideo(false);
              setErrorVideo(false);
            }}
            onWaiting={() => setLoadingVideo(true)}
            onPlaying={() => {
              setLoadingVideo(false);
              setErrorVideo(false);
            }}
            onError={() => {
              setLoadingVideo(false);
              setErrorVideo(true);
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
              if (heldRef.current) {
                const v = videoRef.current;
                if (v) {
                  v.play().catch(() => {});
                  setPaused(false);
                }
                heldRef.current = false;
              }
            }}
            className="absolute inset-0 w-full h-full object-contain bg-black touch-pan-y select-none"
          />
        ) : (
          <div className="absolute inset-0 bg-black" />
        )
      ) : (
        media && (
          <img src={media.url} alt="" className="absolute inset-0 w-full h-full object-contain bg-black" />
        )
      )}

      {/* Loading spinner for active video while buffering */}
      {isVideo && active && loadingVideo && !errorVideo && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-12 w-12 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
      )}

      {/* Error state with retry */}
      {isVideo && active && errorVideo && (
        <div className="absolute inset-0 grid place-items-center text-white text-center px-6">
          <div className="rounded-2xl bg-white/10 backdrop-blur p-6">
            <p className="font-semibold mb-3">Não foi possível carregar o vídeo</p>
            <button
              onClick={tryPlay}
              className="inline-flex items-center gap-2 rounded-full bg-white text-black px-5 py-2 text-sm font-bold"
            >
              <Play className="h-4 w-4" /> Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Hearts burst — Vapor Chrome */}
      {hearts.map((h) => (
        <div
          key={h.id}
          className="like-burst"
          style={{ left: h.x - 48, top: h.y - 48 }}
        >
          <span className="lb-ring" />
          <span className="lb-heart" aria-hidden>✌</span>
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const dist = 38 + Math.random() * 14;
            return (
              <span
                key={i}
                className="lb-spark"
                style={{
                  ["--sx" as any]: `${Math.cos(angle) * dist}px`,
                  ["--sy" as any]: `${Math.sin(angle) * dist}px`,
                  animationDelay: `${i * 14}ms`,
                }}
              />
            );
          })}
        </div>
      ))}

      {/* Mute indicator */}
      {showMute && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-20 w-20 rounded-full bg-black/45 backdrop-blur-sm grid place-items-center animate-scale-in">
            {muted ? <VolumeX className="h-9 w-9 text-white" /> : <Volume2 className="h-9 w-9 text-white" />}
          </div>
        </div>
      )}

      {/* Pause indicator */}
      {paused && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-20 w-20 rounded-full bg-black/40 backdrop-blur-sm grid place-items-center">
            <Pause className="h-10 w-10 text-white fill-white" />
          </div>
        </div>
      )}

      <div data-no-tap data-no-swipe className="absolute right-3 bottom-28 flex flex-col items-center gap-5 text-white">
        <button onClick={toggleLike} className="flex flex-col items-center" aria-label="Curtir">
          <span
            key={btnPop}
            aria-hidden
            className={`like-peace text-[30px] leading-none h-8 w-8 transition-transform ${reel.liked_by_me ? "active like-btn-pop" : "opacity-90"}`}
          >
            ✌
          </span>
          <span className="text-xs font-bold mt-0.5">{reel.likes_count}</span>
        </button>
        <button onClick={() => setCommentsOpen(true)} className="flex flex-col items-center" aria-label="Comentar">
          <MessageCircle className="h-8 w-8" />
          <span className="text-xs font-bold">{reel.comments_count}</span>
        </button>
        {isOwner && (
          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="flex flex-col items-center" aria-label="Mais opções">
              <MoreHorizontal className="h-8 w-8" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 bottom-12 min-w-44 rounded-xl border bg-popover text-popover-foreground shadow-lg overflow-hidden">
                <button
                  onClick={onDelete}
                  disabled={deleting}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-muted disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? "Excluindo…" : "Excluir reel"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div data-no-tap className="absolute left-0 right-16 bottom-6 px-4 text-white">
        <Link to="/u/$username" params={{ username: u }} className="flex items-center gap-2 mb-2 font-semibold">
          {reel.author?.avatar_url && (
            <img src={reel.author.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          )}
          @{u}
        </Link>
        {reel.caption && <p className="text-sm whitespace-pre-wrap line-clamp-3">{reel.caption}</p>}
      </div>

      {commentsOpen && (
        <CommentsSheet
          postId={reel.id}
          onClose={() => setCommentsOpen(false)}
          onCountChange={(n) => setReel((r) => ({ ...r, comments_count: n }))}
        />
      )}

      {isVideo && near && (
        <div data-no-tap data-no-swipe className="absolute inset-x-0 bottom-0 px-3 pb-1.5 pt-2 z-10">
          {scrubbing && (
            <div className="mb-1 text-center text-[11px] font-medium text-white/90 tabular-nums">
              {fmt(progress * duration)} / {fmt(duration)}
            </div>
          )}
          <div
            onPointerDown={onScrubDown}
            onPointerMove={onScrubMove}
            onPointerUp={onScrubUp}
            onPointerCancel={onScrubUp}
            className="relative w-full touch-none cursor-pointer py-2"
            role="slider"
            aria-label="Progresso do vídeo"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div className={`relative w-full rounded-full bg-white/25 transition-all ${scrubbing ? "h-1.5" : "h-0.5"}`}>
              <div className="absolute left-0 top-0 h-full rounded-full bg-white" style={{ width: `${progress * 100}%` }} />
              {scrubbing && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white shadow"
                  style={{ left: `${progress * 100}%` }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
