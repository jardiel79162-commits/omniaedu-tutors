import { useState, useRef } from "react";
import type { PostMedia as PM, ProductLink } from "@/lib/social";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { InlineVideo } from "@/components/InlineVideo";

export function PostMediaCarousel({
  items,
  links = [],
  className = "",
  priority = false,
}: {
  items: PM[];
  links?: ProductLink[];
  className?: string;
  /** Set true for the first 2-3 posts in the feed for instant display */
  priority?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [imgRatio, setImgRatio] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  if (!items.length) return null;
  const item = items[idx];
  const isVideo = item.mime.startsWith("video/");
  const currentLinks = links.filter((l) => l.media_position === idx);

  const knownRatio =
    item.width && item.height && item.width > 0 && item.height > 0
      ? item.width / item.height
      : null;
  const rawRatio = !isVideo ? knownRatio ?? imgRatio : knownRatio;
  // Clamp to a sensible range so vertical/panoramic media still fill nicely
  const aspectRatio = rawRatio ? Math.min(Math.max(rawRatio, 0.5625), 1.91) : 1;

  function goNext() { if (idx < items.length - 1) setIdx(idx + 1); }
  function goPrev() { if (idx > 0) setIdx(idx - 1); }

  // Touch swipe on carousel
  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -40) goNext();
    else if (dx > 40) goPrev();
  }

  // Preload next image
  if (!isVideo && idx < items.length - 1) {
    const next = items[idx + 1];
    if (!next.mime.startsWith("video/") && next.url) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = next.url;
      // Only add if not already in DOM
      if (!document.querySelector(`link[href="${next.url}"]`)) {
        document.head.appendChild(link);
      }
    }
  }

  return (
    <div
      className={`relative bg-black overflow-hidden ${className}`}
      style={{ aspectRatio }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {isVideo ? (
        <InlineVideo
          key={item.id}
          src={item.url}
          width={item.width}
          height={item.height}
          className="absolute inset-0"
          priority={priority}
        />
      ) : (
        <img
          key={item.id}
          src={item.url}
          alt=""
          onLoad={(e) => {
            if (knownRatio) return;
            const im = e.currentTarget;
            if (im.naturalWidth && im.naturalHeight) {
              setImgRatio(im.naturalWidth / im.naturalHeight);
            }
          }}
          className="absolute inset-0 w-full h-full object-cover"
          // Eager loading for instant display — no lazy
          loading={priority ? "eager" : "eager"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
        />
      )}

      {/* Product link overlays */}
      {currentLinks.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {currentLinks.map((l) => (
            <ProductLinkPill key={l.id} link={l} />
          ))}
        </div>
      )}

      {/* Navigation arrows + dots for multi-media */}
      {items.length > 1 && (
        <>
          {idx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              aria-label="Anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full grid place-items-center z-10 text-white transition-transform active:scale-90"
              style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {idx < items.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              aria-label="Próximo"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full grid place-items-center z-10 text-white transition-transform active:scale-90"
              style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
          {/* Dots indicator */}
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? "20px" : "6px",
                  height: "6px",
                  background: i === idx ? "var(--cosmos-violet)" : "rgba(255,255,255,0.5)",
                  boxShadow: i === idx ? "0 0 8px var(--cosmos-violet)" : "none",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ProductLinkPill({ link }: { link: ProductLink }) {
  const widthPct = Math.max(18, Math.min(80, link.size * 100));
  const safeUrl = /^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`;
  const label = link.label?.trim() || hostFromUrl(safeUrl);
  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="pointer-events-auto absolute flex items-center gap-2 rounded-full text-black shadow-lg px-2.5 py-1.5 text-xs font-semibold hover:scale-105 active:scale-95 transition-transform"
      style={{
        left: `${link.x * 100}%`,
        top: `${link.y * 100}%`,
        width: `${widthPct}%`,
        transform: "translate(-50%, -50%)",
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
      }}
    >
      {link.logo_url ? (
        <img
          src={link.logo_url}
          alt=""
          className="h-6 w-6 rounded-md object-cover shrink-0"
        />
      ) : (
        <span className="h-6 w-6 rounded-md bg-black/10 grid place-items-center shrink-0">
          <ExternalLink className="h-3.5 w-3.5" />
        </span>
      )}
      <span className="truncate flex-1">{label}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
    </a>
  );
}

function hostFromUrl(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "Abrir link";
  }
}
