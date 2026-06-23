import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useMediaUrl } from "@/lib/media-url";

export type StoryItem = {
  id: string;
  user_id: string;
  content: string | null;
  background: string | null;
  media_url: string | null;
  created_at: string;
};

export type StoryGroup = {
  user: { id: string; username: string | null; full_name: string | null; avatar_url: string | null };
  items: StoryItem[];
};

const DURATION = 5000;

function StoryImage({ src }: { src: string }) {
  const url = useMediaUrl(src);
  return <img src={url || undefined} alt="Story" className="max-h-full max-w-full object-contain" />;
}

export function StoryViewer({
  groups,
  startGroup,
  myId,
  onClose,
  onAdvanceUser,
}: {
  groups: StoryGroup[];
  startGroup: number;
  myId: string | null;
  onClose: () => void;
  onAdvanceUser?: (groupIndex: number) => void;
}) {
  const [gi, setGi] = useState(startGroup);
  const [ii, setIi] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const startRef = useRef<number>(Date.now());
  const accRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const group = groups[gi];
  const story = group?.items[ii];

  // Record view
  useEffect(() => {
    if (!story || !myId || story.user_id === myId) return;
    supabase
      .from("status_views")
      .insert({ status_id: story.id, viewer_id: myId })
      .then(() => {}, () => {});
  }, [story?.id, myId]);

  // Reset timer when story changes
  useEffect(() => {
    setProgress(0);
    accRef.current = 0;
    startRef.current = Date.now();
  }, [gi, ii]);

  // Progress loop
  useEffect(() => {
    function tick() {
      if (!paused) {
        const elapsed = accRef.current + (Date.now() - startRef.current);
        const p = Math.min(1, elapsed / DURATION);
        setProgress(p);
        if (p >= 1) {
          next();
          return;
        }
      }
      rafRef.current = window.requestAnimationFrame(tick);
    }
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, gi, ii]);

  function pause() {
    if (paused) return;
    accRef.current += Date.now() - startRef.current;
    setPaused(true);
  }
  function resume() {
    if (!paused) return;
    startRef.current = Date.now();
    setPaused(false);
  }

  function next() {
    if (!group) return;
    if (ii < group.items.length - 1) {
      setIi(ii + 1);
    } else if (gi < groups.length - 1) {
      onAdvanceUser?.(gi);
      setGi(gi + 1);
      setIi(0);
    } else {
      onAdvanceUser?.(gi);
      onClose();
    }
  }
  function prev() {
    if (ii > 0) {
      setIi(ii - 1);
    } else if (gi > 0) {
      const prevG = groups[gi - 1];
      setGi(gi - 1);
      setIi(prevG.items.length - 1);
    }
  }

  async function deleteStory() {
    if (!story) return;
    if (!confirm("Excluir este story?")) return;
    const { error } = await supabase.from("statuses").delete().eq("id", story.id);
    if (error) return toast.error(error.message);
    toast.success("Story excluído");
    // Remove locally and advance
    group.items.splice(ii, 1);
    if (group.items.length === 0) {
      if (gi < groups.length - 1) setGi(gi + 1);
      else onClose();
    } else if (ii >= group.items.length) {
      setIi(group.items.length - 1);
    } else {
      setProgress(0);
      accRef.current = 0;
      startRef.current = Date.now();
    }
  }

  if (!story || !group) return null;
  const isImage = !!story.media_url;
  const name = group.user.full_name || group.user.username || "Usuário";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: story.background ?? "#000" }}>
      {/* Progress bars */}
      <div className="px-2 pt-2 flex gap-1">
        {group.items.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white"
              style={{
                width: i < ii ? "100%" : i === ii ? `${progress * 100}%` : "0%",
                transition: i === ii ? "none" : undefined,
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 text-white relative z-10">
        <div className="h-9 w-9 rounded-full bg-white/20 grid place-items-center overflow-hidden shrink-0">
          {group.user.avatar_url ? (
            <img src={group.user.avatar_url} className="h-full w-full object-cover" alt="" />
          ) : (
            <span className="font-semibold">{name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{name}</div>
          <div className="text-xs opacity-80">
            {new Date(story.created_at).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        {myId === story.user_id && (
          <button
            onClick={deleteStory}
            className="h-10 w-10 rounded-full bg-black/30 grid place-items-center"
            aria-label="Excluir"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-black/30 grid place-items-center"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 relative grid place-items-center px-2 overflow-hidden select-none">
        {isImage ? (
          <StoryImage src={story.media_url!} />
        ) : (
          <div className="text-white text-2xl text-center font-semibold whitespace-pre-wrap px-6">
            {story.content}
          </div>
        )}
        {isImage && story.content && (
          <div className="absolute bottom-10 left-0 right-0 px-6 text-center text-white text-lg font-semibold drop-shadow whitespace-pre-wrap">
            {story.content}
          </div>
        )}

        {/* Tap zones */}
        <button
          aria-label="Anterior"
          onClick={prev}
          onPointerDown={pause}
          onPointerUp={resume}
          onPointerLeave={resume}
          onPointerCancel={resume}
          className="absolute inset-y-0 left-0 w-1/3 text-white/0 active:bg-black/5 flex items-center justify-start pl-2"
        >
          <ChevronLeft className="h-6 w-6 opacity-0" />
        </button>
        <button
          aria-label="Próximo"
          onClick={next}
          onPointerDown={pause}
          onPointerUp={resume}
          onPointerLeave={resume}
          onPointerCancel={resume}
          className="absolute inset-y-0 right-0 w-2/3 text-white/0 active:bg-black/5 flex items-center justify-end pr-2"
        >
          <ChevronRight className="h-6 w-6 opacity-0" />
        </button>
      </div>
    </div>
  );
}
