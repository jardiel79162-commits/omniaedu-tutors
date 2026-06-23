import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useMemo, useEffect, useCallback, type ReactElement } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/app-cache";
import { extractHashtags } from "@/lib/social";
import { usePlus, FREE_PHOTO_BYTES, FREE_VIDEO_BYTES } from "@/lib/use-plus";
import { listDrafts, saveDraft, deleteDraft, getDraft, makeDraftId, type PostDraft } from "@/lib/post-drafts";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Video,
  X,
  Check,
  Sparkles,
  Hash,
  Square,
  RectangleVertical,
  RectangleHorizontal,
  RotateCw,
  FlipHorizontal2,
  Sun,
  Contrast,
  Droplets,
  Thermometer,
  Wand2,
  Globe2,
  Users,
  Lock,
  RefreshCw,
  Type,
  Plus,
  Trash2,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Crop,
  Play,
  Pause,
  VolumeX,
  Volume2,
  Smile,
  Zap,
  Aperture,
  Scissors,
  Music,
  SplitSquareHorizontal,
  Link2,
  ExternalLink,
  Archive,
  Trash,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/create")({
  component: CreatePostPage,
});

type Picked = { file: File; previewUrl: string; isVideo: boolean };
export type VideoEdit = {
  duration: number;     // seconds (0 = unknown until loadedmetadata)
  trimStart: number;    // seconds
  trimEnd: number;      // seconds (>= trimStart)
  volume: number;       // 0..2 (1 = original)
  muted: boolean;
  music: { name: string; url: string; file: File; volume: number; offset: number } | null;
};
const DEFAULT_VIDEO_EDIT: VideoEdit = {
  duration: 0,
  trimStart: 0,
  trimEnd: 0,
  volume: 1,
  muted: false,
  music: null,
};
type Step = 1 | 2 | 3;
type Audience = "public" | "followers" | "private";
type Ratio = "4:5" | "1:1" | "16:9";
type Align = "left" | "center" | "right";
type BgStyle = "none" | "solid" | "translucent";

type TextAnim = "none" | "fade" | "slide" | "pop" | "bounce" | "type" | "glow";

type TextLayer = {
  id: string;
  text: string;
  font: string;       // CSS font-family
  size: number;       // fraction of preview height (0.03..0.18)
  color: string;      // hex
  bg: BgStyle;
  bgColor: string;
  align: Align;
  bold: boolean;
  x: number;          // 0..1 (center)
  y: number;          // 0..1 (center)
  rotate: number;     // degrees
  anim: TextAnim;     // preview entrance animation
  isSticker?: boolean;
};

export type LinkDraft = {
  id: string;
  url: string;
  label: string;
  logoFile: File | null;
  logoUrl: string | null;   // object URL (preview) or remote
  x: number;                // 0..1
  y: number;                // 0..1
  size: number;             // 0.18..0.8 (fraction of container width)
};

const RATIOS: { id: Ratio; label: string; cls: string; w: number; h: number; Icon: any }[] = [
  { id: "4:5", label: "Retrato", cls: "aspect-[4/5]", w: 4, h: 5, Icon: RectangleVertical },
  { id: "1:1", label: "Quadrado", cls: "aspect-square", w: 1, h: 1, Icon: Square },
  { id: "16:9", label: "Paisagem", cls: "aspect-video", w: 16, h: 9, Icon: RectangleHorizontal },
];

const FILTERS: { id: string; label: string; css: string }[] = [
  { id: "none", label: "Original", css: "none" },
  { id: "vivid", label: "Vivo", css: "saturate(1.4) contrast(1.1)" },
  { id: "warm", label: "Quente", css: "sepia(0.25) saturate(1.2)" },
  { id: "cool", label: "Frio", css: "hue-rotate(-15deg) saturate(1.1)" },
  { id: "mono", label: "P&B", css: "grayscale(1) contrast(1.05)" },
  { id: "fade", label: "Fade", css: "contrast(0.9) brightness(1.08) saturate(0.85)" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.3) brightness(0.95)" },
  { id: "dream", label: "Dream", css: "saturate(1.3) brightness(1.05)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.5) contrast(0.95) saturate(1.1)" },
  { id: "crisp", label: "Nítido", css: "contrast(1.2) saturate(1.15) brightness(1.02)" },
];

const FONTS: { id: string; label: string; family: string }[] = [
  { id: "inter", label: "Clássica", family: '"Inter", system-ui, sans-serif' },
  { id: "jakarta", label: "Moderno", family: '"Plus Jakarta Sans", sans-serif' },
  { id: "playfair", label: "Elegante", family: '"Playfair Display", serif' },
  { id: "bebas", label: "Impacto", family: '"Bebas Neue", sans-serif' },
  { id: "oswald", label: "Condensada", family: '"Oswald", sans-serif' },
  { id: "anton", label: "Negrito", family: '"Anton", sans-serif' },
  { id: "righteous", label: "Retrô", family: '"Righteous", cursive' },
  { id: "pacifico", label: "Casual", family: '"Pacifico", cursive' },
  { id: "caveat", label: "Caneta", family: '"Caveat", cursive' },
  { id: "dancing", label: "Manuscrita", family: '"Dancing Script", cursive' },
  { id: "lobster", label: "Vintage", family: '"Lobster", cursive' },
  { id: "marker", label: "Marcador", family: '"Permanent Marker", cursive' },
  { id: "bangers", label: "HQ", family: '"Bangers", cursive' },
  { id: "pixel", label: "Pixel", family: '"Press Start 2P", monospace' },
];

const COLOR_PRESETS = [
  "#ffffff", "#000000", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
];

const ANIMS: { id: TextAnim; label: string }[] = [
  { id: "none", label: "Nenhuma" },
  { id: "fade", label: "Fade" },
  { id: "slide", label: "Slide" },
  { id: "pop", label: "Pop" },
  { id: "bounce", label: "Bounce" },
  { id: "type", label: "Digitação" },
  { id: "glow", label: "Glow" },
];

const STICKERS = [
  "✨","🔥","💖","🌟","🎉","💯","😎","🥹","🤩","👀",
  "🌈","☀️","🌸","🍀","⚡","💫","🎶","🦋","🍓","🌊",
  "👑","🏆","💎","🪩","🕶️","📸","🎬","🪐","🛸","🚀",
  "❤️","💛","💚","💙","💜","🖤","🤍","🧡","💗","💞",
];

type Adjust = {
  brightness: number; contrast: number; saturation: number;
  warmth: number; blur: number; rotate: 0 | 90 | 180 | 270; flip: boolean;
  vignette: number; // 0..1
};
const DEFAULT_ADJUST: Adjust = {
  brightness: 1, contrast: 1, saturation: 1, warmth: 0, blur: 0, rotate: 0, flip: false,
  vignette: 0,
};

