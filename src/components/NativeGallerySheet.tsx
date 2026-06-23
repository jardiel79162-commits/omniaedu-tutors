import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { X, Camera as CameraIcon, FolderOpen, Play } from "lucide-react";

type Asset = {
  identifier: string;
  type: "image" | "video";
  thumb: string; // data url or capacitor file src
  width?: number;
  height?: number;
};

async function uriToFile(uri: string, fallbackName: string): Promise<File> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const ext = (blob.type.split("/")[1] || "bin").split(";")[0];
  return new File([blob], `${fallbackName}.${ext}`, { type: blob.type || "application/octet-stream" });
}

export default function NativeGallerySheet({
  open,
  onClose,
  onPick,
  fallbackInputClick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (file: File) => void;
  fallbackInputClick: () => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const isNative = Capacitor.isNativePlatform();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!open || !isNative || loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const mod: any = await import("@capacitor-community/media");
        const Media = mod.Media;
        // Try to ensure permission (Android 13+)
        try {
          if (typeof Media.checkPermissions === "function") {
            const p = await Media.checkPermissions();
            const granted = p?.photos === "granted" || p?.media === "granted";
            if (!granted && typeof Media.requestPermissions === "function") {
              await Media.requestPermissions({ permissions: ["photos"] });
            }
          }
        } catch {}
        const res: any = await Media.getMedias({
          quantity: 120,
          types: "all",
          sort: [{ key: "creationDate", ascending: false }],
        });
        const list: Asset[] = (res?.medias || []).map((m: any) => {
          let thumb: string = "";
          const raw = m.thumbnail || m.data || m.path || "";
          if (typeof raw === "string" && raw.length) {
            if (raw.startsWith("data:") || raw.startsWith("http") || raw.startsWith("blob:")) thumb = raw;
            else if (raw.startsWith("/") || raw.startsWith("file:")) thumb = Capacitor.convertFileSrc(raw);
            else thumb = `data:image/jpeg;base64,${raw}`;
          }
          const t: "image" | "video" =
            m.type === "video" || m.mediaType === "video" || /video/i.test(m.mimeType || "") ? "video" : "image";
          return {
            identifier: m.identifier || m.localIdentifier || m.path,
            type: t,
            thumb,
            width: m.fullWidth,
            height: m.fullHeight,
          };
        });
        setAssets(list.filter((a) => a.identifier));
      } catch (e: any) {
        setError(e?.message || "Não foi possível abrir a galeria");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, isNative]);

  useEffect(() => {
    if (!open) loadedRef.current = false;
  }, [open]);

  if (!open) return null;

  async function pickAsset(a: Asset) {
    if (busyId) return;
    setBusyId(a.identifier);
    try {
      const mod: any = await import("@capacitor-community/media");
      const Media = mod.Media;
      let fileUri = "";
      try {
        const r: any = await Media.getMediaByIdentifier({ identifier: a.identifier });
        const path = r?.path || r?.uri || r?.data;
        if (typeof path === "string" && path.length) {
          if (path.startsWith("data:") || path.startsWith("http") || path.startsWith("blob:")) fileUri = path;
          else if (path.startsWith("/") || path.startsWith("file:")) fileUri = Capacitor.convertFileSrc(path);
          else fileUri = `data:${a.type === "video" ? "video/mp4" : "image/jpeg"};base64,${path}`;
        }
      } catch {}
      if (!fileUri) fileUri = a.thumb;
      const file = await uriToFile(fileUri, `media_${Date.now()}`);
      onPick(file);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Falha ao carregar mídia");
    } finally {
      setBusyId(null);
    }
  }

  async function openCamera() {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        allowEditing: false,
      });
      if (photo?.webPath) {
        const file = await uriToFile(photo.webPath, `photo_${Date.now()}`);
        onPick(file);
        onClose();
      }
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 h-14 border-b">
        <button onClick={onClose} className="h-10 w-10 grid place-items-center rounded-full hover:bg-muted" aria-label="Fechar">
          <X className="h-5 w-5" />
        </button>
        <h2 className="font-semibold">Galeria</h2>
        <button
          onClick={() => {
            onClose();
            fallbackInputClick();
          }}
          className="h-10 px-3 rounded-full hover:bg-muted text-sm flex items-center gap-1"
        >
          <FolderOpen className="h-4 w-4" />
          Arquivos
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {!isNative ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Galeria nativa disponível apenas no aplicativo.
            <div className="mt-4">
              <button
                onClick={() => {
                  onClose();
                  fallbackInputClick();
                }}
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground"
              >
                Selecionar arquivo
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Carregando fotos…</div>
        ) : error ? (
          <div className="p-8 text-center text-sm">
            <div className="text-destructive mb-3">{error}</div>
            <button
              onClick={() => {
                onClose();
                fallbackInputClick();
              }}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground"
            >
              Abrir arquivos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            <button
              onClick={openCamera}
              className="aspect-square bg-muted grid place-items-center text-primary"
              aria-label="Câmera"
            >
              <CameraIcon className="h-8 w-8" />
            </button>
            {assets.map((a) => (
              <button
                key={a.identifier}
                onClick={() => pickAsset(a)}
                className="relative aspect-square bg-muted overflow-hidden disabled:opacity-50"
                disabled={busyId === a.identifier}
              >
                {a.thumb ? (
                  <img src={a.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
                {a.type === "video" && (
                  <div className="absolute inset-0 grid place-items-center bg-black/20">
                    <Play className="h-6 w-6 text-white drop-shadow" />
                  </div>
                )}
                {busyId === a.identifier && (
                  <div className="absolute inset-0 grid place-items-center bg-black/40 text-white text-xs">…</div>
                )}
              </button>
            ))}
            {assets.length === 0 && (
              <div className="col-span-3 p-8 text-center text-muted-foreground text-sm">Nenhuma foto encontrada.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
