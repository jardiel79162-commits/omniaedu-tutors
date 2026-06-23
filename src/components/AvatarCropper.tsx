import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, Check } from "lucide-react";

type Props = {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  output?: number; // output square size in px (default 512)
};

export function AvatarCropper({ file, onCancel, onConfirm, output = 512 }: Props) {
  const [src, setSrc] = useState<string>("");
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState(320); // crop square size in CSS px
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; sx: number; sy: number } | null>(null);
  const pinchRef = useRef<{ d: number; s: number } | null>(null);

  // Read file
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Determine box size from viewport
  useEffect(() => {
    const compute = () => {
      const vw = Math.min(window.innerWidth, 600);
      const vh = window.innerHeight;
      setBox(Math.max(220, Math.min(vw - 48, vh - 280, 360)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  // When image loads, fit to cover the box
  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    const cover = Math.max(box / img.naturalWidth, box / img.naturalHeight);
    setMinScale(cover);
    setScale(cover);
    setPos({ x: 0, y: 0 });
  }

  // Clamp position so image always covers crop box
  function clamp(nx: number, ny: number, s: number) {
    if (!imgSize) return { x: nx, y: ny };
    const w = imgSize.w * s;
    const h = imgSize.h * s;
    const maxX = Math.max(0, (w - box) / 2);
    const maxY = Math.max(0, (h - box) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, nx)),
      y: Math.min(maxY, Math.max(-maxY, ny)),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, sx: pos.x, sy: pos.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setPos(clamp(dragRef.current.sx + dx, dragRef.current.sy + dy, scale));
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const next = Math.min(minScale * 4, Math.max(minScale, scale * (e.deltaY < 0 ? 1.08 : 0.92)));
    setScale(next);
    setPos((p) => clamp(p.x, p.y, next));
  }

  function setScaleClamped(s: number) {
    const next = Math.min(minScale * 4, Math.max(minScale, s));
    setScale(next);
    setPos((p) => clamp(p.x, p.y, next));
  }

  async function confirm() {
    if (!imgSize) return;
    setBusy(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });
      // The visible crop box is `box` CSS px. At current scale, the image is
      // imgSize * scale CSS px, centered at pos. The crop center in image
      // coords (natural px) = (imgSize/2) - (pos / scale).
      const cx = imgSize.w / 2 - pos.x / scale;
      const cy = imgSize.h / 2 - pos.y / scale;
      const srcSize = box / scale; // natural px sampled
      const sx = cx - srcSize / 2;
      const sy = cy - srcSize / 2;
      const canvas = document.createElement("canvas");
      canvas.width = output;
      canvas.height = output;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, output, output);
      const blob: Blob = await new Promise((res) =>
        canvas.toBlob((b) => res(b!), "image/jpeg", 0.92),
      );
      onConfirm(blob);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button onClick={onCancel} className="h-10 w-10 rounded-full grid place-items-center hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
        <div className="text-sm font-semibold">Ajustar foto</div>
        <button
          onClick={confirm}
          disabled={busy || !imgSize}
          className="h-10 px-4 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-1.5 disabled:opacity-60"
        >
          <Check className="h-4 w-4" /> {busy ? "..." : "OK"}
        </button>
      </div>

      {/* Crop stage */}
      <div className="flex-1 grid place-items-center px-4 select-none">
        <div
          ref={wrapRef}
          className="relative touch-none overflow-hidden"
          style={{ width: box, height: box }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          {/* Image */}
          {src && (
            <img
              src={src}
              alt=""
              onLoad={onImgLoad}
              draggable={false}
              className="absolute left-1/2 top-1/2 max-w-none pointer-events-none"
              style={{
                width: imgSize ? imgSize.w * scale : "auto",
                height: imgSize ? imgSize.h * scale : "auto",
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
              }}
            />
          )}

          {/* Mask: dark outside circle, transparent inside */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${box} ${box}`}>
            <defs>
              <mask id="hole">
                <rect width={box} height={box} fill="white" />
                <circle cx={box / 2} cy={box / 2} r={box / 2} fill="black" />
              </mask>
            </defs>
            <rect width={box} height={box} fill="rgba(0,0,0,0.65)" mask="url(#hole)" />
            <circle
              cx={box / 2}
              cy={box / 2}
              r={box / 2 - 1}
              fill="none"
              stroke="white"
              strokeWidth={2}
            />
          </svg>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="px-6 pb-8 pt-2 flex items-center gap-3 text-white max-w-md mx-auto w-full">
        <button
          onClick={() => setScaleClamped(scale / 1.15)}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center"
          aria-label="Diminuir"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <input
          type="range"
          min={minScale}
          max={minScale * 4}
          step={0.001}
          value={scale}
          onChange={(e) => setScaleClamped(parseFloat(e.target.value))}
          className="flex-1 accent-[hsl(var(--primary))]"
        />
        <button
          onClick={() => setScaleClamped(scale * 1.15)}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center"
          aria-label="Aumentar"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>
      <div className="text-center text-xs text-white/60 pb-4">
        Arraste para posicionar · use a roda do mouse ou o controle para aproximar
      </div>
    </div>
  );
}
