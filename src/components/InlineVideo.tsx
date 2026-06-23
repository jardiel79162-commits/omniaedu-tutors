import { useEffect, useRef, useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";

type Props = {
  src: string;
  poster?: string;
  className?: string;
  autoPlayInView?: boolean;
  loop?: boolean;
  initialMuted?: boolean;
  width?: number | null;
  height?: number | null;
  /** Priority videos start preloading immediately */
  priority?: boolean;
};

/**
 * In-app video player without native browser chrome.
 * Auto-plays when 25%+ is in viewport. Single tap toggles mute.
 * Priority mode preloads metadata immediately.
 */
export function InlineVideo({
  src,
  poster,
  className = "",
  autoPlayInView = true,
  loop = false,
  initialMuted = true,
  width,
  height,
  priority = false,
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(initialMuted);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ratio, setRatio] = useState<number | null>(
    width && height && width > 0 && height > 0 ? width / height : null,
  );

  useEffect(() => {
    const v = ref.current;
    if (!v || !autoPlayInView) return;

    // Lower threshold (0.25) so video starts playing earlier,
    // before the user fully scrolls to it.
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          // Try to play, catch policy errors silently
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [autoPlayInView]);

  // Priority: trigger metadata load immediately
  useEffect(() => {
    if (!priority) return;
    const v = ref.current;
    if (!v) return;
    v.load();
  }, [priority, src]);

  function onTap() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      return;
    }
    const next = !v.muted;
    v.muted = next;
    setMuted(next);
  }

  const aspectRatio = ratio ? Math.min(Math.max(ratio, 0.5625), 1.91) : 1;

  return (
    <div
      className={`relative bg-black w-full overflow-hidden ${className}`}
      style={{ aspectRatio }}
    >
      {/* Loading skeleton */}
      {loading && (
        <div className="absolute inset-0 cosmos-skeleton z-10 pointer-events-none" />
      )}

      <video
        ref={ref}
        src={src}
        poster={poster}
        playsInline
        muted={muted}
        loop={loop}
        // preload="auto" ensures the browser buffers the video immediately
        preload="auto"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate nofullscreen noremoteplayback"
        onClick={onTap}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onCanPlay={() => setLoading(false)}
        onLoadedMetadata={(e) => {
          setLoading(false);
          if (ratio) return;
          const v = e.currentTarget;
          if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
        }}
        className="absolute inset-0 w-full h-full object-cover select-none"
      />

      {/* Mute pill — always visible */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          const v = ref.current;
          if (!v) return;
          const next = !v.muted;
          v.muted = next;
          setMuted(next);
        }}
        aria-label={muted ? "Ativar som" : "Silenciar"}
        className="absolute bottom-16 right-3 h-9 w-9 rounded-full text-white grid place-items-center z-20 transition-transform active:scale-90"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {/* Play overlay — shown when paused and not loading */}
      {!playing && !loading && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center z-10">
          <div
            className="h-16 w-16 rounded-full grid place-items-center transition-opacity"
            style={{ background: "rgba(0,0,0,0.50)", backdropFilter: "blur(8px)" }}
          >
            <Play className="h-7 w-7 text-white fill-white" />
          </div>
        </div>
      )}
    </div>
  );
}
