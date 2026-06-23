import { type ImgHTMLAttributes, useEffect, useRef, useState } from "react";
import { isImageCached, markImageLoaded } from "@/lib/image-cache";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined;
  /** Render this when src is null/empty. */
  fallback?: React.ReactNode;
};

/**
 * Image that never flickers on re-mount.
 *
 * - URLs previously loaded in this session (or persisted to localStorage)
 *   render with decoding="sync" + loading="eager" so they appear instantly
 *   without the typical fade-in.
 * - First-time loads use decoding="async" + loading="lazy" to stay smooth.
 * - On successful load we record the URL so future renders are instant.
 */
export function CachedImage({ src, fallback, onLoad, onError, ...rest }: Props) {
  const cached = isImageCached(src);
  const [failed, setFailed] = useState(false);
  const elRef = useRef<HTMLImageElement | null>(null);

  // If we're using decoding="sync" and the URL truly isn't in HTTP cache,
  // the browser still works — it just paints a touch later. No flicker risk.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) return <>{fallback ?? null}</>;

  return (
    <img
      ref={elRef}
      src={src}
      decoding={cached ? "sync" : "async"}
      loading={cached ? "eager" : (rest.loading ?? "lazy")}
      fetchPriority={cached ? "high" : "auto"}
      draggable={false}
      onLoad={(e) => {
        markImageLoaded(src);
        onLoad?.(e);
      }}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
      {...rest}
    />
  );
}
