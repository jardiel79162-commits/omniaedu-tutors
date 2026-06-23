import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cache, getCurrentUserId } from "@/lib/app-cache";
import { callStore } from "@/lib/call-store";
import {
  ArrowLeft,
  Send,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Mic,
  Trash2,
  Phone,
  Video,
  Play,
  Pause,
  Paperclip,
  Image as ImageIcon,
  MapPin,
  X,
  PhoneMissed,
  PhoneIncoming,
  PhoneOutgoing,
  Copy,
  ExternalLink,
  FileIcon,
  Download,
  Pencil,
  Volume2,
  VolumeX,
  Maximize2,
  ChevronDown,
} from "lucide-react";
import { fetchNicknames, saveNickname } from "@/lib/contact-nicknames";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { resolveMediaUrl } from "@/lib/media-url";
import { toast } from "sonner";
import { CallView, IncomingCallPrompt } from "@/components/CallView";
import { LocationPicker } from "@/components/LocationPicker";
import { LocationViewer } from "@/components/LocationViewer";
import NativeGallerySheet from "@/components/NativeGallerySheet";
import { Capacitor } from "@capacitor/core";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useMediaUrl } from "@/lib/media-url";

async function downloadMedia(src: string, filename?: string) {
  try {
    const url = await resolveMediaUrl(src);
    const res = await fetch(url);
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "jpg").split(";")[0];
    const a = document.createElement("a");
    const obj = URL.createObjectURL(blob);
    a.href = obj;
    a.download = filename || `imagem-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(obj), 1000);
  } catch {
    toast.error("Falha ao baixar imagem");
  }
}

const CHAT_MEDIA_BUCKET = "chat-media";
const VOICE_MEDIA_BUCKET = "voice-messages";
const storedMediaRef = (bucket: string, path: string) => `${bucket}/${path}`;

function MediaImage({
  src,
  className,
  ...rest
}: { src: string } & React.ImgHTMLAttributes<HTMLImageElement>) {
  const [retryKey, setRetryKey] = useState(0);
  const resolved = useMediaUrl(src, retryKey);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    setErrored(false);
    setRetryKey(0);
  }, [src]);
  useEffect(() => {
    if (resolved) setErrored(false);
  }, [resolved]);
  if (!resolved) {
    return (
      <div
        className={`${className ?? ""} bg-muted/60 animate-pulse`}
        style={{ width: 220, height: 220 }}
        aria-label="Carregando imagem"
      />
    );
  }
  if (errored) {
    return (
      <div
        className={`${className ?? ""} bg-muted/60 grid place-items-center text-xs text-muted-foreground`}
        style={{ width: 220, height: 160 }}
      >
        <span>Imagem indisponível</span>
      </div>
    );
  }
  return (
    <img
      src={resolved}
      className={className}
      onLoad={() => setErrored(false)}
      onError={() => (retryKey < 3 ? setRetryKey((v) => v + 1) : setErrored(true))}
      {...rest}
    />
  );
}

function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

function videoMimeFromName(name: string) {
  const ext = name.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  if (ext === "webm") return "video/webm";
  if (ext === "mov") return "video/quicktime";
  if (ext === "m4v" || ext === "mp4") return "video/mp4";
  return "video/mp4";
}

function usePlayableVideoUrl(input: string | null | undefined, refreshKey = 0) {
  const resolved = useMediaUrl(input, refreshKey);
  return { playable: resolved, loading: Boolean(input) && !resolved };
}

function MediaVideo({ src, className }: { src: string; className?: string }) {
  const [retryKey, setRetryKey] = useState(0);
  const { playable, loading } = usePlayableVideoUrl(src, retryKey);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [showCtrl, setShowCtrl] = useState(true);
  const [errored, setErrored] = useState(false);
  const hideT = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setErrored(false);
    setRetryKey(0);
    setCur(0);
    setDur(0);
    setPlaying(false);
  }, [src]);

  // When the resolved URL changes (e.g. blob -> signed URL after upload), force
  // the video element to reload so it picks up the new source and shows
  // metadata/poster instead of an empty black frame at 0:00.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !playable) return;
    try {
      v.load();
    } catch {
      void 0;
    }
  }, [playable]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };
  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const t = Number(e.target.value);
    v.currentTime = t;
    setCur(t);
  };
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };
  const toggleFs = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };
  const bumpCtrl = () => {
    setShowCtrl(true);
    if (hideT.current) clearTimeout(hideT.current);
    hideT.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowCtrl(false);
    }, 2200);
  };

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden bg-black ${className || ""}`}
      style={!playable ? { minHeight: 200, minWidth: 220 } : undefined}
      onClick={(e) => {
        e.stopPropagation();
        bumpCtrl();
        togglePlay();
      }}
      onMouseMove={bumpCtrl}
    >
      {(!playable || loading) && !errored && (
        <div className="absolute inset-0 bg-muted/40 animate-pulse grid place-items-center text-[11px] text-muted-foreground">
          Carregando vídeo…
        </div>
      )}
      {errored && (
        <div className="absolute inset-0 grid place-items-center text-xs text-white/80 bg-black/60">
          Vídeo indisponível
        </div>
      )}
      <video
        key={playable || "empty"}
        ref={videoRef}
        src={playable || undefined}
        preload="metadata"
        playsInline
        controls
        controlsList="nodownload noplaybackrate noremoteplayback"
        className="w-full h-full object-contain"
        onPlay={() => {
          setPlaying(true);
          bumpCtrl();
        }}
        onPause={() => {
          setPlaying(false);
          setShowCtrl(true);
        }}
        onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDur(e.currentTarget.duration || 0);
          setMuted(e.currentTarget.muted);
          setErrored(false);
        }}
        onLoadedData={() => setErrored(false)}
        onCanPlay={() => setErrored(false)}
        onError={() => {
          if (retryKey < 2) setRetryKey((v) => v + 1);
          else setErrored(true);
        }}
        onEnded={() => {
          setPlaying(false);
          setShowCtrl(true);
        }}
      />
      {!playing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="absolute inset-0 grid place-items-center"
          aria-label="Reproduzir"
        >
          <span className="h-14 w-14 rounded-full bg-black/55 backdrop-blur grid place-items-center">
            <Play className="h-7 w-7 text-white fill-white ml-0.5" />
          </span>
        </button>
      )}
      <div
        className={`absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent transition-opacity ${showCtrl ? "opacity-100" : "opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="range"
          min={0}
          max={dur || 0}
          step={0.1}
          value={cur}
          onChange={onSeek}
          className="w-full h-1 accent-primary cursor-pointer"
          aria-label="Progresso"
        />
        <div className="flex items-center gap-2 mt-1 text-white text-[11px]">
          <button
            type="button"
            onClick={togglePlay}
            className="h-7 w-7 grid place-items-center rounded-full hover:bg-white/15"
            aria-label={playing ? "Pausar" : "Reproduzir"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
          </button>
          <span className="tabular-nums">
            {fmtTime(cur)} / {fmtTime(dur)}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={toggleMute}
              className="h-7 w-7 grid place-items-center rounded-full hover:bg-white/15"
              aria-label={muted ? "Ativar som" : "Silenciar"}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={toggleFs}
              className="h-7 w-7 grid place-items-center rounded-full hover:bg-white/15"
              aria-label="Tela cheia"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type CallPayload = {
  mode: "audio" | "video";
  outcome: "missed" | "completed" | "declined";
  duration_ms?: number;
};
function parseCall(content: string): CallPayload | null {
  try {
    const o = JSON.parse(content);
    if ((o.mode === "audio" || o.mode === "video") && typeof o.outcome === "string")
      return o as CallPayload;
  } catch {}
  return null;
}
function formatCallDuration(ms?: number) {
  if (!ms) return "";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

type LocPayload = { lat: number; lng: number; label?: string; address?: string };
function parseLocation(content: string): LocPayload | null {
  try {
    if (content.startsWith("{")) {
      const o = JSON.parse(content);
      if (typeof o.lat === "number" && typeof o.lng === "number") return o;
    }
  } catch {}
  const [a, b] = content.split(",").map((s) => s.trim());
  const lat = Number(a),
    lng = Number(b);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
}

type FilePayload = { name: string; size: number; mime?: string };
function parseFile(content: string): FilePayload | null {
  try {
    const o = JSON.parse(content);
    if (typeof o?.name === "string" && typeof o?.size === "number") return o as FilePayload;
  } catch {}
  return null;
}
function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function FileBubble({ url, content }: { url: string; content: string }) {
  const info = parseFile(content) ?? { name: "arquivo", size: 0 };
  async function download() {
    try {
      const resolved = await resolveMediaUrl(url);
      const r = await fetch(resolved);
      const blob = await r.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = info.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      toast.error("Falha ao baixar arquivo");
    }
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        download();
      }}
      className="flex items-center gap-2.5 min-w-[200px] max-w-[260px] px-1 py-1 text-left"
    >
      <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary grid place-items-center shrink-0">
        <FileIcon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold truncate">{info.name}</div>
        <div className="text-[11px] text-muted-foreground">{formatBytes(info.size)}</div>
      </div>
      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?)/gi;
function extractLinks(text: string): string[] {
  const out: string[] = [];
  const m = text.match(URL_RE);
  if (!m) return out;
  for (const raw of m) {
    const trimmed = raw.replace(/[.,;:!?)\]]+$/, "");
    if (trimmed.length < 4) continue;
    out.push(trimmed);
  }
  return Array.from(new Set(out));
}
function ensureHref(u: string): string {
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}
function LinkifiedText({ text }: { text: string }) {
  const parts: Array<{ t: "text" | "url"; v: string }> = [];
  let last = 0;
  text.replace(URL_RE, (match, _g, offset: number) => {
    if (offset > last) parts.push({ t: "text", v: text.slice(last, offset) });
    parts.push({ t: "url", v: match });
    last = offset + match.length;
    return match;
  });
  if (last < text.length) parts.push({ t: "text", v: text.slice(last) });
  if (parts.length === 0) parts.push({ t: "text", v: text });
  return (
    <>
      {parts.map((p, i) =>
        p.t === "url" ? (
          <a
            key={i}
            href={ensureHref(p.v)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-primary break-words"
            onClick={(e) => e.stopPropagation()}
          >
            {p.v}
          </a>
        ) : (
          <span key={i}>{p.v}</span>
        ),
      )}
    </>
  );
}

type MsgStatus = "sending" | "sent" | "failed";
type Msg = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  message_type?: "text" | "audio" | "image" | "video" | "location" | string;
  media_url?: string | null;
  duration_ms?: number | null;
  status?: MsgStatus;
  upload_progress?: number;
};

function guessContentType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    mp4: "video/mp4",
    m4v: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
  };
  return map[ext] || "application/octet-stream";
}

async function uploadToBucketWithProgress(
  bucket: string,
  path: string,
  file: Blob,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const cleanType = contentType || file.type || "application/octet-stream";
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file.type ? file : new Blob([file], { type: cleanType }));
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!baseUrl || !apiKey) {
      reject(new Error("storage url missing"));
      return;
    }
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    xhr.open("POST", `${baseUrl}/storage/v1/object/${bucket}/${encodedPath}`, true);
    xhr.setRequestHeader("apikey", apiKey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else reject(new Error(`upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("network error"));
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        const token = data.session?.access_token;
        if (!token) throw new Error("not authenticated");
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(body);
      })
      .catch(reject);
  });
}