function buildFilterCss(filterPreset: string, a: Adjust) {
  const base = FILTERS.find((f) => f.id === filterPreset)?.css ?? "none";
  const adj = `brightness(${a.brightness}) contrast(${a.contrast}) saturate(${a.saturation}) hue-rotate(${a.warmth}deg) blur(${a.blur}px)`;
  return base === "none" ? adj : `${base} ${adj}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function CreatePostPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { isPlus } = usePlus();

  const [step, setStep] = useState<Step>(1);
  const [items, setItems] = useState<Picked[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [ratio, setRatio] = useState<Ratio>("1:1");
  const [filter, setFilter] = useState<string>("none");
  const [adjust, setAdjust] = useState<Adjust>(DEFAULT_ADJUST);
  // text layers per item index
  const [layers, setLayers] = useState<Record<number, TextLayer[]>>({});
  // video edit state per item index
  const [videoEdits, setVideoEdits] = useState<Record<number, VideoEdit>>({});
  function updateVideoEdit(idx: number, patch: Partial<VideoEdit>) {
    setVideoEdits((m) => ({ ...m, [idx]: { ...(m[idx] ?? DEFAULT_VIDEO_EDIT), ...patch } }));
  }
  function splitVideoAt(idx: number, at: number) {
    setItems((prev) => {
      const cur = prev[idx];
      if (!cur || !cur.isVideo) return prev;
      const e = videoEdits[idx] ?? DEFAULT_VIDEO_EDIT;
      if (at <= e.trimStart + 0.1 || at >= e.trimEnd - 0.1) return prev;
      const dup: Picked = { ...cur, previewUrl: cur.previewUrl };
      const out = [...prev];
      out.splice(idx + 1, 0, dup);
      // Update edits map: shift indices > idx by 1
      setVideoEdits((m) => {
        const nm: Record<number, VideoEdit> = {};
        Object.entries(m).forEach(([k, v]) => {
          const i = Number(k);
          if (i <= idx) nm[i] = v;
          else nm[i + 1] = v;
        });
        nm[idx] = { ...e, trimEnd: at };
        nm[idx + 1] = { ...e, trimStart: at };
        return nm;
      });
      // Shift text layers similarly
      setLayers((m) => {
        const nm: Record<number, TextLayer[]> = {};
        Object.entries(m).forEach(([k, v]) => {
          const i = Number(k);
          if (i <= idx) nm[i] = v;
          else nm[i + 1] = v;
        });
        return nm;
      });
      return out;
    });
    toast.success("Vídeo dividido");
  }
  // product links per media index
  const [linksByIdx, setLinksByIdx] = useState<Record<number, LinkDraft[]>>({});
  function setItemLinks(idx: number, updater: (prev: LinkDraft[]) => LinkDraft[]) {
    setLinksByIdx((m) => ({ ...m, [idx]: updater(m[idx] ?? []) }));
  }
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState<Audience>("public");
  const [allowComments, setAllowComments] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  // ===== Drafts (arquivados) =====
  const [draftId, setDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const finalizedRef = useRef(false); // true when published or explicitly discarded
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      userIdRef.current = uid;
      if (uid) setDrafts(await listDrafts(uid));
    })();
  }, []);

  const filterCss = useMemo(() => buildFilterCss(filter, adjust), [filter, adjust]);
  const hasVideo = useMemo(() => items.some((i) => i.isVideo), [items]);
  const kind = useMemo<"photo" | "reel">(
    () => (hasVideo && items.length === 1 ? "reel" : "photo"),
    [hasVideo, items.length],
  );

  useEffect(() => {
    return () => {
      items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hasVideo) setRatio("4:5");
  }, [hasVideo]);

  // Build a snapshot of the current draft from state
  const buildSnapshot = useCallback((): PostDraft | null => {
    const uid = userIdRef.current;
    if (!uid || !items.length) return null;
    const id = draftId ?? makeDraftId();
    return {
      id,
      userId: uid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: items.map((i) => ({
        name: i.file.name,
        type: i.file.type,
        isVideo: i.isVideo,
        blob: i.file,
      })),
      caption,
      audience,
      allowComments,
      filter,
      ratio,
      adjust,
      step,
    };
  }, [items, caption, audience, allowComments, filter, ratio, adjust, step, draftId]);

  // Debounced auto-save while editing
  useEffect(() => {
    if (finalizedRef.current || busy) return;
    if (!items.length) return;
    const snap = buildSnapshot();
    if (!snap) return;
    if (!draftId) setDraftId(snap.id);
    const t = setTimeout(() => {
      saveDraft(snap);
    }, 800);
    return () => clearTimeout(t);
  }, [buildSnapshot, items.length, busy, draftId]);

  // Save on page hide / unload
  useEffect(() => {
    const onHide = () => {
      if (finalizedRef.current || busy) return;
      const snap = buildSnapshot();
      if (snap) {
        if (!draftId) setDraftId(snap.id);
        saveDraft(snap);
      }
    };
    window.addEventListener("beforeunload", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      window.removeEventListener("pagehide", onHide);
      // Fire on unmount too (route change without cancel/publish)
      onHide();
    };
  }, [buildSnapshot, busy, draftId]);

  async function restoreDraft(d: PostDraft) {
    // Revoke any current previews
    items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    const next: Picked[] = d.items.map((it) => {
      const file = new File([it.blob], it.name, { type: it.type });
      return { file, previewUrl: URL.createObjectURL(file), isVideo: it.isVideo };
    });
    setItems(next);
    setActiveIdx(0);
    setCaption(d.caption);
    setAudience(d.audience);
    setAllowComments(d.allowComments);
    setFilter(d.filter);
    setRatio(d.ratio);
    setAdjust(d.adjust as unknown as Adjust);
    setDraftId(d.id);
    setStep(d.step);
    toast.success("Rascunho restaurado");
  }

  async function discardDraft(id: string) {
    await deleteDraft(id);
    const uid = userIdRef.current;
    if (uid) setDrafts(await listDrafts(uid));
    if (draftId === id) {
      finalizedRef.current = true;
      items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
      setItems([]);
      setDraftId(null);
      // allow further auto-save if user picks new media
      setTimeout(() => { finalizedRef.current = false; }, 0);
    }
  }

  async function discardCurrent() {
    finalizedRef.current = true;
    if (draftId) await deleteDraft(draftId);
    const uid = userIdRef.current;
    if (uid) setDrafts(await listDrafts(uid));
    items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setItems([]);
    setLayers({});
    setVideoEdits({});
    setLinksByIdx({});
    setCaption("");
    setDraftId(null);
    setStep(1);
    setTimeout(() => { finalizedRef.current = false; }, 0);
    toast.success("Rascunho descartado");
  }


  function pick(files: FileList | null) {
    if (!files) return;
    if (!isPlus && items.length > 0) {
      toast.error("Plano free: apenas 1 mídia por publicação");
      return;
    }
    const next: Picked[] = [];
    for (const f of Array.from(files)) {
      const isVideo = f.type.startsWith("video/");
      const isImage = f.type.startsWith("image/");
      if (!isVideo && !isImage) continue;
      if (!isPlus) {
        const maxBytes = isVideo ? FREE_VIDEO_BYTES : FREE_PHOTO_BYTES;
        const maxLabel = isVideo ? "1 GB" : "500 MB";
        if (f.size > maxBytes) {
          toast.error(`${f.name}: máx ${maxLabel} no plano free`);
          continue;
        }
      }
      next.push({ file: f, previewUrl: URL.createObjectURL(f), isVideo });
    }
    if (!next.length) return;
    const maxItems = isPlus ? 10 : 1;
    setItems((s) => [...s, ...next].slice(0, maxItems));
    setActiveIdx(0);
  }

  function remove(i: number) {
    setItems((s) => {
      const removed = s[i];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return s.filter((_, idx) => idx !== i);
    });
    setLayers((m) => {
      const cp = { ...m };
      delete cp[i];
      return cp;
    });
    setActiveIdx(0);
  }

  function openPicker(accept: string, multiple: boolean) {
    if (!fileRef.current) return;
    fileRef.current.accept = accept;
    fileRef.current.multiple = multiple;
    fileRef.current.click();
  }

  function goNext() {
    if (step === 1) {
      if (!items.length) return toast.error("Selecione ao menos uma mídia");
      setStep(2);
    } else if (step === 2) setStep(3);
  }
  function goBack() {
    if (step === 1) return navigate({ to: "/feed" });
    setStep((s) => ((s - 1) as Step));
  }

  function setItemLayers(idx: number, updater: (prev: TextLayer[]) => TextLayer[]) {
    setLayers((m) => ({ ...m, [idx]: updater(m[idx] ?? []) }));
  }

  async function processImage(file: File, itemLayers: TextLayer[]): Promise<Blob> {
    const img = await loadImage(URL.createObjectURL(file));
    const r = RATIOS.find((x) => x.id === ratio)!;
    const targetW = 1440;
    const targetH = Math.round((targetW * r.h) / r.w);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.filter = filterCss === "none" ? "none" : filterCss;

    const rotated = adjust.rotate % 180 !== 0;
    const sw = rotated ? img.height : img.width;
    const sh = rotated ? img.width : img.height;
    const scale = Math.max(targetW / sw, targetH / sh);
    const drawW = sw * scale;
    const drawH = sh * scale;
    const dx = (targetW - drawW) / 2;
    const dy = (targetH - drawH) / 2;

    ctx.save();
    ctx.translate(targetW / 2, targetH / 2);
    ctx.rotate((adjust.rotate * Math.PI) / 180);
    if (adjust.flip) ctx.scale(-1, 1);
    ctx.translate(-targetW / 2, -targetH / 2);
    if (rotated) {
      const s2 = Math.max(targetH / img.height, targetW / img.width);
      const dw = img.width * s2;
      const dh = img.height * s2;
      ctx.drawImage(img, (targetW - dw) / 2, (targetH - dh) / 2, dw, dh);
    } else {
      ctx.drawImage(img, dx, dy, drawW, drawH);
    }
    ctx.restore();

    // Reset filter for text layers (we want text crisp, no filter)
    ctx.filter = "none";

    // Vignette bake
    if (adjust.vignette > 0.01) {
      const grad = ctx.createRadialGradient(
        targetW / 2, targetH / 2, Math.min(targetW, targetH) * 0.25,
        targetW / 2, targetH / 2, Math.max(targetW, targetH) * 0.75,
      );
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, adjust.vignette)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, targetW, targetH);
    }


    // Draw text layers
    for (const l of itemLayers) {
      drawTextLayer(ctx, l, targetW, targetH);
    }

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))), "image/jpeg", 0.92);
    });
  }

  function drawTextLayer(ctx: CanvasRenderingContext2D, l: TextLayer, W: number, H: number) {
    if (!l.text.trim()) return;
    const fontPx = Math.max(14, Math.round(l.size * H));
    const weight = l.bold ? "800" : "600";
    ctx.font = `${weight} ${fontPx}px ${l.font}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = l.align;

    const lines = l.text.split("\n");
    const lineH = fontPx * 1.2;
    const padX = fontPx * 0.4;
    const padY = fontPx * 0.25;

    // measure widest line
    let maxW = 0;
    for (const ln of lines) {
      const w = ctx.measureText(ln).width;
      if (w > maxW) maxW = w;
    }
    const totalH = lineH * lines.length;
    const cx = l.x * W;
    const cy = l.y * H;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((l.rotate * Math.PI) / 180);

    // Background box
    if (l.bg !== "none") {
      const bx = -maxW / 2 - padX;
      const by = -totalH / 2 - padY;
      const bw = maxW + padX * 2;
      const bh = totalH + padY * 2;
      ctx.fillStyle = l.bg === "translucent" ? `${l.bgColor}cc` : l.bgColor;
      roundRect(ctx, bx, by, bw, bh, fontPx * 0.25);
      ctx.fill();
    } else {
      // text shadow for readability
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = fontPx * 0.25;
      ctx.shadowOffsetY = fontPx * 0.05;
    }

    ctx.fillStyle = l.color;
    const startY = -totalH / 2 + lineH / 2;
    const xAnchor = l.align === "left" ? -maxW / 2 : l.align === "right" ? maxW / 2 : 0;
    lines.forEach((ln, i) => {
      ctx.fillText(ln, xAnchor, startY + i * lineH);
    });
    ctx.restore();
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function publish() {
    if (!items.length) return;
    setBusy(true);
    setProgress(5);
    try {
      const uidU = await getCurrentUserId();
      if (!uidU) throw new Error("Não autenticado");

      const { data: postRow, error: postErr } = await supabase
        .from("posts")
        .insert({ author_id: uidU, kind, caption: caption.trim(), visibility: audience } as any)
        .select("id")
        .single();
      if (postErr) throw postErr;
      const postId = postRow.id;
      setProgress(15);

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        let blob: Blob = it.file;
        let mime = it.file.type;
        let ext = it.file.name.split(".").pop() || (it.isVideo ? "mp4" : "jpg");

        if (it.isVideo) {
          const ve = videoEdits[i];
          const needsBake =
            !!ve &&
            ((ve.trimStart || 0) > 0.05 ||
              (ve.trimEnd > 0 && ve.duration > 0 && ve.trimEnd < ve.duration - 0.05) ||
              ve.muted ||
              ve.volume !== 1 ||
              !!ve.music);
          if (needsBake) {
            try {
              blob = await bakeVideo(it.file, ve);
              mime = blob.type || "video/mp4";
              ext = mime.includes("webm") ? "webm" : "mp4";
            } catch (err) {
              console.error("bakeVideo failed", err);
              toast.warning("Não foi possível aplicar a edição do vídeo neste dispositivo. Enviando original.");
            }
          }
        } else {
          try {
            blob = await processImage(it.file, layers[i] ?? []);
            mime = "image/jpeg";
            ext = "jpg";
          } catch {
            blob = it.file;
          }
        }

        const path = `${uidU}/${postId}/${i}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("posts-media")
          .upload(path, blob, { upsert: false, contentType: mime });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("posts-media").getPublicUrl(path);
        const { error: mediaErr } = await supabase.from("post_media").insert({
          post_id: postId,
          url: pub.publicUrl,
          mime,
          position: i,
        });
        if (mediaErr) throw mediaErr;
        setProgress(15 + Math.round(((i + 1) / items.length) * 75));
      }

      const tags = extractHashtags(caption);
      for (const t of tags) {
        await supabase.from("hashtags").upsert({ tag: t, uses_count: 1 }, { onConflict: "tag" });
        await supabase.from("post_hashtags").insert({ post_id: postId, tag: t });
      }

      // Save product links per media index
      for (const [idxStr, drafts] of Object.entries(linksByIdx)) {
        const mediaIdx = Number(idxStr);
        for (const d of drafts) {
          if (!d.url.trim()) continue;
          let logoUrl: string | null = null;
          if (d.logoFile) {
            try {
              const ext = (d.logoFile.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
              const lp = `${uidU}/${postId}/link-${mediaIdx}-${d.id}.${ext}`;
              const contentType = d.logoFile.type || "image/png";
              // Re-wrap as Blob via arrayBuffer to avoid stale File handles on mobile
              const buf = await d.logoFile.arrayBuffer();
              const blob = new Blob([buf], { type: contentType });
              const { error: lerr } = await supabase.storage
                .from("posts-media")
                .upload(lp, blob, { upsert: true, contentType });
              if (lerr) {
                console.error("logo upload error", lerr);
                toast.error(`Logo do produto: ${lerr.message}`);
              } else {
                logoUrl = supabase.storage.from("posts-media").getPublicUrl(lp).data.publicUrl;
              }
            } catch (err: any) {
              console.error("logo upload exception", err);
              toast.error(`Falha ao enviar logo: ${err?.message ?? "rede indisponível"}`);
            }
          }
          await supabase.from("post_links" as any).insert({
            post_id: postId,
            media_position: mediaIdx,
            url: d.url.trim(),
            label: d.label.trim() || null,
            logo_url: logoUrl,
            x: d.x, y: d.y, size: d.size,
          });
        }
      }

      setProgress(100);
      finalizedRef.current = true;
      if (draftId) await deleteDraft(draftId);
      toast.success("Post publicado!");
      navigate({ to: kind === "reel" ? "/twos" : "/feed" });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao publicar");
      setProgress(0);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background via-background to-muted/30">
      <header className="app-header flex items-center gap-3 px-4 pt-5 pb-3 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <button
          onClick={goBack}
          aria-label="Voltar"
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted active:scale-95 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold leading-tight tracking-tight">
            {step === 1 ? "Nova publicação" : step === 2 ? "Editor" : "Finalizar"}
          </h1>
          <Stepper step={step} />
        </div>
        {step < 3 ? (
          <button
            onClick={goNext}
            disabled={!items.length}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2 text-sm font-semibold shadow-soft disabled:opacity-40 active:scale-95 transition"
          >
            Avançar <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={publish}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2 text-sm font-semibold shadow-soft disabled:opacity-40 active:scale-95 transition"
          >
            {busy ? "Publicando…" : "Publicar"} <Check className="h-4 w-4" />
          </button>
        )}
      </header>

      <main className="app-content flex-1 overflow-y-auto">
        {busy && (
          <div className="px-4 pt-3">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 text-center">Enviando… {progress}%</p>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          >
            {step === 1 && (
              <StepSelect
                isPlus={isPlus}
                items={items}
                onPick={() => openPicker("image/*,video/*", isPlus ? true : false)}
                onPickPhotos={() => openPicker("image/*", isPlus ? true : false)}
                onPickVideo={() => openPicker("video/*", false)}
                onRemove={remove}
                drafts={drafts}
                onRestoreDraft={restoreDraft}
                onDeleteDraft={discardDraft}
                onDiscardCurrent={discardCurrent}
              />
            )}

            {step === 2 && items[activeIdx] && (
              <StepEdit
                items={items}
                activeIdx={activeIdx}
                setActiveIdx={setActiveIdx}
                filter={filter}
                setFilter={setFilter}
                filterCss={filterCss}
                ratio={ratio}
                setRatio={setRatio}
                adjust={adjust}
                setAdjust={setAdjust}
                layers={layers[activeIdx] ?? []}
                setLayers={(updater) => setItemLayers(activeIdx, updater)}
                videoEdit={videoEdits[activeIdx] ?? DEFAULT_VIDEO_EDIT}
                updateVideoEdit={(patch) => updateVideoEdit(activeIdx, patch)}
                onSplit={(at) => splitVideoAt(activeIdx, at)}
                productLinks={linksByIdx[activeIdx] ?? []}
                setProductLinks={(updater) => setItemLinks(activeIdx, updater)}
              />
            )}

            {step === 3 && (
              <StepDetails
                items={items}
                filterCss={filterCss}
                ratio={ratio}
                caption={caption}
                setCaption={setCaption}
                audience={audience}
                setAudience={setAudience}
                allowComments={allowComments}
                setAllowComments={setAllowComments}
                kind={kind}
                layers={layers}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-1.5 mt-1">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`h-1 rounded-full transition-all ${s <= step ? "bg-primary w-6" : "bg-muted w-3"}`}
        />
      ))}
      <span className="text-[11px] text-muted-foreground ml-1">Passo {step} de 3</span>
    </div>
  );
}

function StepSelect({
  isPlus, items, onPick, onPickPhotos, onPickVideo, onRemove,
  drafts, onRestoreDraft, onDeleteDraft, onDiscardCurrent,
}: {
  isPlus: boolean;
  items: Picked[];
  onPick: () => void;
  onPickPhotos: () => void;
  onPickVideo: () => void;
  onRemove: (i: number) => void;
  drafts: PostDraft[];
  onRestoreDraft: (d: PostDraft) => void | Promise<void>;
  onDeleteDraft: (id: string) => void | Promise<void>;
  onDiscardCurrent: () => void | Promise<void>;
}) {
  return (
    <div className="p-4 max-w-xl mx-auto w-full space-y-5">
      {items.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-8 text-center shadow-card">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground grid place-items-center mb-4 shadow-soft">
              <Sparkles className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-extrabold mb-1 tracking-tight">Conte sua história</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Escolha fotos ou um vídeo. Vídeos viram Reels automaticamente.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onPickPhotos}
                className="inline-flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-5 text-sm font-semibold shadow-soft active:scale-95 transition"
              >
                <ImagePlus className="h-6 w-6" />
                Fotos
              </button>
              <button
                onClick={onPickVideo}
                className="inline-flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-secondary text-secondary-foreground py-5 text-sm font-semibold border border-border active:scale-95 transition"
              >
                <Video className="h-6 w-6" />
                Vídeo
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-4">
              {isPlus
                ? "Até 10 mídias · sem limite de tamanho"
                : "1 mídia apenas · foto até 500 MB · vídeo até 1 GB"}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {items.map((it, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted shadow-card">
                {it.isVideo ? (
                  <video src={it.previewUrl} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={it.previewUrl} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => onRemove(i)}
                  className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 text-white grid place-items-center active:scale-95"
                  aria-label="Remover"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {it.isVideo && (
                  <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/70 text-white text-[10px] px-1.5 py-0.5">
                    <Video className="h-3 w-3" /> Vídeo
                  </span>
                )}
              </div>
            ))}
            {(isPlus || items.length < 1) && (
              <button
                onClick={onPick}
                className="aspect-square rounded-xl border-2 border-dashed border-border grid place-items-center text-muted-foreground hover:text-primary hover:border-primary transition"
              >
                <ImagePlus className="h-6 w-6" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs text-muted-foreground">
              {isPlus
                ? `${items.length}/10 selecionado${items.length > 1 ? "s" : ""} · Toque em Avançar`
                : "1/1 selecionado · Toque em Avançar"}
            </p>
            <button
              onClick={onDiscardCurrent}
              className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 text-destructive px-3 py-1.5 text-xs font-semibold hover:bg-destructive/10 active:scale-95 transition"
            >
              <Trash className="h-3.5 w-3.5" /> Descartar
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Se você sair sem descartar, seu rascunho fica salvo em Arquivados.
          </p>
        </>
      )}

      {drafts.length > 0 && (
        <DraftsSection
          drafts={drafts}
          currentId={null}
          onRestore={onRestoreDraft}
          onDelete={onDeleteDraft}
        />
      )}
    </div>
  );
}

function DraftsSection({
  drafts, currentId, onRestore, onDelete,
}: {
  drafts: PostDraft[];
  currentId: string | null;
  onRestore: (d: PostDraft) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 shadow-card">
      <header className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-xl bg-muted grid place-items-center">
          <Archive className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold leading-tight">Arquivados</h3>
          <p className="text-[11px] text-muted-foreground">
            Publicações que você começou e não terminou
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{drafts.length}</span>
      </header>
      <ul className="grid grid-cols-3 gap-2">
        {drafts.map((d) => (
          <DraftCard
            key={d.id}
            draft={d}
            isCurrent={d.id === currentId}
            onRestore={() => onRestore(d)}
            onDelete={() => onDelete(d.id)}
          />
        ))}
      </ul>
    </section>
  );
}

function DraftCard({
  draft, isCurrent, onRestore, onDelete,
}: {
  draft: PostDraft;
  isCurrent: boolean;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    const first = draft.items[0];
    if (!first) return;
    const url = URL.createObjectURL(first.blob);
    setThumb(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.id]);

  const when = useMemo(() => {
    const d = new Date(draft.updatedAt);
    const diff = (Date.now() - draft.updatedAt) / 1000;
    if (diff < 60) return "agora";
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
    return d.toLocaleDateString();
  }, [draft.updatedAt]);

  const first = draft.items[0];
  return (
    <li className="relative">
      <button
        onClick={onRestore}
        className={`block w-full aspect-square rounded-xl overflow-hidden bg-muted shadow-card active:scale-95 transition ${isCurrent ? "ring-2 ring-primary" : ""}`}
        aria-label="Retomar rascunho"
      >
        {thumb && first?.isVideo ? (
          <video src={thumb} className="w-full h-full object-cover" muted />
        ) : thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground">
            <ImagePlus className="h-5 w-5" />
          </div>
        )}
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] px-1.5 py-1 text-left">
          {when} · {draft.items.length} mídia{draft.items.length > 1 ? "s" : ""}
        </span>
        {first?.isVideo && (
          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/70 text-white text-[9px] px-1.5 py-0.5">
            <Video className="h-2.5 w-2.5" /> Vídeo
          </span>
        )}
      </button>
      <button
        onClick={onDelete}
        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 text-white grid place-items-center active:scale-95"
        aria-label="Excluir rascunho"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

// ============ STEP EDIT ============

type EditTab = "crop" | "filter" | "video" | "text" | "stickers" | "adjust" | "links";

type LinkPreviewOverlayProps = {
  links: LinkDraft[];
  selectedId: string | null;
  setSelected: (id: string | null) => void;
  onChange: (id: string, patch: Partial<LinkDraft>) => void;
};

type LinksPanelProps = {
  links: LinkDraft[];
  setLinks: (updater: (prev: LinkDraft[]) => LinkDraft[]) => void;
  selectedId: string | null;
  setSelected: (id: string | null) => void;
};

let LinkPreviewOverlay: (props: LinkPreviewOverlayProps) => ReactElement;
let LinksPanel: (props: LinksPanelProps) => ReactElement;

function StepEdit({
  items, activeIdx, setActiveIdx, filter, setFilter, filterCss,
  ratio, setRatio, adjust, setAdjust, layers, setLayers,
  videoEdit, updateVideoEdit, onSplit,
  productLinks, setProductLinks,
}: {
  items: Picked[];
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  filter: string;
  setFilter: (id: string) => void;
  filterCss: string;
  ratio: Ratio;
  setRatio: (r: Ratio) => void;
  adjust: Adjust;
  setAdjust: (a: Adjust) => void;
  layers: TextLayer[];
  setLayers: (updater: (prev: TextLayer[]) => TextLayer[]) => void;
  videoEdit: VideoEdit;
  updateVideoEdit: (patch: Partial<VideoEdit>) => void;
  onSplit: (at: number) => void;
  productLinks: LinkDraft[];
  setProductLinks: (updater: (prev: LinkDraft[]) => LinkDraft[]) => void;
}) {
  const active = items[activeIdx];
  const [tab, setTab] = useState<EditTab>("crop");
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  if (!active) return null;
  const r = RATIOS.find((x) => x.id === ratio)!;
  const transform = `${adjust.flip ? "scaleX(-1) " : ""}rotate(${adjust.rotate}deg)`;

  const TABS: { id: EditTab; label: string; Icon: any }[] = active.isVideo
    ? [
        { id: "video", label: "Vídeo", Icon: Scissors },
        { id: "crop", label: "Formato", Icon: Crop },
        { id: "filter", label: "Filtros", Icon: Wand2 },
        { id: "links", label: "Links", Icon: Link2 },
        { id: "adjust", label: "Ajustes", Icon: Sun },
      ]
    : [
        { id: "crop", label: "Formato", Icon: Crop },
        { id: "filter", label: "Filtros", Icon: Wand2 },
        { id: "text", label: "Texto", Icon: Type },
        { id: "stickers", label: "Stickers", Icon: Smile },
        { id: "links", label: "Links", Icon: Link2 },
        { id: "adjust", label: "Ajustes", Icon: Sun },
      ];

  // Switch to a valid tab when item type changes
  useEffect(() => {
    const valid = TABS.some((t) => t.id === tab);
    if (!valid) setTab(TABS[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.isVideo]);

  function addLayer(opts?: { sticker?: string }) {
    const isSticker = !!opts?.sticker;
    const nl: TextLayer = {
      id: uid(),
      text: opts?.sticker ?? "Toque para editar",
      font: FONTS[0].family,
      size: isSticker ? 0.22 : 0.08,
      color: "#ffffff",
      bg: "none",
      bgColor: "#000000",
      align: "center",
      bold: true,
      x: 0.5,
      y: 0.5,
      rotate: 0,
      anim: isSticker ? "bounce" : "pop",
      isSticker,
    };
    setLayers((p) => [...p, nl]);
    setSelectedLayer(nl.id);
    if (!isSticker) setTab("text");
  }

  function updateLayer(id: string, patch: Partial<TextLayer>) {
    setLayers((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function deleteLayer(id: string) {
    setLayers((p) => p.filter((l) => l.id !== id));
    setSelectedLayer(null);
  }

  const selected = layers.find((l) => l.id === selectedLayer) ?? null;
  const vignetteAlpha = Math.min(0.85, Math.max(0, adjust.vignette));

  return (
    <div className="flex flex-col" data-no-swipe>
      <div className="bg-black w-full grid place-items-center px-4 py-3">
        <div className={`relative w-full max-w-md ${r.cls} bg-black overflow-hidden rounded-2xl shadow-2xl`}>
          {active.isVideo ? (
            <EditorVideo
              src={active.previewUrl}
              filterCss={filterCss}
              transform={transform}
              edit={videoEdit}
              onMetadata={(d) => {
                if (videoEdit.duration === 0) {
                  updateVideoEdit({ duration: d, trimStart: 0, trimEnd: d });
                }
              }}
            />
          ) : (
            <img
              src={active.previewUrl}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover select-none"
              style={{ filter: filterCss, transform }}
            />
          )}

          {/* Vignette overlay */}
          {vignetteAlpha > 0.01 && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${vignetteAlpha}) 100%)`,
              }}
            />
          )}

          {/* Text layers overlay */}
          <PreviewLayers
            layers={layers}
            selectedId={selectedLayer}
            setSelected={setSelectedLayer}
            updateLayer={updateLayer}
            disabled={active.isVideo /* baking text only for images */}
          />

          {/* Product link overlays (interactive while editing) */}
          <LinkPreviewOverlay
            links={productLinks}
            selectedId={selectedLinkId}
            setSelected={setSelectedLinkId}
            onChange={(id: string, patch: Partial<LinkDraft>) =>
              setProductLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
            }
          />

          {/* (vídeos não suportam camadas de texto no preview) */}
        </div>
      </div>

      {/* media thumbnails */}
      {items.length > 1 && (
        <div className="px-4 pt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {items.map((it, i) => (
            <motion.button
              key={i}
              onClick={() => setActiveIdx(i)}
              whileTap={{ scale: 0.9 }}
              className={`h-14 w-14 rounded-lg overflow-hidden shrink-0 ring-2 transition ${
                i === activeIdx ? "ring-primary" : "ring-transparent"
              }`}
            >
              {it.isVideo ? (
                <video src={it.previewUrl} className="h-full w-full object-cover" muted />
              ) : (
                <img src={it.previewUrl} alt="" className="h-full w-full object-cover" />
              )}
            </motion.button>
          ))}
        </div>
      )}

      {/* Tabs with animated indicator */}
      <div className="px-4 pt-3">
        <LayoutGroup id="editor-tabs">
          <div className={`grid rounded-2xl bg-muted/70 p-1 text-[11px] font-semibold relative ${TABS.length === 4 ? "grid-cols-4" : TABS.length === 5 ? "grid-cols-5" : "grid-cols-6"}`}>
            {TABS.map(({ id, label, Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="relative flex flex-col items-center gap-0.5 py-2 rounded-xl transition"
                >
                  {active && (
                    <motion.div
                      layoutId="active-tab-pill"
                      className="absolute inset-0 bg-background shadow rounded-xl"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className={`relative z-10 flex flex-col items-center gap-0.5 ${active ? "text-foreground" : "text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      <div className="p-4 pb-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {tab === "crop" && (
              <CropPanel ratio={ratio} setRatio={setRatio} adjust={adjust} setAdjust={setAdjust} />
            )}

            {tab === "filter" && (
              <FilterPanel active={active} filter={filter} setFilter={setFilter} />
            )}

            {tab === "video" && active.isVideo && (
              <VideoPanel
                edit={videoEdit}
                update={updateVideoEdit}
                onSplit={onSplit}
              />
            )}

            {tab === "text" && (
              <TextPanel
                layers={layers}
                selected={selected}
                setSelected={setSelectedLayer}
                addLayer={() => addLayer()}
                updateLayer={updateLayer}
                deleteLayer={deleteLayer}
                isVideo={active.isVideo}
              />
            )}

            {tab === "stickers" && (
              <StickersPanel onPick={(s) => addLayer({ sticker: s })} />
            )}

            {tab === "links" && (
              <LinksPanel
                links={productLinks}
                setLinks={setProductLinks}
                selectedId={selectedLinkId}
                setSelected={setSelectedLinkId}
              />
            )}

            {tab === "adjust" && (
              <AdjustPanel adjust={adjust} setAdjust={setAdjust} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Custom in-editor video with trim playback + volume + music sync
function EditorVideo({
  src,
  filterCss,
  transform,
  edit,
  onMetadata,
}: {
  src: string;
  filterCss: string;
  transform: string;
  edit: VideoEdit;
  onMetadata: (duration: number) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(true);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [now, setNow] = useState(0);

  // Apply volume / mute to original video
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = previewMuted || edit.muted;
    v.volume = Math.min(1, Math.max(0, edit.volume));
  }, [previewMuted, edit.muted, edit.volume]);

  // Apply music volume
  useEffect(() => {
    const a = musicRef.current;
    if (!a) return;
    a.volume = Math.min(1, Math.max(0, edit.music?.volume ?? 1));
    a.muted = previewMuted;
  }, [edit.music?.volume, previewMuted]);

  // Loop within trim range + sync music
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    function onLoaded() {
      onMetadata(v!.duration || 0);
      try { v!.currentTime = edit.trimStart || 0; } catch {}
    }
    function onTime() {
      if (!v) return;
      setNow(v.currentTime);
      const end = edit.trimEnd > 0 ? edit.trimEnd : v.duration;
      if (v.currentTime >= end - 0.05) {
        try { v.currentTime = edit.trimStart || 0; } catch {}
        const a = musicRef.current;
        if (a) { try { a.currentTime = edit.music?.offset || 0; } catch {} }
      }
      if (v.currentTime < (edit.trimStart || 0) - 0.05) {
        try { v.currentTime = edit.trimStart || 0; } catch {}
      }
    }
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [edit.trimStart, edit.trimEnd, edit.music?.offset, onMetadata]);

  // Keep music in sync with video play/pause
  useEffect(() => {
    const v = ref.current;
    const a = musicRef.current;
    if (!v || !a) return;
    function syncPlay() {
      if (v!.paused) a!.pause();
      else { try { a!.play().catch(() => {}); } catch {} }
    }
    v.addEventListener("play", syncPlay);
    v.addEventListener("pause", syncPlay);
    return () => {
      v.removeEventListener("play", syncPlay);
      v.removeEventListener("pause", syncPlay);
    };
  }, [edit.music?.url]);

  function toggle() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }

  const dur = edit.duration || 0;
  const tStart = edit.trimStart || 0;
  const tEnd = edit.trimEnd > 0 ? edit.trimEnd : dur;
  const progress = dur > 0 ? ((now - tStart) / Math.max(0.01, tEnd - tStart)) : 0;

  return (
    <div className="absolute inset-0">
      <video
        ref={ref}
        src={src}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: filterCss, transform }}
        autoPlay
        playsInline
        loop={false}
        disablePictureInPicture
        // @ts-ignore
        controlsList="nodownload noplaybackrate nofullscreen noremoteplayback"
        onClick={(e) => { e.stopPropagation(); toggle(); }}
      />
      {edit.music?.url && (
        <audio ref={musicRef} src={edit.music.url} loop autoPlay />
      )}
      {!playing && (
        <div className="absolute inset-0 grid place-items-center bg-black/30 pointer-events-none">
          <div className="h-14 w-14 rounded-full bg-black/60 grid place-items-center">
            <Play className="h-7 w-7 text-white" fill="white" />
          </div>
        </div>
      )}
      {/* Progress / trim indicator */}
      {dur > 0 && (
        <div className="absolute left-2 right-2 bottom-10 h-1 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full bg-white"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); setPreviewMuted((m) => !m); }}
        className="absolute bottom-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-black/60 text-white backdrop-blur"
        aria-label={previewMuted ? "Ativar som" : "Silenciar"}
      >
        {previewMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <div className="absolute bottom-2 left-2 text-[10px] font-medium text-white/90 bg-black/50 backdrop-blur rounded-md px-2 py-1">
        {fmtTime(Math.max(0, now - tStart))} / {fmtTime(Math.max(0, tEnd - tStart))}
      </div>
    </div>
  );
}

function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

// ====== Video panel: trim / volume / music / split ======
function VideoPanel({
  edit,
  update,
  onSplit,
}: {
  edit: VideoEdit;
  update: (patch: Partial<VideoEdit>) => void;
  onSplit: (at: number) => void;
}) {
  const dur = edit.duration || 0;
  const tStart = edit.trimStart || 0;
  const tEnd = edit.trimEnd > 0 ? edit.trimEnd : dur;
  const musicInputRef = useRef<HTMLInputElement>(null);

  function pickMusic(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("audio/")) { toast.error("Selecione um arquivo de áudio"); return; }
    const url = URL.createObjectURL(f);
    update({ music: { name: f.name, url, file: f, volume: 0.8, offset: 0 } });
    e.target.value = "";
  }
  function removeMusic() {
    if (edit.music?.url) URL.revokeObjectURL(edit.music.url);
    update({ music: null });
  }

  return (
    <div className="space-y-5">
      {/* Trim */}
      <div className="rounded-2xl border border-border bg-card/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Scissors className="h-4 w-4" /> Cortar
          </div>
          <div className="text-[11px] text-muted-foreground">
            {fmtTime(tEnd - tStart)} de {fmtTime(dur)}
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Início</span><span>{fmtTime(tStart)}</span>
            </div>
            <input
              type="range" min={0} max={Math.max(0.1, dur)} step={0.05}
              value={tStart}
              onChange={(e) => {
                const v = Math.min(Number(e.target.value), tEnd - 0.5);
                update({ trimStart: Math.max(0, v) });
              }}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Fim</span><span>{fmtTime(tEnd)}</span>
            </div>
            <input
              type="range" min={0} max={Math.max(0.1, dur)} step={0.05}
              value={tEnd}
              onChange={(e) => {
                const v = Math.max(Number(e.target.value), tStart + 0.5);
                update({ trimEnd: Math.min(dur, v) });
              }}
              className="w-full accent-primary"
            />
          </div>
        </div>
        <button
          onClick={() => onSplit((tStart + tEnd) / 2)}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 active:scale-[0.98] transition"
        >
          <SplitSquareHorizontal className="h-4 w-4" /> Dividir no meio do corte
        </button>
      </div>

      {/* Original audio volume */}
      <div className="rounded-2xl border border-border bg-card/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Volume2 className="h-4 w-4" /> Áudio original
          </div>
          <button
            onClick={() => update({ muted: !edit.muted })}
            className={`text-[11px] font-semibold h-7 px-3 rounded-full transition ${
              edit.muted ? "bg-destructive text-destructive-foreground" : "bg-muted text-foreground"
            }`}
          >
            {edit.muted ? "Silenciado" : "Ativo"}
          </button>
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>Volume</span><span>{Math.round(edit.volume * 100)}%</span>
        </div>
        <input
          type="range" min={0} max={1} step={0.01}
          value={edit.volume}
          onChange={(e) => update({ volume: Number(e.target.value) })}
          disabled={edit.muted}
          className="w-full accent-primary disabled:opacity-50"
        />
      </div>

      {/* Music */}
      <div className="rounded-2xl border border-border bg-card/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Music className="h-4 w-4" /> Música
          </div>
          {edit.music ? (
            <button onClick={removeMusic} className="text-[11px] font-semibold text-destructive">
              Remover
            </button>
          ) : (
            <button
              onClick={() => musicInputRef.current?.click()}
              className="text-[11px] font-semibold text-primary"
            >
              Importar
            </button>
          )}
          <input ref={musicInputRef} type="file" accept="audio/*" className="hidden" onChange={pickMusic} />
        </div>
        {edit.music ? (
          <>
            <div className="text-xs text-muted-foreground truncate mb-3">{edit.music.name}</div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Volume da música</span><span>{Math.round((edit.music.volume) * 100)}%</span>
            </div>
            <input
              type="range" min={0} max={1} step={0.01}
              value={edit.music.volume}
              onChange={(e) => update({ music: { ...edit.music!, volume: Number(e.target.value) } })}
              className="w-full accent-primary"
            />
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Importe uma música do seu dispositivo. Ela tocará junto com o vídeo durante o corte selecionado.
          </p>
        )}
      </div>
    </div>
  );
}


// Draggable text overlay on the preview
function PreviewLayers({
  layers, selectedId, setSelected, updateLayer, disabled,
}: {
  layers: TextLayer[];
  selectedId: string | null;
  setSelected: (id: string | null) => void;
  updateLayer: (id: string, patch: Partial<TextLayer>) => void;
  disabled: boolean;
}) {
  return (
    <div
      className="absolute inset-0"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setSelected(null);
      }}
    >
      {layers.map((l) => (
        <DraggableText
          key={l.id}
          layer={l}
          selected={selectedId === l.id}
          onSelect={() => setSelected(l.id)}
          onChange={(patch) => updateLayer(l.id, patch)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function DraggableText({
  layer, selected, onSelect, onChange, disabled,
}: {
  layer: TextLayer;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<TextLayer>) => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    dragRef.current = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [onSelect]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const d = dragRef.current;
    const dx = (e.clientX - d.x) / d.w;
    const dy = (e.clientY - d.y) / d.h;
    onChange({
      x: Math.max(0, Math.min(1, layer.x + dx)),
      y: Math.max(0, Math.min(1, layer.y + dy)),
    });
    dragRef.current = { ...d, x: e.clientX, y: e.clientY };
  }, [layer.x, layer.y, onChange]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const fontSizeVh = `${layer.size * 100}cqh`;

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`absolute touch-none select-none cursor-grab active:cursor-grabbing ${disabled ? "opacity-60" : ""}`}
      style={{
        left: `${layer.x * 100}%`,
        top: `${layer.y * 100}%`,
        transform: `translate(-50%, -50%) rotate(${layer.rotate}deg)`,
        containerType: "size",
        // ensure tap target generous
        padding: "8px",
        outline: selected ? "1.5px dashed rgba(255,255,255,0.9)" : "none",
        outlineOffset: "2px",
        borderRadius: "6px",
        maxWidth: "90%",
      }}
    >
      <AnimatedLayerText layer={layer} fontSizeVh={fontSizeVh} />
    </div>
  );
}

function AnimatedLayerText({ layer, fontSizeVh }: { layer: TextLayer; fontSizeVh: string }) {
  // Replay animation when text/anim/font changes
  const replayKey = `${layer.anim}:${layer.text}:${layer.font}:${layer.color}`;
  const baseStyle: React.CSSProperties = {
    fontFamily: layer.font,
    fontWeight: layer.bold ? 800 : 600,
    color: layer.color,
    fontSize: fontSizeVh,
    textAlign: layer.align,
    lineHeight: 1.15,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    padding: layer.bg !== "none" ? "0.25em 0.45em" : 0,
    borderRadius: "0.25em",
    background:
      layer.bg === "solid" ? layer.bgColor :
      layer.bg === "translucent" ? `${layer.bgColor}cc` : "transparent",
    textShadow: layer.bg === "none" ? "0 2px 8px rgba(0,0,0,0.55)" : "none",
  };

  const anim = layer.anim ?? "none";

  if (anim === "type") {
    const text = layer.text || " ";
    return (
      <motion.div key={replayKey} style={baseStyle}>
        {text.split("").map((ch, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.035, duration: 0.05 }}
          >
            {ch}
          </motion.span>
        ))}
      </motion.div>
    );
  }

  if (anim === "glow") {
    return (
      <motion.div
        key={replayKey}
        style={baseStyle}
        animate={{
          textShadow: [
            `0 0 0px ${layer.color}00`,
            `0 0 18px ${layer.color}cc`,
            `0 0 0px ${layer.color}00`,
          ],
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        {layer.text || " "}
      </motion.div>
    );
  }

  const variants: Record<string, { initial: any; animate: any; transition?: any }> = {
    none: { initial: { opacity: 1 }, animate: { opacity: 1 } },
    fade: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.45 } },
    slide: {
      initial: { opacity: 0, y: 24 },
      animate: { opacity: 1, y: 0 },
      transition: { type: "spring", stiffness: 300, damping: 22 },
    },
    pop: {
      initial: { opacity: 0, scale: 0.6 },
      animate: { opacity: 1, scale: 1 },
      transition: { type: "spring", stiffness: 360, damping: 16 },
    },
    bounce: {
      initial: { opacity: 0, scale: 0.4, y: -30 },
      animate: { opacity: 1, scale: 1, y: 0 },
      transition: { type: "spring", stiffness: 500, damping: 12 },
    },
  };
  const v = variants[anim] ?? variants.none;

  return (
    <motion.div key={replayKey} style={baseStyle} initial={v.initial} animate={v.animate} transition={v.transition}>
      {layer.text || " "}
    </motion.div>
  );
}

function CropPanel({
  ratio, setRatio, adjust, setAdjust,
}: { ratio: Ratio; setRatio: (r: Ratio) => void; adjust: Adjust; setAdjust: (a: Adjust) => void; }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Proporção</h3>
        <div className="grid grid-cols-3 gap-2">
          {RATIOS.map((opt) => {
            const Icon = opt.Icon;
            const sel = ratio === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setRatio(opt.id)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition ${
                  sel ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{opt.label}</span>
                <span className="text-[10px] opacity-70">{opt.id}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Transformar</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setAdjust({ ...adjust, rotate: (((adjust.rotate + 90) % 360) as Adjust["rotate"]) })}
            className="flex flex-col items-center gap-1 rounded-2xl border border-border p-3 text-xs"
          >
            <RotateCw className="h-5 w-5" />Girar
          </button>
          <button
            onClick={() => setAdjust({ ...adjust, flip: !adjust.flip })}
            className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-xs ${
              adjust.flip ? "border-primary text-primary" : "border-border"
            }`}
          >
            <FlipHorizontal2 className="h-5 w-5" />Espelhar
          </button>
          <button
            onClick={() => setAdjust({ ...DEFAULT_ADJUST })}
            className="flex flex-col items-center gap-1 rounded-2xl border border-border p-3 text-xs"
          >
            <RefreshCw className="h-5 w-5" />Resetar
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterPanel({ active, filter, setFilter }: { active: Picked; filter: string; setFilter: (id: string) => void }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
        <Wand2 className="h-3.5 w-3.5" /> Filtros
      </h3>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="shrink-0 flex flex-col items-center gap-1"
          >
            <div className={`h-16 w-16 rounded-2xl overflow-hidden ring-2 transition ${filter === f.id ? "ring-primary" : "ring-transparent"}`}>
              {active.isVideo ? (
                <video src={active.previewUrl} className="h-full w-full object-cover" style={{ filter: f.css }} muted />
              ) : (
                <img src={active.previewUrl} alt="" className="h-full w-full object-cover" style={{ filter: f.css }} />
              )}
            </div>
            <span className={`text-[11px] ${filter === f.id ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              {f.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TextPanel({
  layers, selected, setSelected, addLayer, updateLayer, deleteLayer, isVideo,
}: {
  layers: TextLayer[];
  selected: TextLayer | null;
  setSelected: (id: string | null) => void;
  addLayer: () => void;
  updateLayer: (id: string, patch: Partial<TextLayer>) => void;
  deleteLayer: (id: string) => void;
  isVideo: boolean;
}) {
  if (isVideo) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
        <Type className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Textos disponíveis em fotos</p>
        <p className="text-xs text-muted-foreground mt-1">
          Para vídeos, use a legenda do post na próxima etapa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Layer list */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={addLayer}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-3.5 py-2 text-xs font-semibold shadow-soft"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar texto
        </button>
        {layers.map((l) => (
          <button
            key={l.id}
            onClick={() => setSelected(l.id)}
            className={`shrink-0 max-w-[140px] truncate rounded-full border px-3 py-1.5 text-xs ${
              selected?.id === l.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
            }`}
            style={{ fontFamily: l.font }}
          >
            {l.text || "(vazio)"}
          </button>
        ))}
      </div>

      {!selected ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <Type className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Sem textos ainda</p>
          <p className="text-xs text-muted-foreground mt-1">Toque em <strong>Adicionar texto</strong> para começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Editable text */}
          <textarea
            value={selected.text}
            onChange={(e) => updateLayer(selected.id, { text: e.target.value })}
            rows={2}
            placeholder="Escreva aqui…"
            className="w-full rounded-2xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            style={{ fontFamily: selected.font }}
          />

          {/* Fonts */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Fonte</h4>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {FONTS.map((f) => {
                const sel = selected.font === f.family;
                return (
                  <button
                    key={f.id}
                    onClick={() => updateLayer(selected.id, { font: f.family })}
                    className={`shrink-0 flex flex-col items-center justify-center min-w-[78px] rounded-2xl border px-3 py-2 transition ${
                      sel ? "border-primary bg-primary/10" : "border-border bg-card"
                    }`}
                  >
                    <span className="text-base leading-none" style={{ fontFamily: f.family }}>Ag</span>
                    <span className={`mt-1 text-[10px] ${sel ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colors */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Cor do texto</h4>
            <div className="flex flex-wrap gap-2 items-center">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateLayer(selected.id, { color: c })}
                  className={`h-7 w-7 rounded-full border-2 transition ${
                    selected.color.toLowerCase() === c ? "border-primary scale-110" : "border-border"
                  }`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
              <label className="h-7 w-7 rounded-full border-2 border-border grid place-items-center overflow-hidden cursor-pointer relative">
                <span className="absolute inset-0 bg-gradient-to-br from-red-500 via-green-500 to-blue-500" />
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => updateLayer(selected.id, { color: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Background */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Fundo</h4>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {([
                ["none", "Sem fundo"],
                ["translucent", "Translúcido"],
                ["solid", "Sólido"],
              ] as const).map(([id, label]) => {
                const sel = selected.bg === id;
                return (
                  <button
                    key={id}
                    onClick={() => updateLayer(selected.id, { bg: id })}
                    className={`rounded-xl border py-2 text-xs font-medium transition ${
                      sel ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {selected.bg !== "none" && (
              <div className="flex flex-wrap gap-2 items-center">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateLayer(selected.id, { bgColor: c })}
                    className={`h-6 w-6 rounded-full border-2 transition ${
                      selected.bgColor.toLowerCase() === c ? "border-primary scale-110" : "border-border"
                    }`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
                <label className="h-6 w-6 rounded-full border-2 border-border overflow-hidden cursor-pointer relative">
                  <span className="absolute inset-0 bg-gradient-to-br from-red-500 via-green-500 to-blue-500" />
                  <input
                    type="color"
                    value={selected.bgColor}
                    onChange={(e) => updateLayer(selected.id, { bgColor: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Align + Bold */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-border overflow-hidden">
              {([
                ["left", AlignLeft],
                ["center", AlignCenter],
                ["right", AlignRight],
              ] as const).map(([a, Icon]) => {
                const sel = selected.align === a;
                return (
                  <button
                    key={a}
                    onClick={() => updateLayer(selected.id, { align: a })}
                    className={`h-9 w-9 grid place-items-center ${sel ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => updateLayer(selected.id, { bold: !selected.bold })}
              className={`h-9 w-9 grid place-items-center rounded-xl border ${
                selected.bold ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              onClick={() => deleteLayer(selected.id)}
              className="ml-auto h-9 px-3 inline-flex items-center gap-1 rounded-xl border border-destructive/30 text-destructive text-xs font-semibold"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </button>
          </div>

          {/* Size + rotate */}
          <SliderRow
            icon={Type} label="Tamanho"
            value={selected.size} min={0.03} max={0.32} step={0.005} defaultVal={0.08}
            onChange={(v) => updateLayer(selected.id, { size: v })}
          />
          <SliderRow
            icon={RotateCw} label="Rotação"
            value={selected.rotate} min={-180} max={180} step={1} defaultVal={0}
            onChange={(v) => updateLayer(selected.id, { rotate: v })}
          />

          {/* Entrance animation */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 inline-flex items-center gap-1.5">
              <Zap className="h-3 w-3" /> Animação
            </h4>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {ANIMS.map((a) => {
                const sel = (selected.anim ?? "none") === a.id;
                return (
                  <motion.button
                    key={a.id}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => updateLayer(selected.id, { anim: a.id })}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      sel ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {a.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StickersPanel({ onPick }: { onPick: (sticker: string) => void }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
        <Smile className="h-3.5 w-3.5" /> Stickers
      </h3>
      <p className="text-[11px] text-muted-foreground -mt-1">
        Toque para adicionar. Arraste no preview para posicionar.
      </p>
      <div className="grid grid-cols-6 gap-2">
        {STICKERS.map((s, i) => (
          <motion.button
            key={s + i}
            whileHover={{ scale: 1.12, rotate: -4 }}
            whileTap={{ scale: 0.85, rotate: 6 }}
            onClick={() => onPick(s)}
            className="aspect-square rounded-2xl bg-muted/60 hover:bg-muted text-2xl grid place-items-center shadow-sm"
          >
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function AdjustPanel({ adjust, setAdjust }: { adjust: Adjust; setAdjust: (a: Adjust) => void }) {
  return (
    <div className="space-y-4">
      <SliderRow icon={Sun} label="Brilho" value={adjust.brightness} min={0.5} max={1.5} step={0.01} defaultVal={1}
        onChange={(v) => setAdjust({ ...adjust, brightness: v })} />
      <SliderRow icon={Contrast} label="Contraste" value={adjust.contrast} min={0.5} max={1.5} step={0.01} defaultVal={1}
        onChange={(v) => setAdjust({ ...adjust, contrast: v })} />
      <SliderRow icon={Droplets} label="Saturação" value={adjust.saturation} min={0} max={2} step={0.01} defaultVal={1}
        onChange={(v) => setAdjust({ ...adjust, saturation: v })} />
      <SliderRow icon={Thermometer} label="Temperatura" value={adjust.warmth} min={-30} max={30} step={1} defaultVal={0}
        onChange={(v) => setAdjust({ ...adjust, warmth: v })} />
      <SliderRow icon={Sparkles} label="Suavizar" value={adjust.blur} min={0} max={3} step={0.1} defaultVal={0}
        onChange={(v) => setAdjust({ ...adjust, blur: v })} />
      <SliderRow icon={Aperture} label="Vinheta" value={adjust.vignette} min={0} max={1} step={0.01} defaultVal={0}
        onChange={(v) => setAdjust({ ...adjust, vignette: v })} />
      <button
        onClick={() => setAdjust({ ...DEFAULT_ADJUST })}
        className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition"
      >
        Resetar ajustes
      </button>
    </div>
  );
}

function SliderRow({
  icon: Icon, label, value, min, max, step, defaultVal, onChange,
}: {
  icon: any; label: string; value: number; min: number; max: number; step: number;
  defaultVal: number; onChange: (v: number) => void;
}) {
  return (
    <div data-no-swipe>
      <div className="flex items-center justify-between mb-1.5">
        <span className="inline-flex items-center gap-2 text-xs font-medium">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}
        </span>
        <button
          onClick={() => onChange(defaultVal)}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          {value === defaultVal ? "—" : "Redefinir"}
        </button>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

// ============ STEP DETAILS ============

function StepDetails({
  items, filterCss, ratio, caption, setCaption, audience, setAudience,
  allowComments, setAllowComments, kind, layers,
}: {
  items: Picked[];
  filterCss: string;
  ratio: Ratio;
  caption: string;
  setCaption: (s: string) => void;
  audience: Audience;
  setAudience: (a: Audience) => void;
  allowComments: boolean;
  setAllowComments: (v: boolean) => void;
  kind: "photo" | "reel";
  layers: Record<number, TextLayer[]>;
}) {
  const tags = useMemo(() => extractHashtags(caption), [caption]);
  const cover = items[0];
  const coverLayers = layers[0] ?? [];
  const r = RATIOS.find((x) => x.id === ratio)!;
  return (
    <div className="p-4 max-w-xl mx-auto w-full space-y-4">
      <div className="flex gap-3">
        {cover && (
          <div className={`relative w-24 rounded-xl overflow-hidden bg-muted shrink-0 ${r.cls}`}>
            {cover.isVideo ? (
              <video src={cover.previewUrl} className="h-full w-full object-cover" style={{ filter: filterCss }} muted />
            ) : (
              <img src={cover.previewUrl} alt="" className="h-full w-full object-cover" style={{ filter: filterCss }} />
            )}
            {/* Preview of text layers (non-interactive) */}
            {!cover.isVideo && coverLayers.length > 0 && (
              <div className="absolute inset-0 pointer-events-none" style={{ containerType: "size" }}>
                {coverLayers.map((l) => (
                  <div
                    key={l.id}
                    className="absolute"
                    style={{
                      left: `${l.x * 100}%`,
                      top: `${l.y * 100}%`,
                      transform: `translate(-50%, -50%) rotate(${l.rotate}deg)`,
                      maxWidth: "90%",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: l.font,
                        fontWeight: l.bold ? 800 : 600,
                        color: l.color,
                        fontSize: `${l.size * 100}cqh`,
                        textAlign: l.align,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        padding: l.bg !== "none" ? "0.2em 0.4em" : 0,
                        borderRadius: "0.2em",
                        background:
                          l.bg === "solid" ? l.bgColor :
                          l.bg === "translucent" ? `${l.bgColor}cc` : "transparent",
                        textShadow: l.bg === "none" ? "0 1px 4px rgba(0,0,0,0.6)" : "none",
                        lineHeight: 1.1,
                      }}
                    >
                      {l.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 2200))}
          placeholder="Escreva uma legenda... use #hashtags e @menções"
          rows={4}
          className="flex-1 rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Hash className="h-3.5 w-3.5" /> {tags.length} hashtag{tags.length === 1 ? "" : "s"}
        </span>
        <span>{caption.length}/2200</span>
      </div>

      <section className="rounded-2xl border bg-card divide-y">
        <div className="p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quem pode ver
          </h3>
        </div>
        {(
          [
            { id: "public", label: "Público", desc: "Qualquer um pode ver", icon: Globe2 },
            { id: "followers", label: "Seguidores", desc: "Só quem te segue", icon: Users },
            { id: "private", label: "Só eu", desc: "Apenas você vê", icon: Lock },
          ] as const
        ).map((opt) => {
          const Icon = opt.icon;
          const selected = audience === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setAudience(opt.id)}
              className="w-full flex items-center gap-3 p-3 text-left"
            >
              <div
                className={`h-9 w-9 rounded-full grid place-items-center ${
                  selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              <div
                className={`h-5 w-5 rounded-full border-2 grid place-items-center ${
                  selected ? "border-primary bg-primary" : "border-border"
                }`}
              >
                {selected && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
            </button>
          );
        })}
      </section>

      <label className="flex items-center justify-between rounded-2xl border bg-card p-4 cursor-pointer">
        <div>
          <p className="text-sm font-medium">Permitir comentários</p>
          <p className="text-xs text-muted-foreground">
            Você pode mudar isso depois nas configurações do post.
          </p>
        </div>
        <input
          type="checkbox"
          checked={allowComments}
          onChange={(e) => setAllowComments(e.target.checked)}
          className="h-5 w-5 accent-primary"
        />
      </label>

      <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
        Será publicado como <strong className="text-foreground">{kind === "reel" ? "Reel" : "Post"}</strong> ·{" "}
        {items.length} mídia{items.length > 1 ? "s" : ""} · formato <strong className="text-foreground">{r.id}</strong>.
      </div>
    </div>
  );
}

// =========================================================
// bakeVideo: aplica trim + volume + música via MediaRecorder
// =========================================================
async function bakeVideo(file: File, edit: VideoEdit): Promise<Blob> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.crossOrigin = "anonymous";
  video.playsInline = true;
  video.muted = false;
  (video as any).disableRemotePlayback = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Falha ao carregar vídeo"));
  });

  const duration = video.duration;
  const tStart = Math.max(0, Math.min(edit.trimStart || 0, duration));
  const tEnd = Math.min(duration, edit.trimEnd > 0 ? edit.trimEnd : duration);
  const segment = Math.max(0.2, tEnd - tStart);

  const vStream = (video as any).captureStream
    ? ((video as any).captureStream() as MediaStream)
    : (video as any).mozCaptureStream?.();
  if (!vStream) throw new Error("captureStream não suportado");
  const videoTracks = vStream.getVideoTracks();

  const AC: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  const ac = new AC();
  const dest = ac.createMediaStreamDestination();

  if (!edit.muted) {
    const origSrc = ac.createMediaElementSource(video);
    const g = ac.createGain();
    g.gain.value = Math.max(0, Math.min(1, edit.volume));
    origSrc.connect(g);
    g.connect(dest);
  }

  let musicEl: HTMLAudioElement | null = null;
  let musicUrl: string | null = null;
  if (edit.music?.file) {
    musicUrl = URL.createObjectURL(edit.music.file);
    musicEl = new Audio(musicUrl);
    musicEl.crossOrigin = "anonymous";
    musicEl.loop = true;
    await new Promise<void>((resolve) => {
      musicEl!.onloadedmetadata = () => resolve();
      musicEl!.onerror = () => resolve();
    });
    const mSrc = ac.createMediaElementSource(musicEl);
    const mG = ac.createGain();
    mG.gain.value = Math.max(0, Math.min(1, edit.music.volume));
    mSrc.connect(mG);
    mG.connect(dest);
    try { musicEl.currentTime = edit.music.offset || 0; } catch {}
  }

  const mixed = new MediaStream();
  videoTracks.forEach((t: MediaStreamTrack) => mixed.addTrack(t));
  dest.stream.getAudioTracks().forEach((t) => mixed.addTrack(t));

  const candidates = [
    "video/mp4;codecs=h264,aac",
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const MR: any = (window as any).MediaRecorder;
  if (!MR) throw new Error("MediaRecorder não suportado");
  const mimeType = candidates.find((c) => MR.isTypeSupported?.(c)) || "video/webm";
  // Calcula bitrate de altíssima qualidade com base na resolução do vídeo
  // (~0.25 bits por pixel a 30fps), com piso de 12 Mbps e teto de 50 Mbps.
  const vw = (video as any).videoWidth || 1080;
  const vh = (video as any).videoHeight || 1920;
  const pixelRate = vw * vh * 30;
  const targetBitrate = Math.max(12_000_000, Math.min(50_000_000, Math.round(pixelRate * 0.25)));
  const recorder: MediaRecorder = new MR(mixed, {
    mimeType,
    videoBitsPerSecond: targetBitrate,
    audioBitsPerSecond: 192_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

  await new Promise<void>((resolve) => {
    const onSeeked = () => { video.removeEventListener("seeked", onSeeked); resolve(); };
    video.addEventListener("seeked", onSeeked);
    try { video.currentTime = tStart; } catch { resolve(); }
  });

  recorder.start(250);
  await video.play().catch(() => {});
  if (musicEl) await musicEl.play().catch(() => {});

  await new Promise<void>((resolve) => setTimeout(resolve, segment * 1000));

  try { video.pause(); } catch {}
  if (musicEl) { try { musicEl.pause(); } catch {} }

  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
    try { recorder.stop(); } catch { resolve(); }
  });

  try { await ac.close(); } catch {}
  URL.revokeObjectURL(url);
  if (musicUrl) URL.revokeObjectURL(musicUrl);

  const out = new Blob(chunks, { type: mimeType.split(";")[0] });
  if (out.size === 0) throw new Error("Gravação vazia");
  return out;
}

// =========================================================
// Product Link overlay (draggable) + LinksPanel
// =========================================================
LinkPreviewOverlay = function LinkPreviewOverlayImpl({
  links, selectedId, setSelected, onChange,
}: LinkPreviewOverlayProps) {
  return (
    <div
      className="absolute inset-0"
      onPointerDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
    >
      {links.map((l) => (
        <DraggableLinkPill
          key={l.id}
          link={l}
          selected={selectedId === l.id}
          onSelect={() => setSelected(l.id)}
          onChange={(patch) => onChange(l.id, patch)}
        />
      ))}
    </div>
  );
};

function DraggableLinkPill({
  link, selected, onSelect, onChange,
}: {
  link: LinkDraft;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<LinkDraft>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const widthPct = Math.max(18, Math.min(80, link.size * 100));
  const label = link.label.trim() || hostOf(link.url) || "Produto";

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const r = parent.getBoundingClientRect();
    drag.current = { x: e.clientX, y: e.clientY, w: r.width, h: r.height };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const d = drag.current;
    const dx = (e.clientX - d.x) / d.w;
    const dy = (e.clientY - d.y) / d.h;
    onChange({
      x: Math.max(0.05, Math.min(0.95, link.x + dx)),
      y: Math.max(0.05, Math.min(0.95, link.y + dy)),
    });
    drag.current = { ...d, x: e.clientX, y: e.clientY };
  };
  const onPointerUp = () => { drag.current = null; };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="absolute touch-none select-none cursor-grab active:cursor-grabbing"
      style={{
        left: `${link.x * 100}%`,
        top: `${link.y * 100}%`,
        width: `${widthPct}%`,
        transform: "translate(-50%, -50%)",
        outline: selected ? "2px dashed rgba(255,255,255,0.95)" : "none",
        outlineOffset: "3px",
        borderRadius: "9999px",
      }}
    >
      <div className="flex items-center gap-2 rounded-full bg-white/95 text-black shadow-lg backdrop-blur px-2.5 py-1.5 text-xs font-semibold">
        {link.logoUrl ? (
          <img src={link.logoUrl} alt="" className="h-6 w-6 rounded-md object-cover shrink-0" />
        ) : (
          <span className="h-6 w-6 rounded-md bg-black/10 grid place-items-center shrink-0">
            <ExternalLink className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="truncate flex-1">{label}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </div>
    </div>
  );
}

function hostOf(u: string): string {
  try { return new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, ""); }
  catch { return ""; }
}

LinksPanel = function LinksPanelImpl({
  links, setLinks, selectedId, setSelected,
}: LinksPanelProps) {
  const [step, setStep] = useState<"list" | "url" | "logo">("list");
  const [draftUrl, setDraftUrl] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [draftLogo, setDraftLogo] = useState<{ file: File; url: string } | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const selected = links.find((l) => l.id === selectedId) ?? null;

  function resetDraft(revoke = true) {
    setDraftUrl(""); setDraftLabel("");
    if (revoke && draftLogo) URL.revokeObjectURL(draftLogo.url);
    setDraftLogo(null);
  }

  function confirmUrl() {
    const u = draftUrl.trim();
    if (!u) { toast.error("Informe o link do produto"); return; }
    setStep("logo");
  }

  function confirmAdd() {
    const nl: LinkDraft = {
      id: uid(),
      url: draftUrl.trim(),
      label: draftLabel.trim(),
      logoFile: draftLogo?.file ?? null,
      logoUrl: draftLogo?.url ?? null,
      x: 0.5, y: 0.5, size: 0.4,
    };
    setLinks((p) => [...p, nl]);
    setSelected(nl.id);
    // Ownership of the object URL transfers to the link; do NOT revoke here
    resetDraft(false);
    setStep("list");
    toast.success("Link adicionado — arraste para posicionar");
  }

  function pickLogo(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (draftLogo) URL.revokeObjectURL(draftLogo.url);
    setDraftLogo({ file, url: URL.createObjectURL(file) });
  }

  if (step === "url") {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">1/2 · Link do produto</h3>
        <input
          autoFocus
          type="url"
          inputMode="url"
          placeholder="https://loja.com/produto"
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <input
          type="text"
          placeholder="Nome do produto (opcional)"
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value.slice(0, 60))}
          className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="flex gap-2">
          <button onClick={() => { resetDraft(); setStep("list"); }} className="flex-1 rounded-xl border py-2.5 text-sm font-semibold">Cancelar</button>
          <button onClick={confirmUrl} className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold">Próximo</button>
        </div>
      </div>
    );
  }

  if (step === "logo") {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">2/2 · Logo do produto (opcional)</h3>
        <button
          onClick={() => logoRef.current?.click()}
          className="w-full rounded-2xl border-2 border-dashed py-6 grid place-items-center gap-2 hover:bg-muted/50 transition"
        >
          {draftLogo ? (
            <img src={draftLogo.url} alt="" className="h-20 w-20 rounded-xl object-cover" />
          ) : (
            <>
              <ImagePlus className="h-7 w-7 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Toque para enviar a logo</span>
            </>
          )}
        </button>
        <input
          ref={logoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = ""; }}
        />
        <div className="flex gap-2">
          <button onClick={() => setStep("url")} className="flex-1 rounded-xl border py-2.5 text-sm font-semibold">Voltar</button>
          <button onClick={confirmAdd} className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold">
            {draftLogo ? "Adicionar" : "Pular e adicionar"}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center">
          Depois você pode arrastar o cartão na imagem e ajustar o tamanho abaixo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => { resetDraft(); setStep("url"); }}
        className="w-full rounded-2xl border-2 border-dashed py-4 grid place-items-center gap-1.5 hover:bg-muted/50 transition"
      >
        <Link2 className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold">Adicionar link de produto</span>
        <span className="text-[11px] text-muted-foreground">Como no YouTube — clientes clicam e abrem</span>
      </button>

      {links.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum link nesta mídia ainda.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((l) => {
            const isSel = l.id === selectedId;
            return (
              <li key={l.id} className={`rounded-2xl border p-3 ${isSel ? "ring-2 ring-primary" : ""}`}>
                <button onClick={() => setSelected(isSel ? null : l.id)} className="w-full flex items-center gap-2 text-left">
                  {l.logoUrl ? (
                    <img src={l.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" />
                  ) : (
                    <span className="h-9 w-9 rounded-lg bg-muted grid place-items-center shrink-0">
                      <ExternalLink className="h-4 w-4" />
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{l.label || hostOf(l.url) || "Produto"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{l.url}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLinks((p) => p.filter((x) => x.id !== l.id)); if (isSel) setSelected(null); }}
                    className="h-8 w-8 grid place-items-center rounded-full hover:bg-destructive/10 text-destructive"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </button>
                {isSel && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-16">Tamanho</span>
                      <input
                        type="range" min={0.18} max={0.8} step={0.01}
                        value={l.size}
                        onChange={(e) => setLinks((p) => p.map((x) => x.id === l.id ? { ...x, size: Number(e.target.value) } : x))}
                        className="flex-1 accent-primary"
                      />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