async function waitForStoredMedia(ref: string, minBytes: number) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const url = await resolveMediaUrl(ref, { refresh: attempt > 0 });
    if (url) {
      try {
        const res = await fetch(url, { method: "HEAD", cache: "no-store" });
        const len = Number(res.headers.get("content-length") || "0");
        if (res.ok && (!minBytes || !len || len >= minBytes)) return;
      } catch {
        void 0;
      }
    }
    await new Promise((resolve) => window.setTimeout(resolve, 500));
  }
  throw new Error("media not readable after upload");
}
type ChatInfo = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  avatar_url: string | null;
};

export const Route = createFileRoute("/_authenticated/chats/$id")({
  component: ChatRoute,
});

function ChatRoute() {
  const { id } = Route.useParams();
  // Force a fresh ChatThread per chat id so cached state from the previous
  // contact doesn't bleed into the next one while data loads.
  return <ChatThread key={id} />;
}

function formatDuration(ms?: number | null) {
  if (!ms) return "0:00";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function AudioBubble({ url, duration }: { url: string; duration?: number | null }) {
  const resolvedUrl = useMediaUrl(url);
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState<number>(duration ? duration / 1000 : 0);
  const [rate, setRate] = useState(1);
  const [seeking, setSeeking] = useState(false);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    a.playbackRate = rate;
  }, [rate]);

  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  function fmt(s: number) {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function seek(e: React.PointerEvent<HTMLDivElement>) {
    const a = ref.current;
    if (!a || !total) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * total;
    setCurrent(ratio * total);
  }

  const rates = [1, 1.5, 2];

  return (
    <div className="flex items-center gap-2 min-w-[220px] max-w-[280px]">
      <button
        type="button"
        onClick={() => {
          const a = ref.current;
          if (!a) return;
          if (a.paused) a.play();
          else a.pause();
        }}
        className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0"
        aria-label={playing ? "Pausar" : "Reproduzir"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          className="relative h-2 rounded-full bg-muted-foreground/25 cursor-pointer touch-none"
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            setSeeking(true);
            seek(e);
          }}
          onPointerMove={(e) => seeking && seek(e)}
          onPointerUp={(e) => {
            setSeeking(false);
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary shadow"
            style={{ left: `calc(${pct}% - 6px)` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
          <span>{fmt(current)}</span>
          <span>{fmt(total)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          const i = rates.indexOf(rate);
          setRate(rates[(i + 1) % rates.length]);
        }}
        className="shrink-0 h-7 px-2 rounded-full bg-muted text-[11px] font-semibold tabular-nums"
        aria-label="Velocidade de reprodução"
      >
        {rate}x
      </button>
      <audio
        ref={ref}
        src={resolvedUrl || undefined}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onLoadedMetadata={(e) => {
          const d = (e.currentTarget as HTMLAudioElement).duration;
          if (isFinite(d) && d > 0) setTotal(d);
        }}
        onTimeUpdate={(e) => {
          if (!seeking) setCurrent((e.currentTarget as HTMLAudioElement).currentTime);
        }}
      />
    </div>
  );
}

function LocationBubble({
  content,
  onOpen,
}: {
  content: string;
  onOpen: (loc: LocPayload) => void;
}) {
  const loc = parseLocation(content);
  if (!loc) return <div className="text-sm text-muted-foreground">Localização inválida</div>;
  const { lat, lng, label, address } = loc;
  // Static map tile from OSM (single tile around the point) — pure visual preview
  const z = 15;
  const n = 2 ** z;
  const xt = Math.floor(((lng + 180) / 360) * n);
  const yt = Math.floor(
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
      2) *
      n,
  );
  const tile = `https://tile.openstreetmap.org/${z}/${xt}/${yt}.png`;
  return (
    <button
      type="button"
      onClick={() => onOpen(loc)}
      className="block w-[240px] rounded-lg overflow-hidden text-left"
    >
      <div className="relative w-full h-[140px] bg-muted">
        <img src={tile} alt="" className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="h-7 w-7 rounded-full bg-destructive text-white grid place-items-center shadow-lg">
            <MapPin className="h-4 w-4" />
          </div>
        </div>
      </div>
      <div className="px-1.5 pt-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{label || "Localização"}</span>
        </div>
        {address && <div className="text-[11px] text-muted-foreground line-clamp-2">{address}</div>}
      </div>
    </button>
  );
}

function PeerActivityIndicator({ kind }: { kind: "typing" | "recording" }) {
  if (kind === "typing") {
    return (
      <div className="flex items-center gap-1 text-[11px] text-primary font-medium">
        <span className="flex items-end gap-0.5 h-3">
          <span
            className="block h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: "0ms", animationDuration: "0.9s" }}
          />
          <span
            className="block h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: "150ms", animationDuration: "0.9s" }}
          />
          <span
            className="block h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: "300ms", animationDuration: "0.9s" }}
          />
        </span>
        <span>digitando…</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-red-500 font-medium">
      <span className="relative grid place-items-center">
        <span className="absolute inline-flex h-3 w-3 rounded-full bg-red-500/40 animate-ping" />
        <Mic className="h-3 w-3 relative" />
      </span>
      <span>gravando áudio…</span>
    </div>
  );
}

function ChatThread() {
  const { id } = Route.useParams();
  type ChatCache = {
    headerName: string;
    messages: Msg[];
    chat: ChatInfo | null;
    peerAvatar: string | null;
    peerShortCode: string | null;
    profileName: string;
    otherUserId: string | null;
    peerIsPlus?: boolean;
  };
  const cached = cache.get<ChatCache>(`chat-${id}`);
  const [me, setMe] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatInfo | null>(cached?.chat ?? null);
  const [headerName, setHeaderName] = useState(cached?.headerName ?? "");
  const [otherUserId, setOtherUserId] = useState<string | null>(cached?.otherUserId ?? null);
  const [profileName, setProfileName] = useState<string>(cached?.profileName ?? "");
  const [peerAvatar, setPeerAvatar] = useState<string | null>(cached?.peerAvatar ?? null);
  const [peerShortCode, setPeerShortCode] = useState<string | null>(cached?.peerShortCode ?? null);
  const [peerIsPlus, setPeerIsPlus] = useState<boolean>(cached?.peerIsPlus ?? false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [viewProfile, setViewProfile] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(cached?.messages ?? []);
  const justSelectedRef = useRef(false);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [viewLoc, setViewLoc] = useState<LocPayload | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const isAtBottomRef = useRef(true);
  const scrollToBottom = (smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordStartRef = useRef<number>(0);
  const cancelledRef = useRef(false);
  const pressStartXRef = useRef<number>(0);
  const pressCancelRef = useRef(false);
  const [slideCancel, setSlideCancel] = useState(false);

  // Peer activity (typing / recording indicator)
  const [peerActivity, setPeerActivity] = useState<"typing" | "recording" | null>(null);
  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peerActivityTimer = useRef<number | null>(null);
  const typingSentAtRef = useRef<number>(0);
  function broadcastActivity(kind: "typing" | "recording" | "idle") {
    const ch = presenceChRef.current;
    if (!ch || !me) return;
    try {
      void ch.send({ type: "broadcast", event: "activity", payload: { from: me, kind } });
    } catch {}
  }
  function broadcastMessage(message: Msg) {
    const ch = chatChannelRef.current;
    if (!ch || !me) return;
    try {
      void ch.send({
        type: "broadcast",
        event: "message",
        payload: { from: me, chatId: id, messageId: message.id },
      });
    } catch {}
  }

  function clearUnreadCache() {
    const listCache = cache.get<any>("chats-list");
    if (!listCache?.unread?.[id]) return;
    cache.set("chats-list", {
      ...listCache,
      unread: { ...listCache.unread, [id]: 0 },
    });
  }

  async function markCurrentChatRead(userId = me) {
    if (!userId) return;
    clearUnreadCache();
    await supabase
      .from("chat_reads")
      .upsert(
        { chat_id: id, user_id: userId, last_read_at: new Date().toISOString() },
        { onConflict: "chat_id,user_id" },
      );
  }

  // Calls
  const [call, setCall] = useState<{
    mode: "audio" | "video";
    role: "caller" | "callee";
    offer?: RTCSessionDescriptionInit;
    eventId?: string;
  } | null>(null);
  const [incoming, setIncoming] = useState<{
    mode: "audio" | "video";
    offer: RTCSessionDescriptionInit;
    from: string;
    eventId?: string;
  } | null>(null);

  // Selection (long-press to select messages)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const longPressTimer = useRef<number | null>(null);
  function clearSelection() {
    setSelected(new Set());
  }
  function toggleSelect(msgId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }
  function onBubblePointerDown(msgId: string, e?: React.PointerEvent) {
    if (e && (e.button === 2 || (e.pointerType === "mouse" && e.button !== 0))) return;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    const hold = e?.pointerType === "mouse" ? 280 : 380;
    longPressTimer.current = window.setTimeout(() => {
      try {
        navigator.vibrate?.(15);
      } catch {}
      justSelectedRef.current = true;
      toggleSelect(msgId);
      window.setTimeout(() => {
        justSelectedRef.current = false;
      }, 600);
    }, hold);
  }
  function onBubblePointerUp() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }
  function onBubbleClick(msgId: string, e: React.MouseEvent) {
    if (justSelectedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (selected.size > 0) {
      e.preventDefault();
      e.stopPropagation();
      toggleSelect(msgId);
    }
  }
  async function copySelected() {
    const parts = messages
      .filter((m) => selected.has(m.id))
      .map((m) => {
        if (m.message_type === "audio") return "[áudio]";
        if (m.message_type === "image") return m.media_url || "[imagem]";
        if (m.message_type === "video") return m.media_url || "[vídeo]";
        if (m.message_type === "location") {
          const loc = parseLocation(m.content);
          return loc
            ? `${loc.label || "Localização"}: https://maps.google.com/?q=${loc.lat},${loc.lng}`
            : m.content;
        }
        if (m.message_type === "call") return "[ligação]";
        return m.content;
      });
    try {
      await navigator.clipboard.writeText(parts.join("\n"));
      toast.success(parts.length > 1 ? "Mensagens copiadas" : "Mensagem copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
    clearSelection();
  }
  async function deleteSelected() {
    const ids = Array.from(selected).filter((i) => !i.startsWith("temp-"));
    if (ids.length === 0) {
      clearSelection();
      return;
    }
    const { error } = await supabase.from("chat_messages").delete().in("id", ids);
    if (error) {
      toast.error("Falha ao apagar");
      return;
    }
    setMessages((prev) => prev.filter((m) => !selected.has(m.id)));
    clearSelection();
  }
  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(ensureHref(url));
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.stop();
      } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    (async () => {
      const userId = await getCurrentUserId();
      if (!userId) return;
      setMe(userId);

      const { data: c } = await supabase
        .from("chats")
        .select("id,type,name,avatar_url")
        .eq("id", id)
        .maybeSingle();
      if (!c) return;
      const chatInfo = c as ChatInfo;
      setChat(chatInfo);

      let name = cached?.headerName || "Conversa";
      let peerAv: string | null = cached?.peerAvatar ?? null;
      let peerSc: string | null = cached?.peerShortCode ?? null;
      let profName: string = cached?.profileName ?? "";
      let otherId: string | null = cached?.otherUserId ?? null;
      let isPlus: boolean = cached?.peerIsPlus ?? false;
      if (c.type === "group") {
        name = c.name || "Grupo";
        setHeaderName(name);
      } else {
        const { data: members } = await supabase
          .from("chat_members")
          .select("user_id")
          .eq("chat_id", id);
        otherId = (members ?? []).map((m) => m.user_id).find((uid) => uid !== userId) ?? null;
        if (otherId) {
          setOtherUserId(otherId);
          const { data: p } = await supabase
            .from("profiles")
            .select("full_name,username,avatar_url,short_code,is_plus")
            .eq("id", otherId)
            .maybeSingle();
          profName = p?.full_name || p?.username || "Usuário";
          peerAv = (p as any)?.avatar_url || null;
          peerSc = (p as any)?.short_code || null;
          isPlus = !!(p as any)?.is_plus;
          setProfileName(profName);
          setPeerAvatar(peerAv);
          setPeerShortCode(peerSc);
          setPeerIsPlus(isPlus);
          const nicks = await fetchNicknames([otherId]);
          name = nicks[otherId] || profName;
          setHeaderName(name);
        }
      }

      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("id,chat_id,sender_id,content,created_at,message_type,media_url,duration_ms")
        .eq("chat_id", id)
        .order("created_at", { ascending: true });
      const list = (msgs ?? []) as Msg[];
      setMessages(list);
      cache.set<ChatCache>(`chat-${id}`, {
        headerName: name,
        messages: list,
        chat: chatInfo,
        peerAvatar: peerAv,
        peerShortCode: peerSc,
        profileName: profName,
        otherUserId: otherId,
        peerIsPlus,
      });
      // Force scroll to bottom on initial open, including after async images load
      requestAnimationFrame(() => {
        scrollToBottom(false);
        requestAnimationFrame(() => scrollToBottom(false));
        setTimeout(() => scrollToBottom(false), 120);
        setTimeout(() => scrollToBottom(false), 400);
      });
      // Mark this chat as read for the current user
      void markCurrentChatRead(userId);
    })();

    const channelKey = `chat-thread-${id}`;
    const ch = supabase
      .channel(channelKey, { config: { broadcast: { self: false }, presence: { key: "" } } })
      .on("broadcast", { event: "message" }, async ({ payload }: any) => {
        if (!payload || payload.chatId !== id || payload.from === me || !payload.messageId) return;
        let exists = false;
        setMessages((prev) => {
          exists = prev.some((m) => m.id === payload.messageId);
          return prev;
        });
        if (exists) return;
        const { data } = await supabase
          .from("chat_messages")
          .select("id,chat_id,sender_id,content,created_at,message_type,media_url,duration_ms")
          .eq("id", payload.messageId)
          .maybeSingle();
        if (!data) return;
        setMessages((prev) =>
          prev.find((m) => m.id === data.id)
            ? prev
            : [...prev, { ...(data as Msg), status: "sent" }],
        );
        requestAnimationFrame(() =>
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
        );
        // Pre-resolve any media URL so it appears instantly when rendered
        if ((data as Msg).media_url) void resolveMediaUrl((data as Msg).media_url || "");
        // Mark chat as read since the user is actively viewing it
        if (me) void markCurrentChatRead(me);
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${id}` },
        (payload) => {
          const incoming = payload.new as Msg;
          if (incoming.media_url) void resolveMediaUrl(incoming.media_url);
          setMessages((prev) => {
            const tempIdx = prev.findIndex(
              (m) =>
                m.id.startsWith("temp-") &&
                m.sender_id === incoming.sender_id &&
                m.content === incoming.content &&
                m.status !== "failed",
            );
            let next: Msg[];
            if (tempIdx >= 0) {
              next = [...prev];
              next[tempIdx] = { ...incoming, status: "sent" };
            } else if (prev.find((m) => m.id === incoming.id)) {
              return prev;
            } else {
              next = [...prev, { ...incoming, status: "sent" }];
            }
            return next;
          });
          requestAnimationFrame(() =>
            scrollRef.current?.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: "smooth",
            }),
          );
          if (me && incoming.sender_id !== me) void markCurrentChatRead(me);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `chat_id=eq.${id}` },
        (payload) => {
          const updated = payload.new as Msg;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages", filter: `chat_id=eq.${id}` },
        (payload) => {
          const old = payload.old as { id?: string };
          if (!old?.id) return;
          setMessages((prev) => prev.filter((m) => m.id !== old.id));
        },
      )
      .subscribe();
    chatChannelRef.current = ch;
    return () => {
      if (chatChannelRef.current === ch) chatChannelRef.current = null;
      supabase.removeChannel(ch);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Listen for incoming calls on this chat. Use a page-unique channel name
  // to avoid collision with the global `call-${chatId}` channel opened by
  // the authenticated layout (Supabase reuses channels by name, which causes
  // "cannot add 'postgres_changes' callbacks after subscribe()" when two
  // effects target the same name).
  useEffect(() => {
    if (!me) return;
    const ch = supabase
      .channel(`call-page-${id}-${me}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "offer" }, ({ payload }: any) => {
        if (!payload || payload.from === me) return;
        setIncoming((cur) => cur ?? { mode: payload.mode, offer: payload.sdp, from: payload.from });
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_events",
          filter: `recipient_id=eq.${me}`,
        },
        ({ new: row }: any) => {
          if (!row || row.chat_id !== id || row.caller_id === me || row.status !== "ringing")
            return;
          setIncoming(
            (cur) =>
              cur ?? { mode: row.mode, offer: row.offer, from: row.caller_id, eventId: row.id },
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, me]);

  // Presence channel: broadcast typing/recording and listen for the peer's.
  useEffect(() => {
    if (!me) return;
    const ch = supabase.channel(`presence-${id}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "activity" }, ({ payload }: any) => {
      if (!payload || payload.from === me) return;
      if (peerActivityTimer.current) {
        window.clearTimeout(peerActivityTimer.current);
        peerActivityTimer.current = null;
      }
      if (payload.kind === "idle") {
        setPeerActivity(null);
      } else {
        setPeerActivity(payload.kind);
        // Auto-clear in case the "idle" event is missed
        peerActivityTimer.current = window.setTimeout(() => setPeerActivity(null), 5000);
      }
    }).subscribe();
    presenceChRef.current = ch;
    return () => {
      presenceChRef.current = null;
      if (peerActivityTimer.current) {
        window.clearTimeout(peerActivityTimer.current);
        peerActivityTimer.current = null;
      }
      try {
        void ch.send({ type: "broadcast", event: "activity", payload: { from: me, kind: "idle" } });
      } catch {}
      supabase.removeChannel(ch);
    };
  }, [id, me]);

  useEffect(() => {
    if (!me) return;
    const pending = callStore.consumePending(id);
    if (pending) {
      setCall({
        mode: pending.mode,
        role: "callee",
        offer: pending.offer,
        eventId: pending.eventId,
      });
    }
    const applyIncoming = (inc: ReturnType<typeof callStore.get>) => {
      if (!inc || inc.chatId !== id || inc.from === me) return;
      setIncoming(
        (cur) => cur ?? { mode: inc.mode, offer: inc.offer, from: inc.from, eventId: inc.eventId },
      );
      callStore.set(null);
    };
    applyIncoming(callStore.get());
    return callStore.subscribe(applyIncoming);
  }, [id, me]);

  async function send() {
    if (!text.trim() || !me || sending) return;
    setSending(true);
    const content = text.trim();
    setText("");
    broadcastActivity("idle");
    typingSentAtRef.current = 0;

    const tempId = `temp-${Date.now()}`;
    const optimistic: Msg = {
      id: tempId,
      chat_id: id,
      sender_id: me,
      content,
      created_at: new Date().toISOString(),
      status: "sending",
      message_type: "text",
    };
    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
    );
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ chat_id: id, sender_id: me, content, message_type: "text" })
      .select("id,chat_id,sender_id,content,created_at,message_type,media_url,duration_ms")
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
    } else if (data) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev.filter((m) => m.id !== tempId);
        return prev.map((m) => (m.id === tempId ? { ...(data as Msg), status: "sent" } : m));
      });
      broadcastMessage(data as Msg);
    }
    setSending(false);
  }

  async function retry(failed: Msg) {
    if (!me) return;
    setMessages((prev) => prev.map((m) => (m.id === failed.id ? { ...m, status: "sending" } : m)));
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        chat_id: id,
        sender_id: me,
        content: failed.content,
        message_type: failed.message_type ?? "text",
        media_url: failed.media_url,
        duration_ms: failed.duration_ms,
      })
      .select("id,chat_id,sender_id,content,created_at,message_type,media_url,duration_ms")
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      setMessages((prev) => prev.map((m) => (m.id === failed.id ? { ...m, status: "failed" } : m)));
    } else if (data) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev.filter((m) => m.id !== failed.id);
        return prev.map((m) => (m.id === failed.id ? { ...(data as Msg), status: "sent" } : m));
      });
      broadcastMessage(data as Msg);
    }
  }

  async function startRecording() {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      cancelledRef.current = false;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        if (recordTimerRef.current) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        const duration = Date.now() - recordStartRef.current;
        setRecording(false);
        setRecordSecs(0);
        broadcastActivity("idle");
        if (cancelledRef.current) return;

        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        await uploadAndSendAudio(blob, duration);
      };
      recorderRef.current = rec;
      recordStartRef.current = Date.now();
      rec.start();
      setRecording(true);
      broadcastActivity("recording");

      setRecordSecs(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordSecs(Math.floor((Date.now() - recordStartRef.current) / 1000));
      }, 250);
    } catch (e: any) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      toast.error("Não foi possível acessar o microfone");
    }
  }

  function stopRecording(cancel = false) {
    cancelledRef.current = cancel;
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {}
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function uploadAndSendAudio(blob: Blob, durationMs: number) {
    if (!me) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: Msg = {
      id: tempId,
      chat_id: id,
      sender_id: me,
      content: "[áudio]",
      created_at: new Date().toISOString(),
      status: "sending",
      message_type: "audio",
      duration_ms: durationMs,
      media_url: URL.createObjectURL(blob),
    };
    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
    );

    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    const path = `${id}/${me}/${Date.now()}.${ext}`;
    try {
      await uploadToBucketWithProgress(VOICE_MEDIA_BUCKET, path, blob, blob.type || "audio/webm", (pct) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, upload_progress: pct } : m)),
        );
      });
    } catch {
      toast.error("Falha ao enviar áudio");
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
      return;
    }
    const mediaUrl = storedMediaRef(VOICE_MEDIA_BUCKET, path);
    try {
      await waitForStoredMedia(mediaUrl, blob.size);
    } catch {
      toast.error("Áudio enviado, mas ainda não está pronto");
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
      return;
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        chat_id: id,
        sender_id: me,
        content: "[áudio]",
        message_type: "audio",
        media_url: mediaUrl,
        duration_ms: durationMs,
      })
      .select("id,chat_id,sender_id,content,created_at,message_type,media_url,duration_ms")
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
    } else if (data) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev.filter((m) => m.id !== tempId);
        return prev.map((m) => (m.id === tempId ? { ...(data as Msg), status: "sent" } : m));
      });
      broadcastMessage(data as Msg);
    }
  }

  async function handlePickImage(file: File) {
    if (!me || !file) return;
    setShowAttach(false);
    const isVideo = file.type.startsWith("video/");
    const isImg = file.type.startsWith("image/");
    if (!isImg && !isVideo) {
      toast.error("Selecione uma imagem ou vídeo");
      return;
    }
    const sizeLimit = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > sizeLimit) {
      toast.error(isVideo ? "Vídeo muito grande (máx 100MB)" : "Imagem muito grande (máx 10MB)");
      return;
    }
    const kind: "image" | "video" = isVideo ? "video" : "image";
    const placeholder = isVideo ? "[vídeo]" : "[imagem]";
    const tempId = `temp-${Date.now()}`;
    const previewUrl = URL.createObjectURL(file);
    const optimistic: Msg = {
      id: tempId,
      chat_id: id,
      sender_id: me,
      content: placeholder,
      created_at: new Date().toISOString(),
      status: "sending",
      message_type: kind,
      media_url: previewUrl,
    };
    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
    );

    const ext = file.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
    const path = `${id}/${me}/${Date.now()}.${ext}`;
    const contentType = guessContentType(file);
    try {
      await uploadToBucketWithProgress(CHAT_MEDIA_BUCKET, path, file, contentType, (pct) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, upload_progress: pct } : m)),
        );
      });
    } catch (upErr: any) {
      toast.error(isVideo ? "Falha ao enviar vídeo" : "Falha ao enviar imagem");
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
      return;
    }
    const mediaUrl = storedMediaRef(CHAT_MEDIA_BUCKET, path);
    try {
      await waitForStoredMedia(mediaUrl, file.size);
    } catch {
      toast.error(isVideo ? "Vídeo enviado, mas ainda não está pronto" : "Imagem enviada, mas ainda não está pronta");
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
      return;
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        chat_id: id,
        sender_id: me,
        content: placeholder,
        message_type: kind,
        media_url: mediaUrl,
      })
      .select("id,chat_id,sender_id,content,created_at,message_type,media_url,duration_ms")
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
    } else if (data) {
      // Keep the local blob preview URL on the sender's side so the image/video
      // does not need to re-fetch a signed URL and never flickers to black.
      const merged: Msg = { ...(data as Msg), media_url: previewUrl, status: "sent" };
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev.filter((m) => m.id !== tempId);
        return prev.map((m) => (m.id === tempId ? merged : m));
      });
      broadcastMessage(data as Msg);
    }
  }

  async function handlePickFile(file: File) {
    if (!me || !file) return;
    setShowAttach(false);
    const plus = await import("@/lib/use-plus");
    const { isPlus } = await plus.refreshPlus();
    const limit = isPlus ? Number.POSITIVE_INFINITY : plus.FREE_UPLOAD_BYTES;
    if (file.size > limit) {
      toast.error(`Arquivo acima de 1 GB. Assine o PLUS para enviar arquivos ilimitados.`, {
        action: {
          label: "Assinar PLUS",
          onClick: () => {
            window.location.href = "/plus";
          },
        },
      });
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const meta: FilePayload = { name: file.name, size: file.size, mime: file.type || undefined };
    const content = JSON.stringify(meta);
    const optimistic: Msg = {
      id: tempId,
      chat_id: id,
      sender_id: me,
      content,
      created_at: new Date().toISOString(),
      status: "sending",
      message_type: "file",
      media_url: URL.createObjectURL(file),
    };
    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
    );

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const path = `${id}/${me}/${Date.now()}-${safeName}`;
    try {
      await uploadToBucketWithProgress(
        CHAT_MEDIA_BUCKET,
        path,
        file,
        file.type || "application/octet-stream",
        (pct) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, upload_progress: pct } : m)),
          );
        },
      );
    } catch {
      toast.error("Falha ao enviar arquivo");
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
      return;
    }
    const mediaUrl = storedMediaRef(CHAT_MEDIA_BUCKET, path);
    try {
      await waitForStoredMedia(mediaUrl, file.size);
    } catch {
      toast.error("Arquivo enviado, mas ainda não está pronto");
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
      return;
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ chat_id: id, sender_id: me, content, message_type: "file", media_url: mediaUrl })
      .select("id,chat_id,sender_id,content,created_at,message_type,media_url,duration_ms")
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
    } else if (data) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev.filter((m) => m.id !== tempId);
        return prev.map((m) => (m.id === tempId ? { ...(data as Msg), status: "sent" } : m));
      });
      broadcastMessage(data as Msg);
    }
  }

  function openLocationPicker() {
    setShowAttach(false);
    setPicker(true);
  }

  async function sendLocation(loc: { lat: number; lng: number; label: string; address: string }) {
    if (!me) return;
    setPicker(false);
    const payload: LocPayload = {
      lat: loc.lat,
      lng: loc.lng,
      label: loc.label,
      address: loc.address,
    };
    const content = JSON.stringify(payload);
    const tempId = `temp-${Date.now()}`;
    const optimistic: Msg = {
      id: tempId,
      chat_id: id,
      sender_id: me,
      content,
      created_at: new Date().toISOString(),
      status: "sending",
      message_type: "location",
    };
    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
    );
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ chat_id: id, sender_id: me, content, message_type: "location" })
      .select("id,chat_id,sender_id,content,created_at,message_type,media_url,duration_ms")
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
    } else if (data) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev.filter((m) => m.id !== tempId);
        return prev.map((m) => (m.id === tempId ? { ...(data as Msg), status: "sent" } : m));
      });
      broadcastMessage(data as Msg);
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] relative">
      <header className="app-header px-3 py-3 flex items-center gap-2">
        <Link to="/chats" className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {chat?.type === "group" ? (
          <Link
            to="/groups/$id/edit"
            params={{ id }}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <div className="h-9 w-9 rounded-full bg-gradient-brand grid place-items-center text-white text-sm font-semibold overflow-hidden">
              {chat?.avatar_url ? (
                <img src={chat.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (headerName || "").charAt(0).toUpperCase()
              )}
            </div>
            <div className="font-semibold truncate">{headerName}</div>
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setViewProfile(true)}
              className="h-9 w-9 rounded-full bg-gradient-brand grid place-items-center text-white text-sm font-semibold overflow-hidden shrink-0"
              aria-label="Ver perfil"
            >
              {peerAvatar ? (
                <img src={peerAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                (headerName || "").charAt(0).toUpperCase()
              )}
            </button>
            <div className="flex-1 min-w-0 flex flex-col leading-tight">
              <div className="font-semibold truncate flex items-center gap-1.5 min-w-0">
                <span className="truncate">{headerName}</span>
                {peerIsPlus && <VerifiedBadge />}
                {otherUserId && (
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(headerName || profileName || "");
                      setEditingName(true);
                    }}
                    className="h-7 w-7 grid place-items-center rounded-full hover:bg-muted text-muted-foreground shrink-0"
                    aria-label="Editar nome"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {peerActivity && <PeerActivityIndicator kind={peerActivity} />}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setCall({ mode: "video", role: "caller" })}
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted"
          aria-label="Chamada de vídeo"
        >
          <Video className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setCall({ mode: "audio", role: "caller" })}
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted"
          aria-label="Chamada de voz"
        >
          <Phone className="h-5 w-5" />
        </button>
      </header>

      <div
        ref={scrollRef}
        className="chat-thread flex-1 overflow-y-auto px-3 py-3 space-y-1.5"
        style={{ background: "color-mix(in oklab, var(--color-muted) 50%, transparent)" }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
          const atBottom = distance < 80;
          isAtBottomRef.current = atBottom;
          setShowScrollDown(!atBottom && distance > 200);
        }}
      >
        {messages.map((m, i) => {
          const mine = m.sender_id === me;
          const prev = messages[i - 1];
          const sameSender = prev && prev.sender_id === m.sender_id;
          const isAudio = m.message_type === "audio" && m.media_url;
          const isImage = m.message_type === "image" && m.media_url;
          const isVideo = m.message_type === "video" && m.media_url;
          const isLocation = m.message_type === "location";
          const isFile = m.message_type === "file" && m.media_url;
          const callInfo = m.message_type === "call" ? parseCall(m.content) : null;
          const isSel = selected.has(m.id);
          const isText = !callInfo && !isAudio && !isImage && !isVideo && !isLocation && !isFile;

          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"} ${isSel ? "bg-primary/10 -mx-3 px-3 py-0.5 rounded-none" : ""}`}
              onPointerDown={(e) => onBubblePointerDown(m.id, e)}
              onPointerUp={onBubblePointerUp}
              onPointerCancel={onBubblePointerUp}
              onPointerLeave={onBubblePointerUp}
              onClick={(e) => onBubbleClick(m.id, e)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (longPressTimer.current) {
                  window.clearTimeout(longPressTimer.current);
                  longPressTimer.current = null;
                }
                if (!selected.has(m.id)) toggleSelect(m.id);
              }}
            >
              <div
                className={`chat-bubble ${mine ? "chat-bubble-out" : "chat-bubble-in"} max-w-[78%] px-2.5 py-1.5 text-[15px] leading-snug shadow-card ${mine ? "bg-[color:var(--color-bubble-out)] text-foreground rounded-2xl rounded-br-md" : "bg-[color:var(--color-bubble-in)] rounded-2xl rounded-bl-md"} ${sameSender ? "mt-0.5" : "mt-2"} ${isSel ? "ring-2 ring-primary" : ""}`}
              >
                {callInfo ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      if (selected.size > 0) return;
                      e.stopPropagation();
                      setCall({ mode: callInfo.mode, role: "caller" });
                    }}
                    className="flex items-center gap-2.5 px-1 py-1 min-w-[180px] text-left"
                    aria-label="Ligar novamente"
                  >
                    <div
                      className={`h-9 w-9 rounded-full grid place-items-center ${callInfo.outcome === "missed" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}
                    >
                      {callInfo.outcome === "missed" ? (
                        <PhoneMissed className="h-4 w-4" />
                      ) : mine ? (
                        <PhoneOutgoing className="h-4 w-4" />
                      ) : (
                        <PhoneIncoming className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold flex items-center gap-1">
                        {callInfo.mode === "video" ? (
                          <Video className="h-3.5 w-3.5" />
                        ) : (
                          <Phone className="h-3.5 w-3.5" />
                        )}
                        {callInfo.outcome === "missed"
                          ? `Ligação de ${callInfo.mode === "video" ? "vídeo" : "voz"} perdida`
                          : `Ligação de ${callInfo.mode === "video" ? "vídeo" : "voz"}`}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {callInfo.outcome === "missed"
                          ? "Toque para ligar"
                          : `Duração ${formatCallDuration(callInfo.duration_ms)}`}
                      </div>
                    </div>
                  </button>
                ) : isAudio ? (
                  <AudioBubble url={m.media_url as string} duration={m.duration_ms} />
                ) : isImage ? (
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          if (selected.size > 0) return;
                          e.stopPropagation();
                          setLightbox(m.media_url!);
                        }}
                        onContextMenu={(e) => e.stopPropagation()}
                        className="relative block"
                      >
                        <MediaImage
                          src={m.media_url!}
                          alt=""
                          className="rounded-md max-h-72 object-cover"
                          loading="lazy"
                        />
                        {m.status === "sending" && typeof m.upload_progress === "number" && (
                          <div className="absolute inset-0 grid place-items-center bg-black/40 rounded-md">
                            <div className="w-3/4 max-w-[180px] text-center">
                              <div className="text-[11px] text-white mb-1">
                                Enviando… {m.upload_progress}%
                              </div>
                              <div className="h-1.5 w-full bg-white/25 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-white transition-all"
                                  style={{ width: `${m.upload_progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onSelect={() => downloadMedia(m.media_url!)}>
                        <Download className="h-4 w-4 mr-2" /> Salvar
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : isVideo ? (
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <div
                        onContextMenu={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          if (selected.size > 0) return;
                          e.stopPropagation();
                        }}
                        className="relative block"
                      >
                        <MediaVideo src={m.media_url!} className="rounded-md max-h-72 max-w-full" />
                        {m.status === "sending" && typeof m.upload_progress === "number" && (
                          <div className="absolute inset-0 grid place-items-center bg-black/55 rounded-md">
                            <div className="w-3/4 max-w-[200px] text-center">
                              <div className="text-[12px] text-white mb-1.5 font-medium">
                                Enviando vídeo… {m.upload_progress}%
                              </div>
                              <div className="h-2 w-full bg-white/25 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-white transition-all"
                                  style={{ width: `${m.upload_progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onSelect={() => downloadMedia(m.media_url!, `video-${Date.now()}.mp4`)}
                      >
                        <Download className="h-4 w-4 mr-2" /> Salvar
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ) : isLocation ? (
                  <LocationBubble
                    content={m.content}
                    onOpen={(loc) => {
                      if (selected.size > 0) return;
                      setViewLoc(loc);
                    }}
                  />
                ) : isFile ? (
                  <FileBubble url={m.media_url as string} content={m.content} />
                ) : (
                  <button
                    type="button"
                    onClick={async (e) => {
                      if (selected.size > 0) return;
                      e.stopPropagation();
                      try {
                        await navigator.clipboard.writeText(m.content);
                        toast.success("Mensagem copiada");
                      } catch {
                        toast.error("Não foi possível copiar");
                      }
                    }}
                    className="text-left whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word] px-1 w-full cursor-pointer overflow-x-auto"
                    aria-label="Copiar mensagem"
                  >
                    {m.content}
                  </button>
                )}
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {mine && m.status === "sending" && (
                    <Clock className="h-3 w-3 text-muted-foreground" aria-label="Enviando" />
                  )}
                  {mine && m.status === "sent" && (
                    <CheckCheck
                      className="h-3.5 w-3.5 text-muted-foreground"
                      aria-label="Enviado"
                    />
                  )}
                  {mine && !m.status && m.id && !m.id.startsWith("temp-") && (
                    <Check className="h-3.5 w-3.5 text-muted-foreground" aria-label="Enviado" />
                  )}
                  {mine && m.status === "failed" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        retry(m);
                      }}
                      className="inline-flex items-center gap-0.5 text-[10px] text-destructive"
                      aria-label="Falhou — toque para tentar novamente"
                    >
                      <AlertCircle className="h-3.5 w-3.5" /> Falhou
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showScrollDown && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          aria-label="Ir para a última mensagem"
          className="absolute right-3 bottom-20 h-10 w-10 rounded-full bg-background border shadow-card grid place-items-center text-foreground/80 hover:bg-muted z-20"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}



      {selected.size > 0 ? (
        (() => {
          const sel = messages.filter((m) => selected.has(m.id));
          const onlyAudio = sel.length > 0 && sel.every((m) => m.message_type === "audio");
          const canDelete = sel.some((m) => m.sender_id === me);
          return (
            <div
              className="border-t bg-background px-3 py-2 flex items-center gap-2"
              style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
            >
              <button
                type="button"
                onClick={clearSelection}
                className="h-11 w-11 rounded-full hover:bg-muted grid place-items-center"
                aria-label="Cancelar seleção"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex-1 text-sm font-semibold">
                {selected.size} selecionada{selected.size > 1 ? "s" : ""}
              </div>
              {!onlyAudio && (
                <button
                  type="button"
                  onClick={copySelected}
                  className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-primary/15 text-primary text-sm font-semibold hover:bg-primary/25"
                >
                  <Copy className="h-4 w-4" /> Copiar
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-destructive/15 text-destructive text-sm font-semibold hover:bg-destructive/25"
                >
                  <Trash2 className="h-4 w-4" /> Apagar
                </button>
              )}
            </div>
          );
        })()
      ) : recording ? (
        <div
          className="border-t bg-background px-3 py-2 flex items-center gap-2 animate-fade-in"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={() => stopRecording(true)}
            className="h-11 w-11 rounded-full bg-muted text-destructive grid place-items-center hover-scale"
            aria-label="Cancelar gravação"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-full border transition-colors ${slideCancel ? "bg-destructive/15 border-destructive/40" : "bg-input/60"}`}>
            <span className="relative grid place-items-center h-3 w-3">
              <span className="absolute inset-0 rounded-full bg-destructive/40 animate-ping" />
              <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
            </span>
            <div className="flex items-end gap-[3px] h-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full bg-destructive/80"
                  style={{
                    animation: `wave 0.9s ease-in-out ${i * 0.12}s infinite`,
                    height: "40%",
                  }}
                />
              ))}
            </div>
            <span className="text-sm tabular-nums font-medium">
              {slideCancel ? "Solte para cancelar" : `${Math.floor(recordSecs / 60)}:${(recordSecs % 60).toString().padStart(2, "0")}`}
            </span>
            <span className="ml-auto text-xs text-muted-foreground hidden xs:inline">← deslize p/ cancelar</span>
          </div>
          <button
            type="button"
            onClick={() => stopRecording(false)}
            className="h-11 w-11 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-soft hover-scale"
            aria-label="Enviar áudio"
          >
            <Send className="h-5 w-5" />
          </button>
          <style>{`@keyframes wave { 0%,100% { height: 25%; } 50% { height: 100%; } }`}</style>
        </div>
      ) : (
        <div className="relative">
          {showAttach && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAttach(false)} />
              <div className="absolute bottom-full left-2 mb-2 z-20 bg-popover border rounded-2xl shadow-xl p-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAttach(false);
                    if (Capacitor.isNativePlatform()) setShowGallery(true);
                    else fileRef.current?.click();
                  }}
                  className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-muted"
                >
                  <div className="h-11 w-11 rounded-full bg-primary/15 text-primary grid place-items-center">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <span className="text-xs">Foto/Vídeo</span>
                </button>
                <button
                  type="button"
                  onClick={() => docRef.current?.click()}
                  className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-muted"
                >
                  <div className="h-11 w-11 rounded-full bg-primary/15 text-primary grid place-items-center">
                    <FileIcon className="h-5 w-5" />
                  </div>
                  <span className="text-xs">Arquivo</span>
                </button>
                <button
                  type="button"
                  onClick={openLocationPicker}
                  className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-muted"
                >
                  <div className="h-11 w-11 rounded-full bg-primary/15 text-primary grid place-items-center">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <span className="text-xs">Local</span>
                </button>
              </div>
            </>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t bg-background px-3 py-2 flex items-end gap-2 min-w-0"
            style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePickImage(f);
                e.currentTarget.value = "";
              }}
            />
            <input
              ref={docRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePickFile(f);
                e.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => setShowAttach((v) => !v)}
              className="h-11 w-11 rounded-full hover:bg-muted grid place-items-center text-muted-foreground"
              aria-label="Anexar"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <textarea
              value={text}
              rows={1}
              onChange={(e) => {
                setText(e.target.value);
                const el = e.target as HTMLTextAreaElement;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
                const now = Date.now();
                if (e.target.value && now - typingSentAtRef.current > 1500) {
                  typingSentAtRef.current = now;
                  broadcastActivity("typing");
                }
                if (!e.target.value) {
                  broadcastActivity("idle");
                  typingSentAtRef.current = 0;
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              onBlur={() => {
                broadcastActivity("idle");
                typingSentAtRef.current = 0;
              }}
              placeholder="Mensagem"
              className="flex-1 min-w-0 w-0 rounded-2xl bg-input/60 px-4 py-2.5 outline-none border focus:ring-2 focus:ring-ring resize-none whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word] max-h-[120px] overflow-y-auto"
            />
            {text.trim() ? (
              <button
                type="submit"
                disabled={sending}
                className="h-11 w-11 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-soft disabled:opacity-50"
                aria-label="Enviar"
              >
                <Send className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
                  pressStartXRef.current = e.clientX;
                  pressCancelRef.current = false;
                  void startRecording();
                }}
                onPointerMove={(e) => {
                  if (!recording) return;
                  const dx = pressStartXRef.current - e.clientX;
                  // Slide left > 80px to mark as cancel-on-release (WhatsApp-style)
                  pressCancelRef.current = dx > 80;
                  setSlideCancel(pressCancelRef.current);
                }}
                onPointerUp={(e) => {
                  try { (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId); } catch {}
                  const heldMs = Date.now() - recordStartRef.current;
                  if (pressCancelRef.current) {
                    stopRecording(true);
                  } else if (heldMs < 1000) {
                    // Mensagens de voz precisam ter pelo menos 1 segundo
                    stopRecording(true);
                    toast.message("Segure por pelo menos 1 segundo para enviar");
                  } else {
                    stopRecording(false);
                  }
                  setSlideCancel(false);
                }}
                onPointerCancel={() => {
                  stopRecording(true);
                  setSlideCancel(false);
                }}
                onContextMenu={(e) => e.preventDefault()}
                className={`relative h-11 w-11 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-soft select-none touch-none transition-transform ${recording ? "scale-125" : ""}`}
                aria-label="Segure para gravar áudio"
              >
                {recording && (
                  <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                )}
                <Mic className="h-5 w-5 relative" />
              </button>
            )}
          </form>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 grid place-items-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white grid place-items-center"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
          <MediaImage src={lightbox} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}

      {incoming && !call && (
        <IncomingCallPrompt
          peerName={headerName}
          mode={incoming.mode}
          onAccept={() => {
            const i = incoming;
            setIncoming(null);
            if (i.eventId)
              void (supabase as any)
                .from("call_events")
                .update({ status: "accepted" })
                .eq("id", i.eventId);
            setCall({ mode: i.mode, role: "callee", offer: i.offer, eventId: i.eventId });
          }}
          onReject={() => {
            if (incoming.eventId)
              void (supabase as any)
                .from("call_events")
                .update({ status: "declined" })
                .eq("id", incoming.eventId);
            setIncoming(null);
          }}
        />
      )}

      {call && me && (
        <CallView
          chatId={id}
          me={me}
          peerName={headerName}
          mode={call.mode}
          role={call.role}
          offerSdp={call.offer ?? null}
          callEventId={call.eventId}
          onClose={() => setCall(null)}
        />
      )}
      {picker && <LocationPicker onCancel={() => setPicker(false)} onSend={sendLocation} />}
      {viewLoc && (
        <LocationViewer
          lat={viewLoc.lat}
          lng={viewLoc.lng}
          initialLabel={viewLoc.label}
          initialAddress={viewLoc.address}
          onClose={() => setViewLoc(null)}
        />
      )}
      {editingName && otherUserId && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4"
          onClick={() => setEditingName(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card border shadow-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-3">Nome do contato</h3>
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  try {
                    await saveNickname(otherUserId, nameDraft);
                    setHeaderName(nameDraft.trim() || profileName);
                    setEditingName(false);
                    toast.success("Nome salvo");
                  } catch (err: any) {
                    toast.error(err?.message || "Erro ao salvar");
                  }
                } else if (e.key === "Escape") setEditingName(false);
              }}
              placeholder="Nome do contato"
              className="w-full rounded-xl bg-input/60 px-3 py-2.5 outline-none border focus:ring-2 focus:ring-ring"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingName(false)}
                className="px-3 py-2 rounded-full text-sm hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    await saveNickname(otherUserId, nameDraft);
                    setHeaderName(nameDraft.trim() || profileName);
                    setEditingName(false);
                    toast.success("Nome salvo");
                  } catch (err: any) {
                    toast.error(err?.message || "Erro ao salvar");
                  }
                }}
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
      {viewProfile && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4"
          onClick={() => setViewProfile(false)}
        >
          <button
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white grid place-items-center"
            aria-label="Fechar"
            onClick={() => setViewProfile(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="flex flex-col items-center gap-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-64 w-64 max-w-[80vw] max-h-[60vh] rounded-full overflow-hidden bg-gradient-brand grid place-items-center text-white text-7xl font-bold shadow-2xl">
              {peerAvatar ? (
                <img src={peerAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                (headerName || "").charAt(0).toUpperCase()
              )}
            </div>
            <div className="text-white">
              <div className="text-2xl font-bold inline-flex items-center gap-2">{headerName}{peerIsPlus && <VerifiedBadge className="h-6 w-6" />}</div>
              {peerShortCode && (
                <div className="text-sm text-white/70 mt-1">ID: {peerShortCode}</div>
              )}
            </div>
          </div>
        </div>
      )}
      <NativeGallerySheet
        open={showGallery}
        onClose={() => setShowGallery(false)}
        onPick={(f) => handlePickImage(f)}
        fallbackInputClick={() => fileRef.current?.click()}
      />
    </div>
  );
}
